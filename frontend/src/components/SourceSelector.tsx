'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronRight, Sparkles, User } from 'lucide-react'
import type { Source } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useState } from 'react'

// Define the specific targets as per user request
const TARGETS = [
  { name: 'Donald J. Trump', handle: 'realDonaldTrump', avatar: 'https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_400x400.jpg', id: '1' },
  { name: 'Elon Musk', handle: 'elonmusk', avatar: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg', id: '2' },
  { name: 'CZ 🔶 BNB', handle: 'cz_binance', avatar: 'https://pbs.twimg.com/profile_images/1450054312512233473/g10_f8gD_400x400.jpg', id: '3' },
  { name: 'SBF', handle: 'SBF_FTX', avatar: 'https://pbs.twimg.com/profile_images/1496242735224528901/8a4f0723_400x400.jpg', id: '4' },
  { name: 'Tykoo', handle: '0xTykoo', avatar: 'https://pbs.twimg.com/profile_images/1790424806007406592/rN_j34gR_400x400.jpg', id: '5' },
  { name: 'Midaz.xyz', handle: 'Midaz_labs', avatar: 'https://pbs.twimg.com/profile_images/1785384425117163520/i2_u42d3_400x400.jpg', id: '6' },
]

interface SourceSelectorProps {
  sources: Source[] // Kept for compatibility but we focus on targets
  onToggle: (id: string) => void // We'll repurpose this or use local state
  onProceed: (selectedHandles: string[]) => void
}

export function SourceSelector({ onProceed }: SourceSelectorProps) {
  const [selectedTargets, setSelectedTargets] = useState<string[]>([])

  const toggleTarget = (handle: string) => {
    setSelectedTargets(prev => 
      prev.includes(handle) 
        ? prev.filter(h => h !== handle) 
        : [...prev, handle]
    )
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-24 relative z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="max-w-6xl w-full">
        {/* Header Section mimicking DaVincii Essence */}
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-3 px-4 py-1.5 mb-6 border border-accent/30 rounded-full bg-accent/5 backdrop-blur-sm">
             <Sparkles className="w-3 h-3 text-accent" /> 
             <span className="text-[10px] font-mono tracking-[0.2em] text-accent uppercase">Oracle Input Vectors</span>
          </div>
          
          <h2 className="font-display text-5xl md:text-7xl font-medium mb-8 text-sand tracking-tight leading-[0.9]">
            Select <span className="text-accent italic font-serif">Architects</span><br />
            of the Future
          </h2>
          
          <p className="text-cloud font-light text-lg max-w-xl mx-auto leading-relaxed">
            Choose the key opinion leaders to monitor. The Seer Engine will ingest their signals to predict market movements.
          </p>
        </motion.div>

        {/* Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {TARGETS.map((target, index) => {
            const isSelected = selectedTargets.includes(target.handle)
            return (
              <motion.div
                key={target.handle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.4 }}
                onClick={() => toggleTarget(target.handle)}
                className="group cursor-pointer"
              >
                <div className={cn(
                  "relative p-6 h-full transition-all duration-500 ease-out",
                  "border border-white/5 bg-surface/30 backdrop-blur-md hover:bg-surface/50",
                  isSelected ? "border-accent/60 bg-accent/5" : "hover:border-white/10"
                )}>
                  {/* Number/Index */}
                  <div className="absolute top-6 right-6 font-serif text-3xl text-white/5 group-hover:text-white/10 transition-colors">
                    0{index + 1}
                  </div>

                  {/* Avatar Area */}
                  <div className="mb-6 relative">
                    <div className={cn(
                      "w-16 h-16 rounded-full overflow-hidden border-2 transition-all duration-500",
                      isSelected ? "border-accent shadow-[0_0_20px_rgba(212,175,55,0.3)]" : "border-white/10 group-hover:border-white/30"
                    )}>
                      {/* Fallback to icon if image fails load (in real app) */}
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                         <User className="w-6 h-6 text-cloud" />
                         {/* Image overlay */}
                         <img 
                           src={target.avatar} 
                           alt={target.name}
                           className="absolute inset-0 w-full h-full object-cover"
                           onError={(e) => e.currentTarget.style.display = 'none'}
                         />
                      </div>
                    </div>
                  </div>

                  {/* Text Content */}
                  <div>
                    <h3 className={cn(
                      "font-display text-2xl mb-2 transition-colors duration-300",
                      isSelected ? "text-accent" : "text-sand group-hover:text-white"
                    )}>
                      {target.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="font-mono text-xs text-cloud/60 tracking-wider">@{target.handle}</p>
                      
                      {/* Checkbox Indicator */}
                      <div className={cn(
                        "w-5 h-5 border border-white/20 flex items-center justify-center transition-all duration-300",
                        isSelected ? "bg-accent border-accent" : "group-hover:border-accent/50"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-surface" />}
                      </div>
                    </div>
                  </div>

                  {/* Decorative Corner */}
                  <div className={cn(
                    "absolute bottom-0 left-0 w-3 h-3 border-b border-l transition-all duration-500",
                    isSelected ? "border-accent opacity-100" : "border-white/10 opacity-0 group-hover:opacity-100"
                  )} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Action Button */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <button
            onClick={() => onProceed(selectedTargets)}
            disabled={selectedTargets.length === 0}
            className={cn(
              "group relative px-12 py-5 overflow-hidden transition-all duration-500",
              selectedTargets.length > 0 ? "cursor-pointer" : "cursor-not-allowed opacity-50"
            )}
          >
            <div className={cn(
              "absolute inset-0 border border-accent/30 transition-all duration-500",
              selectedTargets.length > 0 ? "group-hover:border-accent/60 group-hover:bg-accent/5" : ""
            )} />
            
            <div className="relative flex items-center gap-4">
              <span className={cn(
                "font-display text-lg tracking-widest uppercase transition-colors",
                selectedTargets.length > 0 ? "text-accent" : "text-cloud"
              )}>
                Initiate Monitoring
              </span>
              <ChevronRight className={cn(
                "w-5 h-5 transition-all duration-300",
                selectedTargets.length > 0 ? "text-accent group-hover:translate-x-1" : "text-cloud"
              )} />
            </div>

            {/* Decorative lines */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-accent/50" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-accent/50" />
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}
