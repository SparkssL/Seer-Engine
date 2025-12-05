#!/usr/bin/env python3
"""
Seer Engine - Python Trader Service
Interfaces with Opinion CLOB SDK for prediction market trading
"""

import json
import sys
import os
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path='../.env')

# Try to import Opinion CLOB SDK
try:
    from opinion_clob_sdk import Client
    from opinion_clob_sdk.chain.py_order_utils.model.order import PlaceOrderDataInput
    from opinion_clob_sdk.chain.py_order_utils.model.sides import OrderSide
    from opinion_clob_sdk.chain.py_order_utils.model.order_type import LIMIT_ORDER
    from opinion_clob_sdk.model import TopicStatusFilter
    from opinion_clob_sdk.exceptions import InvalidParamError, OpenApiError
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    InvalidParamError = Exception
    OpenApiError = Exception
    print(json.dumps({"type": "error", "message": "Opinion CLOB SDK not installed. Install with: pip install opinion-clob-sdk"}), flush=True)


class OpinionTrader:
    def __init__(self):
        self.client: Optional[Client] = None
        self.connected = False
        self.market_cache: Dict[str, Any] = {}  # Cache for market details

    def connect(self) -> bool:
        """Connect to Opinion Trade API with cache configuration"""
        if not SDK_AVAILABLE:
            print(json.dumps({"type": "error", "message": "Opinion CLOB SDK not installed. Install with: pip install opinion-clob-sdk"}))
            return False

        try:
            api_key = os.getenv('OPINION_API_KEY')
            private_key = os.getenv('OPINION_PRIVATE_KEY')
            rpc_url = os.getenv('OPINION_RPC_URL', 'https://bsc-dataseed.binance.org')
            multi_sig_addr = os.getenv('OPINION_MULTISIG_ADDR')

            # Validate required credentials per SDK docs
            if not api_key:
                print(json.dumps({"type": "error", "message": "Missing OPINION_API_KEY in .env file"}), flush=True)
                return False
            if not private_key:
                print(json.dumps({"type": "error", "message": "Missing OPINION_PRIVATE_KEY in .env file"}), flush=True)
                return False
            if not multi_sig_addr:
                print(json.dumps({"type": "error", "message": "Missing OPINION_MULTISIG_ADDR in .env file (required for holding assets/portfolio)"}), flush=True)
                return False

            # Initialize client with proper cache configuration per SDK docs
            self.client = Client(
                host='https://proxy.opinion.trade:8443',
                apikey=api_key,
                chain_id=56,  # BNB Chain mainnet
                rpc_url=rpc_url,
                private_key=private_key,
                multi_sig_addr=multi_sig_addr,
                conditional_tokens_addr='0xAD1a38cEc043e70E83a3eC30443dB285ED10D774',
                multisend_addr='0x998739BFdAAdde7C933B942a68053933098f9EDa',
                # Cache configuration per SDK docs (individual parameters, not dict)
                market_cache_ttl=60,  # Cache markets for 60 seconds (high-frequency trading)
                quote_tokens_cache_ttl=300,  # Cache quote tokens for 5 minutes
                enable_trading_check_interval=3600  # Approval status cache (1 hour)
            )
            self.connected = True
            print(json.dumps({"type": "info", "message": f"Connected to Opinion Trade API (wallet: {multi_sig_addr[:10]}...)"}), flush=True)
            return True

        except InvalidParamError as e:
            print(json.dumps({"type": "error", "message": f"Invalid parameter: {str(e)}"}))
            return False
        except OpenApiError as e:
            print(json.dumps({"type": "error", "message": f"API error: {str(e)}"}))
            return False
        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to connect: {str(e)}"}))
            return False
    
    def get_markets(self) -> list:
        """Fetch only ACTIVE markets from Opinion Trade with proper error handling"""
        if not self.client:
            print(json.dumps({"type": "error", "message": "Not connected to Opinion Trade API"}))
            return []

        try:
            # Fetch only activated (live) markets per SDK docs
            response = self.client.get_markets(topic_status=TopicStatusFilter.ACTIVATED)

            # Parse APIResponse format: {errno, errmsg, result: {data/list}}
            if isinstance(response, dict):
                errno = response.get('errno', 0)
                if errno != 0:
                    error_msg = response.get('errmsg') or response.get('message', 'Unknown error')
                    print(json.dumps({"type": "error", "message": f"API error (errno {errno}): {error_msg}"}), flush=True)
                    return []

                # Extract from result.list or result.data per SDK docs
                result = response.get('result', {})
                markets_data = result.get('list') or result.get('data', [])
            else:
                # Fallback for direct list response
                markets_data = response if isinstance(response, list) else []

            if not isinstance(markets_data, list):
                markets_data = [markets_data] if markets_data else []

            markets = []
            for market in markets_data:
                # Some SDK payloads use 'status' or 'active'; prefer status check
                status = market.get('status') or ('activated' if market.get('active') else 'resolved')
                if str(status).lower() not in ['activated', 'active', '2']:
                    # Skip non-active markets defensively
                    continue

                markets.append({
                    'id': market.get('id'),
                    'question': market.get('question'),
                    'category': market.get('category', 'General'),
                    'volume': market.get('volume', 0),
                    'liquidity': market.get('liquidity', 0),
                    'status': 'active',
                    'endDate': market.get('end_date'),
                    'outcomes': [
                        {
                            'id': f"{market.get('id')}-yes",
                            'name': 'Yes',
                            'probability': market.get('yes_price', 0.5),
                            'change24h': market.get('change_24h', 0),
                        },
                        {
                            'id': f"{market.get('id')}-no",
                            'name': 'No',
                            'probability': 1 - market.get('yes_price', 0.5),
                            'change24h': -market.get('change_24h', 0),
                        }
                    ]
                })

            return markets

        except InvalidParamError as e:
            print(json.dumps({"type": "error", "message": f"Invalid parameter in get_markets: {str(e)}"}))
            return []
        except OpenApiError as e:
            print(json.dumps({"type": "error", "message": f"API error in get_markets: {str(e)}"}))
            return []
        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get markets: {str(e)}"}))
            return []
    
    def get_market_details(self, market_id: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed market information including token IDs"""
        if not self.client:
            return None

        # Check cache first
        if market_id in self.market_cache:
            return self.market_cache[market_id]

        try:
            response = self.client.get_market(market_id)

            # Parse APIResponse format: {errno, errmsg, result: {data}}
            if isinstance(response, dict):
                errno = response.get('errno', 0)
                if errno != 0:
                    error_msg = response.get('errmsg') or response.get('message', 'Unknown error')
                    print(json.dumps({"type": "error", "message": f"Failed to get market details (errno {errno}): {error_msg}"}), flush=True)
                    return None

                # Extract from result.data per SDK docs
                result = response.get('result', {})
                market_data = result.get('data', response)
            else:
                market_data = response

            # Cache the result
            self.market_cache[market_id] = market_data
            return market_data

        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get market details: {str(e)}"}), flush=True)
            return None

    def get_orderbook(self, token_id: str) -> Optional[Dict[str, Any]]:
        """Fetch current orderbook for a token"""
        if not self.client:
            return None

        try:
            response = self.client.get_orderbook(token_id)

            # Parse APIResponse format: {errno, errmsg, result: {data}}
            if isinstance(response, dict):
                errno = response.get('errno', 0)
                if errno != 0:
                    error_msg = response.get('errmsg') or response.get('message', 'Unknown error')
                    print(json.dumps({"type": "error", "message": f"Failed to get orderbook (errno {errno}): {error_msg}"}), flush=True)
                    return None

                # Extract from result.data per SDK docs
                result = response.get('result', {})
                orderbook_data = result.get('data', response)
            else:
                orderbook_data = response

            return orderbook_data

        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get orderbook: {str(e)}"}), flush=True)
            return None

    def place_order(self, market_id: str, side: str, amount: float, price: float) -> dict:
        """Place an order on Opinion Trade with proper token ID and orderbook checking"""
        if not self.client:
            return {
                'success': False,
                'error': 'Not connected to Opinion Trade API'
            }

        try:
            # Get market details to fetch proper token IDs
            market_details = self.get_market_details(market_id)
            if not market_details:
                return {
                    'success': False,
                    'error': 'Failed to fetch market details'
                }

            # Extract token ID based on side
            # Token IDs are typically in market_details['condition_id'] or similar
            token_id = f"{market_id}-{'yes' if side == 'YES' else 'no'}"

            # Try to get actual token ID from market details if available
            if 'tokens' in market_details:
                tokens = market_details.get('tokens', [])
                for token in tokens:
                    if (side == 'YES' and token.get('outcome') in ['yes', 'YES', 1]) or \
                       (side == 'NO' and token.get('outcome') in ['no', 'NO', 0]):
                        token_id = token.get('token_id', token_id)
                        break

            # Check orderbook for current market prices (optional but recommended)
            orderbook = self.get_orderbook(token_id)
            if orderbook:
                best_bid = orderbook.get('best_bid')
                best_ask = orderbook.get('best_ask')
                print(json.dumps({
                    "type": "info",
                    "message": f"Orderbook check - Best bid: {best_bid}, Best ask: {best_ask}, Our price: {price}"
                }))

            # Place the order
            order_side = OrderSide.BUY if side == 'YES' else OrderSide.SELL

            order_data = PlaceOrderDataInput(
                marketId=int(market_id),
                tokenId=token_id,
                side=order_side,
                orderType=LIMIT_ORDER,
                price=str(price),
                makerAmountInQuoteToken=amount
            )

            response = self.client.place_order(order_data)

            # Parse APIResponse format: {errno, errmsg, result: {data}}
            if isinstance(response, dict):
                errno = response.get('errno', 0)
                if errno != 0:
                    error_msg = response.get('errmsg') or response.get('message', 'Unknown error')
                    return {
                        'success': False,
                        'error': f"API error (errno {errno}): {error_msg}"
                    }

                # Extract from result.data per SDK docs
                result = response.get('result', {})
                result_data = result.get('data', response)
            else:
                result_data = response

            return {
                'success': True,
                'orderId': result_data.get('order_id') or result_data.get('orderId'),
                'txHash': result_data.get('tx_hash') or result_data.get('txHash'),
            }

        except InvalidParamError as e:
            error_msg = f"Invalid parameter: {str(e)}"
            print(json.dumps({"type": "error", "message": error_msg}))
            return {
                'success': False,
                'error': error_msg
            }
        except OpenApiError as e:
            error_msg = f"API error: {str(e)}"
            print(json.dumps({"type": "error", "message": error_msg}))
            return {
                'success': False,
                'error': error_msg
            }
        except Exception as e:
            error_msg = f"Failed to place order: {str(e)}"
            print(json.dumps({"type": "error", "message": error_msg}))
            return {
                'success': False,
                'error': error_msg
            }

    def get_balance(self) -> dict:
        """
        Fetch wallet balance (quote token) for sizing guard.
        Returns USD-equivalent if available, else raw balance fields.
        """
        if not self.client:
            print(json.dumps({"type": "error", "message": "Not connected to Opinion Trade API"}))
            return {"available": 0, "symbol": "UNKNOWN", "error": "Not connected"}

        try:
            # Try multiple potential balance methods from the SDK
            balance_methods = ['get_balances', 'get_balance', 'get_account_balances']
            response = None

            for method_name in balance_methods:
                if hasattr(self.client, method_name):
                    method = getattr(self.client, method_name)
                    response = method()
                    break

            if not response:
                print(json.dumps({"type": "error", "message": "No balance method available in SDK"}), flush=True)
                return {"available": 0, "symbol": "UNKNOWN", "error": "Balance method not found"}

            # Parse APIResponse format: {errno, errmsg, result: {data/list}}
            if isinstance(response, dict):
                errno = response.get('errno', 0)
                if errno != 0:
                    error_msg = response.get('errmsg') or response.get('message', 'Unknown error')
                    print(json.dumps({"type": "error", "message": f"Balance API error (errno {errno}): {error_msg}"}), flush=True)
                    return {"available": 0, "symbol": "UNKNOWN", "error": error_msg}

                # Extract from result.list or result.data per SDK docs
                result = response.get('result', {})
                balances_data = result.get('list') or result.get('data')

                # Handle list of balances
                if isinstance(balances_data, list):
                    balances = balances_data
                elif isinstance(balances_data, dict):
                    balances = [balances_data]
                else:
                    balances = []
            else:
                # Fallback for direct list response
                balances = response if isinstance(response, list) else [response]

            # Find USDC or USDT balance (quote tokens)
            quote_tokens = ['USDC', 'USDT', 'USD']
            best = None

            for b in balances:
                if not isinstance(b, dict):
                    continue

                symbol = b.get('symbol') or b.get('token') or b.get('currency') or ''

                # Prefer quote tokens
                if symbol.upper() in quote_tokens:
                    best = b
                    break

                # Otherwise pick the one with largest available balance
                if best is None:
                    best = b
                elif float(b.get('available', 0)) > float(best.get('available', 0)):
                    best = b

            if not best:
                print(json.dumps({"type": "error", "message": "No balances found in account"}))
                return {"available": 0, "symbol": "UNKNOWN", "error": "No balances found"}

            return {
                "available": float(best.get('available') or best.get('balance') or 0),
                "symbol": best.get('symbol') or best.get('token') or best.get('currency') or 'UNKNOWN',
            }

        except InvalidParamError as e:
            error_msg = f"Invalid parameter in get_balance: {str(e)}"
            print(json.dumps({"type": "error", "message": error_msg}))
            return {"available": 0, "symbol": "UNKNOWN", "error": error_msg}
        except OpenApiError as e:
            error_msg = f"API error in get_balance: {str(e)}"
            print(json.dumps({"type": "error", "message": error_msg}))
            return {"available": 0, "symbol": "UNKNOWN", "error": error_msg}
        except Exception as e:
            error_msg = f"Failed to get balance: {str(e)}"
            print(json.dumps({"type": "error", "message": error_msg}))
            return {"available": 0, "symbol": "UNKNOWN", "error": error_msg}


def main():
    """Main entry point - runs as a service accepting JSON commands via stdin"""
    trader = OpinionTrader()

    # Connect on startup - exit if connection fails
    if not trader.connect():
        print(json.dumps({"type": "error", "message": "Failed to connect to Opinion Trade. Exiting."}), flush=True)
        sys.exit(1)

    # Signal ready only if connection succeeded
    print(json.dumps({"type": "ready", "data": {"sdk_available": SDK_AVAILABLE}}), flush=True)
    
    # Process commands from stdin
    for line in sys.stdin:
        try:
            message = json.loads(line.strip())
            command = message.get('command')
            params = message.get('params', {})
            msg_id = message.get('id')
            
            result = None
            error = None
            
            if command == 'get_markets':
                result = trader.get_markets()
            elif command == 'place_order':
                result = trader.place_order(
                    market_id=params.get('marketId'),
                    side=params.get('side'),
                    amount=params.get('amount', 10),
                    price=params.get('price', 0.5)
                )
            elif command == 'get_balance':
                result = trader.get_balance()
            else:
                error = f"Unknown command: {command}"
            
            response = {
                'id': msg_id,
                'data': result,
                'error': error
            }
            print(json.dumps(response))
            sys.stdout.flush()
            
        except json.JSONDecodeError:
            print(json.dumps({"type": "error", "message": "Invalid JSON input"}))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"type": "error", "message": str(e)}))
            sys.stdout.flush()


if __name__ == '__main__':
    main()

