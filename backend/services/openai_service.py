import json
from typing import List, Optional
from openai import AsyncOpenAI
from models.types import (
    Tweet, Market, MarketImpact,
    GPTMarketFilterResponse, GPTMarketAnalysisResponse, GPTMarketSelectionResponse,
    TradeDecision
)

class OpenAIService:
    def __init__(self, api_key: str):
        self.client = AsyncOpenAI(api_key=api_key)
        self.model = "gpt-5.1"

    async def filter_relevant_markets(
        self, tweet: Tweet, markets: List[Market]
    ) -> GPTMarketFilterResponse:
        """
        Stage A: Market Filtering (Cheap, Fast)
        From hundreds of markets, quickly find 3-5 that may be impacted
        """
        # Create compact market list for efficient token usage
        # All markets in this list are tradeable (ACTIVATED with token IDs)
        markets_summary = [
            {
                "id": m.id,
                "question": m.question,
                "category": m.category
            }
            for m in markets
        ]

        system_prompt = """You are a market relevance filter for a prediction market trading system.

Your task: Analyze the incoming tweet and identify which prediction markets from the given list could be impacted by this news.

Rules:
1. Be selective - only return markets with clear, direct relevance
2. Maximum 5 markets (prefer 2-3 highly relevant ones)
3. Consider both direct mentions AND indirect implications
4. If the tweet is clearly irrelevant to ALL markets, return empty list

Output ONLY valid JSON in this exact format:
{
  "is_relevant": boolean,
  "relevant_market_ids": ["market_id_1", "market_id_2"],
  "reasoning_summary": "Brief explanation of why these markets are relevant"
}

If no markets are relevant:
{
  "is_relevant": false,
  "relevant_market_ids": [],
  "reasoning_summary": "Explanation of why no markets are affected"
}"""

        verified_badge = " ✓" if tweet.author.verified else ""
        likes = tweet.metrics.likes if tweet.metrics else 0
        retweets = tweet.metrics.retweets if tweet.metrics else 0

        user_prompt = f"""Tweet from @{tweet.author.username}{verified_badge}:
"{tweet.text}"

Posted: {tweet.timestamp}
Engagement: {likes} likes, {retweets} RTs

Available Markets ({len(markets)} total):
{json.dumps(markets_summary, indent=2)}

Analyze and return relevant market IDs."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
                max_completion_tokens=500,
            )

            content = response.choices[0].message.content
            if not content:
                return GPTMarketFilterResponse(
                    is_relevant=False,
                    relevant_market_ids=[],
                    reasoning_summary="No response from LLM"
                )

            parsed = json.loads(content)
            result = GPTMarketFilterResponse(**parsed)

            status = f"Found {len(result.relevant_market_ids)} relevant markets" if result.is_relevant else "No relevant markets"
            print(f"[OpenAI] Filter: {status}")
            return result

        except Exception as e:
            print(f"[OpenAI] Filter stage failed: {e}")
            return GPTMarketFilterResponse(
                is_relevant=False,
                relevant_market_ids=[],
                reasoning_summary="Analysis failed"
            )

    async def analyze_market_impact(
        self, tweet: Tweet, market: Market
    ) -> GPTMarketAnalysisResponse:
        """
        Stage B: Impact Analysis & Decision (Expensive, Detailed)
        Deep analysis of tweet impact on a specific market
        """
        # Get current YES price
        yes_outcome = next((o for o in market.outcomes if o.name.lower() == "yes"), None)
        current_yes_price = yes_outcome.probability if yes_outcome else 0.5

        change_24h = yes_outcome.change24h if yes_outcome else 0

        system_prompt = """You are an expert prediction market trader. Your task is to analyze how a specific news event impacts a prediction market and provide a trading decision WITH A CONFIDENCE SCORE.

IMPORTANT: We will ONLY trade on the SINGLE most impacted market with a FIXED $5 amount. Your analysis helps identify which market has the highest impact.

Analysis Framework:
1. CREDIBILITY: For this task, ASSUME the tweet content is TRUE and IMPACTFUL unless proven otherwise. Trust the signal.
2. DIRECTNESS: How directly does this news affect the market question?
3. MAGNITUDE: How significant is the impact? Minor update vs game-changer?
4. TIMING: Act fast. Assume this is new information that the market needs to react to.
5. EDGE: Is there a gap between current price and fair value?

Output ONLY valid JSON in this exact format (no prose):
{
  "market_id": "string",
  "sentiment": "POSITIVE" | "NEGATIVE" | "NEUTRAL",
  "impact_score": number (0.0 to 1.0),
  "confidence": number (0.0 to 1.0 - how confident are you in this analysis?),
  "reasoning_steps": ["step 1", "step 2", "step 3"],
  "trade_decision": {
    "action": "BUY" | "SELL" | "HOLD",
    "side": "YES" | "NO" | null,
    "suggested_price": number (0.01 to 0.99) REQUIRED - ALWAYS include this field even for HOLD decisions,
    "size_usdc": 5
  },
  "human_readable_reason": "Clear explanation in natural language"
}

IMPORTANT: The "suggested_price" field is REQUIRED in every response, even for HOLD decisions. If HOLD, use current market price.

sentiment:
- POSITIVE = increases likelihood of YES outcome
- NEGATIVE = decreases likelihood of YES outcome (favors NO)
- NEUTRAL = no significant impact

CONFIDENCE SCORING:
- 0.9-1.0: Very high confidence (direct impact, verified source, clear signal)
- 0.7-0.9: High confidence (strong relevance, credible source)
- 0.5-0.7: Medium confidence (indirect impact or uncertain magnitude)
- 0.3-0.5: Low confidence (weak signal or unclear relevance)
- 0.0-0.3: Very low confidence (speculative or tangential connection)

TRADING DECISION:
- Bias towards ACTION over inaction. If there is a plausible link, TAKE THE TRADE.
- Don't be overly skeptical. If the tweet suggests a price move, bet on it.
- You have full autonomy - trade when you see opportunity
- Be opportunistic but rational

Note: size_usdc is always 5 (fixed $5 per trade). Focus on identifying the MOST impacted market.
Reasoning should be concise, 3 steps: (1) signal/content, (2) impact direction & magnitude, (3) trade rationale"""

        verified_badge = " ✓" if tweet.author.verified else ""

        is_tradeable = bool(market.yesTokenId and market.noTokenId)
        tradeable_status = "YES - Ready for trading" if is_tradeable else "NO - Cannot execute trades (no token IDs)"

        # Use actual outcome labels (e.g., UP/DOWN or YES/NO)
        yes_label = market.yesLabel if hasattr(market, 'yesLabel') else "YES"
        no_label = market.noLabel if hasattr(market, 'noLabel') else "NO"

        user_prompt = f"""Tweet from @{tweet.author.username}{verified_badge}:
"{tweet.text}"

Market Details:
- ID: {market.id}
- Question: {market.question}
- Category: {market.category}
- Outcome Labels: "{yes_label}" vs "{no_label}"
- Current {yes_label} price: {current_yes_price * 100:.1f}%
- Current {no_label} price: {(1 - current_yes_price) * 100:.1f}%
- 24h Change: {'+' if change_24h > 0 else ''}{change_24h:.1f}%
- Volume: ${market.volume:,.0f}
- End Date: {market.endDate}
- TRADEABLE: {tradeable_status}

Analyze the impact and provide your trading decision.
IMPORTANT: Use the actual outcome labels "{yes_label}" or "{no_label}" in your trade_decision.side field (not generic YES/NO).
Note: If the market is NOT tradeable, you can still analyze the impact but the trade cannot be executed."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_completion_tokens=600,
            )

            content = response.choices[0].message.content
            if not content:
                return self._get_default_analysis(market.id)

            parsed = json.loads(content)
            # Log the raw response for debugging
            print(f"[OpenAI] Raw analysis response: {json.dumps(parsed, indent=2)}")
            result = GPTMarketAnalysisResponse(**parsed)

            print(f"[OpenAI] Analysis: Market {market.id} - {result.sentiment}, impact={result.impact_score:.2f}, action={result.trade_decision.action}")
            return result

        except Exception as e:
            print(f"[OpenAI] Analysis stage failed: {e}")
            return self._get_default_analysis(market.id)

    async def select_best_market(
        self, tweet: Tweet, impacts: List[MarketImpact]
    ) -> Optional[GPTMarketSelectionResponse]:
        """
        Stage C: Market Selection (LLM-Driven)
        From actionable markets, use LLM to intelligently select the single best market
        """
        if not impacts:
            return None

        if len(impacts) == 1:
            return GPTMarketSelectionResponse(
                selected_market_id=impacts[0].marketId,
                selection_reasoning="Only one actionable market available",
                comparative_analysis="No comparison needed - single candidate",
                confidence_in_selection=1.0
            )

        system_prompt = """You are an expert prediction market trader making the FINAL decision on which single market to trade.

You have already analyzed multiple markets for their impact from a news event. Now you must select the ONE best market to place a $5 trade on.

Consider:
1. Impact Score: Higher impact = more likely the news moves this market
2. Confidence: Higher confidence = more certain about the analysis
3. Edge Quality: Is there a clear mispricing opportunity?
4. Market Liquidity: Can we execute at the desired price?
5. Time Sensitivity: Is this time-critical information?
6. Risk/Reward: Best asymmetric opportunity

Output ONLY valid JSON in this exact format (no prose):
{
  "selected_market_id": "string",
  "selection_reasoning": "Why this market is the best choice among all candidates",
  "comparative_analysis": "Brief comparison explaining why this beats other options",
  "confidence_in_selection": number (0.0 to 1.0 - how confident are you this is the best choice?)
}

Be decisive. Pick the ONE market with the best combination of high impact, high confidence, and clear edge."""

        verified_badge = " ✓" if tweet.author.verified else ""

        markets_context = []
        for idx, impact in enumerate(impacts):
            yes_outcome = next((o for o in impact.market.outcomes if o.name.lower() == "yes"), None)
            current_yes_price = yes_outcome.probability if yes_outcome else 0.5

            markets_context.append({
                "index": idx + 1,
                "market_id": impact.marketId,
                "question": impact.market.question,
                "category": impact.market.category,
                "current_yes_price": current_yes_price,
                "volume": impact.market.volume,
                "liquidity": impact.market.liquidity,
                "impact_score": impact.impactScore,
                "confidence": impact.confidence,
                "sentiment": impact.sentiment,
                "action": impact.tradeDecision.action,
                "side": impact.tradeDecision.side,
                "suggested_price": impact.tradeDecision.suggestedPrice,
                "reasoning": impact.reasoning
            })

        user_prompt = f"""Tweet from @{tweet.author.username}{verified_badge}:
"{tweet.text}"

Candidate Markets ({len(impacts)} total):
{json.dumps(markets_context, indent=2)}

Select the ONE best market to trade $5 on. Be decisive and explain your choice clearly."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.4,
                max_completion_tokens=400,
            )

            content = response.choices[0].message.content
            if not content:
                print("[OpenAI] Empty selection response")
                return None

            parsed = json.loads(content)
            result = GPTMarketSelectionResponse(**parsed)

            print(f"[OpenAI] Selection: Chose market {result.selected_market_id} (confidence={result.confidence_in_selection:.2f})")
            return result

        except Exception as e:
            print(f"[OpenAI] Market selection failed: {e}")
            return None

    def _get_default_analysis(self, market_id: str) -> GPTMarketAnalysisResponse:
        """Return safe default analysis on error"""
        return GPTMarketAnalysisResponse(
            market_id=market_id,
            sentiment="NEUTRAL",
            impact_score=0.0,
            confidence=0.0,
            trade_decision=TradeDecision(
                action="HOLD",
                side=None,
                suggestedPrice=0.5,
                sizeUsdc=0.0
            ),
            human_readable_reason="Analysis could not be completed"
        )
