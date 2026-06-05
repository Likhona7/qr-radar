import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const core = read('scripts/radar-core.js');
const executive = read('scripts/executive-os-roadmap.js');
const actions = read('scripts/team-actions.js');
const customer = read('scripts/customer-os.js');
const css = read('styles/radar.css');

const checks = [
  ['core exports renderSignalDateMeta', /window\.renderSignalDateMeta\s*=/.test(core)],
  ['core exposes source date line', /Source\s/.test(core) && /First seen\s/.test(core) && /Verified\s/.test(core)],
  ['core uses compact multi-unit age labels', /remH/.test(core) && !/m ago/.test(core)],
  ['executive uses shared date metadata', (executive.match(/dateMetaOf\(/g) || []).length >= 5],
  ['team actions uses shared date metadata', (actions.match(/dateMetaOf\(/g) || []).length >= 3],
  ['customer intelligence uses shared date metadata', (customer.match(/ciDateMetaOf\(/g) || []).length >= 7],
  ['core exports compact date metadata', /window\.renderSignalDateCompactMeta\s*=/.test(core)],
  ['competitor intelligence keeps signal timing metadata', /signal:\s*s/.test(core) && /compDateMetaOf\(/.test(core)],
  ['customer source tiles show compact freshness', /sentimentSourceFreshnessMeta/.test(customer) && /ciCompactDateMetaOf\(/.test(customer)],
  ['date metadata has visual styling', /\.sig-date-meta/.test(css) && /\.sig-date-chip/.test(css)]
];

let failed = 0;
for (const [label, ok] of checks) {
  if (ok) {
    console.log('PASS', label);
  } else {
    failed += 1;
    console.error('FAIL', label);
  }
}

if (failed) {
  console.error(`${failed}/${checks.length} date metadata checks failed.`);
  process.exit(1);
}

console.log(`${checks.length}/${checks.length} date metadata checks passed.`);
