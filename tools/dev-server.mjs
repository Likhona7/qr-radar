import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const BACKEND = process.env.RADAR_BACKEND_URL || 'https://qr-radar-backend.onrender.com';
const USE_STUBS = /^(1|true|yes|on)$/i.test(String(process.env.USE_STUBS || 'false'));
const FORCE_CLAUDE_WEB_SEARCH = !/^(0|false|no|off)$/i.test(String(process.env.FORCE_CLAUDE_WEB_SEARCH || 'true'));
const CLAUDE_WEB_SEARCH_MAX_USES = Math.max(1, Number(process.env.CLAUDE_WEB_SEARCH_MAX_USES || 3));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const cleanPath = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const filePath = path.resolve(root, `.${cleanPath}`);

  if (!filePath.startsWith(root)) {
    send(res, 403, 'Forbidden');
    return;
  }

  try {
    const body = await fs.readFile(filePath);
    const type = contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    send(res, 200, body, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  } catch {
    send(res, 404, 'Not found');
  }
}

async function proxyApi(req, res) {
  if (req.url.startsWith('/api/health')) {
    send(res, 200, JSON.stringify({
      ok: true,
      status: 'local-dev-proxy',
      backend: BACKEND,
      useStubs: USE_STUBS
    }), {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return;
  }

  if (
    USE_STUBS &&
    req.method === 'GET' &&
    (
      req.url.startsWith('/api/cache/competitor/') ||
      req.url.startsWith('/api/cache/sentiment/')
    )
  ) {
    send(res, 200, JSON.stringify({ cached: false, data: null }), {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    return;
  }

  const target = new URL(req.url, BACKEND);
  const body = await new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  const shouldInjectClaudeWebSearch =
    FORCE_CLAUDE_WEB_SEARCH &&
    req.method === 'POST' &&
    req.url.startsWith('/api/claude');

  let outboundBody = body;
  if (shouldInjectClaudeWebSearch && body.length) {
    try {
      const parsed = JSON.parse(body.toString('utf8'));
      const existingTools = Array.isArray(parsed.tools) ? parsed.tools : [];
      const hasWebSearch = existingTools.some(t => t && t.type === 'web_search_20250305');
      if (!hasWebSearch) {
        parsed.tools = [...existingTools, { type: 'web_search_20250305', name: 'web_search', max_uses: CLAUDE_WEB_SEARCH_MAX_USES }];
      } else {
        parsed.tools = existingTools.map(t =>
          t && t.type === 'web_search_20250305'
            ? { ...t, max_uses: Math.max(1, Number(t.max_uses || CLAUDE_WEB_SEARCH_MAX_USES)) }
            : t
        );
      }
      if (!parsed.tool_choice) parsed.tool_choice = { type: 'auto' };
      outboundBody = Buffer.from(JSON.stringify(parsed), 'utf8');
    } catch {
      // pass through raw body if payload is not JSON
    }
  }

  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        Accept: req.headers.accept || 'application/json'
      },
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : outboundBody
    });

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    const headers = Object.fromEntries(upstream.headers.entries());
    delete headers['content-encoding'];
    delete headers['content-length'];
    delete headers['transfer-encoding'];
    headers['access-control-allow-origin'] = '*';
    send(res, upstream.status, responseBody, headers);
  } catch (error) {
    send(res, 502, JSON.stringify({ error: 'Backend proxy failed', detail: error.message }), {
      'Content-Type': 'application/json; charset=utf-8'
    });
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, '', {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
    return;
  }

  if (req.url.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`QR Radar dev server running at http://localhost:${PORT}`);
  console.log(`Proxying API requests to ${BACKEND}`);
  console.log(`USE_STUBS=${USE_STUBS ? 'true' : 'false'}`);
  console.log(`FORCE_CLAUDE_WEB_SEARCH=${FORCE_CLAUDE_WEB_SEARCH ? 'true' : 'false'} (max_uses=${CLAUDE_WEB_SEARCH_MAX_USES})`);
});
