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
  'navMain', 'navComp', 'navSent', 'navCI', 'navCIOS', 'navExec', 'navPredict', 'navRoadmap',
  'compPage', 'sentPage', 'ciPage', 'ciosPage', 'execPage', 'predictPage', 'roadmapPage'
];
requiredIds.forEach(id => addCheck(`id:${id}`, bundle.includes(`id="${id}"`), 'Required tab/page id'));

const requiredFns = [
  'function showMain(',
  'function showComp(',
  'function showSent(',
  'function showCI(',
  'function showCIOS(',
  'function showExecSummary(',
  'function showPredictive(',
  'window.showRoadmap=function(',
  'function loadComp(',
  'function loadCI('
];
requiredFns.forEach(fn => addCheck(`fn:${fn}`, bundle.includes(fn), 'Required navigation/load function'));

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
  'devserver:use-stubs',
  (await fs.readFile(path.join(root, 'tools', 'dev-server.mjs'), 'utf8')).includes('USE_STUBS'),
  'Local proxy toggle exists'
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
