'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Twitter, Heart, Repeat2, MessageCircle, BadgeCheck, ExternalLink, Sparkles, User, Rocket, TrendingUp, CheckCircle2, AlertCircle, Hash, Clock, Wallet } from 'lucide-react'
import type { Tweet, AnalysisSession, TradeExecution } from '@/lib/types'
import { formatNumber, formatTimestamp, truncateText, cn } from '@/lib/utils'

// Mapping handles to the avatars used in the selector
const AVATAR_MAP: Record<string, string> = {
  realDonaldTrump: 'https://pbs.twimg.com/profile_images/874276197357596672/kUuht00m_400x400.jpg',
  elonmusk: 'https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_400x400.jpg',
  cz_binance: 'https://pbs.twimg.com/profile_images/1450054312512233473/g10_f8gD_400x400.jpg',
  SBF_FTX: 'https://pbs.twimg.com/profile_images/1496242735224528901/8a4f0723_400x400.jpg',
  '0xTykoo': 'https://pbs.twimg.com/profile_images/1790424806007406592/rN_j34gR_400x400.jpg',
  Midaz_labs: 'https://pbs.twimg.com/profile_images/1785384425117163520/i2_u42d3_400x400.jpg'
}

interface TweetFeedProps {
  tweets: Tweet[]
  activeTweetId?: string
  activeSession?: AnalysisSession | null
  sessions?: AnalysisSession[]
}

export function TweetFeed({ tweets, activeTweetId, activeSession, sessions = [] }: TweetFeedProps) {
  // Collect all trades from all completed sessions
  const allTrades: Array<TradeExecution & { tweetText?: string, tweetAuthor?: string, timestamp?: string }> = []

  // Gather trades from sessions
  for (const session of sessions) {
    if (session.trades && session.trades.length > 0) {
      for (const trade of session.trades) {
        allTrades.push({
          ...trade,
          tweetText: session.tweet?.text,
          tweetAuthor: session.tweet?.author?.username,
          timestamp: trade.timestamp || session.endTime || session.startTime
        })
      }
    }
  }

  // Add active session trades if any
  if (activeSession?.trades && activeSession.trades.length > 0) {
    for (const trade of activeSession.trades) {
      allTrades.push({
        ...trade,
        tweetText: activeSession.tweet?.text,
        tweetAuthor: activeSession.tweet?.author?.username,
        timestamp: trade.timestamp || activeSession.endTime || activeSession.startTime
      })
    }
  }

  return (
    <div className="h-full flex flex-col rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-surface/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center border border-accent/20">
            <Twitter className="w-4 h-4 text-accent" />
          </div>
          <h3 className="font-display font-medium text-sand tracking-wide">SIGNAL INGESTION</h3>
        </div>
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-white/5 border border-white/5">
          <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          <span className="text-[10px] font-mono text-accent/80 uppercase">Live Stream</span>
        </div>
      </div>

      {/* Tweet List + Trade Executions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {/* Trade Execution Cards - Show at Top */}
          {allTrades.length > 0 && allTrades.map((trade, idx) => (
            <motion.div
              key={`trade-${trade.id}-${idx}`}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 200, delay: idx * 0.1 }}
              className={cn(
                "p-5 rounded-xl border-2 relative overflow-hidden",
                trade.status === 'confirmed' && "bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]",
                trade.status === 'failed' && "bg-red-500/10 border-red-500/50"
              )}
            >
              {/* Glow effect for confirmed trades */}
              {trade.status === 'confirmed' && (
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
              )}

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50">
                      <Rocket className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-bold text-green-400 uppercase tracking-wider">
                          Trade Executed
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase",
                          trade.status === 'confirmed' && "bg-green-500/20 text-green-400 border border-green-500/50",
                          trade.status === 'failed' && "bg-red-500/20 text-red-400 border border-red-500/50"
                        )}>
                          {trade.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-cloud/50 font-mono mt-0.5">
                        {formatTimestamp(trade.timestamp || new Date().toISOString())}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Trade Details Grid */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                    <p className="text-[10px] text-cloud/50 uppercase mb-1">Action</p>
                    <p className={cn(
                      "text-base font-mono font-bold",
                      trade.side === 'YES' && "text-green-400",
                      trade.side === 'NO' && "text-red-400"
                    )}>
                      {trade.side}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                    <p className="text-[10px] text-cloud/50 uppercase mb-1">Amount</p>
                    <p className="text-base font-mono font-bold text-accent">
                      ${trade.amount.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                    <p className="text-[10px] text-cloud/50 uppercase mb-1">Price</p>
                    <p className="text-base font-mono font-bold text-sand">
                      ${trade.price.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-surface/50 border border-white/10">
                    <p className="text-[10px] text-cloud/50 uppercase mb-1">Market</p>
                    <p className="text-xs font-mono text-cloud truncate">
                      #{trade.marketId}
                    </p>
                  </div>
                </div>

                {/* Tweet Context */}
                {trade.tweetText && (
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-[10px] text-cloud/50 uppercase mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Triggered By
                    </p>
                    <p className="text-xs text-sand/80 leading-relaxed">
                      {truncateText(trade.tweetText, 140)}
                    </p>
                    {trade.tweetAuthor && (
                      <p className="text-[10px] text-cloud/50 font-mono mt-1">@{trade.tweetAuthor}</p>
                    )}
                  </div>
                )}

                {/* Transaction Details */}
                {trade.txHash && (
                  <div className="mt-3 space-y-2">
                    {/* Transaction Hash with BscScan Link */}
                    <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-green-400 uppercase flex items-center gap-1.5 font-bold">
                          <Hash className="w-3 h-3" />
                          Transaction Hash
                        </p>
                        <a
                          href={`https://bscscan.com/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors"
                        >
                          View on BscScan
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs font-mono text-sand/80 break-all bg-surface/50 p-2 rounded border border-white/5">
                        {trade.txHash}
                      </p>
                    </div>

                    {/* View Transaction Button */}
                    <a
                      href={`https://bscscan.com/tx/${trade.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "w-full flex items-center justify-center gap-2 p-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wide transition-all",
                        "bg-gradient-to-r from-green-500/20 to-green-600/20 border border-green-500/30",
                        "text-green-400 hover:from-green-500/30 hover:to-green-600/30 hover:border-green-500/50"
                      )}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on BscScan
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Tweets */}
          {tweets.length === 0 && allTrades.length === 0 ? (
            <motion.div
              className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
            >
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <p className="text-sand font-light">Awaiting signals...</p>
              <p className="text-xs text-cloud font-mono mt-2">Monitoring designated vectors</p>
            </motion.div>
          ) : (
            tweets.map((tweet, index) => {
              // Try to match author username to our avatar map, otherwise fallback
              const avatarUrl = AVATAR_MAP[tweet.author.username] || tweet.author.avatar;
              
              return (
                <motion.div
                  key={tweet.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    borderColor: activeTweetId === tweet.id ? '#d4af37' : 'rgba(255,255,255,0.05)'
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className={`p-5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                    activeTweetId === tweet.id 
                      ? 'bg-accent/5 shadow-[0_0_30px_rgba(212,175,55,0.05)]' 
                      : 'bg-surface/50 hover:bg-surface/70'
                  }`}
                >
                  {/* Active Indicator Line */}
                  {activeTweetId === tweet.id && (
                    <motion.div 
                      layoutId="active-tweet-indicator"
                      className="absolute left-0 top-0 bottom-0 w-1 bg-accent" 
                    />
                  )}

                  {/* Author Header */}
                  <div className="flex items-start gap-3 mb-3 pl-2">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-surface">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={tweet.author.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                            <User className="w-5 h-5 text-cloud" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-0.5 border border-black">
                         <Twitter className="w-3 h-3 text-[#1DA1F2] fill-current" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-display font-medium text-sand truncate text-sm">
                          {tweet.author.name}
                        </span>
                        {tweet.author.verified && (
                          <BadgeCheck className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                        )}
                        <span className="text-xs text-cloud font-mono truncate ml-1 opacity-60">
                          @{tweet.author.username}
                        </span>
                      </div>
                      <span className="text-[10px] text-cloud/50 font-mono uppercase tracking-wider">
                        {formatTimestamp(tweet.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Tweet Content */}
                  <div className="pl-[3.25rem] pr-2">
                    <p className="text-cloud/90 text-sm font-light leading-relaxed mb-4">
                      {truncateText(tweet.text, 280)}
                    </p>

                    {/* Metrics */}
                    {tweet.metrics && (
                      <div className="flex items-center gap-6 text-cloud/40 border-t border-white/5 pt-3">
                        <div className="flex items-center gap-1.5 text-xs hover:text-accent transition-colors">
                          <Heart className="w-3.5 h-3.5" />
                          <span className="font-mono">{formatNumber(tweet.metrics.likes)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs hover:text-accent transition-colors">
                          <Repeat2 className="w-3.5 h-3.5" />
                          <span className="font-mono">{formatNumber(tweet.metrics.retweets)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs hover:text-accent transition-colors">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="font-mono">{formatNumber(tweet.metrics.replies)}</span>
                        </div>
                        <div className="flex-1" />
                        <ExternalLink className="w-3.5 h-3.5 hover:text-accent cursor-pointer transition-colors" />
                      </div>
                    )}
                  </div>

                  {/* Processing State Overlay */}
                  {activeTweetId === tweet.id && (
                    <motion.div
                      className="absolute top-4 right-4"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="px-2 py-1 rounded border border-accent/30 bg-accent/10 backdrop-blur-md flex items-center gap-2">
                        <motion.div
                          className="w-1.5 h-1.5 bg-accent rounded-full"
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                        <span className="text-[10px] font-mono text-accent tracking-widest uppercase">Processing</span>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
