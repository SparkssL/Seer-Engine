import asyncio
import aiohttp
import json
import random
from typing import Optional, Callable, List
from datetime import datetime, timezone
from models.types import Tweet, Source, TweetAuthor, TweetMetrics

class TwitterService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self.session: Optional[aiohttp.ClientSession] = None
        self.connected = False
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.min_reconnect_delay = 90

        # Selected accounts to monitor (lowercase for case-insensitive matching)
        self.selected_accounts: List[str] = []

        # Event handlers
        self.on_tweet: Optional[Callable] = None
        self.on_connected: Optional[Callable] = None
        self.on_disconnected: Optional[Callable] = None
        self.on_error: Optional[Callable] = None

    async def connect(self, sources: List[Source]) -> None:
        """Connect to Twitter WebSocket API"""
        if not self.api_key:
            print("[Twitter] No API key; skipping connection")
            return

        # Flatten account lists from sources
        accounts = []
        for source in sources:
            if source.enabled and source.accounts:
                accounts.extend(source.accounts)

        if not accounts:
            print("[Twitter] No accounts configured")
            return

        # Store selected accounts (lowercase for case-insensitive matching)
        self.selected_accounts = [acc.lower() for acc in accounts]
        print(f"[Twitter] Filtering for accounts: {self.selected_accounts}")

        # Create WebSocket connection
        self.session = aiohttp.ClientSession()
        url = "wss://ws.twitterapi.io/twitter/tweet/websocket"
        headers = {"x-api-key": self.api_key}

        try:
            self.ws = await self.session.ws_connect(url, headers=headers)
            self.connected = True
            self.reconnect_attempts = 0
            print(f"[Twitter] Connected, monitoring {len(accounts)} accounts")

            if self.on_connected:
                await self.on_connected()

            # Listen for messages
            async for msg in self.ws:
                if msg.type == aiohttp.WSMsgType.TEXT:
                    await self._handle_message(msg.data)
                elif msg.type == aiohttp.WSMsgType.ERROR:
                    print(f"[Twitter] WebSocket error: {self.ws.exception()}")
                    break

        except Exception as e:
            print(f"[Twitter] Connection error: {e}")
            if self.on_error:
                await self.on_error(str(e))
            await self._reconnect()

    async def _handle_message(self, data: str) -> None:
        """Parse WebSocket message and emit tweet event"""
        try:
            msg = json.loads(data)
            # TwitterAPI.io uses 'type' field (not 'event_type')
            event_type = msg.get("type") or msg.get("event_type")

            print(f"[Twitter] Received event: {event_type}", flush=True)

            if event_type == "connected":
                print("[Twitter] WebSocket handshake complete", flush=True)

            elif event_type == "ping":
                # Log ping for debugging
                timestamp = msg.get("timestamp", "unknown")
                print(f"[Twitter] Ping received (timestamp: {timestamp})", flush=True)
                # No need to respond - server handles it

            elif event_type == "tweet":
                # TwitterAPI.io sends tweet data directly in the message, not in a "tweets" array
                # Check if tweet data is in message root (TwitterAPI.io format)
                if "text" in msg:
                    # Single tweet in message root
                    print("[Twitter] Received 1 tweet", flush=True)
                    # Print raw data for debugging
                    print(f"[Twitter] Raw tweet data: {json.dumps(msg, indent=2)}", flush=True)

                    tweet = self._parse_tweet(msg, msg)
                    if tweet:
                        # Filter by selected accounts
                        if not self._is_from_selected_account(tweet):
                            print(f"[Twitter] Ignoring tweet from @{tweet.author.username} (not in selected accounts)", flush=True)
                            return
                        print(f"[Twitter] New tweet from @{tweet.author.username}: {tweet.text[:50]}...", flush=True)
                        if self.on_tweet:
                            await self.on_tweet(tweet)
                else:
                    # Fallback: try tweets array format (other APIs)
                    tweets_data = msg.get("tweets", [])
                    if not tweets_data:
                        print("[Twitter] Tweet event without tweet data", flush=True)
                        return

                    print(f"[Twitter] Received {len(tweets_data)} tweet(s)", flush=True)
                    for tweet_data in tweets_data:
                        tweet = self._parse_tweet(tweet_data, msg)
                        if tweet:
                            # Filter by selected accounts
                            if not self._is_from_selected_account(tweet):
                                print(f"[Twitter] Ignoring tweet from @{tweet.author.username} (not in selected accounts)", flush=True)
                                continue
                            print(f"[Twitter] New tweet from @{tweet.author.username}: {tweet.text[:50]}...", flush=True)
                            if self.on_tweet:
                                await self.on_tweet(tweet)

            else:
                print(f"[Twitter] Ignoring unknown event type: {event_type}", flush=True)

        except Exception as e:
            print(f"[Twitter] Message parse error: {e}", flush=True)
            import traceback
            traceback.print_exc()

    def _parse_tweet(self, data: dict, envelope: Optional[dict] = None) -> Optional[Tweet]:
        """Convert Twitter API response to Tweet model"""
        try:
            # Handle both nested author and user fields (API variations)
            author_data = data.get("author") or data.get("user") or {}

            # Debug: Log author_data to understand parsing
            print(f"[Twitter] DEBUG author_data keys: {list(author_data.keys()) if author_data else 'None'}", flush=True)

            # Support both camelCase (TwitterAPI.io) and snake_case field names
            tweet_id = data.get("id") or data.get("id_str") or data.get("tweet_id", f"tweet-{datetime.now(timezone.utc).timestamp()}")
            text = data.get("text", "")

            if not text:
                return None

            # Timestamp - try multiple fields, fallback to envelope timestamp
            timestamp = (
                data.get("createdAt") or
                data.get("created_at") or
                (datetime.fromtimestamp(envelope.get("timestamp") / 1000, timezone.utc).isoformat() if envelope and envelope.get("timestamp") else None) or
                datetime.now(timezone.utc).isoformat()
            )

            # Author parsing with TwitterAPI.io field names (userName, profilePicture, isBlueVerified)
            author = TweetAuthor(
                name=author_data.get("name") or author_data.get("display_name", "Unknown"),
                username=author_data.get("userName") or author_data.get("username") or author_data.get("screen_name", "unknown"),
                avatar=(
                    author_data.get("profilePicture") or
                    author_data.get("profile_image_url_https") or
                    author_data.get("profile_image_url") or
                    author_data.get("profileImageUrl")
                ),
                verified=author_data.get("isBlueVerified") or author_data.get("verified") or author_data.get("is_blue_verified", False)
            )

            # Metrics - support both camelCase and snake_case
            metrics = TweetMetrics(
                likes=data.get("likeCount") or data.get("favorite_count", 0),
                retweets=data.get("retweetCount") or data.get("retweet_count", 0),
                replies=data.get("replyCount") or data.get("reply_count", 0)
            )

            return Tweet(
                id=str(tweet_id),
                text=text,
                author=author,
                timestamp=timestamp,
                metrics=metrics
            )
        except Exception as e:
            print(f"[Twitter] Tweet parse error: {e}", flush=True)
            import traceback
            traceback.print_exc()
            return None

    def _is_from_selected_account(self, tweet: Tweet) -> bool:
        """Check if tweet is from one of the selected accounts"""
        if not self.selected_accounts:
            # No filtering if no accounts selected (accept all)
            return True
        return tweet.author.username.lower() in self.selected_accounts

    async def disconnect(self) -> None:
        """Close WebSocket connection"""
        self.connected = False
        if self.ws:
            await self.ws.close()
        if self.session:
            await self.session.close()

        if self.on_disconnected:
            await self.on_disconnected()

    async def _reconnect(self) -> None:
        """Attempt to reconnect with exponential backoff"""
        if self.reconnect_attempts >= self.max_reconnect_attempts:
            print("[Twitter] Max reconnection attempts reached")
            return

        self.reconnect_attempts += 1
        delay = self.min_reconnect_delay * (2 ** (self.reconnect_attempts - 1))
        print(f"[Twitter] Reconnecting in {delay}s (attempt {self.reconnect_attempts})")

        await asyncio.sleep(delay)
        # Caller should handle reconnection

    def generate_mock_tweet(self) -> Tweet:
        """Generate mock tweet for testing from selected accounts"""
        # Account-specific templates for realistic mock tweets
        account_templates = {
            "realdonaldtrump": [
                {"text": "We are making America great again. The economy is booming like never before!", "name": "Donald J. Trump"},
                {"text": "Tariffs on China are working. They are paying billions to our Treasury!", "name": "Donald J. Trump"},
                {"text": "The stock market just hit another all-time high. Thank you!", "name": "Donald J. Trump"},
            ],
            "elonmusk": [
                {"text": "Tesla FSD v13 is incredible. Robotaxis coming soon 🚗", "name": "Elon Musk"},
                {"text": "Dogecoin to the moon 🚀", "name": "Elon Musk"},
                {"text": "SpaceX Starship orbital flight test next week", "name": "Elon Musk"},
                {"text": "X is now the everything app", "name": "Elon Musk"},
            ],
            "cz_binance": [
                {"text": "4. BNB Chain ecosystem growing fast. More builders than ever.", "name": "CZ 🔶 BNB"},
                {"text": "SAFU. Funds are safe.", "name": "CZ 🔶 BNB"},
                {"text": "Education is key in crypto. DYOR always.", "name": "CZ 🔶 BNB"},
            ],
            "sbf_ftx": [
                {"text": "Effective altruism is the future of philanthropy", "name": "SBF"},
                {"text": "Crypto regulation needs to be balanced", "name": "SBF"},
            ],
            "0xtykoo": [
                {"text": "New alpha dropping soon. Stay tuned 👀", "name": "Tykoo"},
                {"text": "Bullish on prediction markets. The future of forecasting.", "name": "Tykoo"},
            ],
            "midaz_labs": [
                {"text": "Seer Engine update: Now processing 10x more events per second", "name": "Midaz.xyz"},
                {"text": "Building the future of autonomous trading on BNB Chain", "name": "Midaz.xyz"},
            ],
        }

        # Fallback templates for any account
        generic_templates = [
            "This is going to be huge for crypto markets",
            "Big news coming soon. Can't say more yet.",
            "The market is looking bullish today",
            "Interesting developments in the prediction market space",
        ]

        # Pick a random selected account, or use a fallback
        if self.selected_accounts:
            username = random.choice(self.selected_accounts)
            username_lower = username.lower()

            # Get account-specific templates or use generic
            if username_lower in account_templates:
                template = random.choice(account_templates[username_lower])
                text = template["text"]
                name = template["name"]
            else:
                text = random.choice(generic_templates)
                name = username
        else:
            # Fallback to generic news if no accounts selected
            username = "Reuters"
            name = "Reuters"
            text = "Breaking: Major market-moving event developing"

        return Tweet(
            id=f"mock-{datetime.now(timezone.utc).timestamp()}",
            text=text,
            author=TweetAuthor(
                name=name,
                username=username,
                verified=True
            ),
            timestamp=datetime.now(timezone.utc).isoformat(),
            metrics=TweetMetrics(
                likes=random.randint(100, 5000),
                retweets=random.randint(50, 2000),
                replies=random.randint(10, 500)
            )
        )
