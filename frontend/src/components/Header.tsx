'use client'

import { motion } from 'framer-motion'
import { Activity, Zap, Eye } from 'lucide-react'
import type { ConnectionStatus } from '@/lib/types'

interface HeaderProps {
  status: ConnectionStatus
}

export function Header({ status }: HeaderProps) {
  const statusConfig = {
    disconnected: { color: 'text-steel', bg: 'bg-steel', label: 'Offline' },
    connecting: { color: 'text-neon-orange', bg: 'bg-neon-orange', label: 'Connecting...' },
    connected: { color: 'text-neon-green', bg: 'bg-neon-green', label: 'Live' },
    error: { color: 'text-danger', bg: 'bg-danger', label: 'Error' },
  }

  const config = statusConfig[status]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-neon-cyan/20">
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-magenta flex items-center justify-center">
                <Eye className="w-6 h-6 text-void" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-magenta opacity-50 blur-md"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold tracking-wider text-pearl">
                SEER ENGINE
              </h1>
              <p className="text-xs text-silver font-mono">AI PREDICTION ORACLE</p>
            </div>
          </motion.div>

          {/* Center Stats */}
          <motion.div 
            className="hidden md:flex items-center gap-8"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-neon-yellow" />
              <span className="font-mono text-sm text-silver">v1.0.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-neon-cyan" />
              <span className="font-mono text-sm text-silver">BNB Chain</span>
            </div>
          </motion.div>

          {/* Status */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-card border border-white/5">
              <div className="relative">
                <div className={`w-2 h-2 rounded-full ${config.bg}`} />
                {status === 'connected' && (
                  <motion.div
                    className={`absolute inset-0 rounded-full ${config.bg}`}
                    animate={{ scale: [1, 2, 1], opacity: [1, 0, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                )}
              </div>
              <span className={`font-mono text-sm ${config.color}`}>
                {config.label}
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </header>
  )
}

