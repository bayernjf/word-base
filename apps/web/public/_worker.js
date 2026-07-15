const API_BASE_URL = (globalThis.__ENV || {}).NEXT_PUBLIC_API_BASE_URL || ''

function shouldProxyApi(url) {
  return url.pathname.startsWith('/api/')
}

function isAscii(s) {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 0x7e || s.charCodeAt(i) < 0x20) return false
  }
  return true
}

export default {
  async fetch(request, env, ctx) {
    try {
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

        const headers = new Headers()
        for (const [name, value] of request.headers.entries()) {
          try {
            if (isAscii(name) && isAscii(value)) {
              headers.append(name, value)
            }
          } catch (e) {
            // skip bad header
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

        const response = await fetch(proxyRequest)

        const newHeaders = new Headers()
        for (const [name, value] of response.headers.entries()) {
          try {
            if (name.toLowerCase() === 'content-encoding') continue
            if (name.toLowerCase() === 'set-cookie') {
              newHeaders.append('set-cookie', value)
              continue
            }
            newHeaders.set(name, value)
          } catch (e) {
            // skip bad header
          }
        }
        newHeaders.set('Access-Control-Allow-Origin', request.headers.get('Origin') || '*')
        newHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS')
        newHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        newHeaders.set('Access-Control-Allow-Credentials', 'true')

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        })
      }

      return env.ASSETS.fetch(request)
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'worker_exception',
        message: String(e?.message || e),
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
        },
      })
    }
  },
}
