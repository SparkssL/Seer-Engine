'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, Minus, Zap, DollarSign, 
  BarChart3, ArrowRight, Scale, Activity
} from 'lucide-react'
import type { MarketImpact, TradeExecution, Market } from '@/lib/types'
import { cn, formatNumber, formatPercentage } from '@/lib/utils'
import { SentimentMeter } from './SentimentMeter'
import { OrderTicket } from './OrderTicket'

interface MarketImpactPanelProps {
  impacts: MarketImpact[]
  trades: TradeExecution[]
  markets: Market[]
}

function ImpactCard({ impact, index }: { impact: MarketImpact; index: number }) {
  return (
    <motion.div
      className="p-5 rounded-xl border border-white/10 bg-surface/40 backdrop-blur-sm relative overflow-hidden"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay: index * 0.15, duration: 0.4 }}
    >
       {/* Decorative gradient background */}
       <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <div className="flex justify-between items-start mb-4">
         <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="inline-flex items-center gap-2 px-2 py-1 rounded border border-white/10 bg-white/5 text-[10px] font-mono text-cloud uppercase">
                <Scale className="w-3 h-3" />
                <span>{impact.market.category}</span>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.15 + 0.2 }}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-1 rounded border text-[10px] font-mono uppercase font-bold",
                  impact.confidence >= 0.9 ? "border-green-400/30 bg-green-400/10 text-green-400" :
                  impact.confidence >= 0.7 ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-400" :
                  impact.confidence >= 0.5 ? "border-orange-400/30 bg-orange-400/10 text-orange-400" :
                  impact.confidence >= 0.3 ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400" :
                  "border-red-400/30 bg-red-400/10 text-red-400"
                )}
              >
                🎯 {Math.round(impact.confidence * 100)}%
              </motion.div>
            </div>
            <h4 className="font-display text-lg text-sand leading-snug max-w-md">
               {impact.market.question}
            </h4>
         </div>
         <div className="text-right">
            <div className="text-xs text-cloud font-mono mb-1">Impact Score</div>
            <div className="text-2xl font-display text-accent">{Math.round(impact.impactScore * 100)}</div>
         </div>
      </div>

      {/* Analysis Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
         {/* Left: Reasoning */}
         <div className="p-4 rounded-lg bg-black/20 border border-white/5">
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-cloud uppercase">
               <Activity className="w-3 h-3" /> Signal Logic
            </div>
            <p className="text-sm text-sand/80 font-light leading-relaxed">
               {impact.reasoning}
            </p>
         </div>

         {/* Right: Market Stats & Sentiment */}
         <div className="flex flex-col gap-2">
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
               <span className="text-xs text-cloud">Sentiment</span>
               <div className={cn(
                  "flex items-center gap-1 font-mono text-sm",
                  impact.sentiment === 'POSITIVE' ? "text-green-400" : 
                  impact.sentiment === 'NEGATIVE' ? "text-red-400" : "text-cloud"
               )}>
                  {impact.sentiment === 'POSITIVE' && <TrendingUp className="w-3 h-3" />}
                  {impact.sentiment === 'NEGATIVE' && <TrendingDown className="w-3 h-3" />}
                  {impact.sentiment}
               </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
               <span className="text-xs text-cloud">Relevance</span>
               <div className="font-mono text-sm text-sand">
                  {Math.round(impact.relevanceScore * 100)}%
               </div>
            </div>
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between">
               <span className="text-xs text-cloud">Liquidity</span>
               <div className="font-mono text-sm text-sand">
                  ${formatNumber(impact.market.liquidity)}
               </div>
            </div>
         </div>
      </div>

      {/* Action Area */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between">
         <div className="flex gap-4">
            {impact.market.outcomes.slice(0, 2).map(outcome => (
               <div key={outcome.id} className="text-xs">
                  <span className="text-cloud block mb-0.5">{outcome.name}</span>
                  <span className="text-sand font-mono">{formatPercentage(outcome.probability)}</span>
               </div>
            ))}
         </div>

         {impact.tradeDecision.action !== 'HOLD' ? (
            <div className={cn(
               "px-4 py-2 rounded flex items-center gap-3 font-mono text-sm border",
               impact.tradeDecision.action === 'BUY' 
                  ? "bg-green-500/10 border-green-500/30 text-green-400" 
                  : "bg-red-500/10 border-red-500/30 text-red-400"
            )}>
               <span className="font-bold">{impact.tradeDecision.action}</span>
               <span className={cn(
                  "px-1.5 py-0.5 rounded text-black font-bold text-xs",
                  impact.tradeDecision.side === 'YES' ? "bg-green-400" : "bg-red-400"
               )}>
                  {impact.tradeDecision.side}
               </span>
               <span className="text-sand/70 text-xs border-l border-white/10 pl-3">
                  ${impact.tradeDecision.sizeUsdc} USDC
               </span>
            </div>
         ) : (
            <div className="px-3 py-1.5 rounded border border-white/10 bg-white/5 text-xs text-cloud font-mono">
               NO TRADE SIGNAL
            </div>
         )}
      </div>
    </motion.div>
  )
}

export function MarketImpactPanel({ impacts, trades, markets }: MarketImpactPanelProps) {
  return (
    <div className="h-full flex flex-col rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-surface/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
            <BarChart3 className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-display font-medium text-sand tracking-wide">MARKET EXECUTION</h3>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono text-cloud">
           <span>{impacts.length} ANALYZED</span>
           <span>{trades.length} EXECUTED</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
         {impacts.length === 0 && trades.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
               <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-sand" />
               </div>
               <p className="text-sand">No market impacts detected</p>
               <p className="text-xs text-cloud mt-1 font-mono">System standing by for actionable signals</p>
            </div>
         ) : (
            <div className="space-y-8">
               {/* Orders Section */}
               {trades.length > 0 && (
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 text-xs font-mono text-accent uppercase tracking-widest">
                        <Zap className="w-3 h-3" /> Active Orders
                     </div>
                     <div className="grid grid-cols-1 gap-4">
                        <AnimatePresence>
                           {trades.map(trade => (
                              <OrderTicket 
                                 key={trade.id} 
                                 trade={trade} 
                                 market={markets.find(m => m.id === trade.marketId)}
                              />
                           ))}
                        </AnimatePresence>
                     </div>
                  </div>
               )}

               {/* Analysis Section */}
               {impacts.length > 0 && (
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 text-xs font-mono text-sand/50 uppercase tracking-widest">
                        <TrendingUp className="w-3 h-3" /> Impact Analysis
                     </div>
                     <div className="space-y-4">
                        <AnimatePresence>
                           {impacts.map((impact, index) => (
                              <ImpactCard key={impact.marketId} impact={impact} index={index} />
                           ))}
                        </AnimatePresence>
                     </div>
                  </div>
               )}
            </div>
         )}
      </div>
    </div>
  )
}
