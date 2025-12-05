'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Twitter, Heart, Repeat2, MessageCircle, BadgeCheck, ExternalLink, Sparkles, User } from 'lucide-react'
import type { Tweet } from '@/lib/types'
import { formatNumber, formatTimestamp, truncateText } from '@/lib/utils'

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
}

export function TweetFeed({ tweets, activeTweetId }: TweetFeedProps) {
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

      {/* Tweet List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {tweets.length === 0 ? (
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
