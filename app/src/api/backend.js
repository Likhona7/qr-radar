// Port of scripts/radar-core.js:71-133 (BACKEND_URL, backendFetch, radarWebSocketUrl).
// Kept behaviorally identical (same timeout/CORS-error-shaping) so this app's
// network errors are diagnosable the same way the legacy app's are.

export const RENDER_BACKEND_URL = 'https://qr-radar-backend.onrender.com'
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || RENDER_BACKEND_URL

export async function backendFetch(path, options = {}, timeoutMs = 15000) {
  const url = BACKEND_URL + path
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null
  const opts = {
    mode: 'cors',
    credentials: 'omit',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  }
  if (controller) opts.signal = controller.signal
  try {
    const resp = await fetch(url, opts)
    if (timer) clearTimeout(timer)
    if (!resp.ok) {
      let errBody = ''
      try {
        errBody = await resp.text()
      } catch {
        /* ignore */
      }
      throw new Error(`HTTP ${resp.status} from ${path}${errBody ? ': ' + errBody.slice(0, 200) : ''}`)
    }
    return resp
  } catch (err) {
    if (timer) clearTimeout(timer)
    if (err.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs / 1000}s: ${path}`)
    if (err.message && err.message.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        `CORS or network error reaching backend: ${url}. Check Render backend CORS config allows ${location.origin}`,
      )
    }
    throw err
  }
}

export function radarWebSocketUrl() {
  const base =
    location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? RENDER_BACKEND_URL : BACKEND_URL
  return base.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:') + '/ws'
}
