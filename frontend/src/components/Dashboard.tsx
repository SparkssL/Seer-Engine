'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Settings, Power, Pause, Play, History, Activity, Sparkles } from 'lucide-react'
import type { Source, Tweet, Market, AnalysisSession, SessionAnalytics } from '@/lib/types'
import { TweetFeed } from './TweetFeed'
import { AnalysisPipeline } from './AnalysisPipeline'
import { MarketImpactPanel } from './MarketImpactPanel'
import { MarketsOverview } from './MarketsOverview'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface DashboardProps {
  sources: Source[]
  tweets: Tweet[]
  markets: Market[]
  activeSession: AnalysisSession | null
  sessions: AnalysisSession[]
  analytics: SessionAnalytics | null
  onDisconnect: () => void
}

export function Dashboard({
  sources,
  tweets,
  markets,
  activeSession,
  sessions,
  analytics,
  onDisconnect
}: DashboardProps) {
  const [isPaused, setIsPaused] = useState(false)
  const [selectedHistorySession, setSelectedHistorySession] = useState<AnalysisSession | null>(null)

  // If user selects a past session, show that. Otherwise show the active session.
  const displaySession = selectedHistorySession || activeSession
  const activeTweetId = displaySession?.tweet.id
  const highlightedMarkets = displaySession?.marketImpacts.map(i => i.marketId) || []

  return (
    <div className="min-h-screen pt-24 pb-8 px-4 md:px-8">
      <div className="max-w-[1920px] mx-auto">
        {/* Top Control Bar */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-6">
            <h2 className="font-display text-3xl font-bold text-sand tracking-tight flex items-center gap-3">
              <Activity className="w-6 h-6 text-accent" />
              LIVE MONITORING
            </h2>
            
            {/* Source Indicators */}
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-surface/40 backdrop-blur-sm">
              <span className="text-[10px] font-mono text-cloud uppercase tracking-widest mr-2">Active Streams</span>
              {sources.filter(s => s.enabled).map(source => (
                <span 
                  key={source.id}
                  className="px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-[10px] font-mono uppercase"
                >
                  {source.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="px-4 py-2 rounded-lg border border-white/5 bg-surface/40 backdrop-blur-sm flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
                <span className="text-xs font-mono text-sand uppercase tracking-wider">
                  {isPaused ? 'PAUSED' : 'SYSTEM ONLINE'}
                </span>
             </div>

            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                "p-3 rounded-lg transition-all border border-white/5",
                isPaused 
                  ? "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20" 
                  : "bg-green-500/10 text-green-500 hover:bg-green-500/20"
              )}
            >
              {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
            </button>
            
            <button className="p-3 rounded-lg bg-surface/40 text-cloud hover:text-sand border border-white/5 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            
            <button 
              onClick={onDisconnect}
              className="p-3 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <Power className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-[calc(100vh-180px)]">
          
          {/* Left Column: Input Stream & History */}
          <div className="xl:col-span-3 flex flex-col gap-6 h-full overflow-hidden">
             {/* Tweet Feed */}
             <div className="flex-1 min-h-0">
                <TweetFeed
                  tweets={tweets}
                  activeTweetId={activeTweetId}
                  activeSession={activeSession}
                  sessions={sessions}
                />
             </div>
             
             {/* Session History (Mini List) */}
             <div className="h-1/3 glass-card rounded-2xl border border-white/10 bg-surface/30 backdrop-blur-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-surface/50">
                   <h3 className="font-display text-xs text-sand tracking-widest flex items-center gap-2">
                      <History className="w-3 h-3 text-accent" />
                      EXECUTION LOG
                   </h3>
                   <span className="text-[10px] font-mono text-cloud">{sessions.length} RECORDS</span>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                   {sessions.slice().reverse().map((session) => (
                      <button
                        key={session.id}
                        onClick={() => setSelectedHistorySession(session === selectedHistorySession ? null : session)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-all group",
                          selectedHistorySession?.id === session.id
                             ? "bg-accent/10 border-accent/30"
                             : "bg-white/5 border-transparent hover:bg-white/10"
                        )}
                      >
                         <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-cloud">
                               {new Date(session.startTime).toLocaleTimeString()}
                            </span>
                            <span className={cn(
                               "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded",
                               session.status === 'complete' ? "bg-green-500/20 text-green-400" :
                               session.status === 'error' ? "bg-red-500/20 text-red-400" :
                               "bg-accent/20 text-accent"
                            )}>
                               {session.status}
                            </span>
                         </div>
                         <div className="text-xs text-sand truncate font-light">
                            @{session.tweet.author.username}: {session.tweet.text.slice(0, 30)}...
                         </div>
                      </button>
                   ))}
                   {sessions.length === 0 && (
                      <div className="text-center py-8 text-cloud/50 text-xs italic">
                         No execution history yet
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Center Column: The Oracle Pipeline (AI Thought Process) */}
          <div className="xl:col-span-5 flex flex-col gap-6 h-full overflow-hidden">
             <AnalysisPipeline session={displaySession} markets={markets} />
          </div>

          {/* Right Column: Market Context & Execution */}
          <div className="xl:col-span-4 flex flex-col gap-6 h-full overflow-hidden">
             {/* Impact & Trade Decision */}
             <div className="flex-1 min-h-0">
                <MarketImpactPanel 
                   impacts={displaySession?.marketImpacts || []} 
                   trades={displaySession?.trades || []}
                   markets={markets}
                />
             </div>
             
             {/* Markets Watchlist */}
             <div className="h-1/3">
                <MarketsOverview 
                   markets={markets} 
                   highlightedMarkets={highlightedMarkets}
                />
             </div>
          </div>

        </div>
      </div>
    </div>
  )
}
