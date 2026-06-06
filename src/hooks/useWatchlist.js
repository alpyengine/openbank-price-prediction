/**
 * useWatchlist — manages the current user's watchlist state.
 *
 * Provides:
 *   watchlist   — Set<string> of ticker strings currently in the watchlist
 *   loading     — true while initial load is in progress
 *   toggle(t)   — add if not present, remove if present
 *   isWatched(t)— true if ticker is in the watchlist
 *   reload()    — force reload from Supabase
 *
 * Data lives in Supabase `watchlist` table.
 * RLS ensures each user only sees their own rows.
 * State is a Set for O(1) lookup in isWatched().
 *
 * Usage:
 *   const { watchlist, toggle, isWatched } = useWatchlist()
 */
import { useState, useCallback, useEffect } from 'react'
import { loadWatchlist, addToWatchlist, removeFromWatchlist } from '@/services/storage.js'
import { isStorageConfigured } from '@/services/storage.js'

export function useWatchlist() {
  // Set<string> — ticker strings currently in the watchlist
  const [watchlist, setWatchlist] = useState(new Set())
  const [loading,   setLoading]   = useState(false)

  // Load watchlist from Supabase on mount
  const reload = useCallback(async () => {
    if (!isStorageConfigured()) return
    setLoading(true)
    const tickers = await loadWatchlist()
    setWatchlist(new Set(tickers))
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  /**
   * toggle — add ticker if not in watchlist, remove if present.
   * Updates local state optimistically before confirming with Supabase.
   *
   * @param {string} ticker — bare ticker e.g. 'MU'
   */
  const toggle = useCallback(async (ticker) => {
    const alreadyWatched = watchlist.has(ticker)

    // Optimistic update — instant UI feedback
    setWatchlist(prev => {
      const next = new Set(prev)
      if (alreadyWatched) next.delete(ticker)
      else next.add(ticker)
      return next
    })

    // Persist to Supabase
    const ok = alreadyWatched
      ? await removeFromWatchlist(ticker)
      : await addToWatchlist(ticker)

    // Revert optimistic update on failure
    if (!ok) {
      setWatchlist(prev => {
        const next = new Set(prev)
        if (alreadyWatched) next.add(ticker)
        else next.delete(ticker)
        return next
      })
    }
  }, [watchlist])

  /**
   * isWatched — O(1) check if a ticker is in the watchlist.
   *
   * @param {string} ticker — bare ticker e.g. 'MU'
   * @returns {boolean}
   */
  const isWatched = useCallback((ticker) => watchlist.has(ticker), [watchlist])

  return { watchlist, loading, toggle, isWatched, reload }
}
