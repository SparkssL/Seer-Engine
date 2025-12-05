from pydantic import BaseModel, Field, AliasChoices
from typing import Optional, Literal, List
from datetime import datetime

# ========== Tweet Models ==========

class TweetAuthor(BaseModel):
    name: str
    username: str
    avatar: Optional[str] = None
    verified: Optional[bool] = False

class TweetMetrics(BaseModel):
    likes: int = 0
    retweets: int = 0
    replies: int = 0

class Tweet(BaseModel):
    id: str
    text: str
    author: TweetAuthor
    timestamp: str  # ISO 8601
    metrics: Optional[TweetMetrics] = None

# ========== Market Models ==========

class Outcome(BaseModel):
    id: str
    name: str
    probability: float = Field(ge=0, le=1)
    change24h: float = 0
    tokenId: Optional[str] = None  # Token ID for this outcome (needed for trading)

class Market(BaseModel):
    id: str
    question: str
    category: str = "General"
    volume: float = 0
    liquidity: float = 0
    outcomes: List[Outcome]
    endDate: str
    status: Literal["active", "resolved", "pending"]
    yesTokenId: Optional[str] = None  # Token ID for YES/primary outcome
    noTokenId: Optional[str] = None   # Token ID for NO/secondary outcome
    yesLabel: str = "YES"  # Label for primary outcome (e.g., "UP", "YES")
    noLabel: str = "NO"    # Label for secondary outcome (e.g., "DOWN", "NO")

# ========== Trading Models ==========

class TradeDecision(BaseModel):
    action: Literal["BUY", "SELL", "HOLD"]
    side: Optional[str] = None  # Accepts any outcome label (YES/NO, UP/DOWN, etc.)
    # Accept multiple field name variations from OpenAI (price, suggested_price, suggestedPrice)
    suggestedPrice: float = Field(
        ge=0.01,
        le=0.99,
        validation_alias=AliasChoices("suggested_price", "price", "suggestedPrice")
    )
    sizeUsdc: float = Field(
        default=5.0,
        validation_alias=AliasChoices("size_usdc", "sizeUsdc")
    )

    model_config = {
        "populate_by_name": True,  # Allow both camelCase and snake_case
        "extra": "ignore"  # Ignore extra fields from API
    }

class MarketImpact(BaseModel):
    marketId: str
    market: Market
    relevanceScore: float
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    impactScore: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    reasoning: str
    reasoningSteps: Optional[List[str]] = None  # Step-by-step LLM reasoning
    tradeDecision: TradeDecision

class TradeExecution(BaseModel):
    id: str
    marketId: str
    side: str  # Accepts any outcome label (YES/NO, UP/DOWN, etc.)
    amount: float
    price: float
    status: Literal["pending", "confirmed", "failed"]
    error: Optional[str] = None
    txHash: Optional[str] = None
    timestamp: str

# ========== Analysis Session Models ==========

class AnalysisStep(BaseModel):
    id: str
    type: Literal["listening", "receiving", "filtering", "analyzing", "deciding", "executing", "complete"]
    title: str
    description: str
    status: Literal["pending", "processing", "complete", "error"]
    data: Optional[dict] = None
    timestamp: str

class AnalysisSession(BaseModel):
    id: str
    tweet: Tweet
    steps: List[AnalysisStep]
    filterResult: Optional[dict] = None  # GPTMarketFilterResponse
    marketImpacts: List[MarketImpact] = []
    trades: List[TradeExecution] = []
    status: Literal["active", "complete", "error"]
    startTime: str
    endTime: Optional[str] = None

# ========== LLM Response Schemas ==========

class GPTMarketFilterResponse(BaseModel):
    is_relevant: bool
    relevant_market_ids: List[str]
    reasoning_summary: str

class GPTMarketAnalysisResponse(BaseModel):
    market_id: str
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    impact_score: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    reasoning_steps: Optional[List[str]] = None
    trade_decision: TradeDecision
    human_readable_reason: str

class GPTMarketSelectionResponse(BaseModel):
    selected_market_id: str
    selection_reasoning: str
    comparative_analysis: str
    confidence_in_selection: float = Field(ge=0, le=1)

# ========== History & Analytics Models ==========

class HistoryFilter(BaseModel):
    status: Optional[List[Literal["active", "complete", "error"]]] = None
    dateRange: Optional[dict] = None
    marketCategory: Optional[List[str]] = None
    author: Optional[str] = None
    tweetText: Optional[str] = None
    minTrades: Optional[int] = None
    maxTrades: Optional[int] = None
    minConfidence: Optional[float] = None

class SessionAnalytics(BaseModel):
    totalSessions: int
    completedSessions: int
    erroredSessions: int
    activeSessions: int
    totalTrades: int
    successfulTrades: int
    failedTrades: int
    successRate: float
    totalVolume: float
    averageTradesPerSession: float
    averageImpactsPerSession: float
    averageConfidence: float
    marketCategoryBreakdown: dict
    topAuthors: List[dict]
    sentimentDistribution: dict
    timeSeriesData: List[dict]

# ========== Source Configuration Models ==========

class Source(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    enabled: bool
    accounts: Optional[List[str]] = None
