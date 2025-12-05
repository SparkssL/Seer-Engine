'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  Radio, Filter, Brain, Target, Rocket, CheckCircle2, 
  AlertCircle, Loader2, ArrowDown, Sparkles, Eye, Cpu
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

            {/* LLM Analysis Display (Thought Process) */}
            {step.type === 'analyzing' && isComplete && step.data && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-4 rounded bg-surface/50 border border-white/5 font-mono text-xs"
              >
                <div className="flex items-center gap-2 text-accent mb-2">
                  <Brain className="w-3 h-3" />
                  <span className="uppercase tracking-widest text-[10px]">Oracle Insight</span>
                </div>
                <p className="text-sand/80 leading-relaxed whitespace-pre-wrap">
                  {/* Assuming data has a 'thought' or 'reasoning' field */}
                  {(step.data as any).reasoning || "Analyzing market implications..."}
                </p>
              </motion.div>
            )}

            {/* Decision/Execution Display */}
            {(step.type === 'deciding' || step.type === 'executing') && isComplete && step.data && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }}
                 className="mt-3 flex flex-wrap gap-2"
               >
                 {Object.entries(step.data).map(([key, value]) => {
                    if (typeof value === 'object') return null;
                    return (
                      <div key={key} className="px-2 py-1 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-cloud">
                        <span className="text-cloud/50 uppercase mr-2">{key}:</span>
                        <span className="text-sand">{String(value)}</span>
                      </div>
                    )
                 })}
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
