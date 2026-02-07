// src/routes/(base)/api/[...path]/+server.ts
import type { RequestHandler } from './$types'
import type { Cookies } from '@sveltejs/kit'

const PUBLIC_APP_BASE_PATH = process.env.PUBLIC_APP_BASE_PATH || '';
const API_BASE = process.env.API_BASE || '';
const AUTH_REFRESH_SKEW_SEC = process.env.AUTH_REFRESH_SKEW_SEC || '45';
const COOKIE_SECURE = process.env.COOKIE_SECURE || 'false';

const hopByHopHeaders = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host'
])

function filterHeaders(headers: Headers) {
  const out = new Headers()
  for (const [k, v] of headers.entries()) {
    if (hopByHopHeaders.has(k.toLowerCase())) continue
    out.set(k, v)
  }
  return out
}

function cookiePath() {
  const raw = (PUBLIC_APP_BASE_PATH || '').trim()
  if (!raw || raw === '/') return '/'
  return '/' + raw.replace(/^\/+|\/+$/g, '')
}

function decodeJwtExp(token: string) {
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const json = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as { exp?: number }
    return typeof json.exp === 'number' ? json.exp : null
  } catch {
    return null
  }
}

async function refreshSession(fetchFn: typeof fetch, cookies: Cookies) {
  const refreshToken = cookies.get('session_refresh')
  if (!refreshToken) return { ok: false as const }

  const targetUrl = `${API_BASE}/auth/refreshToken`

  const res = await fetchFn(targetUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })

  if (!res.ok) return { ok: false as const }

  const data = await res.json() as {
    accessToken: string
    refreshToken?: string
    expiresIn?: number
    refreshExpiresIn?: number
  }

  const path = cookiePath()

  cookies.set('session_token', data.accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE === 'true',
    path,
    maxAge: Math.max(60, data.expiresIn ?? 3600)
  })

  if (data.refreshToken) {
    cookies.set('session_refresh', data.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE === 'true',
      path,
      maxAge: Math.max(300, data.refreshExpiresIn ?? 86400)
    })
  }

  return { ok: true as const }
}

async function forwardOnce(
  request: Request,
  url: URL,
  path: string,
  fetchFn: typeof fetch,
  cookies: Cookies
) {
  const targetUrl = new URL(API_BASE.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, ''))
  url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v))

  const headers = filterHeaders(request.headers)

  const token = cookies.get('session_token')
  if (token) headers.set('authorization', `Bearer ${token}`)

  const res = await fetchFn(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer()
  })

  return new Response(res.body, {
    status: res.status,
    headers: filterHeaders(res.headers)
  })
}

async function proxy(
  request: Request,
  url: URL,
  path: string,
  fetchFn: typeof fetch,
  cookies: Cookies
) {
  const token = cookies.get('session_token')
  const exp = token ? decodeJwtExp(token) : null
  const now = Math.floor(Date.now() / 1000)
  const skew = Number(AUTH_REFRESH_SKEW_SEC || 45)

  if (exp && exp - now <= skew) {
    await refreshSession(fetchFn, cookies)
  }

  const first = await forwardOnce(request, url, path, fetchFn, cookies)

  if (first.status !== 401 && first.status !== 403) return first
  if (!cookies.get('session_refresh')) return first

  const refreshed = await refreshSession(fetchFn, cookies)
  if (!refreshed.ok) return first

  return forwardOnce(request, url, path, fetchFn, cookies)
}

export const GET: RequestHandler = ({ params, request, url, fetch, cookies }) =>
  proxy(request, url, params.path ?? '', fetch, cookies)

export const POST: RequestHandler = ({ params, request, url, fetch, cookies }) =>
  proxy(request, url, params.path ?? '', fetch, cookies)

export const PUT: RequestHandler = ({ params, request, url, fetch, cookies }) =>
  proxy(request, url, params.path ?? '', fetch, cookies)

export const PATCH: RequestHandler = ({ params, request, url, fetch, cookies }) =>
  proxy(request, url, params.path ?? '', fetch, cookies)

export const DELETE: RequestHandler = ({ params, request, url, fetch, cookies }) =>
  proxy(request, url, params.path ?? '', fetch, cookies)
