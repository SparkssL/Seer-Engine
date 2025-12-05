'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle2, XCircle, Activity, Terminal, Zap, AlertCircle, ExternalLink } from 'lucide-react'
import type { AnalysisSession } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useEffect, useRef } from 'react'

interface EventStreamProps {
  sessions: AnalysisSession[]
  selectedId?: string
  onSelect: (session: AnalysisSession) => void
}

export function EventStream({ sessions, selectedId, onSelect }: EventStreamProps) {
  // Reverse to show newest at the bottom (Chat style)
  // sessions[0] is newest. reverse() puts it at the end.
  const history = [...sessions].reverse()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [history.length])

  return (
    <div className="h-full flex flex-col bg-surface/20 border-r border-white/5 backdrop-blur-md w-80">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-2">
          <Terminal className="w-3 h-3 text-accent" />
          <h3 className="font-display text-xs text-sand tracking-widest uppercase">
            Ingestion Stream
          </h3>
        </div>
        <span className="font-mono text-[10px] text-cloud">
          {sessions.length}
        </span>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-hide"
      >
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 opacity-40">
            <Activity className="w-8 h-8 text-accent mb-2 animate-pulse" />
            <p className="text-xs font-mono text-cloud">Waiting for signal...</p>
          </div>
        ) : (
          history.map((session) => {
            // Find actionable decision to display
            const trade = session.trades[0]
            const impact = !trade ? session.marketImpacts.find(i => i.tradeDecision.action !== 'HOLD') : null
            const decision = trade || impact?.tradeDecision

            return (
              <button
                key={session.id}
                onClick={() => onSelect(session)}
                className={cn(
                  "w-full text-left p-3 rounded border transition-all group relative overflow-hidden",
                  selectedId === session.id 
                    ? "bg-accent/10 border-accent/40" 
                    : "bg-black/20 border-white/5 hover:bg-white/5 hover:border-white/10"
                )}
              >
                {/* Status Bar */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-0.5",
                  session.status === 'complete' ? "bg-green-500" :
                  session.status === 'error' ? "bg-red-500" :
                  "bg-accent animate-pulse"
                )} />

                <div className="pl-2">
                  <div className="flex items-center justify-between mb-1">
                     <span className="text-[10px] font-mono text-accent/80">
                        @{session.tweet.author.username}
                     </span>
                     <span className="text-[9px] font-mono text-cloud">
                        {new Date(session.startTime).toLocaleTimeString()}
                     </span>
                  </div>
                  
                  <div className="text-xs text-sand/90 font-medium leading-snug line-clamp-2 mb-2">
                     {session.tweet.text}
                  </div>

                  {/* Trade Decision/Execution Display */}
                  {decision && (
                    <div className={cn(
                      "mb-2 px-2 py-1.5 rounded border flex flex-col gap-1",
                      trade?.status === 'failed' ? "bg-red-500/10 border-red-500/20" :
                      trade?.status === 'confirmed' ? "bg-green-500/10 border-green-500/20" : 
                      "bg-accent/10 border-accent/20"
                    )}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-1.5">
                          {trade?.status === 'failed' ? (
                             <AlertCircle className="w-3 h-3 text-red-400" />
                          ) : (
                             <Zap className={cn("w-3 h-3", trade ? "text-green-400" : "text-accent")} />
                          )}
                          <span className={cn(
                            "text-[10px] font-mono font-bold",
                            trade?.status === 'failed' ? "text-red-400" :
                            trade ? "text-green-400" : "text-accent"
                          )}>
                            {trade ? (trade.status === 'failed' ? 'FAILED' : 'EXECUTED') : (decision as any).action || 'SIGNAL'}
                          </span>
                        </div>
                        <div className="text-[10px] font-mono text-sand">
                          {trade ? (
                            <>
                              {trade.side} <span className="opacity-50">@</span> {trade.price.toFixed(2)}
                            </>
                          ) : (
                            <>
                              {(decision as any).side} <span className="opacity-50">@</span> {(decision as any).suggestedPrice?.toFixed(2)}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Error Log */}
                      {trade?.status === 'failed' && trade.error && (
                         <div className="text-[9px] font-mono text-red-300/80 break-all leading-tight border-t border-red-500/10 pt-1">
                            Error: {trade.error}
                         </div>
                      )}

                      {/* BscScan Link for Confirmed Trades */}
                      {trade?.status === 'confirmed' && trade.txHash && (
                         <div className="border-t border-green-500/10 pt-1 mt-1">
                            <a 
                               href={`https://bscscan.com/tx/${trade.txHash}`}
                               target="_blank" 
                               rel="noopener noreferrer"
                               className="flex items-center gap-1 text-[9px] font-mono text-green-400/80 hover:text-green-400 hover:underline transition-colors"
                               onClick={(e) => e.stopPropagation()}
                            >
                               <ExternalLink className="w-2.5 h-2.5" />
                               View on BscScan
                            </a>
                         </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-1.5">
                        {session.status === 'active' && (
                          <span className="flex items-center gap-1 text-[9px] text-accent animate-pulse">
                             <Activity className="w-3 h-3" /> PROCESSING
                          </span>
                        )}
                        {session.status === 'complete' && (
                          <span className="flex items-center gap-1 text-[9px] text-green-400">
                             <CheckCircle2 className="w-3 h-3" /> PROCESSED
                          </span>
                        )}
                        {session.status === 'error' && (
                           <span className="flex items-center gap-1 text-[9px] text-red-400">
                              <XCircle className="w-3 h-3" /> FAILED
                           </span>
                        )}
                     </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}


