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
    print(json.dumps({"type": "warning", "message": "Opinion CLOB SDK not installed, running in mock mode"}))


class OpinionTrader:
    def __init__(self):
        self.client: Optional[Client] = None
        self.connected = False
        self.market_cache: Dict[str, Any] = {}  # Cache for market details

    def connect(self) -> bool:
        """Connect to Opinion Trade API with cache configuration"""
        if not SDK_AVAILABLE:
            print(json.dumps({"type": "info", "message": "Running in mock mode - SDK not available"}))
            return True

        try:
            api_key = os.getenv('OPINION_API_KEY')
            private_key = os.getenv('OPINION_PRIVATE_KEY')
            rpc_url = os.getenv('OPINION_RPC_URL', 'https://bsc-dataseed.binance.org')
            multi_sig_addr = os.getenv('OPINION_MULTISIG_ADDR', '')

            if not api_key or not private_key:
                print(json.dumps({"type": "warning", "message": "Missing API credentials, running in mock mode"}))
                return True

            self.client = Client(
                host='https://proxy.opinion.trade:8443',
                apikey=api_key,
                chain_id=56,  # BNB Chain mainnet
                rpc_url=rpc_url,
                private_key=private_key,
                multi_sig_addr=multi_sig_addr,
                conditional_tokens_addr='0xAD1a38cEc043e70E83a3eC30443dB285ED10D774',
                multisend_addr='0x998739BFdAAdde7C933B942a68053933098f9EDa',
                # Cache configuration for performance
                cache_config={
                    'markets_ttl': 60,  # Cache markets for 60 seconds
                    'quote_tokens_ttl': 300,  # Cache quote tokens for 5 minutes
                }
            )
            self.connected = True
            print(json.dumps({"type": "info", "message": "Connected to Opinion Trade API"}))
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
            return self._get_mock_markets()

        try:
            # Fetch only activated (live) markets per SDK docs
            response = self.client.get_markets(topic_status=TopicStatusFilter.ACTIVATED)

            # Check errno for success (per SDK docs)
            if isinstance(response, dict) and response.get('errno') != 0:
                error_msg = response.get('message', 'Unknown error')
                print(json.dumps({"type": "error", "message": f"API error: {error_msg}"}))
                return self._get_mock_markets()

            # Handle different response formats
            markets_data = response.get('data', response) if isinstance(response, dict) else response
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
            return self._get_mock_markets()
        except OpenApiError as e:
            print(json.dumps({"type": "error", "message": f"API error in get_markets: {str(e)}"}))
            return self._get_mock_markets()
        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get markets: {str(e)}"}))
            return self._get_mock_markets()
    
    def get_market_details(self, market_id: str) -> Optional[Dict[str, Any]]:
        """Fetch detailed market information including token IDs"""
        if not self.client:
            return None

        # Check cache first
        if market_id in self.market_cache:
            return self.market_cache[market_id]

        try:
            response = self.client.get_market(market_id)

            # Check errno
            if isinstance(response, dict) and response.get('errno') != 0:
                error_msg = response.get('message', 'Unknown error')
                print(json.dumps({"type": "error", "message": f"Failed to get market details: {error_msg}"}))
                return None

            market_data = response.get('data', response) if isinstance(response, dict) else response

            # Cache the result
            self.market_cache[market_id] = market_data
            return market_data

        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get market details: {str(e)}"}))
            return None

    def get_orderbook(self, token_id: str) -> Optional[Dict[str, Any]]:
        """Fetch current orderbook for a token"""
        if not self.client:
            return None

        try:
            response = self.client.get_orderbook(token_id)

            # Check errno
            if isinstance(response, dict) and response.get('errno') != 0:
                error_msg = response.get('message', 'Unknown error')
                print(json.dumps({"type": "error", "message": f"Failed to get orderbook: {error_msg}"}))
                return None

            orderbook_data = response.get('data', response) if isinstance(response, dict) else response
            return orderbook_data

        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get orderbook: {str(e)}"}))
            return None

    def place_order(self, market_id: str, side: str, amount: float, price: float) -> dict:
        """Place an order on Opinion Trade with proper token ID and orderbook checking"""
        if not self.client:
            return self._mock_place_order(market_id, side, amount, price)

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

            result = self.client.place_order(order_data)

            # Check errno
            if isinstance(result, dict) and result.get('errno') != 0:
                error_msg = result.get('message', 'Unknown error')
                return {
                    'success': False,
                    'error': f"API error: {error_msg}"
                }

            # Extract result data
            result_data = result.get('data', result) if isinstance(result, dict) else result

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
            return self._mock_balance()

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
                print(json.dumps({"type": "warning", "message": "No balance method available, using mock"}))
                return self._mock_balance()

            # Check errno if response is a dict
            if isinstance(response, dict) and response.get('errno') is not None:
                if response.get('errno') != 0:
                    error_msg = response.get('message', 'Unknown error')
                    print(json.dumps({"type": "error", "message": f"Balance API error: {error_msg}"}))
                    return self._mock_balance()
                # Extract data from response
                response = response.get('data', response)

            # Handle list of balances
            if isinstance(response, list):
                balances = response
            else:
                balances = [response]

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
                print(json.dumps({"type": "warning", "message": "No balances found, using mock"}))
                return self._mock_balance()

            return {
                "available": float(best.get('available') or best.get('balance') or 0),
                "symbol": best.get('symbol') or best.get('token') or best.get('currency') or 'UNKNOWN',
            }

        except InvalidParamError as e:
            print(json.dumps({"type": "error", "message": f"Invalid parameter in get_balance: {str(e)}"}))
            return self._mock_balance()
        except OpenApiError as e:
            print(json.dumps({"type": "error", "message": f"API error in get_balance: {str(e)}"}))
            return self._mock_balance()
        except Exception as e:
            print(json.dumps({"type": "error", "message": f"Failed to get balance: {str(e)}"}))
            return self._mock_balance()
    
    def _get_mock_markets(self) -> list:
        """Return mock markets for demo mode"""
        return [
            {
                'id': '1',
                'question': 'Will Bitcoin reach $100,000 by end of 2024?',
                'category': 'Crypto',
                'volume': 2500000,
                'liquidity': 450000,
                'status': 'active',
                'endDate': '2024-12-31',
                'outcomes': [
                    {'id': '1a', 'name': 'Yes', 'probability': 0.42, 'change24h': 5.2},
                    {'id': '1b', 'name': 'No', 'probability': 0.58, 'change24h': -5.2},
                ],
            },
            {
                'id': '2',
                'question': 'Who will win the 2024 US Presidential Election?',
                'category': 'Politics',
                'volume': 15000000,
                'liquidity': 2300000,
                'status': 'active',
                'endDate': '2024-11-05',
                'outcomes': [
                    {'id': '2a', 'name': 'Trump', 'probability': 0.52, 'change24h': 1.8},
                    {'id': '2b', 'name': 'Biden', 'probability': 0.48, 'change24h': -1.8},
                ],
            },
            {
                'id': '3',
                'question': 'Will the Fed cut rates in September 2024?',
                'category': 'Finance',
                'volume': 890000,
                'liquidity': 120000,
                'status': 'active',
                'endDate': '2024-09-18',
                'outcomes': [
                    {'id': '3a', 'name': 'Yes', 'probability': 0.75, 'change24h': 3.1},
                    {'id': '3b', 'name': 'No', 'probability': 0.25, 'change24h': -3.1},
                ],
            },
            {
                'id': '4',
                'question': 'Will Ethereum ETF be approved in 2024?',
                'category': 'Crypto',
                'volume': 1200000,
                'liquidity': 280000,
                'status': 'active',
                'endDate': '2024-12-31',
                'outcomes': [
                    {'id': '4a', 'name': 'Yes', 'probability': 0.68, 'change24h': 12.4},
                    {'id': '4b', 'name': 'No', 'probability': 0.32, 'change24h': -12.4},
                ],
            },
            {
                'id': '5',
                'question': 'Will Tesla stock close above $250 this week?',
                'category': 'Finance',
                'volume': 560000,
                'liquidity': 85000,
                'status': 'active',
                'endDate': '2024-03-22',
                'outcomes': [
                    {'id': '5a', 'name': 'Yes', 'probability': 0.35, 'change24h': -8.2},
                    {'id': '5b', 'name': 'No', 'probability': 0.65, 'change24h': 8.2},
                ],
            },
            {
                'id': '6',
                'question': 'Will there be a TikTok ban in the US by 2025?',
                'category': 'Politics',
                'volume': 780000,
                'liquidity': 95000,
                'status': 'active',
                'endDate': '2025-01-01',
                'outcomes': [
                    {'id': '6a', 'name': 'Yes', 'probability': 0.28, 'change24h': 2.1},
                    {'id': '6b', 'name': 'No', 'probability': 0.72, 'change24h': -2.1},
                ],
            },
        ]
    
    def _mock_place_order(self, market_id: str, side: str, amount: float, price: float) -> dict:
        """Return mock order result for demo mode"""
        import random
        import hashlib
        import time
        
        # Simulate some randomness in success
        success = random.random() > 0.1  # 90% success rate
        
        if success:
            # Generate a mock transaction hash
            hash_input = f"{market_id}{side}{amount}{time.time()}"
            tx_hash = '0x' + hashlib.sha256(hash_input.encode()).hexdigest()[:64]
            
            return {
                'success': True,
                'orderId': f"order-{int(time.time() * 1000)}",
                'txHash': tx_hash,
            }
        else:
            return {
                'success': False,
                'error': 'Mock order failed (simulated failure)',
            }

    def _mock_balance(self) -> dict:
        """Return mock balance for demo mode"""
        return {"available": 1000.0, "symbol": "USDC"}


def main():
    """Main entry point - runs as a service accepting JSON commands via stdin"""
    trader = OpinionTrader()
    
    # Connect on startup
    if not trader.connect():
        print(json.dumps({"type": "error", "message": "Failed to connect to Opinion Trade"}))
    
    # Signal ready
    print(json.dumps({"type": "ready", "data": {"sdk_available": SDK_AVAILABLE}}))
    sys.stdout.flush()
    
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

