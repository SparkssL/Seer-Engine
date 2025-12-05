'use client'

import { motion } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, DollarSign, Users, 
  Clock, Activity, ChevronRight, Search
} from 'lucide-react'
import type { Market } from '@/lib/types'
import { cn, formatNumber, formatPercentage } from '@/lib/utils'
import { useState } from 'react'

interface MarketsOverviewProps {
  markets: Market[]
  highlightedMarkets?: string[]
}

export function MarketsOverview({ markets, highlightedMarkets = [] }: MarketsOverviewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = Array.from(new Set(markets.map(m => m.category)))
  
  const filteredMarkets = markets.filter(market => {
    const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || market.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="glass-card rounded-2xl border border-neon-blue/20 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center">
              <Activity className="w-4 h-4 text-void" />
            </div>
            <h3 className="font-display font-semibold text-pearl">ACTIVE MARKETS</h3>
          </div>
          <span className="text-xs font-mono text-silver">
            {markets.length} markets
          </span>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel" />
            <input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-obsidian border border-white/10 text-pearl text-sm placeholder:text-steel focus:outline-none focus:border-neon-cyan/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all",
                !selectedCategory
                  ? "bg-neon-cyan text-void"
                  : "bg-graphite text-silver hover:text-pearl"
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all",
                  selectedCategory === cat
                    ? "bg-neon-cyan text-void"
                    : "bg-graphite text-silver hover:text-pearl"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto">
        {filteredMarkets.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Activity className="w-12 h-12 text-steel mx-auto mb-4" />
            <p className="text-silver">No markets found</p>
          </div>
        ) : (
          filteredMarkets.map((market, index) => (
            <motion.div
              key={market.id}
              className={cn(
                "market-card p-4 rounded-xl border bg-obsidian/50 cursor-pointer group",
                highlightedMarkets.includes(market.id)
                  ? "border-neon-cyan/50 shadow-neon-cyan"
                  : "border-white/5 hover:border-white/10"
              )}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02 }}
            >
              {/* Question */}
              <h4 className="font-body font-semibold text-pearl text-sm leading-tight mb-3 line-clamp-2 group-hover:text-neon-cyan transition-colors">
                {market.question}
              </h4>

              {/* Category & Status */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-graphite text-silver">
                  {market.category}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-xs font-mono",
                  market.status === 'active' 
                    ? "bg-neon-green/20 text-neon-green" 
                    : "bg-steel/20 text-steel"
                )}>
                  {market.status}
                </span>
              </div>

              {/* Outcomes */}
              <div className="space-y-2 mb-3">
                {market.outcomes.slice(0, 2).map(outcome => (
                  <div 
                    key={outcome.id}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs text-silver">{outcome.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-pearl">
                        {formatPercentage(outcome.probability)}
                      </span>
                      {outcome.change24h !== 0 && (
                        <span className={cn(
                          "flex items-center text-xs",
                          outcome.change24h > 0 ? "text-neon-green" : "text-danger"
                        )}>
                          {outcome.change24h > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {Math.abs(outcome.change24h).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-steel">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>{formatNumber(market.volume)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{formatNumber(market.liquidity)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(market.endDate).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Highlighted indicator */}
              {highlightedMarkets.includes(market.id) && (
                <motion.div
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-neon-cyan"
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

