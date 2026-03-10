// src/routes/(base)/auth/callback/+server.ts
import type { RequestHandler } from './$types'
import { redirect } from '@sveltejs/kit'

const PUBLIC_APP_BASE_PATH = process.env.PUBLIC_APP_BASE_PATH || ''

function normalizeBase(v?: string) {
  if (!v || v === '/') return ''
  return '/' + v.replace(/^\/+|\/+$/g, '')
}

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const base = normalizeBase(PUBLIC_APP_BASE_PATH)
  const code = url.searchParams.get('code')
  const stateParam = url.searchParams.get('state')

  if (!code || !stateParam) {
    console.error('[auth/callback] missing code or state param')
    throw redirect(302, `${base}/auth/error?error=${encodeURIComponent('Missing auth params')}&type=auth_failed`)
  }

  // ── 1. verify state (CSRF protection)
  const savedState = cookies.get('kc_state')

  if (!savedState) {
    // Cookie missing — likely caused by cross-origin redirect (IP vs hostname mismatch)
    // or browser privacy settings dropping cookies across external redirect
    console.error(`[auth/callback] kc_state cookie missing. state_param=${stateParam} origin=${url.origin}`)
    console.error('[auth/callback] Tip: register this redirect_uri in Keycloak client:',
      `${url.origin}${base}/auth/callback`)
    throw redirect(302,
      `${base}/auth/error?error=${encodeURIComponent('Session expired or origin mismatch. Please try again.')}&type=state_missing`
    )
  }

  if (savedState !== stateParam) {
    console.error(`[auth/callback] state mismatch. cookie=${savedState} param=${stateParam}`)
    throw redirect(302,
      `${base}/auth/error?error=${encodeURIComponent('Invalid auth state. Please try again.')}&type=state_mismatch`
    )
  }

  // ── 2. reconstruct redirect_uri using saved origin (so it matches what was sent to Keycloak)
  const savedOrigin = cookies.get('kc_origin') || `${url.protocol}//${url.host}`
  const redirectUri = `${savedOrigin}${base}/auth/callback`

  // ── 3. exchange code for tokens via BFF
  const bffUrl = new URL(`${url.origin}${base}/api/auth/oauth`)

  const res = await fetch(bffUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, redirectUri })
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    console.error(`[auth/callback] token exchange failed. status=${res.status} body=${text}`)

    const isConnectionError =
      res.status === 503 ||
      text.includes('Connection refused') ||
      text.includes('remote connection failure')

    const errorMsg = isConnectionError
      ? `API Gateway Error (${res.status}): ${text.substring(0, 200)}`
      : `Authentication failed (Status: ${res.status})`

    const errorType = isConnectionError ? 'api_connection' : 'auth_failed'

    throw redirect(302,
      `${base}/auth/error?error=${encodeURIComponent(errorMsg)}&type=${errorType}`
    )
  }

  const wrapped = await res.json() as any
  console.log('[auth/callback] token exchange response:', JSON.stringify(wrapped).substring(0, 500))
  // auth/oauth endpoint may return either key — handle both
  const detail = wrapped?.details ?? wrapped?.detail ?? wrapped

  if (!detail?.access_token) {
    console.error('[auth/callback] no access_token in response:', JSON.stringify(wrapped).substring(0, 500))
    throw redirect(302,
      `${base}/auth/error?error=${encodeURIComponent('No access token received from backend')}&type=auth_failed`
    )
  }

  // ── 4. set session cookies
  const sec = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: url.protocol === 'https:',
    path: '/'
  }

  cookies.set('session_token', detail.access_token, {
    ...sec,
    maxAge: detail.expires_in ?? 3600
  })

  if (detail.refresh_token) {
    cookies.set('session_refresh', detail.refresh_token, {
      ...sec,
      maxAge: detail.refresh_expires_in ?? 86400
    })
  }

  // ── 5. cleanup temp cookies
  cookies.delete('kc_state', { path: '/' })
  cookies.delete('kc_origin', { path: '/' })

  const returnTo = cookies.get('return_to') || `${base}/dashboard`
  cookies.delete('return_to', { path: '/' })

  throw redirect(302, returnTo)
}