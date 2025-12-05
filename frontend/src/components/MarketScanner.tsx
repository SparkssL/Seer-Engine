'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, X } from 'lucide-react'
import type { Market } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MarketScannerProps {
  markets: Market[]
  relevantMarketIds: string[]
  isScanning: boolean
  scanProgress: number // 0 to 100
}

export function MarketScanner({ 
  markets, 
  relevantMarketIds, 
  isScanning,
  scanProgress 
}: MarketScannerProps) {
  return (
    <div className="space-y-2">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-mono text-silver">
          {isScanning ? 'Scanning markets...' : 'Scan complete'}
        </span>
        <span className="text-xs font-mono text-neon-cyan">
          {Math.round(scanProgress)}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="h-1 bg-graphite rounded-full overflow-hidden mb-4">
        <motion.div
          className="h-full bg-gradient-to-r from-neon-cyan to-neon-magenta"
          initial={{ width: '0%' }}
          animate={{ width: `${scanProgress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Market list with scanning effect */}
      <div className="space-y-1 max-h-[300px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {markets.map((market, index) => {
            const isRelevant = relevantMarketIds.includes(market.id)
            const isScanned = (index / markets.length) * 100 <= scanProgress
            const isCurrentlyScanning = isScanning && 
              Math.abs((index / markets.length) * 100 - scanProgress) < 10

            return (
              <motion.div
                key={market.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ 
                  opacity: isScanned ? 1 : 0.3,
                  x: 0,
                  scale: isCurrentlyScanning ? 1.02 : 1,
                }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg transition-all",
                  isRelevant && isScanned && "bg-neon-cyan/10 border border-neon-cyan/30",
                  !isRelevant && isScanned && "bg-void/50 opacity-40",
                  isCurrentlyScanning && "bg-neon-magenta/10 border border-neon-magenta/30"
                )}
              >
                {/* Status indicator */}
                <div className={cn(
                  "w-5 h-5 rounded flex items-center justify-center flex-shrink-0",
                  isRelevant && isScanned && "bg-neon-cyan text-void",
                  !isRelevant && isScanned && "bg-graphite text-steel",
                  isCurrentlyScanning && "bg-neon-magenta"
                )}>
                  {isScanned && !isCurrentlyScanning && (
                    isRelevant ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <X className="w-3 h-3" />
                    )
                  )}
                  {isCurrentlyScanning && (
                    <motion.div
                      className="w-2 h-2 rounded-full bg-white"
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Market info */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-xs truncate transition-colors",
                    isRelevant && isScanned ? "text-pearl font-medium" : "text-silver"
                  )}>
                    {market.question}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-steel">{market.category}</span>
                    {isRelevant && isScanned && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-[10px] px-1 py-0.5 rounded bg-neon-cyan/20 text-neon-cyan"
                      >
                        RELEVANT
                      </motion.span>
                    )}
                  </div>
                </div>

                {/* Relevance score for matched markets */}
                {isRelevant && isScanned && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-mono text-neon-cyan"
                  >
                    MATCH
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}

