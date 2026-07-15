// Cloudflare Pages _worker.js (Advanced mode Worker entrypoint)
//
// Routes:
//   /api/*  → proxy to Vercel (env.NEXT_PUBLIC_API_BASE_URL), where Next.js
//             App Router catch-all at apps/web/src/app/api/[[...all]]/route.ts
//             mounts the Hono API.
//   /*      → static assets (Next.js standalone output)
//
// 2026-07 debug: API requests were returning index.html (Next.js SPA fallback)
// instead of Hono JSON. Add a transient debug header so we can inspect the
// proxied response from the client side without needing CF Dashboard logs.
const API_BASE_URL = (globalThis.__ENV || {}).NEXT_PUBLIC_API_BASE_URL || ''
const DEBUG = true; // flip to false once /api/* routing is verified

function shouldProxyApi(url) {
  return url.pathname.startsWith('/api/')
}

// Header names/values must be printable ASCII (RFC 7230). Browsers and
// extensions sometimes include non-ASCII in headers (e.g. Cookie with
// unicode characters, Referer with escaped paths). Filter them out before
// passing to the upstream fetch.
function isAscii(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 0x7e || s.charCodeAt(i) < 0x20) return false
  }
  return true
}

async function readResponsePreview(response, maxBytes = 500) {
  try {
    const clone = response.clone();
    const buf = await clone.arrayBuffer();
    const text = new TextDecoder().decode(buf.slice(0, maxBytes));
    return text;
  } catch (e) {
    return `<preview error: ${e?.message || e}>`;
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await this._handle(request, env, ctx);
    } catch (e) {
      // Surface worker-side exceptions to the client so we can debug without
      // needing CF Dashboard → Logs access.
      return new Response(JSON.stringify({
        error: 'worker_exception',
        message: String(e?.message || e),
        stack: String(e?.stack || '').slice(0, 800),
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        },
      });
    }
  },

  async _handle(request, env, ctx) {
    const url = new URL(request.url)

    if (shouldProxyApi(url)) {
      const apiBase = env.NEXT_PUBLIC_API_BASE_URL || API_BASE_URL
      if (!apiBase) {
        return new Response(JSON.stringify({ error: 'API base URL not configured' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const targetUrl = new URL(url.pathname + url.search, apiBase)

      // Build upstream headers, dropping any header whose name or value
      // contains non-ASCII characters. The Vercel/Node fetch implementation
      // rejects headers with bytes outside the printable-ASCII range with
      // "TypeError: Invalid header value.", and certain browser/User-Agent
      // strings can include such characters.
      const headers = new Headers()
      for (const [name, value] of request.headers.entries()) {
        try {
          if (isAscii(name) && isAscii(value)) {
            headers.append(name, value)
          } else {
            console.warn('[worker] drop non-ASCII header', name)
          }
        } catch (e) {
          console.warn('[worker] drop bad header', name, e?.message || e)
        }
      }
      headers.delete('host')
      headers.delete('cf-connecting-ip')
      headers.delete('cf-ray')
      headers.delete('cf-visitor')
      headers.delete('cf-worker')

      const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
        redirect: 'manual',
      })

      // CF Worker log: visible in Dashboard → Workers & Pages → word-base → Logs
      console.log('[worker] proxy', {
        incoming: url.pathname + url.search,
        target: String(targetUrl),
        method: request.method,
        hasAuth: Boolean(headers.get('Authorization')),
      })

      let response
      try {
        response = await fetch(proxyRequest)
      } catch (e) {
        console.error('[worker] upstream fetch failed', e?.message || e)
        const errBody = JSON.stringify({
          error: 'upstream_fetch_failed',
          message: String(e?.message || e),
          target: String(targetUrl),
        })
        return new Response(errBody, {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Build outgoing headers, tolerating upstream's potentially-malformed
      // values (e.g. multi-value set-cookie collapsed into a comma-separated
      // string by Headers init). Iterate and set individually so a single
      // bad header name/value doesn't kill the whole response.
      const newHeaders = new Headers()
      for (const [name, value] of response.headers.entries()) {
        try {
          // Skip hop-by-hop headers we already handle separately.
          if (name.toLowerCase() === 'content-encoding') continue;
          if (name.toLowerCase() === 'set-cookie') {
            // Multi-value cookies must be appended, not set.
            newHeaders.append('set-cookie', value);
            continue;
          }
          newHeaders.set(name, value);
        } catch (e) {
          console.warn('[worker] skip bad header', name, e?.message || e);
        }
      }
      newHeaders.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*')
      newHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      newHeaders.set('Access-Control-Allow-Credentials', 'true')

      if (DEBUG) {
        const preview = await readResponsePreview(response, 500)
        console.log('[worker] upstream response', {
          status: response.status,
          ctype: response.headers.get('content-type'),
          xVercelCache: response.headers.get('x-vercel-cache'),
          xVercelId: response.headers.get('x-vercel-id'),
          previewHead: String(preview).slice(0, 200),
        })
        try {
          newHeaders.set('X-Worker-Debug-Target', String(targetUrl))
          newHeaders.set('X-Worker-Debug-Status', String(response.status))
          newHeaders.set('X-Worker-Debug-CT', response.headers.get('content-type') || '')
          newHeaders.set('X-Worker-Debug-VercelCache', response.headers.get('x-vercel-cache') || '')
          newHeaders.set('X-Worker-Debug-Preview', String(preview).slice(0, 300))
        } catch (e) {
          console.warn('[worker] skip debug header', e?.message || e)
        }
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      })
    }

    return env.ASSETS.fetch(request)
  },
}
