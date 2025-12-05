'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, DollarSign, TrendingUp, TrendingDown, Hash } from 'lucide-react'
import type { TradeExecution, Market } from '@/lib/types'
import { cn } from '@/lib/utils'

interface OrderTicketProps {
  trade: TradeExecution
  market?: Market
}

export function OrderTicket({ trade, market }: OrderTicketProps) {
  const isConfirmed = trade.status === 'confirmed'
  const isFailed = trade.status === 'failed'
  const isPending = trade.status === 'pending'

  return (
    <motion.div
      className={cn(
        "relative p-5 rounded-xl border overflow-hidden bg-surface shadow-xl",
        isConfirmed ? "border-green-500/30" : isFailed ? "border-red-500/30" : "border-accent/30"
      )}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
    >
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -z-10" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-accent/5 rounded-full blur-xl -z-10" />
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4 border-b border-dashed border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-white/5">
             <Hash className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="flex flex-col">
             <span className="font-display text-[10px] text-cloud uppercase tracking-wider">Order ID</span>
             <span className="font-mono text-xs text-sand">#{trade.id.slice(-8)}</span>
          </div>
        </div>
        <div className={cn(
          "px-2 py-1 rounded text-[10px] font-mono font-bold uppercase tracking-wide border",
          trade.side === 'YES' 
             ? "bg-green-500/10 text-green-400 border-green-500/20" 
             : "bg-red-500/10 text-red-400 border-red-500/20"
        )}>
          Position: {trade.side}
        </div>
      </div>

      {/* Market Context */}
      {market && (
        <div className="mb-4">
           <p className="text-[10px] text-cloud font-mono uppercase mb-1">Market Contract</p>
           <div className="text-sm text-sand font-medium leading-snug line-clamp-2">
             {market.question}
           </div>
        </div>
      )}

      {/* Financial Details Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[10px] text-cloud uppercase font-mono mb-1">Position Size</div>
          <div className="font-mono text-lg text-sand flex items-center gap-1">
            <span className="text-accent">$</span>
            {trade.amount}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-white/5 border border-white/5">
          <div className="text-[10px] text-cloud uppercase font-mono mb-1">Entry Price</div>
          <div className="font-mono text-lg text-sand flex items-center gap-1">
            {trade.side === 'YES' ? (
              <TrendingUp className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
            {(trade.price * 100).toFixed(1)}<span className="text-xs text-cloud">%</span>
          </div>
        </div>
      </div>

      {/* Footer / Transaction Info */}
      <div className="flex items-center justify-between text-xs text-cloud/60 font-mono">
         <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {new Date(trade.timestamp).toLocaleTimeString()}
         </div>
         {trade.txHash && (
            <a href={`https://testnet.bscscan.com/tx/${trade.txHash}`} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors truncate max-w-[100px]">
               View TX ↗
            </a>
         )}
      </div>

      {/* Status Stamp Overlay */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20"
        initial={{ scale: 1.5, opacity: 0, rotate: -12 }}
        animate={{ 
          scale: 1, 
          opacity: isConfirmed ? 1 : isFailed ? 1 : 0,
          rotate: -12
        }}
        transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 15 }}
      >
        <div className={cn(
          "px-4 py-1 border-2 text-xl font-black tracking-widest uppercase transform -rotate-12 opacity-80 mix-blend-screen",
          isConfirmed && "border-green-500 text-green-500",
          isFailed && "border-red-500 text-red-500"
        )}>
          {isConfirmed && 'EXECUTED'}
          {isFailed && 'REJECTED'}
        </div>
      </motion.div>
    </motion.div>
  )
}



