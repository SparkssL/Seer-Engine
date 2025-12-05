import asyncio
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from models.types import (
    Tweet, Market, MarketImpact, TradeExecution, AnalysisSession, AnalysisStep,
    HistoryFilter, SessionAnalytics
)
from services.openai_service import OpenAIService
from services.opinion_service import OpinionService

class AnalyzerService:
    def __init__(self, openai_service: OpenAIService, opinion_service: Optional[OpinionService], socketio):
        self.openai = openai_service
        self.opinion = opinion_service
        self.sio = socketio
        self.tweet_queue = asyncio.Queue()
        self.sessions: List[AnalysisSession] = []
        self.MAX_HISTORY_SIZE = 500
        self.processing = False
        self.FIXED_TRADE_AMOUNT = 2.0  # Minimum order size is ~1.30 USDT, set to 2.0 for safety

    async def process_tweet(self, tweet: Tweet) -> None:
        """Queue tweet for analysis"""
        await self.tweet_queue.put(tweet)
        if not self.processing:
            asyncio.create_task(self._process_queue())

    async def _process_queue(self) -> None:
        """Process tweets sequentially"""
        self.processing = True
        while not self.tweet_queue.empty():
            tweet = await self.tweet_queue.get()
            await self._run_analysis(tweet)
        self.processing = False

    async def _run_analysis(self, tweet: Tweet) -> None:
        """6-step analysis pipeline"""
        session_id = str(uuid.uuid4())

        # Create session
        session = AnalysisSession(
            id=session_id,
            tweet=tweet,
            steps=[],
            filterResult=None,
            marketImpacts=[],
            trades=[],
            status="active",
            startTime=datetime.now(timezone.utc).isoformat()
        )

        # Emit session start
        await self.sio.emit('session:start', session.dict())

        try:
            # Step 1: Receiving
            await self._add_step(session, "receiving", "📥 Event Received", "Capturing tweet data", "processing")
            await asyncio.sleep(0.5)
            await self._update_step_status(session, "receiving", "complete")

            # Get markets
            markets = self.opinion.get_markets() if self.opinion else []
            if not markets:
                await self._add_step(session, "complete", "⚠️ No Markets", "No markets available", "error")
                session.status = "error"
                await self._finalize_session(session)
                return

            # Count tradeable markets (with token IDs)
            tradeable_count = len([m for m in markets if m.yesTokenId and m.noTokenId])
            print(f"[Analyzer] {len(markets)} markets total, {tradeable_count} tradeable (with token IDs)")

            # Step 2: Filtering (Stage A) - Send ALL markets to LLM for comprehensive analysis
            await self._add_step(session, "filtering", "🔍 Filtering Markets", f"Scanning {len(markets)} markets ({tradeable_count} tradeable)", "processing")
            filter_result = await self.openai.filter_relevant_markets(tweet, markets)
            session.filterResult = filter_result.dict()
            await self._update_step_status(session, "filtering", "complete", {
                "relevantMarkets": len(filter_result.relevant_market_ids)
            })

            if not filter_result.is_relevant or not filter_result.relevant_market_ids:
                await self._add_step(session, "complete", "✅ Complete", "No relevant markets found", "complete")
                session.status = "complete"
                await self._finalize_session(session)
                return

            # Step 3: Analyzing (Stage B)
            # All markets are already filtered to ACTIVATED only (have token IDs)
            relevant_markets = [m for m in markets if m.id in filter_result.relevant_market_ids][:5]
            await self._add_step(session, "analyzing", "🧠 Analyzing Impact", f"Analyzing {len(relevant_markets)} markets", "processing")

            analyses = await asyncio.gather(*[
                self.openai.analyze_market_impact(tweet, market)
                for market in relevant_markets
            ])

            # Build market impacts
            for market, analysis in zip(relevant_markets, analyses):
                impact = MarketImpact(
                    marketId=market.id,
                    market=market,
                    relevanceScore=1.0,
                    sentiment=analysis.sentiment,
                    impactScore=analysis.impact_score,
                    confidence=analysis.confidence,
                    reasoning=analysis.human_readable_reason,
                    reasoningSteps=analysis.reasoning_steps,
                    tradeDecision=analysis.trade_decision
                )
                session.marketImpacts.append(impact)

            # Prepare detailed analysis results for frontend display
            analysis_results = [
                {
                    "marketId": impact.marketId,
                    "marketQuestion": impact.market.question,
                    "action": impact.tradeDecision.action,
                    "side": impact.tradeDecision.side,
                    "sentiment": impact.sentiment,
                    "impactScore": impact.impactScore,
                    "confidence": impact.confidence,
                    "suggestedPrice": impact.tradeDecision.suggestedPrice,
                    "reasoning": impact.reasoning
                }
                for impact in session.marketImpacts
            ]

            await self._update_step_status(session, "analyzing", "complete", {
                "analyzedMarkets": len(session.marketImpacts),
                "llmDecisions": analysis_results
            })

            # Filter for actionable impacts - trust LLM's decision
            candidate_impacts = [
                i for i in session.marketImpacts
                if i.tradeDecision.action != "HOLD"
                and i.tradeDecision.side is not None
            ]

            if not candidate_impacts:
                await self._add_step(session, "complete", "✅ Complete", "No actionable trades", "complete")
                session.status = "complete"
                await self._finalize_session(session)
                return

            # Step 4: Deciding (Stage C) - LLM selects best market
            await self._add_step(session, "deciding", "🎯 Selecting Market", f"Choosing from {len(candidate_impacts)} candidates", "processing")

            selection = await self.openai.select_best_market(tweet, candidate_impacts)
            if not selection:
                await self._update_step_status(session, "deciding", "error")
                session.status = "error"
                await self._finalize_session(session)
                return

            most_impacted = next((i for i in candidate_impacts if i.marketId == selection.selected_market_id), None)
            if not most_impacted:
                await self._update_step_status(session, "deciding", "error")
                session.status = "error"
                await self._finalize_session(session)
                return

            await self._update_step_status(session, "deciding", "complete", {
                "selectedMarket": most_impacted.market.question,
                "selectedMarketId": most_impacted.marketId,
                "marketCategory": most_impacted.market.category,
                "marketVolume": most_impacted.market.volume,
                "marketEndDate": most_impacted.market.endDate,
                "action": most_impacted.tradeDecision.action,
                "side": most_impacted.tradeDecision.side,
                "suggestedPrice": most_impacted.tradeDecision.suggestedPrice,
                "impactScore": most_impacted.impactScore,
                "confidence": most_impacted.confidence,
                "reasoning": selection.selection_reasoning,
                "comparativeAnalysis": selection.comparative_analysis,
                "selectionConfidence": selection.confidence_in_selection,
                "candidateCount": len(candidate_impacts)
            })

            # Step 5: Executing
            if self.opinion:
                await self._add_step(session, "executing", "💰 Executing Trade", f"Placing ${self.FIXED_TRADE_AMOUNT} order", "processing")

                # Check balance
                balance = await self.opinion.get_balance()
                print(f"[Analyzer] Balance check: available={balance.get('available')} symbol={balance.get('symbol')}")
                if balance["available"] < self.FIXED_TRADE_AMOUNT:
                    await self._update_step_status(session, "executing", "error", {
                        "reason": f"Insufficient balance: ${balance['available']:.2f}"
                    })
                    session.status = "error"
                    await self._finalize_session(session)
                    return

                # Get token ID based on side (matches actual outcome labels like UP/DOWN or YES/NO)
                token_id = None
                side = most_impacted.tradeDecision.side
                yes_label = most_impacted.market.yesLabel.upper() if most_impacted.market.yesLabel else "YES"
                no_label = most_impacted.market.noLabel.upper() if most_impacted.market.noLabel else "NO"

                # Match against actual outcome labels (e.g., "UP"/"DOWN" or "YES"/"NO")
                if side and side.upper() == yes_label:
                    token_id = most_impacted.market.yesTokenId
                elif side and side.upper() == no_label:
                    token_id = most_impacted.market.noTokenId
                # Fallback: also accept generic YES/NO if labels don't match
                elif side and side.upper() == "YES":
                    token_id = most_impacted.market.yesTokenId
                elif side and side.upper() == "NO":
                    token_id = most_impacted.market.noTokenId

                if not token_id:
                    print(f"[Analyzer] ERROR: No token_id found for {most_impacted.tradeDecision.side} side of market {most_impacted.marketId}")
                    await self._update_step_status(session, "executing", "error", {
                        "reason": f"No token ID available for {most_impacted.tradeDecision.side} side"
                    })
                    session.status = "error"
                    await self._finalize_session(session)
                    return

                print(f"[Analyzer] Executing order: market={most_impacted.marketId}, side={most_impacted.tradeDecision.side}, price={most_impacted.tradeDecision.suggestedPrice}, amount={self.FIXED_TRADE_AMOUNT}, token_id={token_id}")

                # Place order
                trade = await self.opinion.place_order(
                    market_id=most_impacted.marketId,
                    side=most_impacted.tradeDecision.side,
                    amount=self.FIXED_TRADE_AMOUNT,
                    price=most_impacted.tradeDecision.suggestedPrice,
                    token_id=token_id
                )

                if trade.status == "failed":
                    print(f"[Analyzer] Trade failed for market {trade.marketId} side {trade.side}: {trade.error}")

                session.trades.append(trade)

                # Get current market prices for display
                yes_price = most_impacted.market.outcomes[0].probability if most_impacted.market.outcomes else 0.5
                no_price = most_impacted.market.outcomes[1].probability if len(most_impacted.market.outcomes) > 1 else 0.5

                await self._update_step_status(session, "executing", "complete", {
                    "marketId": trade.marketId,
                    "marketQuestion": most_impacted.market.question,
                    "marketCategory": most_impacted.market.category,
                    "marketEndDate": most_impacted.market.endDate,
                    "marketVolume": most_impacted.market.volume,
                    "currentYesPrice": yes_price,
                    "currentNoPrice": no_price,
                    "action": most_impacted.tradeDecision.action,
                    "side": trade.side,
                    "amount": trade.amount,
                    "price": trade.price,
                    "tradeStatus": trade.status,
                    "error": trade.error,
                    "txHash": trade.txHash,
                    "timestamp": trade.timestamp,
                    "impactScore": most_impacted.impactScore,
                    "confidence": most_impacted.confidence,
                    "reasoning": most_impacted.reasoning
                })

            # Step 6: Complete
            await self._add_step(session, "complete", "✅ Analysis Complete", "Session finished", "complete")
            session.status = "complete"
            await self._finalize_session(session)

        except Exception as e:
            print(f"[Analyzer] Analysis error: {e}")
            session.status = "error"
            await self._finalize_session(session)

    async def _add_step(self, session: AnalysisSession, step_type: str, title: str, description: str, status: str, data: dict = None) -> None:
        """Add a new step to the session"""
        step = AnalysisStep(
            id=str(uuid.uuid4()),
            type=step_type,
            title=title,
            description=description,
            status=status,
            data=data,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
        session.steps.append(step)
        await self.sio.emit('session:update', session.dict())

    async def _update_step_status(self, session: AnalysisSession, step_type: str, status: str, data: dict = None) -> None:
        """Update the status of an existing step"""
        for step in session.steps:
            if step.type == step_type:
                step.status = status
                if data:
                    step.data = {**(step.data or {}), **data}
                step.timestamp = datetime.now(timezone.utc).isoformat()
                break
        await self.sio.emit('session:update', session.dict())
        await asyncio.sleep(0.5)

    async def _finalize_session(self, session: AnalysisSession) -> None:
        """Finalize session and record in history"""
        session.endTime = datetime.now(timezone.utc).isoformat()

        # Record in history (keep last 500)
        self.sessions.insert(0, session)
        if len(self.sessions) > self.MAX_HISTORY_SIZE:
            self.sessions = self.sessions[:self.MAX_HISTORY_SIZE]

        # Emit updates
        await self.sio.emit('session:complete', session.dict())
        await self.sio.emit('sessions:history', [s.dict() for s in self.sessions])

        # Calculate and emit analytics
        analytics = self.calculate_analytics()
        await self.sio.emit('sessions:analytics', analytics.dict())

    def get_filtered_history(self, filter_obj: HistoryFilter) -> List[AnalysisSession]:
        """Filter sessions by criteria"""
        filtered = self.sessions

        if filter_obj.status:
            filtered = [s for s in filtered if s.status in filter_obj.status]

        if filter_obj.author:
            filtered = [s for s in filtered if filter_obj.author.lower() in s.tweet.author.username.lower()]

        if filter_obj.tweetText:
            filtered = [s for s in filtered if filter_obj.tweetText.lower() in s.tweet.text.lower()]

        if filter_obj.minTrades is not None:
            filtered = [s for s in filtered if len(s.trades) >= filter_obj.minTrades]

        if filter_obj.maxTrades is not None:
            filtered = [s for s in filtered if len(s.trades) <= filter_obj.maxTrades]

        if filter_obj.minConfidence is not None:
            filtered = [
                s for s in filtered
                if any(i.confidence >= filter_obj.minConfidence for i in s.marketImpacts)
            ]

        return filtered

    def calculate_analytics(self) -> SessionAnalytics:
        """Calculate session analytics"""
        if not self.sessions:
            return SessionAnalytics(
                totalSessions=0, completedSessions=0, erroredSessions=0, activeSessions=0,
                totalTrades=0, successfulTrades=0, failedTrades=0, successRate=0.0,
                totalVolume=0.0, averageTradesPerSession=0.0, averageImpactsPerSession=0.0,
                averageConfidence=0.0, marketCategoryBreakdown={}, topAuthors=[],
                sentimentDistribution={"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0},
                timeSeriesData=[]
            )

        total = len(self.sessions)
        completed = len([s for s in self.sessions if s.status == "complete"])
        errored = len([s for s in self.sessions if s.status == "error"])
        active = len([s for s in self.sessions if s.status == "active"])

        all_trades = [t for s in self.sessions for t in s.trades]
        total_trades = len(all_trades)
        successful = len([t for t in all_trades if t.status == "confirmed"])
        failed = len([t for t in all_trades if t.status == "failed"])
        success_rate = (successful / total_trades * 100) if total_trades > 0 else 0.0

        total_volume = sum(t.amount for t in all_trades)
        avg_trades = total_trades / total if total > 0 else 0.0

        all_impacts = [i for s in self.sessions for i in s.marketImpacts]
        avg_impacts = len(all_impacts) / total if total > 0 else 0.0
        avg_confidence = (sum(i.confidence for i in all_impacts) / len(all_impacts) * 100) if all_impacts else 0.0

        # Category breakdown
        category_breakdown = {}
        for impact in all_impacts:
            cat = impact.market.category
            category_breakdown[cat] = category_breakdown.get(cat, 0) + 1

        # Top authors
        author_counts = {}
        for session in self.sessions:
            author = session.tweet.author.username
            author_counts[author] = author_counts.get(author, 0) + 1
        top_authors = [{"author": k, "count": v} for k, v in sorted(author_counts.items(), key=lambda x: x[1], reverse=True)[:5]]

        # Sentiment distribution
        sentiment_dist = {"POSITIVE": 0, "NEGATIVE": 0, "NEUTRAL": 0}
        for impact in all_impacts:
            sentiment_dist[impact.sentiment] += 1

        return SessionAnalytics(
            totalSessions=total,
            completedSessions=completed,
            erroredSessions=errored,
            activeSessions=active,
            totalTrades=total_trades,
            successfulTrades=successful,
            failedTrades=failed,
            successRate=success_rate,
            totalVolume=total_volume,
            averageTradesPerSession=avg_trades,
            averageImpactsPerSession=avg_impacts,
            averageConfidence=avg_confidence,
            marketCategoryBreakdown=category_breakdown,
            topAuthors=top_authors,
            sentimentDistribution=sentiment_dist,
            timeSeriesData=[]
        )
