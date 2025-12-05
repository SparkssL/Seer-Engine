'use client'

import { motion } from 'framer-motion'
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import type { AnalysisSession } from '@/lib/types'
import { cn } from '@/lib/utils'

interface EventStreamProps {
  sessions: AnalysisSession[]
  selectedId?: string
  onSelect: (session: AnalysisSession) => void
}

export function EventStream({ sessions, selectedId, onSelect }: EventStreamProps) {
  // Reverse to show newest first
  const history = [...sessions].reverse()

  return (
    <div className="h-full flex flex-col bg-surface/20 border-t border-white/5 backdrop-blur-md">
      <div className="px-6 py-3 border-b border-white/5 flex items-center justify-between">
        <h3 className="font-display text-xs text-sand tracking-widest uppercase">
          Temporal Stream
        </h3>
        <span className="font-mono text-[10px] text-cloud">
          {sessions.length} EVENTS LOGGED
        </span>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-4 flex items-center gap-4 min-h-[120px]">
        {history.length === 0 ? (
          <div className="w-full text-center text-cloud/40 text-xs font-mono italic">
            Waiting for temporal data...
          </div>
        ) : (
          history.map((session) => (
            <button
              key={session.id}
              onClick={() => onSelect(session)}
              className={cn(
                "relative flex-shrink-0 w-64 h-24 rounded-lg border p-3 text-left transition-all group",
                selectedId === session.id 
                  ? "bg-accent/10 border-accent/40 shadow-[0_0_20px_rgba(212,175,55,0.1)]" 
                  : "bg-surface/40 border-white/5 hover:bg-surface/60 hover:border-white/10"
              )}
            >
              {/* Status Indicator Line */}
              <div className={cn(
                "absolute left-0 top-0 bottom-0 w-1 rounded-l-lg",
                session.status === 'complete' ? "bg-green-500/50" :
                session.status === 'error' ? "bg-red-500/50" :
                "bg-accent/50"
              )} />

              <div className="ml-2 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2 text-[10px] font-mono text-cloud">
                      <Clock className="w-3 h-3" />
                      {new Date(session.startTime).toLocaleTimeString()}
                   </div>
                   {session.status === 'complete' && <CheckCircle2 className="w-3 h-3 text-green-500/70" />}
                   {session.status === 'error' && <XCircle className="w-3 h-3 text-red-500/70" />}
                   {session.status === 'active' && <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />}
                </div>

                <div className="text-xs text-sand font-medium truncate pr-2">
                   @{session.tweet.author.username}
                </div>
                
                <div className="text-[10px] text-cloud/70 truncate font-mono">
                   {session.tweet.text}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}


