'use client'

import { motion } from 'framer-motion'

interface RadarScannerProps {
  isActive: boolean
  size?: number
}

export function RadarScanner({ isActive, size = 200 }: RadarScannerProps) {
  return (
    <div 
      className="relative"
      style={{ width: size, height: size }}
    >
      {/* Background circles */}
      <div className="absolute inset-0 rounded-full border border-neon-cyan/20" />
      <div 
        className="absolute rounded-full border border-neon-cyan/15"
        style={{ 
          top: '15%', left: '15%', right: '15%', bottom: '15%' 
        }}
      />
      <div 
        className="absolute rounded-full border border-neon-cyan/10"
        style={{ 
          top: '30%', left: '30%', right: '30%', bottom: '30%' 
        }}
      />
      
      {/* Center dot */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-2 h-2 rounded-full bg-neon-cyan"
          animate={isActive ? { 
            scale: [1, 1.5, 1],
            opacity: [1, 0.5, 1]
          } : {}}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </div>

      {/* Rotating sweep */}
      {isActive && (
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <div 
            className="absolute top-1/2 left-1/2 origin-left"
            style={{ 
              width: size / 2 - 4,
              height: 2,
              background: 'linear-gradient(90deg, rgba(0,255,247,0.8), transparent)'
            }}
          />
          {/* Sweep cone */}
          <svg 
            className="absolute inset-0" 
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <defs>
              <linearGradient id="sweepGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0,255,247,0.3)" />
                <stop offset="100%" stopColor="transparent" />
              </linearGradient>
            </defs>
            <path
              d="M50,50 L50,0 A50,50 0 0,1 93.3,25 Z"
              fill="url(#sweepGradient)"
            />
          </svg>
        </motion.div>
      )}

      {/* Blip dots when active */}
      {isActive && (
        <>
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-neon-green"
            style={{ top: '25%', left: '60%' }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          />
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-neon-cyan"
            style={{ top: '65%', left: '30%' }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          />
          <motion.div
            className="absolute w-1.5 h-1.5 rounded-full bg-neon-yellow"
            style={{ top: '40%', left: '75%' }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1.5 }}
          />
        </>
      )}
    </div>
  )
}

