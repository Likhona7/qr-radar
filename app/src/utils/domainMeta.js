// Port of META and PUBLIC_SOURCE_FIT (radar-core.js:2438-2471). Icon SVGs
// replaced with 2-letter abbreviations, consistent with how Predictive
// Intelligence's tab icons and Executive Summary's KPI icons were already
// handled in this migration — full icon-path porting is a cosmetic-only
// cost not worth the escaping overhead for 14 domains.
export const DOMAIN_META = {
  rev: { abbr: 'RV', title: 'Revenue & pricing', subtitle: 'Yield · Route economics · Fare strategy · Ancillary' },
  dig: { abbr: 'DG', title: 'Digital & direct channel', subtitle: 'Direct booking · Conversion · Agent migration · App · Payments' },
  loy: { abbr: 'LY', title: 'Loyalty · Privilege Club', subtitle: 'Member retention · Churn · Co-brand · Partners' },
  prd: { abbr: 'PD', title: 'Product & experience', subtitle: 'App · QSuite · Booking flow · Ancillary · Payments' },
  cmp: { abbr: 'CM', title: 'Competitor intelligence', subtitle: 'Emirates · Etihad · Turkish · Lufthansa · Halo effect' },
  geo: { abbr: 'GO', title: 'Geopolitical & macro', subtitle: 'Conflict · Fuel · FX · Airspace · EASA · Trade' },
  agt: { abbr: 'AG', title: 'Agents & OTA migration', subtitle: 'Direct shift · GDS cost · Commission · NDC · Oryx Connect' },
  sml: { abbr: 'SM', title: 'Social media intelligence', subtitle: 'Sentiment · Brand strength · Platform performance' },
  soc: { abbr: 'SC', title: 'Social unrest & civil events', subtitle: 'Protests · Strikes · Political instability · Origin markets' },
  spt: { abbr: 'SP', title: 'Sport & major events', subtitle: 'Football · Rugby · F1 · Golf · Tennis · Cricket' },
  sec: { abbr: 'CY', title: 'Cyber & security threats', subtitle: 'Airline hacks · Airport outages · System failures' },
  reg: { abbr: 'RG', title: 'Regulatory & visa policy', subtitle: 'Visa · BASA · US entry · GCC regulations · EASA' },
  ops: { abbr: 'OP', title: 'Operations & technology', subtitle: 'System outages · Airport disruptions · Fleet · OTP' },
  rep: { abbr: 'RP', title: 'Brand & reputation', subtitle: 'Social sentiment · Media · Passenger feedback' },
}

// Port of PUBLIC_SOURCE_FIT (radar-core.js:2456-2471) — static reference
// copy, no fetch involved.
export const PUBLIC_SOURCE_FIT = {
  ops: { why: 'Operations uses live aviation, weather and location context to explain disruption, technology pressure and customer impact.', sources: [['OpenSky', 'live flight ops'], ['NOAA AviationWeather', 'METAR/TAF'], ['Open-Meteo', 'forecast risk'], ['OurAirports', 'airport reference'], ['OpenAQ', 'air quality']] },
  geo: { why: 'Geopolitical needs event, macro, location and reference sources to connect route exposure with country and airspace context.', sources: [['GDELT', 'global events'], ['World Bank', 'country indicators'], ['Nominatim', 'geocoding'], ['Wikidata', 'entity graph'], ['MediaWiki', 'public reference']] },
  rev: { why: 'Revenue uses demand, macro and event context to explain pricing, route economics and market opportunity.', sources: [['World Bank', 'macro demand'], ['GDELT', 'news/events'], ['Open-Meteo', 'destination risk'], ['Common Crawl', 'trend backfill']] },
  cmp: { why: 'Competitor intelligence combines operating exposure, public announcements, entity resolution and historical source discovery.', sources: [['OpenSky', 'rival movement'], ['GDELT', 'competitor news'], ['Wikidata', 'entity IDs'], ['Common Crawl', 'web archive'], ['MediaWiki', 'reference']] },
  rep: { why: 'Reputation blends customer media, public conversation, news and environmental context for trust and crisis monitoring.', sources: [['YouTube', 'creator/comment signal'], ['Reddit', 'community complaints'], ['Bluesky', 'public posts'], ['Mastodon', 'Fediverse posts'], ['GDELT', 'media events'], ['OpenAQ', 'destination context']] },
  sml: { why: 'Social media uses public conversation and creator platforms to detect customer narrative, campaign and brand movement.', sources: [['YouTube', 'creator media'], ['Reddit', 'community threads'], ['Bluesky', 'public posts'], ['Mastodon', 'public posts'], ['Common Crawl', 'source discovery']] },
  soc: { why: 'Social unrest uses public social, news and event signals to explain disruption risk and customer communication needs.', sources: [['GDELT', 'event detection'], ['Reddit', 'traveller reports'], ['Bluesky', 'public posts'], ['Mastodon', 'public posts'], ['OpenSky', 'route exposure']] },
  dig: { why: 'Digital/direct uses app, media and public conversation signals to identify conversion, app and booking-flow friction.', sources: [['iTunes Search', 'App Store metadata'], ['YouTube', 'app/service media'], ['Reddit', 'digital friction'], ['Bluesky', 'public posts'], ['Nominatim', 'location context']] },
  prd: { why: 'Product uses app metadata, public reference and customer media to connect service experience with product decisions.', sources: [['iTunes Search', 'app metadata'], ['YouTube', 'review videos'], ['Wikidata', 'entity reference'], ['MediaWiki', 'public reference'], ['Reddit', 'experience threads']] },
  loy: { why: 'Loyalty uses customer conversation, app metadata and creator/community signals to detect member praise, churn and friction.', sources: [['YouTube', 'loyalty reviews'], ['Reddit', 'award travel'], ['iTunes Search', 'app metadata'], ['Bluesky', 'public posts'], ['Mastodon', 'public posts']] },
  agt: { why: 'Agents and OTA uses community, digital and public discovery sources to surface booking friction and direct-shift opportunities.', sources: [['Reddit', 'booking stories'], ['iTunes Search', 'app metadata'], ['YouTube', 'service reviews'], ['Common Crawl', 'OTA/source discovery']] },
  spt: { why: 'Sport and events uses event, weather, location and demand context to monitor travel surges and destination risk.', sources: [['GDELT', 'event detection'], ['Open-Meteo', 'event weather'], ['Nominatim', 'venue geocoding'], ['World Bank', 'market backdrop']] },
  reg: { why: 'Regulatory and visa uses public reference, entity and location sources to normalize policy, airport and country context.', sources: [['MediaWiki', 'public reference'], ['Wikidata', 'entity graph'], ['OurAirports', 'airport reference'], ['Nominatim', 'location context']] },
  sec: { why: 'Cyber and security uses news/events and web discovery sources to detect public security, outage and disruption exposure.', sources: [['GDELT', 'security news'], ['Common Crawl', 'web archive'], ['MediaWiki', 'reference'], ['Wikidata', 'entity IDs']] },
}

export function domainPublicSourceFit(id) {
  return PUBLIC_SOURCE_FIT[id] || { why: 'Public source fit will appear here when this domain is mapped.', sources: [] }
}

// Single-word labels used in the KPI tooltip breakdown rows (originally a
// separate, shorter DOM_LABELS constant in radar-core.js — distinct from
// utils/domainSignal.js's DOM_LABELS, which carries the longer tile text).
export const DOM_LABELS_SHORT = {
  rev: 'Revenue', dig: 'Digital', loy: 'Loyalty', prd: 'Product', cmp: 'Competitors',
  geo: 'Geopolitical', agt: 'Agents', sml: 'Social media', soc: 'Unrest', spt: 'Sport',
  sec: 'Cyber', reg: 'Regulatory', ops: 'Operations', rep: 'Reputation',
}
