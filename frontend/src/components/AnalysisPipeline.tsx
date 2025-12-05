'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio, Filter, Brain, Target, Rocket, CheckCircle2,
  AlertCircle, Loader2, ArrowDown, Sparkles, Eye, Cpu,
  ExternalLink, Clock, Hash, Wallet
} from 'lucide-react'
import type { AnalysisStep, AnalysisSession, Market } from '@/lib/types'
import { cn } from '@/lib/utils'
import { RadarScanner } from './RadarScanner'
import { MarketScanner } from './MarketScanner'
import { useState, useEffect } from 'react'

interface AnalysisPipelineProps {
  session: AnalysisSession | null
  markets: Market[]
}

const stepIcons: Record<string, React.ReactNode> = {
  listening: <Radio className="w-5 h-5" />,
  receiving: <Eye className="w-5 h-5" />,
  filtering: <Filter className="w-5 h-5" />,
  analyzing: <Brain className="w-5 h-5" />,
  deciding: <Cpu className="w-5 h-5" />,
  executing: <Target className="w-5 h-5" />,
  complete: <CheckCircle2 className="w-5 h-5" />,
}

// Using DaVincii-inspired color palette
const stepColors: Record<string, string> = {
  listening: 'text-cloud',
  receiving: 'text-mystic-blue',
  filtering: 'text-mystic-blue',
  analyzing: 'text-accent', // Gold for AI thought
  deciding: 'text-accent',
  executing: 'text-green-400',
  complete: 'text-green-400',
}

function StepCard({ step, index, session, markets }: { 
  step: AnalysisStep
  index: number
  session: AnalysisSession
  markets: Market[]
}) {
  const isActive = step.status === 'processing'
  const isComplete = step.status === 'complete'
  const isError = step.status === 'error'
  const colorClass = stepColors[step.type] || 'text-accent'

  // Scan progress for filtering step
  const [scanProgress, setScanProgress] = useState(0)
  
  useEffect(() => {
    if (step.type === 'filtering' && isActive) {
      const interval = setInterval(() => {
        setScanProgress(prev => Math.min(prev + 2, 95))
      }, 50)
      return () => clearInterval(interval)
    }
    if (step.type === 'filtering' && isComplete) {
      setScanProgress(100)
    }
  }, [step.type, isActive, isComplete])

  return (
    <motion.div
      className={cn(
        "relative p-5 rounded-xl border transition-all duration-500 overflow-hidden group",
        isActive && "border-accent/30 bg-accent/5 shadow-[0_0_30px_rgba(212,175,55,0.05)]",
        isComplete && "border-white/10 bg-surface/30",
        isError && "border-red-500/30 bg-red-500/5",
        !isActive && !isComplete && !isError && "border-white/5 bg-surface/20 opacity-50"
      )}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {/* Connecting Line to next step */}
      <div className="absolute left-7 top-full h-6 w-px bg-white/5 -z-10" />

      <div className="flex items-start gap-4">
        {/* Icon Box */}
        <div className={cn(
          "relative z-10 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 border",
          isActive && "bg-accent/10 border-accent text-accent",
          isComplete && "bg-green-500/10 border-green-500/30 text-green-500",
          isError && "bg-red-500/10 border-red-500/30 text-red-500",
          !isActive && !isComplete && !isError && "bg-surface border-white/5 text-cloud"
        )}>
          {isActive ? (
             <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
               <Loader2 className="w-5 h-5" />
             </motion.div>
          ) : (
            stepIcons[step.type]
          )}
        </div>

        <div className="flex-1 pt-1">
           <div className="flex items-center justify-between mb-1">
             <h4 className={cn(
               "font-display font-medium text-sm tracking-wide",
               isActive ? "text-accent" : isComplete ? "text-sand" : "text-cloud"
             )}>
               {step.title.toUpperCase()}
             </h4>
             {isActive && (
               <span className="text-[10px] font-mono text-accent animate-pulse">PROCESSING...</span>
             )}
           </div>
           
           <p className="text-xs text-cloud/70 font-light leading-relaxed mb-3">
             {step.description}
           </p>

           {/* Rich Content Area based on Step Type */}
           
           {/* Filtering Visualization */}
           {step.type === 'filtering' && (isActive || isComplete) && (
             <div className="mt-3">
               <MarketScanner
                  markets={markets}
                  relevantMarketIds={session.filterResult?.relevant_market_ids || []}
                  isScanning={isActive}
                  scanProgress={scanProgress}
               />
             </div>
           )}

            {/* LLM Analysis Display (All Decisions with Full Reasoning) */}
            {step.type === 'analyzing' && isComplete && step.data && (step.data as any).llmDecisions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-accent">
                    <Brain className="w-3.5 h-3.5" />
                    <span className="uppercase tracking-widest text-[10px] font-bold">AI Market Analysis</span>
                  </div>
                  <span className="text-[10px] text-cloud/50 font-mono">
                    {((step.data as any).llmDecisions as any[]).length} markets analyzed
                  </span>
                </div>
                {((step.data as any).llmDecisions as any[]).map((decision: any, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "p-4 rounded-lg border space-y-3 transition-all",
                      decision.action === 'BUY' && "bg-green-500/5 border-green-500/20",
                      decision.action === 'SELL' && "bg-red-500/5 border-red-500/20",
                      decision.action === 'HOLD' && "bg-surface/50 border-white/10"
                    )}
                  >
                    {/* Market Question Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm text-sand font-medium leading-tight">{decision.marketQuestion}</p>
                        <p className="text-[10px] text-cloud/40 font-mono mt-1">Market #{decision.marketId}</p>
                      </div>
                      <span className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5",
                        decision.action === 'BUY' && "bg-green-500/20 text-green-400 border border-green-500/30",
                        decision.action === 'SELL' && "bg-red-500/20 text-red-400 border border-red-500/30",
                        decision.action === 'HOLD' && "bg-white/10 text-cloud/60 border border-white/10"
                      )}>
                        {decision.action === 'BUY' && <Rocket className="w-3 h-3" />}
                        {decision.action === 'SELL' && <Target className="w-3 h-3" />}
                        {decision.action} {decision.side}
                      </span>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="p-2 rounded bg-surface/50 border border-white/5 text-center">
                        <p className="text-[9px] text-cloud/50 uppercase mb-0.5">Sentiment</p>
                        <p className={cn(
                          "text-xs font-mono font-bold",
                          decision.sentiment === 'POSITIVE' && "text-green-400",
                          decision.sentiment === 'NEGATIVE' && "text-red-400",
                          decision.sentiment === 'NEUTRAL' && "text-cloud/70"
                        )}>
                          {decision.sentiment}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-surface/50 border border-white/5 text-center">
                        <p className="text-[9px] text-cloud/50 uppercase mb-0.5">Impact</p>
                        <p className="text-xs font-mono font-bold text-accent">
                          {(decision.impactScore * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="p-2 rounded bg-surface/50 border border-white/5 text-center">
                        <p className="text-[9px] text-cloud/50 uppercase mb-0.5">Confidence</p>
                        <p className="text-xs font-mono font-bold text-mystic-blue">
                          {(decision.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="p-2 rounded bg-surface/50 border border-white/5 text-center">
                        <p className="text-[9px] text-cloud/50 uppercase mb-0.5">Price</p>
                        <p className="text-xs font-mono font-bold text-sand">
                          ${decision.suggestedPrice?.toFixed(2) || '0.50'}
                        </p>
                      </div>
                    </div>

                    {/* AI Reasoning - The Main Focus */}
                    {decision.reasoning && (
                      <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sparkles className="w-3 h-3 text-accent" />
                          <span className="text-[10px] text-accent uppercase tracking-wider font-bold">AI Reasoning</span>
                        </div>
                        <p className="text-xs text-sand/90 leading-relaxed">
                          {decision.reasoning}
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Final Selection Display - Enhanced with Comparative Analysis */}
            {step.type === 'deciding' && isComplete && step.data && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 className="mt-3 p-5 rounded-xl bg-gradient-to-br from-accent/10 to-accent/5 border-2 border-accent/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]"
               >
                 {/* Header */}
                 <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center border border-accent/40">
                       <Target className="w-4 h-4 text-accent" />
                     </div>
                     <div>
                       <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold">AI Final Selection</span>
                       <p className="text-[9px] text-cloud/50 font-mono">
                         Selected from {(step.data as any).candidateCount || 1} candidates
                       </p>
                     </div>
                   </div>
                   {(step.data as any).selectionConfidence && (
                     <div className="text-right">
                       <p className="text-[9px] text-cloud/50 uppercase">Selection Confidence</p>
                       <p className="text-sm font-mono font-bold text-accent">
                         {((step.data as any).selectionConfidence * 100).toFixed(0)}%
                       </p>
                     </div>
                   )}
                 </div>

                 {/* Selected Market */}
                 <div className="p-4 rounded-lg bg-surface/40 border border-white/10 mb-4">
                   <p className="text-sm text-sand font-medium mb-2">{(step.data as any).selectedMarket}</p>
                   <div className="flex flex-wrap gap-2 text-[10px] font-mono text-cloud/50">
                     <span>Market #{(step.data as any).selectedMarketId}</span>
                     {(step.data as any).marketCategory && <span>• {(step.data as any).marketCategory}</span>}
                     {(step.data as any).marketVolume && (
                       <span>• Vol: ${((step.data as any).marketVolume / 1000000).toFixed(2)}M</span>
                     )}
                   </div>
                 </div>

                 {/* Trade Decision Grid */}
                 <div className="grid grid-cols-4 gap-2 mb-4">
                   <div className="p-2.5 rounded-lg bg-surface/50 border border-white/10 text-center">
                     <p className="text-[9px] text-cloud/50 uppercase mb-1">Action</p>
                     <p className={cn(
                       "text-sm font-mono font-bold",
                       (step.data as any).action === 'BUY' && "text-green-400",
                       (step.data as any).action === 'SELL' && "text-red-400"
                     )}>
                       {(step.data as any).action} {(step.data as any).side}
                     </p>
                   </div>
                   <div className="p-2.5 rounded-lg bg-surface/50 border border-white/10 text-center">
                     <p className="text-[9px] text-cloud/50 uppercase mb-1">Price</p>
                     <p className="text-sm font-mono font-bold text-sand">
                       ${((step.data as any).suggestedPrice || 0).toFixed(2)}
                     </p>
                   </div>
                   <div className="p-2.5 rounded-lg bg-surface/50 border border-white/10 text-center">
                     <p className="text-[9px] text-cloud/50 uppercase mb-1">Impact</p>
                     <p className="text-sm font-mono font-bold text-accent">
                       {((step.data as any).impactScore * 100).toFixed(0)}%
                     </p>
                   </div>
                   <div className="p-2.5 rounded-lg bg-surface/50 border border-white/10 text-center">
                     <p className="text-[9px] text-cloud/50 uppercase mb-1">Confidence</p>
                     <p className="text-sm font-mono font-bold text-mystic-blue">
                       {((step.data as any).confidence * 100).toFixed(0)}%
                     </p>
                   </div>
                 </div>

                 {/* Selection Reasoning */}
                 {(step.data as any).reasoning && (
                   <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 mb-3">
                     <div className="flex items-center gap-1.5 mb-2">
                       <Sparkles className="w-3 h-3 text-accent" />
                       <span className="text-[10px] text-accent uppercase tracking-wider font-bold">Why This Market?</span>
                     </div>
                     <p className="text-xs text-sand/90 leading-relaxed">{(step.data as any).reasoning}</p>
                   </div>
                 )}

                 {/* Comparative Analysis */}
                 {(step.data as any).comparativeAnalysis && (
                   <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                     <div className="flex items-center gap-1.5 mb-2">
                       <Brain className="w-3 h-3 text-mystic-blue" />
                       <span className="text-[10px] text-mystic-blue uppercase tracking-wider font-bold">Comparative Analysis</span>
                     </div>
                     <p className="text-xs text-cloud/80 leading-relaxed">{(step.data as any).comparativeAnalysis}</p>
                   </div>
                 )}
               </motion.div>
            )}

            {/* Trade Execution Display - MOST PROMINENT */}
            {step.type === 'executing' && isComplete && step.data && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.95 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ type: "spring", stiffness: 200 }}
                 className={cn(
                   "mt-3 p-5 rounded-xl border-2 relative overflow-hidden",
                   (step.data as any).tradeStatus === 'confirmed' && "bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]",
                   (step.data as any).tradeStatus === 'failed' && "bg-red-500/10 border-red-500/50"
                 )}
               >
                 {/* Glow effect for confirmed trades */}
                 {(step.data as any).tradeStatus === 'confirmed' && (
                   <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
                 )}

                 <div className="relative z-10">
                   {/* Header with Status Badge */}
                   <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                       <div className={cn(
                         "w-8 h-8 rounded-full flex items-center justify-center",
                         (step.data as any).tradeStatus === 'confirmed' && "bg-green-500/20",
                         (step.data as any).tradeStatus === 'failed' && "bg-red-500/20"
                       )}>
                         {(step.data as any).tradeStatus === 'confirmed' ? (
                           <CheckCircle2 className="w-5 h-5 text-green-400" />
                         ) : (
                           <AlertCircle className="w-5 h-5 text-red-400" />
                         )}
                       </div>
                       <div>
                         <span className={cn(
                           "text-sm font-mono uppercase tracking-wide font-bold",
                           (step.data as any).tradeStatus === 'confirmed' && "text-green-400",
                           (step.data as any).tradeStatus === 'failed' && "text-red-400"
                         )}>
                           {(step.data as any).tradeStatus === 'confirmed' ? 'Transaction Confirmed' : 'Transaction Failed'}
                         </span>
                         <p className="text-[10px] text-cloud/50">On-Chain Execution</p>
                       </div>
                     </div>
                     <span className={cn(
                       "px-3 py-1.5 rounded-full text-xs font-mono font-bold uppercase flex items-center gap-1.5",
                       (step.data as any).tradeStatus === 'confirmed' && "bg-green-500/20 text-green-400 border border-green-500/50",
                       (step.data as any).tradeStatus === 'failed' && "bg-red-500/20 text-red-400 border border-red-500/50"
                     )}>
                       <Wallet className="w-3 h-3" />
                       BNB Chain
                     </span>
                   </div>

                   {/* Error Message if Failed */}
                   {(step.data as any).tradeStatus === 'failed' && (
                      <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20">
                         <div className="text-xs text-red-400 font-mono">
                            <span className="font-bold uppercase">Error:</span> {(step.data as any).error || "Order execution failed. Check wallet balance or API configuration."}
                         </div>
                      </div>
                   )}

                   {/* Market Details */}
                   <div className="p-4 rounded-lg bg-surface/30 border border-white/5 mb-4 space-y-3">
                     <div>
                       <p className="text-[10px] text-cloud/50 uppercase mb-1">Market</p>
                       <p className="text-sm text-sand font-medium">{(step.data as any).marketQuestion}</p>
                     </div>
                     <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
                       <div>
                         <p className="text-[10px] text-cloud/50 uppercase mb-1">YES Price</p>
                         <p className="text-sm font-mono text-green-400">
                           {((step.data as any).currentYesPrice * 100).toFixed(1)}%
                         </p>
                       </div>
                       <div>
                         <p className="text-[10px] text-cloud/50 uppercase mb-1">NO Price</p>
                         <p className="text-sm font-mono text-red-400">
                           {((step.data as any).currentNoPrice * 100).toFixed(1)}%
                         </p>
                       </div>
                       <div>
                         <p className="text-[10px] text-cloud/50 uppercase mb-1">Volume</p>
                         <p className="text-sm font-mono text-cloud">
                           ${((step.data as any).marketVolume / 1000000).toFixed(2)}M
                         </p>
                       </div>
                     </div>
                     {(step.data as any).marketEndDate && (
                       <div className="pt-2 border-t border-white/5">
                         <p className="text-[10px] text-cloud/50 uppercase mb-1">Closes</p>
                         <p className="text-xs font-mono text-cloud">
                           {new Date(parseInt((step.data as any).marketEndDate) * 1000).toLocaleString()}
                         </p>
                       </div>
                     )}
                   </div>

                   {/* Order Details Grid */}
                   <div className="grid grid-cols-2 gap-3 mb-4">
                     <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                       <p className="text-[10px] text-cloud/50 uppercase mb-1">Action</p>
                       <p className={cn(
                         "text-xl font-mono font-bold",
                         (step.data as any).action === 'BUY' && "text-green-400",
                         (step.data as any).action === 'SELL' && "text-red-400"
                       )}>
                         {(step.data as any).action} {(step.data as any).side}
                       </p>
                     </div>
                     <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                       <p className="text-[10px] text-cloud/50 uppercase mb-1">Amount</p>
                       <p className="text-xl font-mono font-bold text-accent">
                         ${((step.data as any).amount || 0).toFixed(2)}
                       </p>
                     </div>
                     <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                       <p className="text-[10px] text-cloud/50 uppercase mb-1">Price</p>
                       <p className="text-xl font-mono font-bold text-sand">
                         ${((step.data as any).price || 0).toFixed(2)}
                       </p>
                     </div>
                     <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                       <p className="text-[10px] text-cloud/50 uppercase mb-1">Market ID</p>
                       <p className="text-lg font-mono text-cloud">
                         #{(step.data as any).marketId}
                       </p>
                     </div>
                   </div>

                   {/* AI Reasoning for this Trade */}
                   {(step.data as any).reasoning && (
                     <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 mb-4">
                       <div className="flex items-center gap-1.5 mb-2">
                         <Sparkles className="w-3.5 h-3.5 text-accent" />
                         <span className="text-[10px] text-accent uppercase tracking-wider font-bold">AI Trading Rationale</span>
                       </div>
                       <p className="text-xs text-sand/90 leading-relaxed">{(step.data as any).reasoning}</p>
                     </div>
                   )}

                   {/* Transaction Details Section */}
                   <div className="space-y-3">
                     {/* Transaction Hash with BscScan Link */}
                     {(step.data as any).txHash && (
                       <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                         <div className="flex items-center justify-between mb-2">
                           <p className="text-[10px] text-green-400 uppercase flex items-center gap-1.5 font-bold">
                             <Hash className="w-3 h-3" />
                             Transaction Hash
                           </p>
                           <a
                             href={`https://bscscan.com/tx/${(step.data as any).txHash}`}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors"
                           >
                             View on BscScan
                             <ExternalLink className="w-3 h-3" />
                           </a>
                         </div>
                         <p className="text-xs font-mono text-sand break-all bg-surface/50 p-2 rounded border border-white/5">
                           {(step.data as any).txHash}
                         </p>
                       </div>
                     )}

                     {/* Timestamp */}
                     {(step.data as any).timestamp && (
                       <div className="flex items-center justify-between p-3 rounded-lg bg-surface/30 border border-white/5">
                         <div className="flex items-center gap-2 text-cloud/70">
                           <Clock className="w-3.5 h-3.5" />
                           <span className="text-[10px] uppercase">Executed At</span>
                         </div>
                         <span className="text-xs font-mono text-sand">
                           {new Date((step.data as any).timestamp).toLocaleString()}
                         </span>
                       </div>
                     )}

                     {/* View Full Transaction Button */}
                     {(step.data as any).txHash && (
                       <a
                         href={`https://bscscan.com/tx/${(step.data as any).txHash}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className={cn(
                           "w-full flex items-center justify-center gap-2 p-3 rounded-lg font-mono text-sm font-bold uppercase tracking-wide transition-all",
                           "bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30",
                           "text-green-400 hover:from-green-500/30 hover:to-green-600/30 hover:border-green-500/50"
                         )}
                       >
                         <ExternalLink className="w-4 h-4" />
                         View Transaction on BscScan
                       </a>
                     )}
                   </div>
                 </div>
               </motion.div>
            )}

        </div>
      </div>
    </motion.div>
  )
}

export function AnalysisPipeline({ session, markets }: AnalysisPipelineProps) {
  if (!session) {
    // Idle State
    return (
      <div className="h-full flex flex-col rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-sm overflow-hidden">
         <div className="px-6 py-5 border-b border-white/5 flex items-center gap-3 bg-surface/60">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
               <Brain className="w-4 h-4 text-cloud" />
            </div>
            <h3 className="font-display font-medium text-sand tracking-wide">NEURAL ENGINE</h3>
         </div>

         <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="relative w-64 h-64 flex items-center justify-center">
               {/* Radar visual */}
               <RadarScanner isActive={true} size={200} />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                     <div className="w-3 h-3 bg-accent rounded-full mx-auto mb-4 animate-pulse shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                     <p className="text-xs font-mono text-accent tracking-[0.2em] uppercase">System Armed</p>
                     <p className="text-cloud/50 text-xs mt-2">Waiting for signal trigger...</p>
                  </div>
               </div>
            </div>
         </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-accent/20 bg-surface/40 backdrop-blur-sm overflow-hidden">
      {/* Active Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-surface/60">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
               <Brain className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-display font-medium text-sand tracking-wide">PROCESSING SEQUENCE</h3>
         </div>
         <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-cloud uppercase">Session ID:</span>
            <span className="text-xs font-mono text-accent">{session.id.slice(0,8)}</span>
         </div>
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {session.steps.map((step, index) => (
              <StepCard 
                key={step.id}
                step={step} 
                index={index} 
                session={session}
                markets={markets}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
