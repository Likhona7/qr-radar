import { useEffect, useState } from 'react'
import { getCacheCustomerIntel } from '../api/endpoints'
import { CI_SEGMENTS } from '../utils/customerIntelMeta'
import { normalizeCIData } from '../utils/customerIntelData'

/** Port of loadCI's cache-check path (customer-os.js:1207-1254), fetching all 7 segments in parallel. */
export function useCustomerIntelCache(viewMode = 'b2c') {
  const [ciData, setCiData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all(
      CI_SEGMENTS.map(async (seg) => {
        try {
          const payload = await getCacheCustomerIntel(seg, viewMode)
          const backendData = payload?.data ?? payload
          if (backendData?.segmentName || backendData?.bookingBehaviour || backendData?.painPoints) {
            return [seg, normalizeCIData(seg, backendData)]
          }
        } catch {
          // fall through to empty
        }
        return [seg, normalizeCIData(seg, null)]
      }),
    ).then((entries) => {
      if (cancelled) return
      setCiData(Object.fromEntries(entries))
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [viewMode])

  return { ciData, loading }
}
