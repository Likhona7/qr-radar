import { useRef } from 'react'
import { signalKey } from '../utils/signal'

/**
 * Cross-tab dedup for CIOS sub-tabs. Root cause of bug #4 (same signal
 * appearing verbatim in 4 tabs): renderCIOSPanels (visual-fixes.js:594-630)
 * lets each tab fall back to an unfiltered slice of the same shared pool
 * with no exclusion of items already claimed by an earlier tab.
 *
 * `seen` is reset once per full data load (the caller creates a fresh
 * useSignalDedup() instance per render pass of useCIOSSignals, not persisted
 * across tab-switch clicks) and consumed in a fixed tab order so later tabs
 * explicitly exclude items already shown by earlier tabs.
 *
 * Faithful to the legacy fallback behavior: if a tab's regex-filtered pool is
 * non-empty, ALL of it is used (uncapped, matching legacy); only the
 * fallback pool is capped (fallbackLimit), matching legacy's `.slice(0, 8)`.
 * If dedup empties out a tab's pool entirely, that's surfaced as a real
 * "nothing left to show" state rather than silently re-filled from
 * elsewhere — a tab legitimately running out of unclaimed items is a real
 * finding, not a bug to paper over.
 */
export function createSignalDedup() {
  const seen = new Set()
  return function pickFor(filteredCandidates, fallbackPool, fallbackLimit = 8) {
    const usingFallback = filteredCandidates.length === 0
    const pool = usingFallback ? fallbackPool.slice(0, fallbackLimit) : filteredCandidates
    const picked = []
    for (const item of pool) {
      const key = signalKey(item)
      if (seen.has(key)) continue
      seen.add(key)
      picked.push(item)
    }
    return picked
  }
}

// Kept as a hook wrapper for components that want a dedup instance scoped to
// their own lifetime (not currently used directly — useCIOSSignals creates
// one per aggregation pass instead, see that file for why).
export function useSignalDedup() {
  const ref = useRef(null)
  if (!ref.current) ref.current = createSignalDedup()
  return ref.current
}
