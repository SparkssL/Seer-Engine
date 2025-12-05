'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Terminal, Activity, Brain, Zap, Shield, 
  Search, CheckCircle2, AlertCircle, Lock, 
  ArrowRight, TrendingUp, TrendingDown, Minus
} from 'lucide-react'
import type { AnalysisSession, MarketImpact } from '@/lib/types'
import { cn } from '@/lib/utils'

interface CentralLensProps {
  session: AnalysisSession | null
}

// A mystical card that reveals the AI's "thought" at each stage
function ThoughtBlock({ 
  title, 
  icon: Icon, 
  children, 
  status = 'idle',
  delay = 0
}: { 
  title: string
  icon: any
  children: React.ReactNode
  status?: 'idle' | 'active' | 'complete' | 'error'
  delay?: number
}) {
  if (status === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn(
        "relative overflow-hidden rounded-xl border p-6 backdrop-blur-md transition-colors duration-500",
        status === 'active' ? "border-accent/40 bg-accent/5" : "border-white/5 bg-surface/40"
      )}
    >
      {status === 'active' && (
        <motion.div 
          className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent"
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
      )}
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center border",
            status === 'active' ? "border-accent text-accent" : "border-white/10 text-cloud"
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className={cn(
            "font-display text-sm tracking-widest uppercase",
            status === 'active' ? "text-accent" : "text-sand"
          )}>
            {title}
          </h3>
        </div>
        <div className="font-mono text-sm text-cloud/80 leading-relaxed">
          {children}
        </div>
      </div>
    </motion.div>
  )
}

// Visualizer for the trade decision
function TradeSeal({ impact }: { impact: MarketImpact }) {
  const decision = impact.tradeDecision
  if (decision.action === 'HOLD') return null

  return (
    <motion.div
      initial={{ scale: 0, rotate: -45 }}
      animate={{ scale: 1, rotate: 0 }}
      className="relative aspect-square w-full max-w-[200px] mx-auto border-2 border-accent rounded-full flex items-center justify-center bg-surface/90 backdrop-blur-xl shadow-[0_0_50px_rgba(212,175,55,0.2)]"
    >
      <div className="absolute inset-2 border border-accent/30 rounded-full border-dashed animate-spin-slow" />
      <div className="text-center">
        <div className="text-xs font-mono text-accent/70 uppercase tracking-widest mb-1">EXECUTE</div>
        <div className={cn(
          "font-display text-3xl font-bold mb-1",
          decision.action === 'BUY' ? "text-green-400" : "text-red-400"
        )}>
          {decision.action}
        </div>
        <div className="font-mono text-lg text-sand">
          {decision.side}
        </div>
        <div className="mt-2 text-[10px] font-mono text-cloud">
          ${decision.sizeUsdc} USDC
        </div>
      </div>
    </motion.div>
  )
}

export function CentralLens({ session }: CentralLensProps) {
  if (!session) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-12">
        <motion.div 
          className="relative w-32 h-32 mb-8"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 4, repeat: Infinity }}
        >
          <div className="absolute inset-0 rounded-full border border-accent/20" />
          <div className="absolute inset-4 rounded-full border border-accent/40 border-dashed animate-spin-slow" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Search className="w-8 h-8 text-accent/50" />
          </div>
        </motion.div>
        <h2 className="font-display text-2xl text-sand mb-2">The Eye is Open</h2>
        <p className="text-cloud font-mono text-sm max-w-md">
          Scanning the stream for high-probability events. Waiting for signal...
        </p>
      </div>
    )
  }

  // Determine pipeline stage
  const hasTweet = !!session.tweet
  const hasFilter = !!session.filterResult
  const hasImpact = session.marketImpacts.length > 0
  const hasTrade = session.trades.length > 0

  return (
    <div className="h-full overflow-y-auto p-8 scrollbar-hide">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* 1. The Source Event */}
        <ThoughtBlock 
          title="Ingestion" 
          icon={Terminal} 
          status={hasTweet ? 'complete' : 'active'}
        >
          <div className="flex gap-4">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-lg font-bold text-sand">
                {session.tweet.author.name[0]}
             </div>
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <span className="text-sand font-bold">{session.tweet.author.name}</span>
                   <span className="text-cloud text-xs">@{session.tweet.author.username}</span>
                </div>
                <p className="text-sand/90 text-lg leading-snug">"{session.tweet.text}"</p>
             </div>
          </div>
        </ThoughtBlock>

        <div className="flex justify-center">
           <ArrowRight className="w-5 h-5 text-white/10 rotate-90" />
        </div>

        {/* 2. The Filter (Gatekeeper) */}
        <ThoughtBlock 
           title="Relevance Filter" 
           icon={Shield}
           status={hasFilter ? 'complete' : 'active'}
        >
           {session.filterResult ? (
              <div className="flex items-start justify-between gap-6">
                 <div className="flex-1">
                    <p className="mb-3">{session.filterResult.reasoning_summary}</p>
                    <div className="flex gap-2">
                       {session.filterResult.relevant_market_ids.map(id => (
                          <span key={id} className="px-2 py-1 rounded bg-accent/10 text-accent text-[10px] font-mono border border-accent/20">
                             MARKET #{id.slice(0,4)}
                          </span>
                       ))}
                    </div>
                 </div>
                 <div className={cn(
                    "px-3 py-1 rounded border font-mono text-xs uppercase",
                    session.filterResult.is_relevant 
                       ? "bg-green-500/10 border-green-500/30 text-green-400" 
                       : "bg-red-500/10 border-red-500/30 text-red-400"
                 )}>
                    {session.filterResult.is_relevant ? "RELEVANT" : "DISMISSED"}
                 </div>
              </div>
           ) : (
              <div className="flex items-center gap-2 text-accent animate-pulse">
                 <Activity className="w-4 h-4" />
                 <span>Analyzing market correlation...</span>
              </div>
           )}
        </ThoughtBlock>

        {hasFilter && session.filterResult?.is_relevant && (
           <>
              <div className="flex justify-center">
                 <ArrowRight className="w-5 h-5 text-white/10 rotate-90" />
              </div>

              {/* 3. The Oracle (Impact Analysis) */}
              <ThoughtBlock 
                 title="Oracle Insight" 
                 icon={Brain}
                 status={hasImpact ? 'complete' : 'active'}
              >
                 {hasImpact ? (
                    <div className="space-y-4">
                       {session.marketImpacts.map(impact => (
                          <div key={impact.marketId} className="bg-black/20 rounded-lg p-4 border border-white/5">
                             {/* Market Header */}
                             <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sand font-medium text-sm flex-1">{impact.market.question}</h4>
                                <span className={cn(
                                   "px-2 py-0.5 rounded text-[10px] font-mono uppercase",
                                   impact.sentiment === 'POSITIVE' ? "bg-green-500/20 text-green-400" :
                                   impact.sentiment === 'NEGATIVE' ? "bg-red-500/20 text-red-400" :
                                   "bg-gray-500/20 text-gray-400"
                                )}>
                                   {impact.sentiment}
                                </span>
                             </div>

                             {/* Market Details Grid */}
                             <div className="grid grid-cols-4 gap-2 mb-4 p-2 rounded bg-black/30 border border-white/5">
                                <div className="text-center">
                                   <div className="text-[9px] font-mono text-cloud uppercase">Category</div>
                                   <div className="text-xs text-sand font-medium">{impact.market.category}</div>
                                </div>
                                <div className="text-center">
                                   <div className="text-[9px] font-mono text-cloud uppercase">YES Price</div>
                                   <div className="text-xs text-green-400 font-mono">
                                      {((impact.market.outcomes?.[0]?.probability || 0.5) * 100).toFixed(1)}%
                                   </div>
                                </div>
                                <div className="text-center">
                                   <div className="text-[9px] font-mono text-cloud uppercase">Volume</div>
                                   <div className="text-xs text-sand font-mono">${(impact.market.volume / 1000).toFixed(1)}k</div>
                                </div>
                                <div className="text-center">
                                   <div className="text-[9px] font-mono text-cloud uppercase">End Date</div>
                                   <div className="text-xs text-sand font-mono">
                                      {impact.market.endDate ? new Date(impact.market.endDate).toLocaleDateString() : 'N/A'}
                                   </div>
                                </div>
                             </div>

                             {/* LLM Analysis Scores */}
                             <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-mono text-cloud uppercase w-16">Impact</span>
                                   <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                      <div
                                         className="h-full bg-accent transition-all"
                                         style={{ width: `${impact.impactScore * 100}%` }}
                                      />
                                   </div>
                                   <span className="text-xs font-mono text-accent">{(impact.impactScore * 100).toFixed(0)}%</span>
                                </div>
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-mono text-cloud uppercase w-16">Confidence</span>
                                   <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                      <div
                                         className="h-full bg-blue-400 transition-all"
                                         style={{ width: `${impact.confidence * 100}%` }}
                                      />
                                   </div>
                                   <span className="text-xs font-mono text-blue-400">{(impact.confidence * 100).toFixed(0)}%</span>
                                </div>
                             </div>

                             {/* LLM Reasoning Steps */}
                             {impact.reasoningSteps && impact.reasoningSteps.length > 0 && (
                                <div className="mb-4 bg-black/30 rounded-lg p-3 border border-white/5">
                                   <div className="text-[10px] font-mono text-accent uppercase tracking-wider mb-2">
                                      LLM Reasoning Chain
                                   </div>
                                   <div className="space-y-2">
                                      {impact.reasoningSteps.map((step, idx) => (
                                         <div key={idx} className="flex gap-2">
                                            <span className="text-accent font-mono text-xs shrink-0">{idx + 1}.</span>
                                            <p className="text-xs text-cloud/90 leading-relaxed">{step}</p>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             )}

                             {/* LLM Final Reasoning Summary */}
                             <p className="text-xs text-cloud mb-4 border-l-2 border-accent/30 pl-3 italic">
                                {impact.reasoning}
                             </p>

                             {/* LLM Trade Decision */}
                             <div className="bg-black/40 rounded-lg p-3 border border-white/10">
                                <div className="text-[10px] font-mono text-accent uppercase tracking-wider mb-2">
                                   LLM Trade Decision
                                </div>
                                <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-4">
                                      <div className={cn(
                                         "px-3 py-1 rounded font-mono text-sm font-bold",
                                         impact.tradeDecision.action === 'BUY' ? "bg-green-500/20 text-green-400" :
                                         impact.tradeDecision.action === 'SELL' ? "bg-red-500/20 text-red-400" :
                                         "bg-gray-500/20 text-gray-400"
                                      )}>
                                         {impact.tradeDecision.action}
                                      </div>
                                      {impact.tradeDecision.side && (
                                         <div className="text-sand font-mono">
                                            Side: <span className="text-accent">{impact.tradeDecision.side}</span>
                                         </div>
                                      )}
                                   </div>
                                   <div className="text-right">
                                      <div className="text-[10px] text-cloud">Suggested Price</div>
                                      <div className="text-lg font-mono text-accent">
                                         {(impact.tradeDecision.suggestedPrice * 100).toFixed(1)}¢
                                      </div>
                                   </div>
                                </div>
                             </div>

                             {/* Trade Seal for visual effect */}
                             {impact.tradeDecision.action !== 'HOLD' && (
                                <div className="flex justify-center mt-6">
                                   <TradeSeal impact={impact} />
                                </div>
                             )}
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="flex items-center gap-2 text-accent animate-pulse">
                       <Brain className="w-4 h-4" />
                       <span>Calculating probability vectors...</span>
                    </div>
                 )}
              </ThoughtBlock>
           </>
        )}

        {/* 4. Execution Receipt */}
        {hasTrade && (
           <>
              <div className="flex justify-center">
                 <ArrowRight className="w-5 h-5 text-white/10 rotate-90" />
              </div>

              <ThoughtBlock
                 title="Order Execution"
                 icon={Zap}
                 status="complete"
              >
                 <div className="space-y-3">
                    {session.trades.map(trade => {
                       const relatedMarket = session.marketImpacts.find(i => i.marketId === trade.marketId)?.market
                       return (
                          <div key={trade.id} className="bg-black/30 rounded-lg p-4 border border-white/10">
                             {/* Order Status Header */}
                             <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                   <span className={cn(
                                      "w-2 h-2 rounded-full",
                                      trade.status === 'confirmed' ? "bg-green-400" :
                                      trade.status === 'failed' ? "bg-red-400" :
                                      "bg-yellow-400 animate-pulse"
                                   )} />
                                   <span className={cn(
                                      "text-xs font-mono uppercase",
                                      trade.status === 'confirmed' ? "text-green-400" :
                                      trade.status === 'failed' ? "text-red-400" :
                                      "text-yellow-400"
                                   )}>
                                      {trade.status === 'confirmed' ? 'ORDER FILLED' :
                                       trade.status === 'failed' ? 'ORDER FAILED' :
                                       'PENDING...'}
                                   </span>
                                </div>
                                <span className="text-[10px] font-mono text-cloud">
                                   {new Date(trade.timestamp).toLocaleTimeString()}
                                </span>
                             </div>

                             {/* Market Info */}
                             {relatedMarket && (
                                <div className="mb-3 pb-3 border-b border-white/5">
                                   <div className="text-[10px] font-mono text-cloud uppercase mb-1">Market</div>
                                   <div className="text-sm text-sand">{relatedMarket.question}</div>
                                </div>
                             )}

                             {/* Order Details Grid */}
                             <div className="grid grid-cols-4 gap-3">
                                <div>
                                   <div className="text-[9px] font-mono text-cloud uppercase">Side</div>
                                   <div className={cn(
                                      "text-sm font-mono font-bold",
                                      trade.side === 'YES' || trade.side === 'UP' ? "text-green-400" : "text-red-400"
                                   )}>
                                      {trade.side}
                                   </div>
                                </div>
                                <div>
                                   <div className="text-[9px] font-mono text-cloud uppercase">Amount</div>
                                   <div className="text-sm font-mono text-sand">${trade.amount.toFixed(2)}</div>
                                </div>
                                <div>
                                   <div className="text-[9px] font-mono text-cloud uppercase">Price</div>
                                   <div className="text-sm font-mono text-accent">{(trade.price * 100).toFixed(1)}¢</div>
                                </div>
                                <div>
                                   <div className="text-[9px] font-mono text-cloud uppercase">Market ID</div>
                                   <div className="text-sm font-mono text-cloud">#{trade.marketId}</div>
                                </div>
                             </div>

                             {/* TX Hash */}
                             {trade.txHash && (
                                <div className="mt-3 pt-3 border-t border-white/5">
                                   <div className="text-[9px] font-mono text-cloud uppercase mb-1">Transaction Hash</div>
                                   <div className="text-xs font-mono text-accent/80 break-all">
                                      {trade.txHash}
                                   </div>
                                </div>
                             )}

                             {/* Failed Order Message */}
                             {trade.status === 'failed' && (
                                <div className="mt-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                                   <div className="text-xs text-red-400">
                                      {trade.error || "Order execution failed. Check wallet balance or API configuration."}
                                   </div>
                                </div>
                             )}
                          </div>
                       )
                    })}
                 </div>
              </ThoughtBlock>
           </>
        )}
      </div>
    </div>
  )
}


