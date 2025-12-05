import OpenAI from 'openai'
import type { 
  Tweet, 
  Market, 
  GPTMarketFilterResponse, 
  GPTMarketAnalysisResponse 
} from '../types.js'

/**
 * OpenAI Service - Two-Stage LLM Analysis
 * 
 * Stage A (Filtering): Quick scan to find 3-5 relevant markets from hundreds
 * Stage B (Analysis): Deep analysis for each market with trading decision
 * 
 * All outputs are strict JSON format for reliable parsing
 */
export class OpenAIService {
  private client: OpenAI
  private model = 'gpt-4-turbo-preview'

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey })
  }

  /**
   * Stage A: Market Filtering (Cheap, Fast)
   * 
   * Purpose: From hundreds of active markets, quickly find 3-5 that may be impacted
   * Role: Filter
   * 
   * Input: Tweet content + brief list of all markets (ID, question, tags)
   * Output: { is_relevant, relevant_market_ids[], reasoning_summary }
   */
  async filterRelevantMarkets(
    tweet: Tweet,
    markets: Market[]
  ): Promise<GPTMarketFilterResponse> {
    // Create a compact market list for efficient token usage
    const marketsSummary = markets.map(m => ({
      id: m.id,
      question: m.question,
      category: m.category,
    }))

    const systemPrompt = `You are a market relevance filter for a prediction market trading system.

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
}`

    const userPrompt = `Tweet from @${tweet.author.username}${tweet.author.verified ? ' ✓' : ''}:
"${tweet.text}"

Posted: ${tweet.timestamp}
Engagement: ${tweet.metrics?.likes || 0} likes, ${tweet.metrics?.retweets || 0} RTs

Available Markets (${markets.length} total):
${JSON.stringify(marketsSummary, null, 2)}

Analyze and return relevant market IDs.`

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for consistent filtering
        max_tokens: 500,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return { is_relevant: false, relevant_market_ids: [], reasoning_summary: 'No response from LLM' }
      }

      const parsed = JSON.parse(content) as GPTMarketFilterResponse
      
      console.log(`[OpenAI] Filter: ${parsed.is_relevant ? `Found ${parsed.relevant_market_ids.length} relevant markets` : 'No relevant markets'}`)
      return parsed
    } catch (error) {
      console.error('[OpenAI] Filter stage failed:', error)
      return { is_relevant: false, relevant_market_ids: [], reasoning_summary: 'Analysis failed' }
    }
  }

  /**
   * Stage B: Impact Analysis & Decision (Expensive, Detailed)
   * 
   * Purpose: Deep analysis of tweet impact on a SPECIFIC market
   * Role: Professional Trader
   * 
   * Input: Tweet content + detailed market info (current probability, question, end date)
   * Output: { market_id, sentiment, impact_score, trade_decision, human_readable_reason }
   */
  async analyzeMarketImpact(
    tweet: Tweet,
    market: Market
  ): Promise<GPTMarketAnalysisResponse> {
    const currentYesPrice = market.outcomes.find(o => o.name.toLowerCase() === 'yes')?.probability || 0.5

    const systemPrompt = `You are an expert prediction market trader. Your task is to analyze how a specific news event impacts a prediction market and provide a trading decision WITH A CONFIDENCE SCORE.

Analysis Framework:
1. CREDIBILITY: Is the source reliable? (verified account, major news outlet)
2. DIRECTNESS: How directly does this news affect the market question?
3. MAGNITUDE: How significant is the impact? Minor update vs game-changer?
4. TIMING: Is this new information or already priced in?
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
    "suggested_price": number (0.01 to 0.99),
    "size_usdc": number (1 to 100)
  },
  "human_readable_reason": "Clear explanation in natural language"
}

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

Only suggest trades when:
- confidence > 0.7 AND impact_score > 0.6
- There's a clear edge (current price vs fair value gap > 10%)
- Source is credible

Reasoning should be concise, 3 steps: (1) signal/content, (2) impact direction & magnitude, (3) trade and sizing rationale`

    const userPrompt = `Tweet from @${tweet.author.username}${tweet.author.verified ? ' ✓' : ''}:
"${tweet.text}"

Market Details:
- ID: ${market.id}
- Question: ${market.question}
- Category: ${market.category}
- Current YES price: ${(currentYesPrice * 100).toFixed(1)}%
- Current NO price: ${((1 - currentYesPrice) * 100).toFixed(1)}%
- 24h Change: ${market.outcomes[0]?.change24h > 0 ? '+' : ''}${market.outcomes[0]?.change24h?.toFixed(1)}%
- Volume: $${market.volume.toLocaleString()}
- End Date: ${market.endDate}

Analyze the impact and provide your trading decision.`

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3, // Slightly higher for nuanced analysis
        max_tokens: 600,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return this.getDefaultAnalysis(market.id)
      }

      const parsed = JSON.parse(content) as GPTMarketAnalysisResponse
      
      console.log(`[OpenAI] Analysis: Market ${market.id} - ${parsed.sentiment}, impact=${parsed.impact_score}, action=${parsed.trade_decision.action}`)
      return parsed
    } catch (error) {
      console.error('[OpenAI] Analysis stage failed:', error)
      return this.getDefaultAnalysis(market.id)
    }
  }

  private getDefaultAnalysis(marketId: string): GPTMarketAnalysisResponse {
    return {
      market_id: marketId,
      sentiment: 'NEUTRAL',
      impact_score: 0,
      confidence: 0,
      trade_decision: {
        action: 'HOLD',
        side: null,
        suggested_price: 0.5,
        size_usdc: 0,
      },
      human_readable_reason: 'Analysis could not be completed',
    }
  }

  /**
   * Combined Two-Stage Analysis Pipeline
   * 
   * 1. Filter (cheap) - Find 3-5 relevant markets
   * 2. Analyze (expensive) - Deep dive each relevant market
   */
  async analyzeEvent(
    tweet: Tweet,
    markets: Market[]
  ): Promise<{
    filterResult: GPTMarketFilterResponse
    analyses: Array<{
      market: Market
      analysis: GPTMarketAnalysisResponse
    }>
  }> {
    console.log(`[OpenAI] Starting two-stage analysis for tweet from @${tweet.author.username}`)

    // Stage A: Filter relevant markets
    const filterResult = await this.filterRelevantMarkets(tweet, markets)
    
    if (!filterResult.is_relevant || filterResult.relevant_market_ids.length === 0) {
      return { filterResult, analyses: [] }
    }

    // Stage B: Analyze each relevant market (limit to 5 max)
    const relevantMarkets = filterResult.relevant_market_ids
      .slice(0, 5)
      .map(id => markets.find(m => m.id === id))
      .filter((m): m is Market => m !== undefined)

    const analyses = await Promise.all(
      relevantMarkets.map(async (market) => {
        const analysis = await this.analyzeMarketImpact(tweet, market)
        return { market, analysis }
      })
    )

    console.log(`[OpenAI] Completed analysis: ${analyses.length} markets processed`)
    return { filterResult, analyses }
  }
}
