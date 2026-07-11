import { useCallback, useEffect, useState } from 'react'
import { getCacheLatest, getCacheDomain } from '../api/endpoints'
import { getDomainOrder, domainResultFromBackend, getDomainPriorityScore } from '../utils/domainSignal'

/**
 * Port of loadBackendCacheFirst (radar-core.js:1490-1582) — the read-only
 * cache path. Fetches /api/cache/latest to find which domains have a saved
 * refresh, then /api/cache/domain/:id for each. No /api/claude call
 * anywhere in this path (confirmed during exploration) — this is purely
 * "fetch cached domain JSON, map to view model," unlike startFresh/
 * resumeRefresh which trigger live AI generation (out of scope, see plan).
 */
export function useDomainCache(viewMode = 'b2c') {
  const [domData, setDomData] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadedCount, setLoadedCount] = useState(0)
  const [status, setStatus] = useState('Loading saved Radar intelligence from backend…')

  const domains = getDomainOrder(viewMode)

  const load = useCallback(() => {
    let cancelled = false
    setLoading(true)
    setStatus('Loading saved Radar intelligence from backend…')

    ;(async () => {
      try {
        const latestRaw = await getCacheLatest(viewMode)
        const latest = latestRaw?.data ? { ...latestRaw.data, meta: latestRaw.meta || latestRaw.data.meta } : latestRaw
        const available = Array.isArray(latest?.refreshes) ? latest.refreshes : []
        const uniqueDomains = []
        available.forEach((r) => { if (r?.domain_id && !uniqueDomains.includes(r.domain_id)) uniqueDomains.push(r.domain_id) })

        const next = {}
        let loaded = 0
        for (const domainId of uniqueDomains) {
          if (!domains.includes(domainId)) continue
          try {
            const payload = await getCacheDomain(domainId, viewMode)
            const backendSignals = payload?.data?.signals || payload?.signals || []
            if (payload?.cached === false && backendSignals.length === 0) continue
            if (!backendSignals.length) continue
            next[domainId] = domainResultFromBackend(domainId, payload?.data || payload, viewMode)
            loaded++
          } catch {
            // one domain failing to load shouldn't block the rest
          }
        }

        if (cancelled) return
        setDomData(next)
        setLoadedCount(loaded)
        setStatus(loaded > 0
          ? `${loaded} of ${domains.length} domains loaded from backend/Supabase cache`
          : 'No backend cache found for this view — nothing to display yet.')
      } catch (err) {
        if (cancelled) return
        setStatus(`Could not load backend cache: ${err.message}`)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [viewMode, domains.join(',')])

  useEffect(() => load(), [load])

  const orderedDomains = [...domains].sort((a, b) => getDomainPriorityScore(b, domData[b], viewMode) - getDomainPriorityScore(a, domData[a], viewMode))

  return { domData, domains: orderedDomains, loading, loadedCount, status, reload: load }
}
