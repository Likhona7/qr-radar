// Port of CI_META (scripts/customer-os.js:561-616) — the 7 traveller
// segments' static reference data (name/icon/description/routes/size/
// context), plus the luxury segment's 3 sub-personas.
export const CI_META = {
  diaspora: { name: 'Diaspora Traveller', icon: '🌍', color: '#C8A050',
    desc: 'South Asian, Filipino, and Arab diaspora travelling between GCC and home countries. High-frequency, price-aware, family-oriented.',
    routes: 'DOH-CMB, DOH-MNL, DOH-KHI, DOH-DAC, DOH-CCU, DOH-COK, DOH-TRV',
    size: '~18M passengers/year on diaspora routes',
    qrContext: 'Diaspora routes are high-load, high-frequency segments. QR dominates GCC-South Asia but faces pressure from IndiGo, Air Arabia, and flydubai on price.' },
  business: { name: 'Business Traveller', icon: '💼', color: '#7BA7E8',
    desc: "Premium yield segment. Corporate, government, and SME travellers on QR's business hub routes. Highest LTV per passenger.",
    routes: 'DOH-LHR, DOH-JFK, DOH-FRA, DOH-CDG, DOH-SIN, DOH-DXB, DOH-BOM',
    size: '~8.5M business passengers/year',
    qrContext: "Business Traveller is QR's premium yield engine. Wi-Fi reliability, lounge access, and upgrade availability are the primary satisfaction drivers." },
  leisure: { name: 'Leisure Traveller', icon: '🌴', color: '#1abc9c',
    desc: 'Holiday, VFR, and tour group travellers. Volume and conversion segment with medium LTV but high growth potential.',
    routes: 'DOH-BKK, DOH-DPS, DOH-MLE, DOH-LCA, DOH-BCN, DOH-FCO, DOH-IST',
    size: '~16M leisure passengers/year',
    qrContext: 'Leisure segment is volume-driven. QR competes on Hamad connectivity and Doha stopover value. Price sensitivity is high; ancillary upsell opportunity is significant.' },
  loyalty: { name: 'Privilege Club Member', icon: '🏆', color: '#e74c3c',
    desc: 'Tier-holding Privilege Club members. Retention priority. High churn risk if tier benefits or upgrade success rates decline.',
    routes: 'DOH-LHR, DOH-JFK, DOH-SYD, DOH-NRT, DOH-JNB, DOH-GRU, DOH-LAX',
    size: '~21M members across tiers',
    qrContext: 'Privilege Club is the retention backbone. Gold and Platinum members have 3.4x higher LTV. Miles expiry and upgrade availability are the leading churn triggers.' },
  transit: { name: 'Transit Passenger', icon: '🛄', color: '#9B59B6',
    desc: "Hub transit passengers using DOH as a connection point. Key to QR's hub model. Conversion opportunity for Doha stopover packages.",
    routes: 'DOH (hub), Africa-Europe, Asia-Americas, Australia-Middle East corridors',
    size: '~60% of total QR passengers transit via DOH',
    qrContext: "Transit passengers represent 38% of DOH throughput. Doha Stopover conversion and lounge satisfaction are the primary commercial levers for this segment." },
  digitalNomad: { name: 'Digital Nomad', icon: '💻', color: '#2E86DE',
    desc: 'Remote and hybrid workers taking longer-stay, multi-city journeys. They combine work utility with lifestyle and are highly digital in planning and servicing.',
    routes: 'DOH-LIS, DOH-BKK, DOH-DPS, DOH-BCN, DOH-CPT, DOH-MLE',
    size: '~3-5M high-flex travellers in relevant long-stay corridors',
    qrContext: 'Digital nomads influence premium economy, ancillary mix, and repeat direct bookings when work-friendly products and stay partnerships are clear.' },
  luxury: { name: 'Luxury & Premium Traveller', icon: '✨', color: '#C8A050',
    desc: 'Ultra-high-value travellers choosing QR for Qsuite privacy, premium amenities, luxury stopovers, and curated experiences. Behavioural signals matter more than spend alone.',
    routes: 'DOH-LHR, DOH-JFK, DOH-CDG, DOH-SYD, DOH-SIN',
    size: '~2-3M ultra-premium passengers, est. 40%+ of revenue influence',
    qrContext: 'Luxury demand is splitting across prestige, privacy, and curated access. QR has strong Qsuite equity but must orchestrate experiences across lounge, loyalty and stopover moments.',
    luxuryPersonas: [
      { id: 'privacy', label: 'Privacy Seeker', icon: '🤫', triggers: 'Qsuite booking, quiet-preference signals, premium cabin service customisation', serviceFailures: 'Recognition failure, unnecessary friction, poor handoff across touchpoints', nextBestAction: 'Silent service profile and pre-flight personal preference confirmation' },
      { id: 'curator', label: 'Experience Curator', icon: '🍽️', triggers: 'Stopover browsing, premium dining interest, lifestyle itinerary intent', serviceFailures: 'Generic offers, missed city and lounge upsell moments', nextBestAction: 'Pre-arrival curated stopover bundle with premium partner offers' },
      { id: 'status', label: 'Status Maximiser', icon: '🎖️', triggers: 'Tier tracking, Avios acceleration, partner redemption behaviour', serviceFailures: 'Tier-credit friction, unclear progression, benefit inconsistency', nextBestAction: 'Tier-progress nudges and high-value loyalty fast-track campaign' },
    ] },
}

export const CI_SEGMENTS = Object.keys(CI_META)

// Port of CI_STRATEGIC_LENSES (customer-os.js:636-667) — fallback lenses
// used when the backend payload doesn't supply its own strategicLenses.
export const CI_STRATEGIC_LENSES = {
  diaspora: [
    { name: 'Family Multi-Pax Planner', priority: 'High', why: 'Higher basket size and seat-together pressure. This lens protects conversion where one failure can lose multiple passengers.', move: 'Bundle family-seat + baggage certainty and proactive disruption support.' },
    { name: 'Student & Young Professional', priority: 'Medium', why: 'Early loyalty capture on long-haul corridors compounds lifetime value over multiple years.', move: 'Launch first-job/student starter fares with loyalty acceleration and app onboarding.' },
    { name: 'Disruption-Recovery Customers', priority: 'High', why: 'Service recovery quality in this segment directly impacts repeat purchase and referral trust.', move: 'Trigger instant re-accommodation + compensation journeys when disruption signals appear.' },
  ],
  business: [
    { name: 'SME / Self-Employed Business Traveler', priority: 'High', why: 'Frequent trips without managed contracts create direct-share upside if we simplify repeat booking and servicing.', move: 'Offer SME direct bundles with flexible changes, loyalty bonuses and fast service lanes.' },
    { name: 'Disruption-Recovery Customers', priority: 'High', why: 'Business retention drops quickly after poor disruption handling.', move: 'Activate executive service recovery workflow with owner accountability in 24 hours.' },
  ],
  leisure: [
    { name: 'Direct-Recovery from OTA Shoppers', priority: 'High', why: 'Users discover via OTA/metasearch but can still convert direct with timing, pricing clarity and loyalty hooks.', move: 'Run OTA-exposed retargeting play: direct perks, app-only benefits and limited-time conversion nudges.' },
    { name: 'Family Multi-Pax Planner', priority: 'High', why: 'Group leisure trips drive ancillary value but are very sensitive to baggage and seating friction.', move: 'Push family trip bundles with transparent total-trip pricing and seat assurance.' },
    { name: 'Student & Young Professional', priority: 'Medium', why: 'Price-sensitive now, high lifetime value later when captured into owned channels.', move: 'Deploy youth fare + loyalty onboarding + referral mechanics across app and social journeys.' },
  ],
  loyalty: [
    { name: 'Direct-Recovery from OTA Shoppers', priority: 'High', why: 'Members who begin off-channel are at risk of value leakage unless pulled back to direct journeys.', move: 'Use member-level offer recovery flows tied to tier progress and redemption nudges.' },
    { name: 'Disruption-Recovery Customers', priority: 'High', why: 'Tier members penalize inconsistency faster than non-members.', move: 'Guarantee priority recovery path for disrupted loyalty members within 2 hours.' },
  ],
  transit: [
    { name: 'Family Multi-Pax Planner', priority: 'High', why: 'Multi-leg family transit creates outsized risk around misconnects, baggage and visa clarity.', move: 'Publish transfer-safe family itineraries with baggage continuity and clear visa guidance.' },
    { name: 'Disruption-Recovery Customers', priority: 'High', why: 'Transit disruption amplifies support load and social visibility.', move: 'Auto-trigger transit rescue playbook with proactive comms and rebooking pathways.' },
  ],
  digitalNomad: [
    { name: 'Direct-Recovery from OTA Shoppers', priority: 'High', why: 'Nomads often start in comparison channels and need a direct reason to complete with QR.', move: 'Retarget flexible-fare researchers with direct-only work-travel bundles and loyalty boosts.' },
    { name: 'Student & Young Professional', priority: 'Medium', why: 'Emerging professionals overlap with remote-work segments and can become high-frequency future value.', move: 'Create entry-tier growth journey with wallet setup, points education and app habit loops.' },
    { name: 'Disruption-Recovery Customers', priority: 'High', why: 'Long-stay remote travelers face outsized trust loss when schedules break work continuity.', move: 'Deploy proactive disruption playbooks with fast rebooking and transparent service recovery updates.' },
  ],
  luxury: [
    { name: 'Disruption-Recovery Customers', priority: 'High', why: 'Premium travelers judge brand value on recovery precision during irregular operations.', move: 'Enable concierge recovery triggers with premium service restoration and loyalty reinforcement.' },
  ],
}
