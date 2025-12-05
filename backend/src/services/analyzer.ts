import { v4 as uuidv4 } from 'uuid'
import type { Server as SocketServer } from 'socket.io'
import type { 
  Tweet, 
  Market, 
  AnalysisSession, 
  AnalysisStep, 
  MarketImpact,
  TradeExecution,
  GPTMarketFilterResponse
} from '../types.js'
import { OpenAIService } from './openai.js'
import { OpinionService } from './opinion.js'

/**
 * Analyzer Service - Orchestrates the Two-Stage LLM Pipeline
 * 
 * Flow:
 * 1. Receive tweet from WebSocket
 * 2. Stage A: Filter relevant markets (cheap, fast)
 * 3. Stage B: Analyze each market (expensive, detailed)
 * 4. Generate trade decisions
 * 5. Execute trades via Opinion SDK
 * 
 * All steps are streamed to frontend via Socket.IO for real-time visualization
 */
export class AnalyzerService {
  private readonly MAX_HISTORY_SIZE = 500
  private openai: OpenAIService
  private opinion: OpinionService
  private io: SocketServer
  private markets: Market[] = []
  private isProcessing = false
  private queue: Tweet[] = []
  private history: AnalysisSession[] = []

  constructor(
    openaiApiKey: string,
    opinion: OpinionService,
    io: SocketServer
  ) {
    this.openai = new OpenAIService(openaiApiKey)
    this.opinion = opinion
    this.io = io
  }

  async loadMarkets(): Promise<void> {
    this.markets = await this.opinion.getMarkets()
    this.io.emit('markets', this.markets)
    console.log(`[Analyzer] Loaded ${this.markets.length} markets`)
  }

  async processTweet(tweet: Tweet): Promise<void> {
    // Queue if already processing
    if (this.isProcessing) {
      console.log(`[Analyzer] Queuing tweet from @${tweet.author.username}`)
      this.queue.push(tweet)
      return
    }

    this.isProcessing = true

    try {
      await this.runAnalysis(tweet)
    } catch (error) {
      console.error('[Analyzer] Analysis failed:', error)
    } finally {
      this.isProcessing = false
      
      // Process next in queue
      if (this.queue.length > 0) {
        const nextTweet = this.queue.shift()!
        this.processTweet(nextTweet)
      }
    }
  }

  private async runAnalysis(tweet: Tweet): Promise<void> {
    const sessionId = uuidv4()
    const session: AnalysisSession = {
      id: sessionId,
      tweet,
      steps: [],
      marketImpacts: [],
      trades: [],
      status: 'active',
      startTime: new Date().toISOString(),
    }

    // Emit session start
    this.io.emit('session:start', session)

    try {
      // ============================================
      // STEP 1: Event Received (Capturing Mode)
      // ============================================
      await this.addStep(session, {
        type: 'receiving',
        title: '📡 Event Captured',
        description: `High-value tweet from @${tweet.author.username}${tweet.author.verified ? ' ✓' : ''}`,
        status: 'processing',
      })
      await this.delay(800)
      await this.updateStepStatus(session, 0, 'complete', {
        author: tweet.author.username,
        verified: tweet.author.verified,
        engagement: {
          likes: tweet.metrics?.likes || 0,
          retweets: tweet.metrics?.retweets || 0,
        },
      })

      // ============================================
      // STEP 2: Market Filtering (Stage A)
      // ============================================
      await this.addStep(session, {
        type: 'filtering',
        title: '🔍 Scanning Markets',
        description: `AI is scanning ${this.markets.length} active markets for relevance...`,
        status: 'processing',
      })

      // Call LLM Stage A
      const { filterResult, analyses } = await this.openai.analyzeEvent(tweet, this.markets)
      session.filterResult = filterResult

      if (!filterResult.is_relevant || analyses.length === 0) {
        await this.updateStepStatus(session, 1, 'complete', {
          marketsScanned: this.markets.length,
          relevantFound: 0,
          reasoning: filterResult.reasoning_summary,
        })

        await this.addStep(session, {
          type: 'complete',
          title: '✅ Analysis Complete',
          description: 'No markets identified as impacted by this event',
          status: 'complete',
        })
        
        session.status = 'complete'
        session.endTime = new Date().toISOString()
        this.io.emit('session:complete', session)
        return
      }

      await this.updateStepStatus(session, 1, 'complete', {
        marketsScanned: this.markets.length,
        relevantFound: filterResult.relevant_market_ids.length,
        marketIds: filterResult.relevant_market_ids,
        reasoning: filterResult.reasoning_summary,
      })

      // ============================================
      // STEP 3: Deep Analysis (Stage B)
      // ============================================
      await this.addStep(session, {
        type: 'analyzing',
        title: '🧠 Deep Analysis',
        description: `Analyzing impact on ${analyses.length} markets...`,
        status: 'processing',
      })

      // Build market impacts from Stage B results
      for (const { market, analysis } of analyses) {
        const combinedReasoning =
          analysis.human_readable_reason ||
          (analysis.reasoning_steps ? analysis.reasoning_steps.join(' ') : '')

        const impact: MarketImpact = {
          marketId: market.id,
          market: market,
          relevanceScore: filterResult.relevant_market_ids.indexOf(market.id) === 0 ? 0.9 : 0.7,
          sentiment: analysis.sentiment,
          impactScore: analysis.impact_score,
          confidence: analysis.confidence,
          reasoning: combinedReasoning,
          tradeDecision: {
            action: analysis.trade_decision.action,
            side: analysis.trade_decision.side,
            suggestedPrice: analysis.trade_decision.suggested_price,
            sizeUsdc: analysis.trade_decision.size_usdc,
          },
        }
        session.marketImpacts.push(impact)
        this.io.emit('session:update', session)
        await this.delay(500)
      }

      await this.updateStepStatus(session, 2, 'complete', {
        marketsAnalyzed: analyses.length,
        impacts: session.marketImpacts.map(i => ({
          market: i.market.question.substring(0, 40) + '...',
          sentiment: i.sentiment,
          impactScore: i.impactScore,
        })),
      })

      // ============================================
      // STEP 4: Trade Decision
      // ============================================
      const actionableImpacts = session.marketImpacts.filter(
        i => i.tradeDecision.action !== 'HOLD' &&
             i.impactScore > 0.6 &&
             i.confidence > 0.7 &&
             i.tradeDecision.side !== null
      )

      if (actionableImpacts.length === 0) {
        await this.addStep(session, {
          type: 'deciding',
          title: '📊 Decision',
          description: 'No high-confidence trading opportunities identified',
          status: 'complete',
        })
        
        await this.addStep(session, {
          type: 'complete',
          title: '✅ Analysis Complete',
          description: `Analyzed ${analyses.length} markets. No trades recommended.`,
          status: 'complete',
        })
        
        session.status = 'complete'
        session.endTime = new Date().toISOString()
        this.io.emit('session:complete', session)
        return
      }

      await this.addStep(session, {
        type: 'deciding',
        title: '🎯 Trade Signals',
        description: `${actionableImpacts.length} trading opportunities identified`,
        status: 'processing',
      })
      await this.delay(600)
      await this.updateStepStatus(session, 3, 'complete', {
        opportunities: actionableImpacts.length,
        signals: actionableImpacts.map(i => ({
          market: i.market.question.substring(0, 30) + '...',
          action: i.tradeDecision.action,
          side: i.tradeDecision.side,
          amount: i.tradeDecision.sizeUsdc,
        })),
      })

      // ============================================
      // STEP 5: Execute Trades
      // ============================================
      await this.addStep(session, {
        type: 'executing',
        title: '⚡ Executing Trades',
        description: 'Placing orders on Opinion Trade...',
        status: 'processing',
      })

      // Fetch wallet balance once; simple guard to avoid overspend
      const balance = await this.opinion.getBalance()
      let remaining = balance.available

      for (const impact of actionableImpacts) {
        if (!impact.tradeDecision.side) continue

        // Size guard: cap at available balance
        const requested = impact.tradeDecision.sizeUsdc
        if (remaining <= 0 || requested <= 0) {
          continue
        }
        const amountToUse = Math.min(requested, remaining)

        const trade = await this.opinion.placeOrder(
          impact.marketId,
          impact.tradeDecision.side,
          amountToUse,
          impact.tradeDecision.suggestedPrice
        )

        session.trades.push(trade)
        this.io.emit('session:update', session)
        await this.delay(700)

        if (trade.status === 'confirmed') {
          remaining -= amountToUse
        }
      }

      const successfulTrades = session.trades.filter(t => t.status === 'confirmed')
      await this.updateStepStatus(session, 4, 'complete', {
        ordersPlaced: session.trades.length,
        filled: successfulTrades.length,
        totalAmount: successfulTrades.reduce((sum, t) => sum + t.amount, 0),
      })

      // ============================================
      // STEP 6: Complete
      // ============================================
      await this.addStep(session, {
        type: 'complete',
        title: '🎉 Session Complete',
        description: `Analyzed ${session.marketImpacts.length} markets, executed ${successfulTrades.length} trades`,
        status: 'complete',
      })

      session.status = 'complete'
      session.endTime = new Date().toISOString()
      this.io.emit('session:complete', session)
      this.recordHistory(session)

    } catch (error) {
      console.error('[Analyzer] Session failed:', error)
      session.status = 'error'
      session.endTime = new Date().toISOString()
      
      // Mark current step as error
      const currentStep = session.steps.find(s => s.status === 'processing')
      if (currentStep) {
        currentStep.status = 'error'
        currentStep.description = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
      
      this.io.emit('session:complete', session)
      this.recordHistory(session)
    }
  }

  private async addStep(
    session: AnalysisSession,
    step: Omit<AnalysisStep, 'id' | 'timestamp'>
  ): Promise<void> {
    const newStep: AnalysisStep = {
      ...step,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    }
    session.steps.push(newStep)
    this.io.emit('session:update', session)
  }

  private async updateStepStatus(
    session: AnalysisSession,
    stepIndex: number,
    status: AnalysisStep['status'],
    data?: Record<string, unknown>
  ): Promise<void> {
    if (session.steps[stepIndex]) {
      session.steps[stepIndex].status = status
      if (data) {
        session.steps[stepIndex].data = data
      }
      this.io.emit('session:update', session)
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  getMarkets(): Market[] {
    return this.markets
  }

  getHistory(): AnalysisSession[] {
    return this.history
  }

  private recordHistory(session: AnalysisSession): void {
    // Store a shallow clone to avoid later mutations
    const snapshot = JSON.parse(JSON.stringify(session)) as AnalysisSession
    this.history.unshift(snapshot)
    // Keep last MAX_HISTORY_SIZE sessions
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.length = this.MAX_HISTORY_SIZE
    }
    this.io.emit('sessions:history', this.history)
    this.io.emit('sessions:analytics', this.calculateAnalytics())
  }

  getFilteredHistory(filter: import('../types.js').HistoryFilter): AnalysisSession[] {
    let filtered = [...this.history]

    // Filter by status
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(s => filter.status!.includes(s.status))
    }

    // Filter by date range
    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start)
      const end = new Date(filter.dateRange.end)
      filtered = filtered.filter(s => {
        const sessionDate = new Date(s.startTime)
        return sessionDate >= start && sessionDate <= end
      })
    }

    // Filter by market category
    if (filter.marketCategory && filter.marketCategory.length > 0) {
      filtered = filtered.filter(s =>
        s.marketImpacts.some(impact =>
          filter.marketCategory!.includes(impact.market.category)
        )
      )
    }

    // Filter by author
    if (filter.author) {
      const authorLower = filter.author.toLowerCase()
      filtered = filtered.filter(s =>
        s.tweet.author.username.toLowerCase().includes(authorLower) ||
        s.tweet.author.name.toLowerCase().includes(authorLower)
      )
    }

    // Filter by tweet text
    if (filter.tweetText) {
      const textLower = filter.tweetText.toLowerCase()
      filtered = filtered.filter(s =>
        s.tweet.text.toLowerCase().includes(textLower)
      )
    }

    // Filter by trade count
    if (filter.minTrades !== undefined) {
      filtered = filtered.filter(s => s.trades.length >= filter.minTrades!)
    }
    if (filter.maxTrades !== undefined) {
      filtered = filtered.filter(s => s.trades.length <= filter.maxTrades!)
    }

    // Filter by confidence
    if (filter.minConfidence !== undefined) {
      filtered = filtered.filter(s =>
        s.marketImpacts.some(impact => impact.confidence >= (filter.minConfidence! / 100))
      )
    }

    return filtered
  }

  calculateAnalytics(): import('../types.js').SessionAnalytics {
    const completedSessions = this.history.filter(s => s.status === 'complete')
    const erroredSessions = this.history.filter(s => s.status === 'error')
    const activeSessions = this.history.filter(s => s.status === 'active')

    const allTrades = this.history.flatMap(s => s.trades)
    const successfulTrades = allTrades.filter(t => t.status === 'confirmed')
    const failedTrades = allTrades.filter(t => t.status === 'failed')

    const totalVolume = successfulTrades.reduce((sum, t) => sum + t.amount, 0)

    // Calculate average confidence
    const allImpacts = this.history.flatMap(s => s.marketImpacts)
    const averageConfidence = allImpacts.length > 0
      ? allImpacts.reduce((sum, i) => sum + i.confidence, 0) / allImpacts.length
      : 0

    // Market category breakdown
    const categoryMap = new Map<string, number>()
    this.history.forEach(session => {
      session.marketImpacts.forEach(impact => {
        const category = impact.market.category
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
      })
    })

    // Top authors
    const authorMap = new Map<string, number>()
    this.history.forEach(session => {
      const author = session.tweet.author.username
      authorMap.set(author, (authorMap.get(author) || 0) + 1)
    })
    const topAuthors = Array.from(authorMap.entries())
      .map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Sentiment distribution
    const sentiments = this.history.flatMap(s => s.marketImpacts.map(i => i.sentiment))
    const sentimentDistribution = {
      POSITIVE: sentiments.filter(s => s === 'POSITIVE').length,
      NEGATIVE: sentiments.filter(s => s === 'NEGATIVE').length,
      NEUTRAL: sentiments.filter(s => s === 'NEUTRAL').length,
    }

    // Time series data (last 30 days, grouped by day)
    const now = new Date()
    const timeSeriesData: import('../types.js').SessionAnalytics['timeSeriesData'] = []

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      date.setHours(0, 0, 0, 0)

      const nextDate = new Date(date)
      nextDate.setDate(nextDate.getDate() + 1)

      const daySessions = this.history.filter(s => {
        const sessionDate = new Date(s.startTime)
        return sessionDate >= date && sessionDate < nextDate
      })

      const dayTrades = daySessions.flatMap(s => s.trades)
      const dayVolume = dayTrades
        .filter(t => t.status === 'confirmed')
        .reduce((sum, t) => sum + t.amount, 0)

      timeSeriesData.push({
        date: date.toISOString().split('T')[0],
        sessions: daySessions.length,
        trades: dayTrades.length,
        volume: dayVolume,
      })
    }

    return {
      totalSessions: this.history.length,
      completedSessions: completedSessions.length,
      erroredSessions: erroredSessions.length,
      activeSessions: activeSessions.length,

      totalTrades: allTrades.length,
      successfulTrades: successfulTrades.length,
      failedTrades: failedTrades.length,
      successRate: allTrades.length > 0
        ? (successfulTrades.length / allTrades.length) * 100
        : 0,

      totalVolume,
      averageTradesPerSession: this.history.length > 0
        ? allTrades.length / this.history.length
        : 0,
      averageImpactsPerSession: this.history.length > 0
        ? this.history.reduce((sum, s) => sum + s.marketImpacts.length, 0) / this.history.length
        : 0,
      averageConfidence: averageConfidence * 100, // Convert to percentage

      marketCategoryBreakdown: Object.fromEntries(categoryMap),
      topAuthors,
      sentimentDistribution,
      timeSeriesData,
    }
  }
}
