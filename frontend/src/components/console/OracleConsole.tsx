'use client'

import { motion } from 'framer-motion'
import { Settings, Play, Pause, Power, Activity, Shield, Wallet } from 'lucide-react'
import type { Source, Tweet, Market, AnalysisSession, SessionAnalytics, ConnectionStatus } from '@/lib/types'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { CentralLens } from './CentralLens'
import { EventStream } from './EventStream'
import { MarketImpactPanel } from '@/components/MarketImpactPanel'

interface OracleConsoleProps {
  sources: Source[]
  tweets: Tweet[]
  markets: Market[]
  activeSession: AnalysisSession | null
  sessions: AnalysisSession[]
  analytics: SessionAnalytics | null
  status: ConnectionStatus
  onDisconnect: () => void
}

export function OracleConsole({
  sources,
  markets,
  activeSession,
  sessions,
  analytics,
  status,
  onDisconnect
}: OracleConsoleProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)

  // Look up selected session from sessions array so it updates in real-time
  const historySelection = selectedHistoryId
    ? sessions.find(s => s.id === selectedHistoryId) || null
    : null

  // View Logic: Show history selection if active, otherwise show live session
  const displaySession = historySelection || activeSession

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-canvas/90 backdrop-blur-sm text-sand">
      
      {/* 1. Command Bar (Top) */}
      <header className="h-16 border-b border-white/5 bg-surface/80 flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-8">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded border border-accent/30 bg-accent/5 flex items-center justify-center">
                 <Activity className="w-4 h-4 text-accent" />
              </div>
              <h1 className="font-display text-lg tracking-widest text-sand">SEER CONSOLE</h1>
           </div>

           <div className="h-8 w-px bg-white/5" />

           <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2 text-cloud">
                 <Shield className="w-3 h-3" />
                 <span>MODE:</span>
                 <span className="text-sand uppercase">Autonomous</span>
              </div>
              <div className="flex items-center gap-2 text-cloud">
                 <Wallet className="w-3 h-3" />
                 <span>BALANCE:</span>
                 <span className="text-sand">$1.09 USDT</span>
              </div>
           </div>
        </div>

        <div className="flex items-center gap-3">
           <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                "flex items-center gap-2 px-4 py-1.5 rounded-lg border transition-all text-xs font-mono uppercase",
                isPaused 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500" 
                  : "bg-green-500/10 border-green-500/30 text-green-500"
              )}
           >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isPaused ? "Resume" : "Live"}
           </button>
           
           <button 
             onClick={onDisconnect}
             className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors text-cloud"
           >
             <Power className="w-4 h-4" />
           </button>
        </div>
      </header>

      {/* 2. Main Workspace (3-Column Layout) */}
      <div className="flex-1 flex overflow-hidden relative">
         
         {/* Left Sidebar: Ingestion Stream (Chat Style) */}
         <div className="flex-shrink-0 z-30 h-full border-r border-white/5 bg-surface/60 backdrop-blur-md">
            <EventStream
               sessions={sessions}
               selectedId={displaySession?.id}
               onSelect={(session) => setSelectedHistoryId(session.id)}
            />
         </div>

         {/* Center: The Lens (Main Visualization) */}
         <div className="flex-1 flex flex-col relative z-10">
            {/* The Stage */}
            <div className="flex-1 relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-surface/40 pointer-events-none" />
               
               <CentralLens session={displaySession} />
               
               {/* Selection Indicator */}
               {historySelection && (
                  <div className="absolute top-4 right-4 px-3 py-1 bg-accent/20 border border-accent/40 rounded-full text-[10px] font-mono text-accent flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                     VIEWING HISTORY
                     <button
                        onClick={() => setSelectedHistoryId(null)}
                        className="ml-2 hover:text-white"
                     >
                        ×
                     </button>
                  </div>
               )}
            </div>
         </div>

         {/* Right: Context Sidebar */}
         <div className="w-80 border-l border-white/5 bg-surface/60 backdrop-blur-md flex flex-col z-20">
            <div className="flex-1 overflow-y-auto p-6">
               <h3 className="font-display text-xs text-sand tracking-widest uppercase mb-6 flex items-center gap-2">
                  <Activity className="w-3 h-3 text-accent" />
                  Live Markets
               </h3>
               
               {/* Market Cards Mini */}
               <div className="space-y-3">
                  {(status === 'connecting' || (status === 'connected' && markets.length === 0)) ? (
                    <div className="flex flex-col gap-3">
                      {[1, 2, 3, 4].map(i => (
                         <div key={i} className="p-3 rounded border border-white/5 bg-black/20 animate-pulse">
                            <div className="h-4 w-3/4 bg-white/10 rounded mb-3" />
                            <div className="flex items-center justify-between">
                               <div className="h-3 w-1/4 bg-white/10 rounded" />
                               <div className="h-3 w-1/6 bg-white/10 rounded" />
                            </div>
                         </div>
                      ))}
                    </div>
                  ) : (
                    markets.map(market => (
                       <div 
                          key={market.id}
                          className="p-3 rounded border border-white/5 bg-black/20 hover:border-white/10 transition-colors cursor-pointer"
                       >
                          <div className="text-xs text-sand font-medium leading-snug mb-2">
                             {market.question}
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-cloud">
                             <span>VOL: ${(market.volume / 1000).toFixed(1)}k</span>
                             <span className={cn(
                                market.status === 'active' ? "text-green-400" : "text-cloud"
                             )}>
                                {market.status.toUpperCase()}
                             </span>
                          </div>
                       </div>
                    ))
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
