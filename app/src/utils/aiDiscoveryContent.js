// Port of AIDISCOVERY (radar-core.js:3553-3668) — static authored reference
// content (fallback KPIs, useful/exclude signal lists, measurement sources,
// example query monitor, action outputs), not fetched or fabricated.
export const AIDISCOVERY = {
  kpis: [
    { v: '5', l: 'trackable signal families', d: 'Referral sources, crawler visibility, citations, query gaps and conversion.' },
    { v: '3', l: 'core data sources', d: 'Server logs, Adobe Analytics and citation monitoring.' },
    { v: '4', l: 'answer sources to compare', d: 'Major answer platforms.' },
    { v: '7', l: 'query families', d: 'Premium, business, family, route, app and loyalty questions.' },
    { v: '1', l: 'weekly audit loop', d: 'Repeat the same query set to see movement and gaps.' },
  ],
  useful: [
    { title: 'Referral traffic', pill: 'Ready now', tone: 'ai-good', body: 'Measure answer-assistant sessions inside Adobe using a dedicated referral channel group.', sub: 'Why it helps: shows whether answer platforms are sending real visitors and bookings to QR.' },
    { title: 'Crawler visibility', pill: 'Ready now', tone: 'ai-good', body: 'Track known answer-platform crawler agents in server logs.', sub: 'Why it helps: shows which pages answer platforms are reading and where depth is strongest.' },
    { title: 'Citation share and position', pill: 'Ready now', tone: 'ai-good', body: 'Run the same travel queries across major answer platforms to see whether QR is cited, where it ranks, and which competitor appears instead.', sub: 'Why it helps: turns search visibility into a compare-and-improve score.' },
    { title: 'Query gap analysis', pill: 'High value', tone: 'ai-mid', body: 'Identify the travel questions where Emirates, Singapore Airlines or Delta are cited but QR is missing.', sub: 'Why it helps: each gap becomes a content or SEO action.' },
    { title: 'Landing page and conversion quality', pill: 'Ready now', tone: 'ai-good', body: 'Measure which landing pages Referral sources choose, and compare bounce rate, conversion rate and revenue per session.', sub: 'Why it helps: proves whether source discovery is commercial or just noisy traffic.' },
    { title: 'Unattributed answer traffic estimate', pill: 'Exploratory', tone: 'ai-mid', body: 'Use trend matching to estimate sessions that arrive as Direct because referrer data is missing.', sub: 'Why it helps: recovers part of the blind spot, but should be treated as directional rather than exact.' },
  ],
  exclude: [
    { title: 'Training-data inclusion claims', tone: 'ai-bad', body: 'Crawl frequency is only a proxy. It does not prove that QR content was used in training or how a model will answer tomorrow.' },
    { title: 'Exact Google answer-mode traffic', tone: 'ai-bad', body: 'Google uses noreferrer in answer-mode links, so exact traffic attribution is not dependable in client-side analytics.' },
    { title: 'Hype-only social counts', tone: 'ai-bad', body: 'YouTube, LinkedIn and generic hype posts are noisy unless they connect to a measurable referral, citation or conversion signal.' },
    { title: 'Raw crawler totals without URL context', tone: 'ai-bad', body: 'Simple bot counts are less useful than page-level crawl depth, freshness and source-level pattern changes.' },
  ],
  sources: [
    { name: 'Server logs', status: 'No API key', body: 'Filter known answer-platform crawler user agents in server logs.' },
    { name: 'Adobe Analytics', status: 'Config only', body: 'Add a regex channel group for Referral sources so sessions from chatgpt.com, perplexity.ai, claude.ai and gemini.google.com are captured cleanly.' },
    { name: 'Citation monitor', status: 'API or vendor', body: 'Use a weekly citation audit or monitoring tool to compare citation share, query gaps and source position across brands.' },
  ],
  queries: [
    { q: 'best business class airline to London', engine: 'Multi-engine audit', gap: 'Gap watch', meta: 'Premium / long-haul' },
    { q: 'Qatar Airways vs Emirates which is better', engine: 'Multi-engine audit', gap: 'Core benchmark', meta: 'Brand comparison' },
    { q: 'best airline for Doha stopover', engine: 'Multi-engine audit', gap: 'Opportunity', meta: 'Stopover / destination' },
    { q: 'best airline for premium family travel', engine: 'Multi-engine audit', gap: 'Gap watch', meta: 'Family / premium' },
    { q: 'best airline for South Asia diaspora', engine: 'Multi-engine audit', gap: 'Gap watch', meta: 'VFR / regional' },
  ],
  actions: [
    { title: 'Create the Search visibility baseline', body: 'Start the weekly query audit and store results so the business can see citation share, position and gaps over time.', tags: ['Weekly', 'Fast start', 'High value'] },
    { title: 'Add the Adobe Referral source channel group', body: 'Capture referral sessions in existing analytics first; this gives the team a cheap baseline before buying extra tools.', tags: ['Adobe', 'No extra API', 'Direct value'] },
    { title: 'Publish a structured content and llms.txt plan', body: 'Make QR easier for answer platforms to read by tightening authoritative content, schema and machine-readable summaries.', tags: ['SEO', 'Structured data', 'Machine readable'] },
  ],
}
