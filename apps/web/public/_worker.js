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

      const headers = new Headers(request.headers)
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
        target: targetUrl.toString(),
        method: request.method,
        hasAuth: Boolean(headers.get('Authorization')),
      })

      let response
      try {
        response = await fetch(proxyRequest)
      } catch (e) {
        console.error('[worker] upstream fetch failed', e?.message || e)
        return new Response(JSON.stringify({
          error: 'upstream_fetch_failed',
          message: String(e?.message || e),
          target: targetUrl.toString(),
        }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const newHeaders = new Headers(response.headers)
      newHeaders.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*')
      newHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
      newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      newHeaders.set('Access-Control-Allow-Credentials', 'true')
      newHeaders.delete('content-encoding')

      if (DEBUG) {
        const preview = await readResponsePreview(response, 500)
        console.log('[worker] upstream response', {
          status: response.status,
          ctype: response.headers.get('content-type'),
          xVercelCache: response.headers.get('x-vercel-cache'),
          xVercelId: response.headers.get('x-vercel-id'),
          previewHead: preview.slice(0, 200),
        })
        newHeaders.set('X-Worker-Debug-Target', targetUrl.toString())
        newHeaders.set('X-Worker-Debug-Status', String(response.status))
        newHeaders.set('X-Worker-Debug-CT', response.headers.get('content-type') || '')
        newHeaders.set('X-Worker-Debug-VercelCache', response.headers.get('x-vercel-cache') || '')
        newHeaders.set('X-Worker-Debug-Preview', preview.slice(0, 300))
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
