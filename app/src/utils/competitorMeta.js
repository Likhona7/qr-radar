// Port of CMETA (radar-core.js:3018-3140) and COMP_CACHE_ALIASES (3141-3153).
// Static reference data — competitor identity, hub, and the regex used to
// confirm a cached payload is actually about this competitor (not a
// mismatched/generic record).
export const CMETA = {
  em: { name: 'Emirates', flag: 'AE', hub: 'Dubai DXB', tier: 'priority', terms: /\bemirates\b|\bdxb\b|\bdubai\b/i, why: 'Primary Gulf premium and long-haul connector competitor on Europe, Americas, Africa and Asia flows.' },
  tk: { name: 'Turkish Airlines', flag: 'TR', hub: 'Istanbul IST', tier: 'priority', terms: /\bturkish airlines\b|\bturkish\b|\bistanbul\b|\bist\b/i, why: 'Large global network competitor with strong Europe transfer proposition and frequent tactical pricing.' },
  et: { name: 'Etihad Airways', flag: 'AE', hub: 'Abu Dhabi AUH', tier: 'priority', terms: /\betihad airways\b|\betihad\b|\babu dhabi\b|\bauh\b/i, why: 'Gulf premium competitor in overlapping long-haul and high-value loyalty segments.' },
  sg: { name: 'Singapore Airlines', flag: 'SG', hub: 'Singapore SIN', tier: 'priority', terms: /\bsingapore airlines\b|\bsingapore\b|\bsin\b/i, why: 'Premium service benchmark competitor and key long-haul demand capture rival on Asia-bound traffic.' },
  ai: { name: 'Air India', flag: 'IN', hub: 'Delhi DEL', tier: 'strategic', terms: /\bair india\b|\bdelhi\b|\bdel\b|\btata\b/i, why: 'High-growth India network competitor with strong relevance for South Asia demand and price-sensitive shifts.' },
  ea: { name: 'Ethiopian Airlines', flag: 'ET', hub: 'Addis Ababa ADD', tier: 'strategic', terms: /\bethiopian airlines\b|\bethiopian\b|\baddis ababa\b|\baddis\b|\badd\b/i, why: 'Africa connectivity competitor with growing transfer relevance across East/West Africa flows.' },
  lh: { name: 'Lufthansa', flag: 'DE', hub: 'Frankfurt FRA', tier: 'strategic', terms: /\blufthansa\b|\bfrankfurt\b|\bfra\b|\bmunich\b|\bmuc\b/i, why: 'Major Europe network carrier competitor with strong premium-cabin presence and multi-brand feeder scale across EU flows.' },
  ba: { name: 'British Airways', flag: 'UK', hub: 'London Heathrow LHR', tier: 'strategic', terms: /\bbritish airways\b|\bba\b|\blondon heathrow\b|\blhr\b/i, why: 'Key UK long-haul competitor with direct overlap in premium and corporate travel demand on Europe-Americas corridors.' },
  sv: { name: 'Saudia', flag: 'SA', hub: 'Jeddah JED', tier: 'strategic', terms: /\bsaudia\b|\bsaudi arabian airlines\b|\bjeddah\b|\bjed\b|\briyadh\b|\bruh\b/i, why: 'Regional Gulf-area competitor with accelerating network growth and relevance for pilgrimage, leisure and connecting traffic.' },
  cx: { name: 'Cathay Pacific', flag: 'HK', hub: 'Hong Kong HKG', tier: 'strategic', terms: /\bcathay pacific\b|\bcathay\b|\bhong kong\b|\bhkg\b/i, why: 'Premium Asia-Pacific competitor with strong brand pull on long-haul business and high-value leisure segments.' },
  af: { name: 'Air France-KLM', flag: 'EU', hub: 'Paris CDG / Amsterdam AMS', tier: 'strategic', terms: /\bair france\b|\bklm\b|\bair france-klm\b|\bcdg\b|\bams\b/i, why: 'Large dual-hub European competitor group with extensive alliance feed and pricing influence on Europe-bound demand.' },
}

export const COMP_CACHE_ALIASES = {
  em: ['em', 'ek', 'emirates'], tk: ['tk', 'thy', 'turkish'], et: ['et', 'ey', 'etihad'], sg: ['sg', 'sq', 'singapore'],
  ai: ['ai', 'airindia'], ea: ['ea', 'eth', 'ethiopian'], lh: ['lh', 'lufthansa'], ba: ['ba', 'british', 'britishairways'],
  sv: ['sv', 'saudia', 'saudi'], cx: ['cx', 'cathay'], af: ['af', 'airfrance', 'klm', 'airfranceklm'],
}

export const PRIORITY_COMPETITORS = ['em', 'tk', 'et', 'sg']
export const STRATEGIC_COMPETITORS = ['ai', 'ea', 'lh', 'ba', 'sv', 'cx', 'af']
