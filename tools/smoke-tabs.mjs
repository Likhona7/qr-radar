import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const bundlePath = path.join(root, 'dist', 'qr_radar_v11_4_14_modular_bundle.html');
const bundle = await fs.readFile(bundlePath, 'utf8');

const checks = [];
function addCheck(name, pass, detail) {
  checks.push({ name, pass: !!pass, detail: detail || '' });
}

const requiredIds = [
  'navMain', 'navComp', 'navPartner', 'navSent', 'navCI', 'navCIOS', 'navTeamActions', 'navExec', 'navPredict', 'navAI', 'navRoadmap',
  'compPage', 'partnerPage', 'sentPage', 'ciPage', 'ciosPage', 'teamActionsPage', 'execPage', 'predictPage', 'aiDiscoveryPage', 'roadmapPage', 'backendPulsePage',
  'footerBackendPulseLink'
];
requiredIds.forEach(id => addCheck(`id:${id}`, bundle.includes(`id="${id}"`), 'Required tab/page id'));

const requiredFns = [
  'function showMain(',
  'function showComp(',
  'function showPartner(',
  'function showSent(',
  'function showCI(',
  'function showCIOS(',
  'window.showTeamActions = function',
  'function showExecSummary(',
  'function showPredictive(',
  'function showAIDiscovery(',
  'window.showRoadmap=function(',
  'function loadComp(',
  'function loadCI(',
  'function updatePartnerBadgeCount(',
  'function renderAIDiscoveryPage('
];
requiredFns.forEach(fn => addCheck(`fn:${fn}`, bundle.includes(fn), 'Required navigation/load function'));

addCheck(
  'fn:showBackendPulse',
  bundle.includes('window.showBackendPulse=function('),
  'Backend pulse footer page opens as a first-class Radar page'
);

addCheck(
  'fn:loadSent',
  bundle.includes('function loadSent(') || bundle.includes('window.loadSent = loadSent = async function('),
  'Required navigation/load function'
);

const forbiddenLegacy = [
  'Render cache',
  'Load analysis',
  'Analyse segment',
  'No cache match',
  'Loaded (cached)',
  'Not analysed'
];
forbiddenLegacy.forEach(token => addCheck(`legacy:${token}`, !bundle.includes(token), 'Legacy UI label removed'));

const requiredStates = ['Loaded', 'No data', 'Error', 'Stale'];
requiredStates.forEach(token => addCheck(`state:${token}`, bundle.includes(token), 'Unified state vocabulary present'));

addCheck(
  'competitor:no-match-guard',
  bundle.includes('No source-specific cache for') && bundle.includes('duplicate intelligence'),
  'Competitor no-match protection text present'
);
addCheck(
  'competitor:alias-fetch',
  bundle.includes('COMP_CACHE_ALIASES') && bundle.includes('competitorPayloadMatches'),
  'Competitor alias and payload matching logic present'
);
addCheck(
  'roadmap:readiness-panel',
  bundle.includes('roadmapReadiness') && bundle.includes('Frontend-shippable now') && bundle.includes('Blocked end to end here'),
  'Roadmap readiness split is rendered in the frontend'
);
addCheck(
  'roadmap:approval-ready-finish-line',
  bundle.includes('Approval-Ready Finish Line (Before Internal Data)') &&
  bundle.includes('Discovery status endpoint') &&
  bundle.includes('Full source discovery cron') &&
  bundle.includes('Discovery Monitor backend contract') &&
  bundle.includes('App ratings intelligence feed'),
  'Roadmap lists the remaining non-internal-data finish-line work'
);
addCheck(
  'partner:catalog',
  bundle.includes('Partner Network') && bundle.includes('Partner airlines'),
  'Partner network tab and catalog present'
);
addCheck(
  'discovery-monitor:tab',
  bundle.includes('Discovery Monitor') &&
    bundle.includes('Live discovery proof') &&
    bundle.includes('Latest source proof') &&
    bundle.includes('signals created'),
  'Discovery Monitor tab and useful-metrics framework present'
);
addCheck(
  'discovery-monitor:backend-api',
  bundle.includes('aiDiscoveryBackendStatus') &&
  bundle.includes('/api/discovery/status') &&
  bundle.includes('Backend API pending'),
  'Discovery Monitor is wired to a backend API contract with honest pending state'
);
addCheck(
  'devserver:use-stubs',
  (await fs.readFile(path.join(root, 'tools', 'dev-server.mjs'), 'utf8')).includes('USE_STUBS'),
  'Local proxy toggle exists'
);

addCheck(
  'backend-pulse:runtime-endpoints',
  bundle.includes('/api/refresh/daily-status') &&
  bundle.includes('/api/health/full') &&
  bundle.includes('/api/diagnostics/runtime-warnings') &&
  bundle.includes('/api/diagnostics/performance'),
  'Backend pulse page reads the core server status endpoints'
);

const failed = checks.filter(c => !c.pass);
const summary = {
  ok: failed.length === 0,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  checkedAt: new Date().toISOString(),
  checks
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.ok) process.exit(1);
