'use client'

import { useMemo, useState } from 'react'
import { 
  Sparkles, Play, Scroll, Hexagon, Radio, 
  Cpu, Network, Eye, Brain, Zap
} from 'lucide-react'
import { OracleBackground } from '@/components/OracleBackground'
import { motion, AnimatePresence } from 'framer-motion'
import { OracleConsole } from '@/components/console/OracleConsole'
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

const prophecies = [
  {
    code: 'SIGIL-ALPHA',
    title: 'Bitcoin Halving Impact',
    metric: '94% Accuracy',
    blurb: 'Analyzed 4.2M tweets during the halving event. Predicted volatility spike 40 minutes before market reaction.',
    tags: ['Crypto', 'Sentiment'],
  },
  {
    code: 'SIGIL-BETA',
    title: 'Election Probability',
    metric: 'Top 1% Return',
    blurb: 'Filtered noise from political discourse to identify true swing state sentiment shifts.',
    tags: ['Politics', 'Prediction'],
  },
  {
    code: 'SIGIL-GAMMA',
    title: 'Fed Rate Cut',
    metric: '38ms Execution',
    blurb: 'Instantaneous execution on Opinion CLOB upon FOMC statement release via websocket stream.',
    tags: ['Macro', 'HFT'],
  },
]

const features = [
  {
    icon: <Eye className="w-6 h-6" />,
    title: 'The All-Seeing Eye',
    copy: 'Real-time ingestion of global Twitter streams. No event escapes the gaze of the Seer Engine.',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'Neural Prophecy',
    copy: 'GPT-4 inference models trained to decode human chaos into binary market outcomes.',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Flash Execution',
    copy: 'Direct connection to the Opinion Trade CLOB for millisecond-latency trade settlement.',
  },
  {
    icon: <Scroll className="w-6 h-6" />,
    title: 'The Ledger',
    copy: 'Immutable records of every prediction, impact score, and trade execution.',
  },
]

const cipher = [
  { key: 'I', title: 'Ingestion', body: 'The Eye opens. Raw data flows from the ether (Twitter API) into the sanctum.' },
  { key: 'II', title: 'Divination', body: 'The Oracle (AI) casts the bones, reading sentiment and extracting truth from noise.' },
  { key: 'III', title: 'Judgment', body: 'The Scales weigh the probability. Is the alpha sufficient to warrant action?' },
  { key: 'IV', title: 'Execution', body: 'The Strike. Orders are written to the chain before the crowd reacts.' },
]

function SectionShell({ id, heading, eyebrow, children }: { 
  id?: string
  heading: string
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="section-shell relative z-10">
      <div className="section-head">
        <div className="eyebrow text-accent font-mono">
          <span className="mr-2 opacity-50">❖</span> 
          {eyebrow}
        </div>
        <h2 className="section-title text-sand glow-text">{heading}</h2>
      </div>
      {children}
    </section>
  )
}

export default function Home() {
  const [activeCase, setActiveCase] = useState(0)
  const activeItem = useMemo(() => prophecies[activeCase], [activeCase])

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
      <OracleBackground />
      
      <AnimatePresence mode="wait">
        {view === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <OracleConsole sources={sources} onDisconnect={handleDisconnect} analytics={analytics} {...socketData} />
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
          >
             <div className="hero-shell border-accent/10 bg-surface/50 backdrop-blur-sm">
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
          <div className="nav-links font-mono text-xs tracking-widest">
            <a href="#quest" className="hover:text-accent">PROPHECY</a>
            <a href="#essence" className="hover:text-accent">RITUALS</a>
            <a href="#cases" className="hover:text-accent">CHRONICLES</a>
            <a href="#cipher" className="hover:text-accent">SIGILS</a>
          </div>
        </header>

        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow text-accent mb-4 font-mono">
              <span className="animate-pulse mr-2">●</span>
              AI-POWERED PREDICTION MARKET TRADING
            </p>
            <h1 className="hero-title font-display text-transparent bg-clip-text bg-gradient-to-r from-sand via-white to-accent/50">
              The Oracle of the Blockchain Age
            </h1>
            <p className="hero-sub font-light text-cloud/80">
              Seer Engine fuses ancient divination with GPT-4 neural networks. 
              It listens to the chaos of social media, divines the future, and executes 
              trades on prediction markets before the timeline updates.
            </p>
            <div className="hero-actions">
              <button 
                onClick={handleInitiate}
                className="pill primary bg-accent/10 border-accent/30 text-accent hover:bg-accent/20 hover:shadow-[0_0_20px_rgba(242,195,92,0.2)]"
              >
                <Play className="w-4 h-4" /> Initiate Sequence
              </button>
              <button className="pill ghost border-white/10 hover:border-white/30 text-sand">
                <Scroll className="w-4 h-4" /> Read The Scrolls
              </button>
            </div>
            
            <div className="hero-stats border-t border-white/5 pt-6 mt-8">
              <div>
                <span className="stat-label font-mono text-[10px] text-accent/70">Active Oracles</span>
                <span className="stat-value font-display text-sand">4</span>
              </div>
              <div>
                <span className="stat-label font-mono text-[10px] text-accent/70">Events Parsed</span>
                <span className="stat-value font-display text-sand">1.2M+</span>
              </div>
              <div>
                <span className="stat-label font-mono text-[10px] text-accent/70">Win Rate</span>
                <span className="stat-value font-display text-sand">~68%</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-glow bg-accent/5" />
            <div className="panel bg-surface/80 border-accent/20 backdrop-blur-md">
              <div className="panel-head border-b border-white/5 pb-4">
                <div className="eyebrow font-mono text-accent">SYSTEM STATUS</div>
                <div className="pill subtle text-[10px] font-mono border-accent/20 text-accent">
                  <Sparkles className="w-3 h-3" /> ONLINE
                </div>
              </div>
              <div className="panel-grid">
                <div className="panel-card border-white/5 bg-white/5">
                  <div className="pill icon border-none bg-transparent p-0 text-accent">
                    <Radio className="w-5 h-5" />
                  </div>
                  <p className="panel-value text-sm font-mono text-sand mt-2">Listening...</p>
                  <p className="panel-desc text-[10px] mt-1">Scanning Twitter firehose for keywords.</p>
                </div>
                <div className="panel-card border-white/5 bg-white/5">
                  <div className="pill icon border-none bg-transparent p-0 text-accent">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <p className="panel-value text-sm font-mono text-sand mt-2">Inferring...</p>
                  <p className="panel-desc text-[10px] mt-1">GPT-4 analyzing sentiment impact.</p>
                </div>
                <div className="panel-card border-white/5 bg-white/5">
                  <div className="pill icon border-none bg-transparent p-0 text-accent">
                    <Network className="w-5 h-5" />
                  </div>
                  <p className="panel-value text-sm font-mono text-sand mt-2">Trading...</p>
                  <p className="panel-desc text-[10px] mt-1">Connected to Opinion Trade CLOB.</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                 <div className="font-mono text-[10px] text-cloud">
                   <span className="text-accent">LATENCY:</span> 42ms
                 </div>
                 <div className="flex gap-1">
                   <div className="w-1 h-1 bg-accent rounded-full animate-pulse" />
                   <div className="w-1 h-1 bg-accent rounded-full animate-pulse delay-75" />
                   <div className="w-1 h-1 bg-accent rounded-full animate-pulse delay-150" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <SectionShell id="quest" eyebrow="The Prophecy" heading="Divining the Future from Chaos.">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: 'The Signal', d: 'In the noise of millions of voices, truth is hidden. Seer filters the signal.' },
            { t: 'The Oracle', d: 'AI does not sleep. It reads, it understands, it predicts with cold logic.' },
            { t: 'The Action', d: 'Knowledge without action is void. Seer strikes the market instantly.' }
          ].map((item) => (
            <div key={item.t} className="card border-white/5 bg-surface/40 hover:border-accent/30 transition-colors group">
              <h3 className="card-title font-display text-sand group-hover:text-accent transition-colors">{item.t}</h3>
              <p className="card-copy font-light text-sm">{item.d}</p>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell eyebrow="Oracle Glyphs" heading="The Tools of Divination.">
        <div className="grid gap-6 md:grid-cols-2">
          {features.map(feature => (
            <div key={feature.title} className="card card-grid border-white/5 bg-surface/40">
              <div className="icon-shell text-accent border-accent/20 bg-accent/5">{feature.icon}</div>
              <div>
                <h3 className="card-title font-display text-sand text-lg">{feature.title}</h3>
                <p className="card-copy text-sm font-light">{feature.copy}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <SectionShell id="cases" eyebrow="Chronicles" heading="Fulfilled Prophecies.">
        <div className="case-shell">
          <div className="case-tabs">
            {prophecies.map((item, idx) => (
              <button
                key={item.title}
                className={`case-tab font-mono text-xs ${activeCase === idx ? 'active border-accent/40 bg-accent/10 text-accent' : 'border-white/5 text-muted'}`}
                onClick={() => setActiveCase(idx)}
              >
                {item.code}
              </button>
            ))}
          </div>
          <div className="case-card border-accent/10 bg-surface/60 backdrop-blur-md">
            <div className="case-top">
              <div>
                <div className="eyebrow text-accent/60 font-mono mb-2">{activeItem.code}</div>
                <h3 className="section-title text-2xl text-sand">{activeItem.title}</h3>
              </div>
              <div className="pill primary bg-accent text-surface font-bold border-none">{activeItem.metric}</div>
            </div>
            <p className="card-copy my-6 font-light text-lg text-cloud">{activeItem.blurb}</p>
            <div className="case-tags">
              {activeItem.tags.map(tag => (
                <span key={tag} className="pill ghost text-xs font-mono border-white/10 text-muted">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell id="cipher" eyebrow="The Cipher" heading="The Logic of the Sigils.">
        <div className="cipher-grid">
          {cipher.map(item => (
            <div key={item.key} className="cipher-card border-white/5 bg-surface/30 hover:bg-surface/50 transition-colors">
              <div className="cipher-key font-display text-accent opacity-50 text-3xl">{item.key}</div>
              <div>
                <h4 className="card-title text-sand font-mono text-sm mb-2 uppercase tracking-widest">{item.title}</h4>
                <p className="card-copy text-xs font-light">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionShell>

      <footer className="footer border-t border-white/5 mt-20 backdrop-blur-sm bg-surface/50">
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
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
