import fs from 'node:fs/promises';

const components = [
  '01-top-shell.html',
  '02-main-dashboard.html',
  '03-competitors.html',
  '04-sentiment.html',
  '05-customer-intelligence.html',
  '06-executive-pages-footer.html',
  '07-action-plan-overlay.html'
];

const scripts = [
  'radar-core.js',
  'customer-os.js',
  'visual-fixes.js',
  'backend-cache-cleanup.js',
  'executive-os-roadmap.js'
];

const css = await fs.readFile(new URL('../styles/radar.css', import.meta.url), 'utf8');
const body = (
  await Promise.all(
    components.map(file => fs.readFile(new URL('../components/' + file, import.meta.url), 'utf8'))
  )
).join('\n');

const scriptBlocks = (
  await Promise.all(
    scripts.map(file => fs.readFile(new URL('../scripts/' + file, import.meta.url), 'utf8'))
  )
).map(code => '<script>\n' + code + '\n</script>').join('\n');

const html =
  '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>Qatar Airways Radar v11.4.14 - Executive Intelligence Operating System</title>\n<style>\n' +
  css +
  '\n</style>\n</head>\n<body>\n' +
  body +
  '\n<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script>\n<script src="https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js"></script>\n' +
  scriptBlocks +
  '\n</body>\n</html>\n';

await fs.mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await fs.writeFile(new URL('../dist/qr_radar_v11_4_14_modular_bundle.html', import.meta.url), html, 'utf8');
console.log('Built dist/qr_radar_v11_4_14_modular_bundle.html');
