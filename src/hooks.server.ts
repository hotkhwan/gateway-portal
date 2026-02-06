// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit'
import { redirect } from '@sveltejs/kit'
// import { PUBLIC_APP_BASE_URL } from '$env/static/public'

import { userFromToken } from '$lib/server/auth'
const PUBLIC_APP_BASE_URL = process.env.PUBLIC_APP_BASE_URL || '';
function normalizeBase(v?: string) {
  if (!v || v === '/') return ''
  return '/' + v.replace(/^\/+|\/+$/g, '')
}

function stripBase(pathname: string, base: string) {
  if (!base) return pathname
  return pathname.startsWith(base) ? pathname.slice(base.length) || '/' : pathname
}

const publicExact = new Set([
  '/',               // root
  '/landing',
  '/robots.txt',
  '/favicon.ico'
])

const publicPrefixes = [
  '/auth',
  '/api',
  '/_app' // sveltekit assets
]

function isPublicPath(pathnameNoBase: string) {
  if (publicExact.has(pathnameNoBase)) return true
  return publicPrefixes.some(p => pathnameNoBase.startsWith(p))
}

export const handle: Handle = async ({ event, resolve }) => {
  const base = normalizeBase(PUBLIC_APP_BASE_URL)
  const pathname = event.url.pathname
  const pathnameNoBase = stripBase(pathname, base)

  event.locals.user = null

  const token = event.cookies.get('session_token') // ✅ match callback
  if (token) {
    try {
      const user = userFromToken(token)
      event.locals.user = { ...user, accessToken: token }
    } catch {
      event.cookies.delete('session_token', { path: base || '/' })
      event.cookies.delete('session_refresh', { path: base || '/' })
    }
  }

  if (!event.locals.user && !isPublicPath(pathnameNoBase)) {
    const returnTo = `${pathname}${event.url.search || ''}`
    throw redirect(302, `${base}/auth/session/start?returnTo=${encodeURIComponent(returnTo)}`)
  }

  return resolve(event)
}
