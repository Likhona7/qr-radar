$ErrorActionPreference = "Stop"

$serverPath = Join-Path (Get-Location) "server.js"
if (-not (Test-Path $serverPath)) {
  throw "server.js not found. Run this script from C:\Users\DELL\Desktop\Prototypes\radar\radar_backend"
}

$text = Get-Content -LiteralPath $serverPath -Raw
$backupPath = "$serverPath.bak-competitor-set-$(Get-Date -Format yyyyMMdd-HHmmss)"
Copy-Item -LiteralPath $serverPath -Destination $backupPath

$competitorBlock = @'
// Competitor set aligned with the frontend Competitor Intelligence tab.
const COMPETITOR_SET = [
  {
    id: 'turkish',
    name: 'Turkish Airlines',
    group: 'priority',
    hub: 'IST - Istanbul'
  },
  {
    id: 'emirates',
    name: 'Emirates',
    group: 'priority',
    hub: 'DXB - Dubai'
  },
  {
    id: 'etihad',
    name: 'Etihad Airways',
    group: 'priority',
    hub: 'AUH - Abu Dhabi'
  },
  {
    id: 'singapore',
    name: 'Singapore Airlines',
    group: 'priority',
    hub: 'SIN - Singapore'
  },
  {
    id: 'airfranceklm',
    name: 'Air France-KLM',
    group: 'watchlist',
    hub: 'CDG/AMS - Europe'
  },
  {
    id: 'airindia',
    name: 'Air India',
    group: 'watchlist',
    hub: 'DEL - Delhi - Tata'
  },
  {
    id: 'britishairways',
    name: 'British Airways',
    group: 'watchlist',
    hub: 'LHR - London'
  },
  {
    id: 'cathaypacific',
    name: 'Cathay Pacific',
    group: 'watchlist',
    hub: 'HKG - Hong Kong'
  },
  {
    id: 'ethiopian',
    name: 'Ethiopian Airlines',
    group: 'watchlist',
    hub: 'ADD - Addis Ababa'
  },
  {
    id: 'lufthansa',
    name: 'Lufthansa',
    group: 'watchlist',
    hub: 'FRA - Frankfurt'
  },
  {
    id: 'saudia',
    name: 'Saudia',
    group: 'watchlist',
    hub: 'JED - Jeddah'
  }
];

const COMPETITOR_REFRESH_DETAILS = {
  turkish: {
    routes: 'IST,LHR,JFK,DOH,Europe,North America',
    focus: 'transit hub competition, pricing pressure, European routes, loyalty and app experience'
  },
  emirates: {
    routes: 'DXB,LHR,JFK,SIN,SYD,Europe,North America,Australia',
    focus: 'premium product, QSuite competition, app quality, loyalty programme parity and premium economy expansion'
  },
  etihad: {
    routes: 'AUH,LHR,JFK,SYD,Europe,Australia',
    focus: 'Gulf market share, loyalty, premium cabin positioning, Abu Dhabi stopover and digital experience'
  },
  singapore: {
    routes: 'SIN,LHR,SYD,JFK,Asia,Australia,Europe',
    focus: 'premium product competition, loyalty benchmark, app experience, service quality and long-haul premium demand'
  },
  airfranceklm: {
    routes: 'CDG,AMS,DOH,Europe,North America,Africa',
    focus: 'Europe transfer share, Flying Blue loyalty, premium cabin modernization, alliance overlap and corporate demand'
  },
  airindia: {
    routes: 'DEL,BOM,LHR,JFK,DOH,India,North America,Europe',
    focus: 'India diaspora segment, Tata transformation, direct competition on QR India corridors, price sensitivity and loyalty'
  },
  britishairways: {
    routes: 'LHR,DOH,JFK,Europe,North America',
    focus: 'London premium demand, oneworld overlap, Executive Club loyalty, corporate travel and Heathrow capacity'
  },
  cathaypacific: {
    routes: 'HKG,LHR,SYD,JFK,Asia,Australia,Europe',
    focus: 'Asia premium traffic, Hong Kong hub recovery, loyalty redemption, service quality and long-haul premium routes'
  },
  ethiopian: {
    routes: 'ADD,DOH,Africa,Europe,Asia',
    focus: 'Africa network reach, sixth-freedom traffic, price-sensitive flows, regional growth and cargo/passenger overlap'
  },
  lufthansa: {
    routes: 'FRA,MUC,DOH,Europe,North America',
    focus: 'European premium demand, Miles & More loyalty, Allegris cabin rollout, corporate traffic and Star Alliance overlap'
  },
  saudia: {
    routes: 'JED,RUH,DOH,Middle East,Europe,Asia',
    focus: 'Saudi market growth, religious travel flows, Vision 2030 tourism, regional premium demand and loyalty'
  }
};

const COMPETITOR_REFRESH_SET = COMPETITOR_SET.map((competitor) => ({
  ...competitor,
  ...(COMPETITOR_REFRESH_DETAILS[competitor.id] || {})
}));
const PRIORITY_COMPETITOR_IDS = COMPETITOR_SET.filter(c => c.group === 'priority').map(c => c.id);
const WATCHLIST_COMPETITOR_IDS = COMPETITOR_SET.filter(c => c.group === 'watchlist').map(c => c.id);
const COMPETITOR_IDS = COMPETITOR_SET.map(c => c.id);
'@

$text = [regex]::Replace(
  $text,
  '(?s)// FIX 2: All 5 rivals.*?const RIVALS = \[.*?\];',
  $competitorBlock,
  1
)

$text = $text.Replace('for (const rival of RIVALS) {', 'for (const rival of COMPETITOR_REFRESH_SET) {')
$text = $text.Replace("const RIVALS_EXPECTED = ['emirates','turkish','etihad','airindia','singapore'];", "const RIVALS_EXPECTED = COMPETITOR_IDS;")
$text = $text.Replace("label: 'Competitor cache all rivals'", "label: 'Competitor cache all 11 rivals'")
$text = $text.Replace("'All 5 rivals cached.'", "'All 11 frontend competitors cached.'")

$runtimeBlock = @'
    const { data: comps } = await supabase.from('competitor_analyses').select('competitor_id,analysed_at').eq('view_mode', viewMode);
    const competitorRows = comps || [];
    const hasCache = (id) => competitorRows.some(c => c.competitor_id === id);
    const missingPriority = PRIORITY_COMPETITOR_IDS.filter(id => !hasCache(id));
    const missingWatchlist = WATCHLIST_COMPETITOR_IDS.filter(id => !hasCache(id));
    if (missingPriority.length) warnings.push({ level: 'warn', code: 'MISSING_PRIORITY_COMPETITOR_CACHE', message: `Missing priority competitor cache: ${missingPriority.join(', ')}` });
    if (missingWatchlist.length) warnings.push({ level: 'warn', code: 'MISSING_WATCHLIST_COMPETITOR_CACHE', message: `Missing watchlist competitor cache: ${missingWatchlist.join(', ')}` });
    const staleByGroup = (ids, maxAgeHours) => competitorRows.filter(c => ids.includes(c.competitor_id) && c.analysed_at && (Date.now() - new Date(c.analysed_at).getTime()) > maxAgeHours * 3600000);
    const stalePriority = staleByGroup(PRIORITY_COMPETITOR_IDS, 12);
    const staleWatchlist = staleByGroup(WATCHLIST_COMPETITOR_IDS, 72);
    if (stalePriority.length) warnings.push({ level: 'warn', code: 'STALE_PRIORITY_COMPETITOR_CACHE', message: `Stale priority competitor cache: ${stalePriority.map(c => c.competitor_id).join(', ')}` });
    if (staleWatchlist.length) warnings.push({ level: 'warn', code: 'STALE_WATCHLIST_COMPETITOR_CACHE', message: `Stale watchlist competitor cache: ${staleWatchlist.map(c => c.competitor_id).join(', ')}` });
'@

$text = [regex]::Replace(
  $text,
  "(?s)    const \{ data: comps \} = await supabase\.from\('competitor_analyses'\).*?    if \(stale\.length\) warnings\.push\(\{ level: 'warn', code: 'STALE_COMPETITOR_CACHE'.*?\}\);",
  $runtimeBlock,
  1
)

Set-Content -LiteralPath $serverPath -Value $text -Encoding UTF8
Write-Host "Updated server.js competitor set. Backup saved to: $backupPath"
