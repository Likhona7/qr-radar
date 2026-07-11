import { useMemo } from 'react'
import { createSignalDedup } from './useSignalDedup'
import { itemDetail, itemTitle } from '../utils/signal'

const AUDIENCE_RE = /business|family|loyal|leisure|premium|transit|customer|passenger|elite|member|traveller|traveler|audience/i
const GROWING_RE = /increase|rising|spike|growth|surge|accelerat|active|volume|trend|emerging|ongoing/i
const COMPETITOR_RE = /emirates|etihad|turkish|singapore|ota|competitor|oneworld|skyteam|lufthansa|air france|delta|british|review|rating|award/i
const OTA_RE = /ota|direct|booking|agent|rebook|search|conversion|website|app|digital|checkout|abandon|refund/i
// Deliberately narrower than the legacy regex it was ported from (which had
// bare `ratings`/`ios`/`android` alternatives). Verified live against the
// real backend: the bare `ratings` alternative matched "AirlineRatings.com
// 'World's Best Airline 2026'" (an award announcement, not an app review)
// purely on substring, pulling non-app-store items into every App Ratings
// card. Genuine Apple/Google Play items still match via their source field
// (sourceName is "Apple App Store"/"Google Play", matched separately below),
// so this tightening doesn't lose real matches — only the false positive.
const APP_RATINGS_RE = /app store|google play|play store|app rating|app review|review score|ios app|android app/i

function textOf(item) {
  return `${itemTitle(item)} ${itemDetail(item)}`
}

/** Converts a raw sentiment-source object into a signal-shaped item so it can flow through the same SignalRow rendering as everything else — used only for AppRatings' source-level fallback (see comment below). */
function sourceAsSyntheticItem(source) {
  const detail = source.topComplaint || source.topPraise || 'No specific app-store signal text loaded yet for this source.'
  return {
    title: `${source.meta?.name || source.sourceName} app-store signal`,
    detail,
    source: source.meta?.name || source.sourceName,
    impact: source.sentimentLabel,
  }
}

/**
 * Port of renderCIOSPanels' aggregation (visual-fixes.js:594-630), computed
 * once per `sources` change (not per tab-switch — switching tabs must not
 * reshuffle other tabs' already-rendered content, verified in task #8).
 * Heatmap/Keywords/Narrative are comprehensive overview tabs and are
 * intentionally NOT deduped against the others (they're supposed to show
 * everything); the 7 "lens" tabs share one dedup pass in a fixed order.
 */
export function useCIOSSignals(sources) {
  return useMemo(() => {
    const issues = sources.flatMap((d) => (d.painPoints || []).map((p) => ({ source: d.sourceName || d.source, ...p })))
    const strengths = sources.flatMap((d) => (d.strengths || []).map((p) => ({ source: d.sourceName || d.source, ...p })))
    const improvements = sources.flatMap((d) => (d.improvements || []).map((p) => ({ source: d.sourceName || d.source, ...p })))
    const allSignals = [...issues, ...strengths, ...improvements]

    const pickFor = createSignalDedup()

    const audience = pickFor(issues.filter((x) => AUDIENCE_RE.test(textOf(x))), issues, Infinity)
    const growing = pickFor(issues.filter((x) => GROWING_RE.test(textOf(x))), issues, 8)
    const competitor = pickFor([...issues, ...improvements].filter((x) => COMPETITOR_RE.test(textOf(x))), allSignals, 8)
    const requests = pickFor(improvements, [], 0)
    const appRatingsFiltered = allSignals.filter((x) => APP_RATINGS_RE.test(`${textOf(x)} ${x.source || ''}`))
    const appRatingsFallback = sources
      .filter((s) => ['appstore', 'googleplay'].includes(s.sourceKey))
      .map(sourceAsSyntheticItem)
    const appRatings = pickFor(appRatingsFiltered, appRatingsFallback, appRatingsFallback.length)
    const ota = pickFor([...issues, ...improvements].filter((x) => OTA_RE.test(textOf(x))), issues, 8)
    const opportunities = pickFor([...improvements, ...strengths], [], 0)

    const keywordCounts = {}
    allSignals.forEach((i) => {
      textOf(i)
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, ' ')
        .split(/\s+/)
        .forEach((w) => {
          if (w.length > 3) keywordCounts[w] = (keywordCounts[w] || 0) + 1
        })
    })

    return {
      issues, strengths, improvements, allSignals,
      heatmap: issues,
      audience, growing, competitor, requests, appRatings, ota, opportunities,
      keywords: allSignals,
      keywordCounts,
      counts: {
        heatmap: issues.length, audience: audience.length, growing: growing.length,
        competitor: competitor.length, requests: requests.length, appratings: appRatings.length,
        ota: ota.length, opps: opportunities.length, keywords: Object.keys(keywordCounts).length,
      },
    }
  }, [sources])
}
