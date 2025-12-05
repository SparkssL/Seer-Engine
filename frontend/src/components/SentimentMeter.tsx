'use client'

import { motion, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

interface SentimentMeterProps {
  value: number // 0 to 100
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  label?: string
}

export function SentimentMeter({ value, sentiment, label }: SentimentMeterProps) {
  // Animated spring value
  const springValue = useSpring(0, { stiffness: 50, damping: 15 })
  
  // Transform to rotation (-90 to 90 degrees)
  const rotation = useTransform(springValue, [0, 100], [-90, 90])

  useEffect(() => {
    springValue.set(value)
  }, [value, springValue])

  const sentimentColors = {
    POSITIVE: { main: '#39ff14', glow: 'rgba(57,255,20,0.3)' },
    NEGATIVE: { main: '#ff3366', glow: 'rgba(255,51,102,0.3)' },
    NEUTRAL: { main: '#8b8b9e', glow: 'rgba(139,139,158,0.3)' },
  }

  const colors = sentimentColors[sentiment]

  return (
    <div className="flex flex-col items-center">
      {/* Meter container */}
      <div className="relative w-32 h-16 overflow-hidden">
        {/* Background arc */}
        <svg className="w-full h-full" viewBox="0 0 100 50">
          {/* Gradient definitions */}
          <defs>
            <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff3366" />
              <stop offset="50%" stopColor="#8b8b9e" />
              <stop offset="100%" stopColor="#39ff14" />
            </linearGradient>
          </defs>
          
          {/* Background arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* Colored arc */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#meterGradient)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* Scale markers */}
          {[0, 25, 50, 75, 100].map((mark) => {
            const angle = ((mark / 100) * 180 - 90) * (Math.PI / 180)
            const x = 50 + 40 * Math.cos(angle)
            const y = 50 + 40 * Math.sin(angle)
            const innerX = 50 + 32 * Math.cos(angle)
            const innerY = 50 + 32 * Math.sin(angle)
            
            return (
              <line
                key={mark}
                x1={innerX}
                y1={innerY}
                x2={x}
                y2={y}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1"
              />
            )
          })}
        </svg>

        {/* Needle */}
        <motion.div
          className="absolute bottom-0 left-1/2"
          style={{ 
            rotate: rotation,
            originX: '50%',
            originY: '100%',
            x: '-50%',
          }}
        >
          <div 
            className="w-0.5 h-12 rounded-full"
            style={{ 
              background: `linear-gradient(to top, ${colors.main}, transparent)`,
              boxShadow: `0 0 10px ${colors.glow}`
            }}
          />
          {/* Needle base */}
          <div 
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
            style={{ 
              backgroundColor: colors.main,
              boxShadow: `0 0 10px ${colors.glow}`
            }}
          />
        </motion.div>

        {/* Center pivot */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-obsidian border border-white/20" />
      </div>

      {/* Value display */}
      <motion.div 
        className="mt-2 font-mono text-2xl font-bold"
        style={{ color: colors.main }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {Math.round(value)}%
      </motion.div>

      {/* Sentiment label */}
      <div 
        className="text-xs font-display uppercase tracking-wider mt-1"
        style={{ color: colors.main }}
      >
        {sentiment} {label && `• ${label}`}
      </div>
    </div>
  )
}

