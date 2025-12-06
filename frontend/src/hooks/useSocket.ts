'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ConnectionStatus, Tweet, Market, AnalysisSession, Source, SessionAnalytics } from '@/lib/types'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'

interface Balance {
  available: number
  symbol: string
}

interface UseSocketReturn {
  status: ConnectionStatus
  tweets: Tweet[]
  markets: Market[]
  sessions: AnalysisSession[]
  activeSession: AnalysisSession | null
  analytics: SessionAnalytics | null
  balance: Balance | null
  connect: (sources: Source[]) => void
  disconnect: () => void
}

export function useSocket(): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [activeSession, setActiveSession] = useState<AnalysisSession | null>(null)
  const [analytics, setAnalytics] = useState<SessionAnalytics | null>(null)
  const [balance, setBalance] = useState<Balance | null>(null)

  const connect = useCallback((sources: Source[]) => {
    if (socketRef.current?.connected) return

    setStatus('connecting')
    
    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socket.on('connect', () => {
      setStatus('connected')
      // Send selected sources to backend
      socket.emit('configure', { sources: sources.filter(s => s.enabled) })
    })

    socket.on('disconnect', () => {
      setStatus('disconnected')
    })

    socket.on('connect_error', () => {
      setStatus('error')
    })

    // Handle incoming tweets
    socket.on('tweet', (tweet: Tweet) => {
      setTweets(prev => [tweet, ...prev].slice(0, 50))
    })

    // Handle markets update
    socket.on('markets', (data: Market[]) => {
      setMarkets(data)
    })

    // Handle new analysis session
    socket.on('session:start', (session: AnalysisSession) => {
      setActiveSession(session)
      setSessions(prev => [session, ...prev].slice(0, 500))
    })

    // Handle session updates
    socket.on('session:update', (session: AnalysisSession) => {
      setActiveSession(prev => {
        if (prev?.id === session.id) return session
        return prev
      })
      setSessions(prev => prev.map(s => s.id === session.id ? session : s))
    })

    // Handle session complete
    socket.on('session:complete', (session: AnalysisSession) => {
      setActiveSession(session)
      setSessions(prev => prev.map(s => s.id === session.id ? session : s))
    })

    // Handle analytics updates
    socket.on('sessions:analytics', (data: SessionAnalytics) => {
      setAnalytics(data)
    })

    // Handle balance updates
    socket.on('balance', (data: Balance) => {
      setBalance(data)
    })

    socketRef.current = socket
  }, [])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setStatus('disconnected')
    setActiveSession(null)
  }, [])

  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    status,
    tweets,
    markets,
    sessions,
    activeSession,
    analytics,
    balance,
    connect,
    disconnect,
  }
}

