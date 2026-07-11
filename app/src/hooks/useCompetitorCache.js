import { useEffect, useState } from 'react'
import { getCacheCompetitor } from '../api/endpoints'
import { COMP_CACHE_ALIASES } from '../utils/competitorMeta'
import { normalizeCompData } from '../utils/competitorData'

/**
 * Port of loadComp's cache-check path (radar-core.js:4258-4306), fetching
 * all 11 competitors in parallel (matches the CIOS/Sentiment pattern) since
 * this app has no per-tile "load on click" localStorage layer to defer to.
 */
export function useCompetitorCache(viewMode = 'b2c') {
  const [compData, setCompData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all(
      Object.keys(COMP_CACHE_ALIASES).map(async (id) => {
        const aliases = COMP_CACHE_ALIASES[id]
        for (const alias of aliases) {
          try {
            const payload = await getCacheCompetitor(alias, viewMode)
            const cacheData = payload?.data ?? payload
            const result = normalizeCompData(id, cacheData || null)
            if (result.hasSpecificCache) return [id, result]
          } catch {
            // try next alias
          }
        }
        return [id, normalizeCompData(id, null)]
      }),
    ).then((entries) => {
      if (cancelled) return
      setCompData(Object.fromEntries(entries))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [viewMode])

  return { compData, loading }
}
