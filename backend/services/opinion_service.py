import uuid
from datetime import datetime, timezone
from typing import List, Optional
from opinion_clob_sdk import Client, TopicStatusFilter
from opinion_clob_sdk.chain.py_order_utils.model.order import PlaceOrderDataInput
from opinion_clob_sdk.chain.py_order_utils.model.sides import OrderSide
from opinion_clob_sdk.chain.py_order_utils.model.order_type import OrderType
from models.types import Market, Outcome, TradeExecution

class OpinionService:
    def __init__(
        self,
        api_key: str,
        private_key: str,
        multi_sig_addr: str,
        rpc_url: str = "https://bsc-dataseed.binance.org",
        host: str = "https://proxy.opinion.trade:8443",
        chain_id: int = 56
    ):
        # Direct SDK client initialization - NO SUBPROCESS!
        self.client = Client(
            host=host,
            apikey=api_key,
            chain_id=chain_id,
            rpc_url=rpc_url,
            private_key=private_key,
            multi_sig_addr=multi_sig_addr,
            conditional_tokens_addr="0xAD1a38cEc043e70E83a3eC30443dB285ED10D774",
            multisend_addr="0x998739BFdAAdde7C933B942a68053933098f9EDa",
            market_cache_ttl=60,
            quote_tokens_cache_ttl=300,
            enable_trading_check_interval=3600
        )

        # Enable trading (required before placing orders per SDK docs)
        try:
            self.client.enable_trading()
            print(f"[Opinion] Connected to Opinion Trade (wallet: {multi_sig_addr[:10]}...) - Trading enabled")
        except Exception as e:
            print(f"[Opinion] Connected but trading not enabled: {e}")

    def get_markets(self) -> List[Market]:
        """Fetch active markets from Opinion Trade - Direct SDK call!"""
        try:
            # Fetch markets with ACTIVATED status filter to prioritize tradeable markets
            response = self.client.get_markets(limit=20, status=TopicStatusFilter.ACTIVATED)

            # Parse response based on SDK structure
            markets_data = []
            if hasattr(response, 'result'):
                result = getattr(response, 'result', None)
                if result and hasattr(result, 'list'):
                    markets_data = getattr(result, 'list', [])

            # Count actually activated markets (with token IDs)
            activated_count = sum(1 for m in markets_data if self._is_activated(m))
            print(f"[Opinion] Fetched {len(markets_data)} markets from SDK ({activated_count} activated with token IDs)")

            # Only keep ACTIVATED markets with token IDs (tradeable)
            # Filter out CREATED markets since they have no token IDs and can't be traded
            tradeable_markets = []
            for raw_market in markets_data:
                if self._is_activated(raw_market):
                    market = self._normalize_market(raw_market)
                    if market and market.yesTokenId and market.noTokenId:
                        tradeable_markets.append(market)

            markets = tradeable_markets

            print(f"[Opinion] Normalized {len(markets)} tradeable markets")
            return markets

        except Exception as e:
            print(f"[Opinion] Failed to fetch markets: {e}")
            return []

    def _is_activated(self, raw: any) -> bool:
        """Check if a market is activated (has token IDs)"""
        try:
            if hasattr(raw, 'to_dict'):
                data = raw.to_dict()
            elif isinstance(raw, dict):
                data = raw
            else:
                return False

            status = str(data.get('statusEnum') or data.get('status', '')).lower()
            has_tokens = bool(data.get('yesTokenId') and data.get('noTokenId'))
            return 'activated' in status and has_tokens
        except:
            return False

    def _normalize_market(self, raw: any) -> Optional[Market]:
        """Convert SDK market object to Market Pydantic model"""
        try:
            # Convert SDK model to dict if available
            if hasattr(raw, 'to_dict'):
                data = raw.to_dict()
            elif isinstance(raw, dict):
                data = raw
            else:
                return None

            # Filter by status - accept both Created and Activated (tradeable markets)
            status_value = data.get('statusEnum') or data.get('status')
            status_str = str(status_value).lower()

            # Accept Created or Activated, reject Resolved/Canceled/Closed
            is_tradeable = (
                'created' in status_str or
                'activated' in status_str or
                status_str in ['1', '2', 'active']
            )
            is_closed = (
                'resolved' in status_str or
                'canceled' in status_str or
                'closed' in status_str
            )

            if not is_tradeable or is_closed:
                return None

            # SDK uses camelCase - check both formats
            market_id = str(data.get('marketId') or data.get('market_id') or data.get('id') or '')
            title = data.get('marketTitle') or data.get('market_title') or data.get('question') or 'Untitled market'

            # Get outcome labels (e.g., "UP/DOWN" or "YES/NO")
            yes_label = data.get('yesLabel') or data.get('yes_label') or 'YES'
            no_label = data.get('noLabel') or data.get('no_label') or 'NO'

            yes_price = data.get('yesPrice') or data.get('yes_price') or 0.5
            change_24h = data.get('change24h') or data.get('change_24h') or 0

            end_date = data.get('cutoffAt') or data.get('end_date') or data.get('cutoff_at')

            # Get token IDs for outcomes (needed for order placement)
            yes_token_id = data.get('yesTokenId') or data.get('yes_token_id') or ''
            no_token_id = data.get('noTokenId') or data.get('no_token_id') or ''

            return Market(
                id=market_id,
                question=title,
                category=data.get('category', 'General'),
                volume=float(data.get('volume') or 0),
                liquidity=float(data.get('liquidity') or 0),
                status='active',
                endDate=str(end_date) if end_date else '',
                yesTokenId=yes_token_id if yes_token_id else None,
                noTokenId=no_token_id if no_token_id else None,
                yesLabel=yes_label.upper(),  # Store actual label (e.g., "UP", "YES")
                noLabel=no_label.upper(),    # Store actual label (e.g., "DOWN", "NO")
                outcomes=[
                    Outcome(
                        id=f"{market_id}-yes",
                        name=yes_label.upper(),  # Use actual label
                        probability=float(yes_price) if yes_price else 0.5,
                        change24h=float(change_24h),
                        tokenId=yes_token_id if yes_token_id else None
                    ),
                    Outcome(
                        id=f"{market_id}-no",
                        name=no_label.upper(),   # Use actual label
                        probability=1 - (float(yes_price) if yes_price else 0.5),
                        change24h=-float(change_24h),
                        tokenId=no_token_id if no_token_id else None
                    )
                ]
            )

        except Exception as e:
            print(f"[Opinion] Market normalization error: {e}")
            return None

    async def place_order(
        self, market_id: str, side: str, amount: float, price: float = 0, token_id: str = None
    ) -> TradeExecution:
        """Place order on Opinion Trade - Direct SDK call!"""
        try:
            # Enable trading if not already enabled
            try:
                self.client.enable_trading()
                print(f"[Opinion] Trading enabled")
            except Exception as e:
                print(f"[Opinion] enable_trading warning (may already be enabled): {e}")

            # Validate token_id
            if not token_id:
                print(f"[Opinion] ERROR: No token_id provided for market {market_id}")
                return TradeExecution(
                    id=str(uuid.uuid4()),
                    marketId=market_id,
                    side=side,
                    amount=amount,
                    price=price,
                    status="failed",
                    error="Missing token_id",
                    timestamp=datetime.now(timezone.utc).isoformat()
                )

            # For buying YES or NO, we always use OrderSide.BUY (buying the outcome token)
            # OrderSide.SELL would be for closing/selling an existing position
            order_side = OrderSide.BUY

            # Create order input with correct parameter names
            # Always use MARKET orders for immediate execution
            order_input = PlaceOrderDataInput(
                marketId=int(market_id),
                tokenId=token_id,
                side=order_side,
                # For MARKET orders, price is not strictly required but SDK might need a placeholder or 0
                price="0", 
                makerAmountInQuoteToken=amount,  # Amount in USDC
                orderType=OrderType.MARKET_ORDER
            )

            print(f"[Opinion] Placing MARKET {side} order for ${amount} on market {market_id} (token: {token_id[:20]}...)")

            # Place order via SDK
            response = self.client.place_order(order_input)

            # Parse response based on SDK standard format {errno, errmsg, result}
            errno = getattr(response, 'errno', -1)
            
            if errno == 0:
                result = getattr(response, 'result', None)
                data = getattr(result, 'data', None) if result else None
                
                # Try to get tx_hash or order_id
                # Note: CLOB orders might not have immediate tx_hash if they are just signed messages
                tx_hash = None
                order_id = None
                
                if data:
                    tx_hash = getattr(data, 'tx_hash', None) or getattr(data, 'transactionHash', None)
                    order_id = getattr(data, 'order_id', None) or getattr(data, 'orderId', None)
                
                print(f"[Opinion] Order placed successfully. ID: {order_id}, TX: {tx_hash}")
                
                return TradeExecution(
                    id=str(uuid.uuid4()),
                    marketId=market_id,
                    side=side,
                    amount=amount,
                    price=price,
                    status="confirmed", # Or 'pending' if we want to wait for fill?
                    txHash=tx_hash,
                    timestamp=datetime.now(timezone.utc).isoformat()
                )
            else:
                error_msg = getattr(response, 'errmsg', 'Unknown error')
                print(f"[Opinion] Order failed ({errno}): {error_msg}")
                return TradeExecution(
                    id=str(uuid.uuid4()),
                    marketId=market_id,
                    side=side,
                    amount=amount,
                    price=price,
                    status="failed",
                    error=f"SDK Error {errno}: {error_msg}",
                    timestamp=datetime.now(timezone.utc).isoformat()
                )

        except Exception as e:
            print(f"[Opinion] Order error: {e}")
            return TradeExecution(
                id=str(uuid.uuid4()),
                marketId=market_id,
                side=side,
                amount=amount,
                price=price,
                status="failed",
                error=str(e),
                timestamp=datetime.now(timezone.utc).isoformat()
            )

    async def get_balance(self) -> dict:
        """Get wallet balance using real SDK method"""
        try:
            response = self.client.get_my_balances()
            
            # Check for success (errno == 0)
            errno = getattr(response, 'errno', -1)
            if errno != 0:
                errmsg = getattr(response, 'errmsg', 'Unknown error')
                print(f"[Opinion] Balance check error ({errno}): {errmsg}")
                return {"available": 0.0, "symbol": "USDC"}
                
            # Parse result
            result = getattr(response, 'result', None)
            if not result:
                return {"available": 0.0, "symbol": "USDC"}
                
            # SDK response structure check:
            # result might have .data or might have .balances directly
            data = getattr(result, 'data', None)
            if data and hasattr(data, 'balances'):
                balances = getattr(data, 'balances', [])
            elif hasattr(result, 'balances'):
                balances = getattr(result, 'balances', [])
            else:
                balances = []
            
            # Find USDC or USDT balance
            target_balance = 0.0
            total_balance = 0.0
            symbol = "USDC"
            
            # Specific USDT address from debug logs
            USDT_ADDR = "0x55d398326f99059ff775485246999027b3197955".lower()
            
            for bal in balances:
                token_addr = str(getattr(bal, 'quote_token', '')).lower()
                avail = float(getattr(bal, 'available_balance', 0))
                total = float(getattr(bal, 'total_balance', 0))
                
                # Check for specific USDT address
                if token_addr == USDT_ADDR:
                    target_balance = avail
                    total_balance = total
                    symbol = "USDT"
                    print(f"[Opinion] Found USDT balance: {avail} (Total: {total})")
                    break
                # Fallback: take any positive balance if we haven't found USDT yet
                elif avail > 0 and target_balance == 0:
                    target_balance = avail
                    total_balance = total
                    print(f"[Opinion] Found generic balance: {avail} (token: {token_addr})")
                    
            return {
                "available": target_balance,
                "total": total_balance,
                "symbol": symbol
            }

        except Exception as e:
            print(f"[Opinion] Balance check failed: {e}")
            return {"available": 0.0, "total": 0.0, "symbol": "UNKNOWN"}
