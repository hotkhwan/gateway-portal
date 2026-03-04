// src/routes/auth/callback/+server.ts
import type { RequestHandler } from './$types'
import { redirect } from '@sveltejs/kit'

const publicAppBasePath = process.env.PUBLIC_APP_BASE_PATH || ''

function normalizeBase(v?: string) {
  if (!v || v === '/') return ''
  return '/' + v.replace(/^\/+|\/+$/g, '')
}

function cookieSecurity(url: URL) {
  const isHttps = url.protocol === 'https:'
  if (!isHttps) return { sameSite: 'lax' as const, secure: false }
  return { sameSite: 'lax' as const, secure: true }
}

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) throw redirect(302, '/')

  const base = normalizeBase(publicAppBasePath)
  const cookiePath = '/'

  const savedState = cookies.get('kc_state')
  if (savedState !== state) {
    console.error(`Auth state mismatch. Cookie: ${savedState}, Param: ${state}`)
    throw redirect(302, `${base}/`)
  }

  const redirectUri = `${url.origin}${base}/auth/callback`

  // ✅ FIX: route ต้องตรงกับไฟล์ (base)/api/auth/oauth
  const bffUrl = new URL(`${base}/api/auth/oauth`, url.origin)

  console.log('Exchanging token with code:', code)
  console.log('BFF endpoint:', bffUrl.toString())

  const res = await fetch(bffUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, redirectUri })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`Failed to exchange token. Status: ${res.status}`)
    console.error(`Response: ${text}`)

    // Detect API connection errors (503, connection refused, etc.)
    const isApiConnectionError =
      res.status === 503 ||
      text.includes('Connection refused') ||
      text.includes('remote connection failure') ||
      text.includes('transport failure')

    const errorParam = isApiConnectionError
      ? encodeURIComponent(`API Gateway Error (${res.status}): ${text.substring(0, 200)}`)
      : encodeURIComponent(`Authentication failed (Status: ${res.status})`)

    const errorType = isApiConnectionError ? 'api_connection' : 'auth_failed'

    throw redirect(302, `${base}/auth/error?error=${errorParam}&type=${errorType}`)
  }

  // backend ส่ง format แบบ gmod.SendSuccess -> {status:true, detail:{...}}
  const wrapped = await res.json() as any
  const detail = wrapped?.detail ?? wrapped

  const sec = cookieSecurity(url)

  cookies.set('session_token', detail.access_token, {
    httpOnly: true,
    ...sec,
    path: cookiePath,
    maxAge: 3600
  })

  if (detail.refresh_token) {
    cookies.set('session_refresh', detail.refresh_token, {
      httpOnly: true,
      ...sec,
      path: cookiePath,
      maxAge: 3600 * 24 * 30
    })
  }

  cookies.delete('kc_state', { path: cookiePath })

  const returnTo = cookies.get('return_to') || `${base}/dashboard`
  cookies.delete('return_to', { path: cookiePath })

  throw redirect(302, returnTo)
}
