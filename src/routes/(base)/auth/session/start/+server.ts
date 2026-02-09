// src/routes/(base)/auth/session/start/+server.ts
import type { RequestHandler } from './$types'
import { redirect } from '@sveltejs/kit'

const PUBLIC_APP_BASE_PATH = process.env.PUBLIC_APP_BASE_PATH || '';
const PUBLIC_KC_ISSUER_URI = process.env.PUBLIC_KC_ISSUER_URI || '';
const PUBLIC_KC_REALM = process.env.PUBLIC_KC_REALM || '';
const PUBLIC_KC_CLIENT_FE_ID = process.env.PUBLIC_KC_CLIENT_FE_ID || '';

function must(v: string | undefined, name: string) {
  if (!v) throw new Error(`missing ${name}`)
  return v
}

const BASE_PATH = normalizeBase(process.env.PUBLIC_APP_BASE_PATH)

function normalizeBase(v?: string) {
  if (!v || v === '/') return ''
  return '/' + v.replace(/^\/+|\/+$/g, '')
}

export const GET: RequestHandler = async ({ url, cookies }) => {
  const returnTo =
    url.searchParams.get('returnTo') || `${BASE_PATH}/dashboard`

  cookies.set('return_to', returnTo, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/'
  })

  const issuer = must(PUBLIC_KC_ISSUER_URI, 'PUBLIC_KC_ISSUER_URI').replace(/\/+$/, '')
  const realm = must(PUBLIC_KC_REALM, 'PUBLIC_KC_REALM')
  const clientId = must(PUBLIC_KC_CLIENT_FE_ID, 'PUBLIC_KC_CLIENT_FE_ID')

  const base = normalizeBase(PUBLIC_APP_BASE_PATH)
  const cookiePath = '/'

  const appOrigin =
    process.env.PUBLIC_APP_ORIGIN ||
    `${url.protocol}//${url.host}`

  const redirectUri = `${appOrigin}${base}/auth/callback`
  const state = crypto.randomUUID()

  const authUrl = new URL(`${issuer}/realms/${realm}/protocol/openid-connect/auth`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid profile email')
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)

  cookies.set('kc_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: cookiePath
  })

  cookies.set('return_to', returnTo, {
    httpOnly: true,
    sameSite: 'lax',
    path: cookiePath
  })

  throw redirect(302, authUrl.toString())
}
