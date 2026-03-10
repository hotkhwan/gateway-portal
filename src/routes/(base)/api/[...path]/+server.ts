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
  // Always use '/' to match auth/callback which sets cookies with path '/'
  return '/'
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

async function refreshSession(cookies: Cookies) {
  const refreshToken = cookies.get('session_refresh')
  if (!refreshToken) return { ok: false as const }

  const targetUrl = `${API_BASE}/auth/refreshToken`

  // Use globalThis.fetch to avoid SvelteKit internal routing loop
  const res = await globalThis.fetch(targetUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  })

  if (!res.ok) return { ok: false as const }

  const wrapper = await res.json() as Record<string, any>
  // Backend wraps response in { code, message, status, details }
  const data = wrapper.details ?? wrapper

  const accessToken = data.access_token ?? data.accessToken
  const newRefreshToken = data.refresh_token ?? data.refreshToken
  const expiresIn = data.expires_in ?? data.expiresIn
  const refreshExpiresIn = data.refresh_expires_in ?? data.refreshExpiresIn

  if (!accessToken) return { ok: false as const }

  const path = cookiePath()

  cookies.set('session_token', accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE === 'true',
    path,
    maxAge: Math.max(60, expiresIn ?? 3600)
  })

  if (newRefreshToken) {
    cookies.set('session_refresh', newRefreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: COOKIE_SECURE === 'true',
      path,
      maxAge: Math.max(300, refreshExpiresIn ?? 86400)
    })
  }

  return { ok: true as const }
}

async function forwardOnce(
  body: ArrayBuffer | undefined,
  url: URL,
  method: string,
  reqHeaders: Headers,
  path: string,
  cookies: Cookies
) {
  const targetUrl = new URL(API_BASE.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, ''))
  url.searchParams.forEach((v, k) => targetUrl.searchParams.set(k, v))

  const headers = filterHeaders(reqHeaders)

  const token = cookies.get('session_token')
  if (token) headers.set('authorization', `Bearer ${token}`)

  // Use globalThis.fetch to avoid SvelteKit internal routing loop
  const res = await globalThis.fetch(targetUrl.toString(), {
    method,
    headers,
    body
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
  cookies: Cookies
) {
  const token = cookies.get('session_token')
  const exp = token ? decodeJwtExp(token) : null
  const now = Math.floor(Date.now() / 1000)
  const skew = Number(AUTH_REFRESH_SKEW_SEC || 45)

  if (exp && exp - now <= skew) {
    await refreshSession(cookies)
  }

  // Read body once, reuse for retry
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.arrayBuffer()

  const first = await forwardOnce(body, url, request.method, request.headers, path, cookies)

  if (first.status !== 401 && first.status !== 403) return first
  if (!cookies.get('session_refresh')) return first

  const refreshed = await refreshSession(cookies)
  if (!refreshed.ok) return first

  return forwardOnce(body, url, request.method, request.headers, path, cookies)
}

export const GET: RequestHandler = ({ params, request, url, cookies }) =>
  proxy(request, url, params.path ?? '', cookies)

export const POST: RequestHandler = ({ params, request, url, cookies }) =>
  proxy(request, url, params.path ?? '', cookies)

export const PUT: RequestHandler = ({ params, request, url, cookies }) =>
  proxy(request, url, params.path ?? '', cookies)

export const PATCH: RequestHandler = ({ params, request, url, cookies }) =>
  proxy(request, url, params.path ?? '', cookies)

export const DELETE: RequestHandler = ({ params, request, url, cookies }) =>
  proxy(request, url, params.path ?? '', cookies)
