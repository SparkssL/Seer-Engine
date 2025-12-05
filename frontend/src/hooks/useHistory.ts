'use client'

import { useState, useCallback, useEffect } from 'react'
import type { AnalysisSession, HistoryFilter } from '@/lib/types'

interface UseHistoryProps {
  allSessions: AnalysisSession[]
}

export function useHistory({ allSessions }: UseHistoryProps) {
  const [filter, setFilter] = useState<HistoryFilter>({})
  const [filteredSessions, setFilteredSessions] = useState<AnalysisSession[]>(allSessions)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSession, setSelectedSession] = useState<AnalysisSession | null>(null)

  // Client-side filtering (immediate feedback)
  useEffect(() => {
    let filtered = [...allSessions]

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(s =>
        s.tweet.author.username.toLowerCase().includes(query) ||
        s.tweet.author.name.toLowerCase().includes(query) ||
        s.tweet.text.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filter.status && filter.status.length > 0) {
      filtered = filtered.filter(s => filter.status!.includes(s.status))
    }

    // Apply category filter
    if (filter.marketCategory && filter.marketCategory.length > 0) {
      filtered = filtered.filter(s =>
        s.marketImpacts.some(impact =>
          filter.marketCategory!.includes(impact.market.category)
        )
      )
    }

    // Apply confidence filter
    if (filter.minConfidence !== undefined) {
      filtered = filtered.filter(s =>
        s.marketImpacts.some(impact => impact.confidence >= (filter.minConfidence! / 100))
      )
    }

    // Apply date range filter
    if (filter.dateRange?.start || filter.dateRange?.end) {
      const start = filter.dateRange?.start ? new Date(filter.dateRange.start) : null
      const end = filter.dateRange?.end ? new Date(filter.dateRange.end) : null
      filtered = filtered.filter(s => {
        const sessionDate = new Date(s.startTime)
        if (start && sessionDate < start) return false
        if (end && sessionDate > end) return false
        return true
      })
    }

    setFilteredSessions(filtered)
  }, [allSessions, filter, searchQuery])

  const updateFilter = useCallback((newFilter: Partial<HistoryFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }))
  }, [])

  const clearFilter = useCallback(() => {
    setFilter({})
    setSearchQuery('')
  }, [])

  const openSessionDetail = useCallback((sessionId: string) => {
    const session = allSessions.find(s => s.id === sessionId)
    setSelectedSession(session || null)
  }, [allSessions])

  const closeSessionDetail = useCallback(() => {
    setSelectedSession(null)
  }, [])

  return {
    filter,
    filteredSessions,
    searchQuery,
    selectedSession,
    setSearchQuery,
    updateFilter,
    clearFilter,
    openSessionDetail,
    closeSessionDetail,
  }
}
