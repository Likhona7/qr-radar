import { useCallback, useEffect, useState } from 'react'
import { CIOS_SOURCES, SENT_META, resolveSentimentForSource } from '../api/sentimentSources'

/**
 * Fetches all 13 CIOS sentiment sources in parallel and returns the ones with
 * real content, mirroring getAllSentimentSources() in visual-fixes.js:101-110.
 */
export function useSentimentSources(viewMode = 'b2c') {
  const [state, setState] = useState({ sources: [], loading: true, error: null, statusBySource: {} })

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }))
    let cancelled = false

    Promise.all(
      CIOS_SOURCES.map(async (src) => {
        try {
          const result = await resolveSentimentForSource(src, viewMode)
          return { src, result }
        } catch (err) {
          return { src, result: { status: 'error', error: err } }
        }
      }),
    ).then((results) => {
      if (cancelled) return
      const statusBySource = {}
      const sources = []
      for (const { src, result } of results) {
        statusBySource[src] = result.status
        if (result.status === 'loaded' || result.status === 'stale') {
          const d = result.data
          const hasContent =
            d.overallSentiment != null || (d.painPoints || []).length || (d.improvements || []).length || d.topComplaint
          if (hasContent) {
            sources.push({ ...d, sourceKey: src, meta: SENT_META[src] || { name: src }, cacheStatus: result.status })
          }
        }
      }
      setState({ sources, loading: false, error: null, statusBySource })
    })

    return () => {
      cancelled = true
    }
  }, [viewMode])

  useEffect(() => load(), [load])

  return { ...state, reload: load }
}
