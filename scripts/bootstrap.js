const componentFiles = [
  '01-top-shell.html',
  '02-main-dashboard.html',
  '03-competitors.html',
  '04-sentiment.html',
  '05-customer-intelligence.html',
  '06-executive-pages-footer.html',
  '07-action-plan-overlay.html'
];

const localScripts = [
  './scripts/radar-core.js',
  './scripts/customer-os.js',
  './scripts/visual-fixes.js',
  './scripts/backend-cache-cleanup.js',
  './scripts/executive-os-roadmap.js'
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(script);
  });
}

async function loadComponents() {
  const root = document.getElementById('app-root');
  const html = await Promise.all(componentFiles.map(async file => {
    const response = await fetch('./components/' + file);
    if (!response.ok) throw new Error('Failed to load component ' + file);
    return response.text();
  }));
  root.innerHTML = html.join('\n');
}

async function bootRadar() {
  await loadComponents();
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js');
  await loadScript('https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js');
  for (const src of localScripts) await loadScript(src);
}

bootRadar().catch(error => {
  console.error(error);
  const root = document.getElementById('app-root');
  root.innerHTML = '<div style="padding:24px;font-family:Inter,Arial,sans-serif;color:#8A004F">Radar failed to load modular components. Serve this folder over http://localhost instead of opening it directly as a file.</div>';
});
