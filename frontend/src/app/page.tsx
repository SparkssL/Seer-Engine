'use client'

import { useState } from 'react'
import { Play, Hexagon } from 'lucide-react'
import { SeerBackground } from '@/components/SeerBackground'
import { motion, AnimatePresence } from 'framer-motion'
import { SeerConsole } from '@/components/console/SeerConsole'
import { SourceSelector } from '@/components/SourceSelector'
import { useSocket } from '@/hooks/useSocket'
import type { Source } from '@/lib/types'

// Base config - we will modify the 'twitter' source based on user selection
const BASE_SOURCES: Source[] = [
  {
    id: 'twitter',
    name: 'Twitter Firehose',
    description: 'Real-time tweet stream analysis from high-impact accounts.',
    icon: 'twitter',
    enabled: true,
    accounts: [] // Populated by selector
  },
  {
    id: 'news',
    name: 'Global News',
    description: 'Breaking news from major financial outlets (Bloomberg, Reuters).',
    icon: 'news',
    enabled: false
  },
  {
    id: 'social',
    name: 'Social Sentiment',
    description: 'Aggregated sentiment from Reddit and Discord communities.',
    icon: 'social',
    enabled: false
  }
]

export default function Home() {
  const [view, setView] = useState<'landing' | 'selector' | 'dashboard'>('landing')
  const [sources, setSources] = useState<Source[]>(BASE_SOURCES)
  const { connect, disconnect, analytics, ...socketData } = useSocket()

  const handleInitiate = () => setView('selector')

  // Not used in new selector flow but kept for compatibility
  const handleToggleSource = (id: string) => {
    setSources(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  const handleStartEngine = (selectedHandles: string[]) => {
    // Update twitter source with selected accounts
    const updatedSources = sources.map(s => 
      s.id === 'twitter' ? { ...s, accounts: selectedHandles } : s
    )
    setSources(updatedSources)
    
    // Start connection
    connect(updatedSources)
    setView('dashboard')
  }

  const handleDisconnect = () => {
    disconnect()
    setView('landing')
  }

  return (
    <main className="relative min-h-screen selection:bg-accent selection:text-canvas overflow-hidden">
      <SeerBackground />
      
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SeerConsole sources={sources} onDisconnect={handleDisconnect} analytics={analytics} {...socketData} />
          </motion.div>
        )}

        {view === 'selector' && (
          <SourceSelector 
            key="selector"
            sources={sources} 
            onToggle={handleToggleSource} 
            onProceed={handleStartEngine} 
          />
        )}

        {view === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            transition={{ duration: 0.8 }}
            className="flex flex-col min-h-screen"
          >
             <div className="hero-shell border-accent/10 bg-surface/50 backdrop-blur-sm flex-1 flex flex-col">
              <header className="nav-shell">
                <div className="brand">
                  <div className="brand-mark border-accent/20 text-accent">
                    <Hexagon className="w-5 h-5" />
                  </div>
                  <div className="brand-copy">
                    <span className="font-display tracking-wider text-sand">SEER</span>
                    <span className="muted font-mono text-[10px]">ENGINE v1.0</span>
                  </div>
                </div>
              </header>

              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10 relative max-w-5xl mx-auto w-full">
                <div className="w-full">
                  <p className="eyebrow text-accent mb-6 font-mono flex items-center justify-center">
                    <span className="animate-pulse mr-2">●</span>
                    AI-POWERED PREDICTION MARKET TRADING
                  </p>
                  <h1 className="hero-title font-display text-transparent bg-clip-text bg-gradient-to-r from-sand via-white to-accent/50 text-5xl md:text-7xl mb-8">
                    The Seer of the Blockchain Age
                  </h1>
                  <p className="hero-sub font-light text-cloud/80 text-lg md:text-xl leading-relaxed mb-12 max-w-2xl mx-auto">
                    Seer Engine fuses ancient divination with GPT-5 neural networks. 
                    It listens to the chaos of social media, divines the future, and executes 
                    trades on prediction markets before the timeline updates.
                  </p>
                  <div className="hero-actions flex justify-center">
                    <button 
                      onClick={handleInitiate}
                      className="pill primary bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:shadow-[0_0_20px_rgba(242,195,92,0.2)] px-8 py-4 text-lg"
                    >
                      <Play className="w-5 h-5 mr-2" /> Start Engine
                    </button>
                  </div>
                </div>
              </div>

              <footer className="footer border-t border-white/5 backdrop-blur-sm bg-surface/50 mt-auto">
                <div className="brand">
                  <div className="brand-mark border-accent/20 text-accent">
                    <Hexagon className="w-4 h-4" />
                  </div>
                  <div className="brand-copy">
                    <span className="text-sand font-display">SEER ENGINE</span>
                    <span className="muted font-mono text-[10px]">MIDAZ TEAM</span>
                  </div>
                </div>
                <div className="muted text-xs font-mono">
                  ©2025 | BUILT FOR BNB CHAIN
                </div>
              </footer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
