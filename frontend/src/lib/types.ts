export interface Source {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  accounts?: string[]
}

export interface Tweet {
  id: string
  text: string
  author: {
    name: string
    username: string
    avatar?: string
    verified?: boolean
  }
  timestamp: string
  metrics?: {
    likes: number
    retweets: number
    replies: number
  }
}

export interface Market {
  id: string
  question: string
  category: string
  volume: number
  liquidity: number
  outcomes: Outcome[]
  endDate: string
  status: 'active' | 'resolved' | 'pending'
}

export interface Outcome {
  id: string
  name: string
  probability: number
  change24h: number
}

export interface AnalysisStep {
  id: string
  type: 'listening' | 'receiving' | 'filtering' | 'analyzing' | 'deciding' | 'executing' | 'complete'
  title: string
  description: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  data?: Record<string, unknown>
  timestamp: string
}

// Updated MarketImpact to match new backend format
export interface MarketImpact {
  marketId: string
  market: Market
  relevanceScore: number
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  impactScore: number
  confidence: number
  reasoning: string
  reasoningSteps?: string[]  // Step-by-step LLM reasoning
  tradeDecision: {
    action: 'BUY' | 'SELL' | 'HOLD'
    side: 'YES' | 'NO' | null
    suggestedPrice: number
    sizeUsdc: number
  }
}

export interface TradeExecution {
  id: string
  marketId: string
  side: 'YES' | 'NO'
  amount: number
  price: number
  status: 'pending' | 'confirmed' | 'failed'
  error?: string
  txHash?: string
  timestamp: string
}

// LLM Filter Result
export interface GPTMarketFilterResponse {
  is_relevant: boolean
  relevant_market_ids: string[]
  reasoning_summary: string
}

export interface AnalysisSession {
  id: string
  tweet: Tweet
  steps: AnalysisStep[]
  filterResult?: GPTMarketFilterResponse
  marketImpacts: MarketImpact[]
  trades: TradeExecution[]
  status: 'active' | 'complete' | 'error'
  startTime: string
  endTime?: string
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// UI State Machine
export type UIState = 'idle' | 'listening' | 'filtering' | 'analyzing' | 'executing' | 'complete'

// History Filter Criteria
export interface HistoryFilter {
  status?: ('active' | 'complete' | 'error')[]
  dateRange?: {
    start: string
    end: string
  }
  marketCategory?: string[]
  author?: string
  tweetText?: string
  minTrades?: number
  maxTrades?: number
  minConfidence?: number
}

// Analytics Aggregated Metrics
export interface SessionAnalytics {
  totalSessions: number
  completedSessions: number
  erroredSessions: number
  activeSessions: number
  totalTrades: number
  successfulTrades: number
  failedTrades: number
  successRate: number
  totalVolume: number
  averageTradesPerSession: number
  averageImpactsPerSession: number
  averageConfidence: number
  marketCategoryBreakdown: Record<string, number>
  topAuthors: Array<{ author: string; count: number }>
  sentimentDistribution: {
    POSITIVE: number
    NEGATIVE: number
    NEUTRAL: number
  }
  timeSeriesData: Array<{
    date: string
    sessions: number
    trades: number
    volume: number
  }>
}
