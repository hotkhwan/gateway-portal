// src/routes/auth/callback/+server.ts
import type { RequestHandler } from './$types'
import { redirect } from '@sveltejs/kit'
import { PUBLIC_APP_BASE_URL } from '$env/static/public'

function normalizeBase(v?: string) {
  if (!v || v === '/') return ''
  return '/' + v.replace(/^\/+|\/+$/g, '')
}

function cookieSecurity(url: URL) {
  const isHttps = url.protocol === 'https:'
  // dev บน localhost -> secure false, sameSite lax
  if (!isHttps) {
    return { sameSite: 'lax' as const, secure: false }
  }
  // prod https -> ถ้า login/callback อยู่ same-site ใช้ lax ก็พอ
  // ถ้า cross-site จริงค่อยเปลี่ยนเป็น none
  return { sameSite: 'lax' as const, secure: true }
}

export const GET: RequestHandler = async ({ url, cookies, fetch }) => {
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) throw redirect(302, '/')

  const base = normalizeBase(PUBLIC_APP_BASE_URL)
  const cookiePath = base || '/'

  const savedState = cookies.get('kc_state')
  if (savedState !== state) throw redirect(302, '/')

  const redirectUri = `${url.origin}${base}/auth/callback`

  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ code, redirectUri })
  })

  if (!res.ok) throw redirect(302, '/')

  const data = await res.json()
  const sec = cookieSecurity(url)

  cookies.set('session_token', data.accessToken, {
    httpOnly: true,
    ...sec,
    path: cookiePath,
    maxAge: 3600
  })

  if (data.refreshToken) {
    cookies.set('session_refresh', data.refreshToken, {
      httpOnly: true,
      ...sec,
      path: cookiePath,
      maxAge: 86400
    })
  }

  cookies.delete('kc_state', { path: cookiePath })

  const returnTo = cookies.get('return_to') || `${base}/dashboard`
  cookies.delete('return_to', { path: cookiePath })

  throw redirect(302, returnTo)
}
