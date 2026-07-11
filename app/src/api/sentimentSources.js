// Port of the real sentiment-source fetch/normalize pipeline, traced from
// scripts/customer-os.js (fetchSentimentFromBackend, resolveSentimentForSource,
// SENT_META, SENT_CACHE_ALIASES, hasSentimentContent, sentimentPayloadMatchesSource,
// parseSentimentCacheEnvelope) and scripts/radar-core.js (normalizeSentimentData,
// asArray/firstText/safeScore/emptySentiment helpers).
//
// Scope note: the legacy app has a third fallback (deriving a source's sentiment
// from the already-loaded 14-domain cache, via sentimentFromDomainCache) for when
// both the backend fetch and localStorage are empty. That fallback depends on the
// main Intelligence dashboard's domain data, which Phase 1 doesn't port — so this
// version supports the backend-fetch and localStorage-cache paths only, matching
// what a fresh CIOS-only visit would actually exercise.

import { BACKEND_URL } from './backend'

export const CIOS_SOURCES = [
  'reddit', 'flyertalk', 'trustpilot', 'skytrax', 'tripadvisor', 'quora',
  'twitter', 'youtube', 'bluesky', 'mastodon', 'consumer', 'appstore', 'googleplay',
]

export const SENT_META = {
  reddit: { name: 'Reddit', color: '#FF4500' },
  flyertalk: { name: 'FlyerTalk', color: '#1a3a8a' },
  trustpilot: { name: 'Trustpilot', color: '#00b67a' },
  tripadvisor: { name: 'TripAdvisor', color: '#34e0a1' },
  skytrax: { name: 'Skytrax', color: '#1a1a6a' },
  quora: { name: 'Quora', color: '#b92b27' },
  twitter: { name: 'X/Twitter', color: '#1da1f2' },
  consumer: { name: 'Consumer Affairs', color: '#e67e22' },
  appstore: { name: 'Apple App Store', color: '#111827' },
  googleplay: { name: 'Google Play', color: '#4285f4' },
  youtube: { name: 'YouTube Data API', color: '#ff0000' },
  bluesky: { name: 'Bluesky AT Protocol', color: '#1185fe' },
  mastodon: { name: 'Mastodon API', color: '#6364ff' },
}

const SENT_CACHE_ALIASES = {
  twitter: ['twitter', 'x'],
  youtube: ['youtube', 'youtube_data_api', 'video', 'creator'],
  bluesky: ['bluesky', 'bsky', 'at_protocol'],
  mastodon: ['mastodon', 'fediverse'],
  reddit: ['reddit'],
  flyertalk: ['flyertalk', 'flyer_talk'],
  trustpilot: ['trustpilot'],
  tripadvisor: ['tripadvisor', 'trip_advisor'],
  skytrax: ['skytrax'],
  quora: ['quora'],
  consumer: ['consumer', 'consumer_affairs', 'consumeraffairs'],
  appstore: ['appstore', 'app_store', 'apple_app_store', 'ios'],
  googleplay: ['googleplay', 'google_play', 'play_store', 'android'],
}

const SENT_STORE = 'radar_v7_sent_'

function asArray(v) {
  return Array.isArray(v) ? v : []
}

function firstText(obj, keys, fallback = '') {
  obj = obj || {}
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v)
  }
  return fallback
}

function safeScore(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? Math.max(0, Math.min(100, Math.round(n))) : fallback
}

function toPlainText(v) {
  if (v === undefined || v === null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (typeof v === 'object') {
    const picked = firstText(v, ['text', 'verbatim', 'quote', 'title', 'body', 'detail', 'description', 'summary', 'content', 'message'], '')
    if (picked) return picked
    try {
      return JSON.stringify(v)
    } catch {
      return ''
    }
  }
  return ''
}

function emptySentiment(src) {
  const meta = SENT_META[src] || { name: src }
  return {
    source: src, sourceName: meta.name || src, overallSentiment: null, sentimentLabel: 'No data',
    totalMentions: '0', topComplaint: '', topPraise: '', painPoints: [], strengths: [], improvements: [], verbatims: [],
  }
}

export function normalizeSentimentData(src, data) {
  data = data && data.data ? data.data : data || null
  if (!data) return emptySentiment(src)
  const meta = SENT_META[src] || { name: src }
  const painSource = asArray(data.painPoints).length ? asArray(data.painPoints) : asArray(data.issues).length ? asArray(data.issues) : asArray(data.signals)
  const strengthSource = asArray(data.strengths).length ? asArray(data.strengths) : asArray(data.praises)
  const improveSource = asArray(data.improvements).length ? asArray(data.improvements) : asArray(data.actions)

  const painPoints = painSource
    .map((p) => ({
      title: firstText(p, ['title', 'issue', 'pain', 'name', 'complaint', 'theme']),
      detail: firstText(p, ['detail', 'body', 'description', 'summary', 'whyItMattersNow']),
      frequency: firstText(p, ['frequency', 'freq', 'volume']) || 'Medium',
      impact: firstText(p, ['impact', 'impactLabel', 'risk', 'category']) || 'Customer sentiment risk from backend cache',
    }))
    .filter((p) => p.title || p.detail)

  const strengths = strengthSource
    .map((st) => ({
      title: firstText(st, ['title', 'strength', 'name', 'theme']),
      detail: firstText(st, ['detail', 'body', 'description', 'summary']),
      frequency: firstText(st, ['frequency', 'freq', 'volume']) || 'Medium',
    }))
    .filter((s) => s.title || s.detail)

  let improvements = improveSource
    .map((i) => ({
      title: firstText(i, ['title', 'action', 'recommendation', 'name']),
      detail: firstText(i, ['detail', 'body', 'description', 'summary']),
      effort: firstText(i, ['effort', 'timeline']) || 'Medium',
      value: firstText(i, ['value', 'impact']) || 'Service recovery',
      owner: firstText(i, ['owner']) || 'Customer Experience',
    }))
    .filter((i) => i.title || i.detail)

  if (!improvements.length && painPoints.length) {
    improvements = painPoints.slice(0, 3).map((p) => {
      const combined = ((p.title || '') + ' ' + (p.detail || '')).toLowerCase()
      return {
        title: 'Act on ' + (p.title || 'customer issue'),
        detail: 'Use the loaded backend/cache signal to brief owner, verify source freshness, and define a customer-facing response.',
        effort: 'Medium',
        value: /refund|booking|loyalty|app|website|revenue|churn|ota/i.test(combined) ? 'Revenue protection' : 'Service recovery',
        owner: /app|website|booking|checkout/i.test(combined) ? 'Digital Product' : 'Customer Experience',
      }
    })
  }

  let verbatims = asArray(data.verbatims)
    .map(toPlainText)
    .map((v) => v.replace(/\s+/g, ' ').trim())
    .filter((v) => !!v && v !== '[object Object]')
  if (!verbatims.length) verbatims = painPoints.slice(0, 2).map((p) => toPlainText(p.title || p.detail)).filter(Boolean)
  if (!verbatims.length) verbatims = strengths.slice(0, 2).map((s) => toPlainText(s.title || s.detail)).filter(Boolean)

  return {
    source: data.source || src,
    sourceName: data.sourceName || meta.name || src,
    overallSentiment: safeScore(data.overallSentiment || data.score || data.sentimentScore, null),
    sentimentLabel: firstText(data, ['sentimentLabel', 'label', 'status'], 'Loaded'),
    totalMentions: firstText(data, ['totalMentions', 'mentions', 'volume', 'signal_count'], painSource.length ? `${painSource.length} saved signals` : '0'),
    topComplaint: firstText(data, ['topComplaint', 'topPain', 'complaint', 'issue'], painPoints[0] ? firstText(painPoints[0], ['title', 'detail']) : ''),
    topPraise: firstText(data, ['topPraise', 'topStrength', 'strength'], strengths[0] ? firstText(strengths[0], ['title', 'detail']) : ''),
    painPoints,
    strengths,
    improvements,
    verbatims,
  }
}

function sourceAliasTokens(src) {
  return (SENT_CACHE_ALIASES[src] || [src]).map((a) => String(a || '').toLowerCase()).filter(Boolean)
}

const SOURCE_MATCH_RULES = {
  twitter: /\bx\b|twitter|tweet|retweet|mention|viral|hashtag/i,
  youtube: /youtube|video|creator|comment thread|channel|vlog|review video|shorts/i,
  bluesky: /bluesky|bsky|at protocol|public post|social post/i,
  mastodon: /mastodon|fediverse|toot|public post|instance/i,
  reddit: /reddit|subreddit|r\/|thread|upvote/i,
  flyertalk: /flyertalk|frequent flyer|tier|avios|upgrade|status/i,
  trustpilot: /trustpilot|verified review|star rating/i,
  tripadvisor: /tripadvisor|traveler review|traveller review|trip advisor/i,
  skytrax: /skytrax|airline awards|world.?best airline/i,
  quora: /quora|question|answer/i,
  consumer: /consumer affairs|consumeraffairs|pissedconsumer|airlinequality|formal complaint/i,
  appstore: /app store|apple|ios|iphone|booking flow|boarding pass|rating|review/i,
  googleplay: /google play|android|booking flow|boarding pass|rating|review/i,
}

function sentimentPayloadMatchesSource(src, payload) {
  if (!payload || typeof payload !== 'object') return false
  const tokens = sourceAliasTokens(src)
  if (!tokens.length) return true
  const explicit = String([payload.source, payload.sourceName, payload.provider, payload.platform, payload.channel, payload.origin].filter(Boolean).join(' ')).toLowerCase()
  if (explicit && tokens.some((t) => explicit.indexOf(t) !== -1)) return true

  const rule = SOURCE_MATCH_RULES[src]
  if (!rule) return false
  let joined = ''
  joined += ' ' + toPlainText(payload.topComplaint)
  joined += ' ' + toPlainText(payload.topPraise)
  joined += ' ' + toPlainText(payload.sentimentLabel)
  asArray(payload.verbatims).slice(0, 5).forEach((v) => { joined += ' ' + toPlainText(v) })
  asArray(payload.painPoints).slice(0, 5).forEach((p) => {
    joined += ' ' + toPlainText(p && (p.title || p.issue || p.pain || p.theme))
    joined += ' ' + toPlainText(p && (p.detail || p.body || p.description))
  })
  asArray(payload.signals).slice(0, 5).forEach((s) => {
    joined += ' ' + toPlainText(s && (s.source || s.sourceName || s.platform))
    joined += ' ' + toPlainText(s && (s.title || s.body || s.detail))
  })
  return rule.test(joined)
}

function parseSentimentCacheEnvelope(payload) {
  payload = payload || {}
  const meta = payload.meta && typeof payload.meta === 'object' ? payload.meta : {}
  const emptyReason = payload.emptyReason || payload.reason || payload.message || (payload.error && (payload.error.message || payload.error)) || ''
  if (payload.cached === false && payload.data == null) {
    return { ok: false, data: null, meta, emptyReason: emptyReason || 'No source-specific sentiment cache is available yet.' }
  }
  let data = payload.data
  if (data == null && payload.payload != null) data = payload.payload
  if (data == null && payload.result != null) data = payload.result
  if (data == null && !('cached' in payload) && !('ok' in payload)) data = payload
  return { ok: payload.ok !== false, data, meta, emptyReason }
}

function hasSentimentContent(data) {
  if (!data || typeof data !== 'object') return false
  const score = Number(data.overallSentiment || data.score || data.sentimentScore)
  if (Number.isFinite(score) && score > 0) return true
  if (Array.isArray(data.painPoints) && data.painPoints.length) return true
  if (Array.isArray(data.strengths) && data.strengths.length) return true
  if (Array.isArray(data.improvements) && data.improvements.length) return true
  if (Array.isArray(data.verbatims) && data.verbatims.length) return true
  return false
}

function saveSentToStorage(src, data) {
  try {
    localStorage.setItem(SENT_STORE + src, JSON.stringify({ savedAt: new Date().toISOString(), data }))
  } catch {
    /* ignore quota errors */
  }
}

function loadSentFromStorage(src) {
  try {
    const raw = localStorage.getItem(SENT_STORE + src)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** Port of fetchSentimentFromBackend (customer-os.js:1816-1857). */
async function fetchSentimentFromBackend(src, viewMode) {
  const aliases = SENT_CACHE_ALIASES[src] || [src]
  let lastError = null
  for (const alias of aliases) {
    try {
      const url = `${BACKEND_URL}/api/cache/sentiment/${encodeURIComponent(alias)}?viewMode=${encodeURIComponent(viewMode)}`
      const resp = await fetch(url, { signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined })
      if (resp.status === 404) continue
      if (!resp.ok) {
        lastError = new Error(`HTTP ${resp.status} from /api/cache/sentiment/${alias}`)
        continue
      }
      let raw = null
      try {
        raw = await resp.json()
      } catch {
        raw = null
      }
      const parsed = parseSentimentCacheEnvelope(raw || {})
      if (!parsed.ok && !parsed.data) return { status: 'no_data', emptyReason: parsed.emptyReason || 'No source-specific sentiment cache is available yet.' }
      if (parsed.data == null) return { status: 'no_data', emptyReason: parsed.emptyReason || 'No source-specific sentiment cache is available yet.' }
      if (!sentimentPayloadMatchesSource(src, parsed.data)) continue
      const normalised = normalizeSentimentData(src, parsed.data)
      if (!hasSentimentContent(normalised)) return { status: 'no_data', emptyReason: parsed.emptyReason || 'No source-specific sentiment cache is available yet.' }
      const cacheStatus = String((parsed.meta && parsed.meta.cacheStatus) || '').toLowerCase()
      return { status: cacheStatus === 'stale' ? 'stale' : 'loaded', data: normalised }
    } catch (err) {
      lastError = err
    }
  }
  if (lastError) return { status: 'error', error: lastError }
  return { status: 'no_data', emptyReason: 'No source-specific sentiment cache is available yet.' }
}

/**
 * Port of resolveSentimentForSource (customer-os.js:1859-1874), minus the
 * domain-cache-derived fallback (out of Phase 1 scope — see file header).
 */
export async function resolveSentimentForSource(src, viewMode = 'b2c') {
  const backend = await fetchSentimentFromBackend(src, viewMode)
  if (backend.status === 'loaded' || backend.status === 'stale') {
    if (backend.status === 'loaded') saveSentToStorage(src, backend.data)
    return backend
  }
  const saved = loadSentFromStorage(src)
  if (saved && saved.data) {
    return { status: 'loaded', data: normalizeSentimentData(src, saved.data) }
  }
  return backend
}
