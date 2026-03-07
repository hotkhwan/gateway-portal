// src/routes/(base)/auth/session/start/+server.ts
import type { RequestHandler } from './$types'
import { redirect } from '@sveltejs/kit'

const PUBLIC_KC_ISSUER_URI = process.env.PUBLIC_KC_ISSUER_URI || ''
const PUBLIC_KC_REALM = process.env.PUBLIC_KC_REALM || ''
const PUBLIC_KC_CLIENT_FE_ID = process.env.PUBLIC_KC_CLIENT_FE_ID || ''
const PUBLIC_APP_BASE_PATH = process.env.PUBLIC_APP_BASE_PATH || ''

function normalizeBase(v?: string) {
  if (!v || v === '/') return ''
  return '/' + v.replace(/^\/+|\/+$/g, '')
}

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`missing env: ${name}`)
  return v
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const base = normalizeBase(PUBLIC_APP_BASE_PATH)

  // ── 1. resolve origin dynamically from the incoming request
  // PUBLIC_APP_ORIGIN overrides (useful for prod/staging with fixed domain)
  // Falls back to actual request origin — works for localhost AND IP access
  const origin = (process.env.PUBLIC_APP_ORIGIN || '').trim() || `${url.protocol}//${url.host}`

  const issuer = must(PUBLIC_KC_ISSUER_URI, 'PUBLIC_KC_ISSUER_URI').replace(/\/+$/, '')
  const realm = must(PUBLIC_KC_REALM, 'PUBLIC_KC_REALM')
  const clientId = must(PUBLIC_KC_CLIENT_FE_ID, 'PUBLIC_KC_CLIENT_FE_ID')

  const redirectUri = `${origin}${base}/auth/callback`
  const state = crypto.randomUUID()

  const returnTo = url.searchParams.get('returnTo') || `${base}/dashboard`

  // ── 2. set cookies with path '/'
  // encode origin into kc_origin cookie so callback can verify it came from the same origin
  const cookieOpts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: url.protocol === 'https:',
    path: '/'
  }

  cookies.set('kc_state', state, cookieOpts)
  cookies.set('kc_origin', origin, cookieOpts)   // ← new: store origin for callback verification
  cookies.set('return_to', returnTo, cookieOpts)

  const authUrl = new URL(`${issuer}/realms/${realm}/protocol/openid-connect/auth`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid profile email')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  throw redirect(302, authUrl.toString())
}