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
                             <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sand font-medium text-sm">{impact.market.question}</h4>
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-mono text-cloud">CONFIDENCE</span>
                                   <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                      <div 
                                         className="h-full bg-accent" 
                                         style={{ width: `${impact.impactScore * 100}%` }} 
                                      />
                                   </div>
                                </div>
                             </div>
                             
                             <p className="text-xs text-cloud mb-4 border-l-2 border-accent/30 pl-3 italic">
                                {impact.reasoning}
                             </p>

                             {/* Trade Seal */}
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
           <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center pt-8 pb-12"
           >
              <div className="flex items-center gap-2 text-green-400 font-mono text-xs uppercase tracking-widest">
                 <Zap className="w-4 h-4" />
                 Transaction Confirmed On-Chain
              </div>
           </motion.div>
        )}
      </div>
    </div>
  )
}


