import { base } from '$app/paths'
import { env } from '$env/dynamic/private'

export const POST = async ({ cookies, fetch }) => {
  const cookiePath = base && base !== '' ? base : '/'

  // read token BEFORE deleting cookies
  const sessionToken = cookies.get('session_token') || ''

  const apiBase = (env.API_BASE || '').trim()
  const backendLogoutPath = (env.AUTH_LOGOUT_PATH || '/auth/signout').trim()

  let backendResponse
  let backendBody: unknown = null
  let backendStatus = 200
  let backendHeaders: HeadersInit = {
    'content-type': 'application/json'
  }

  if (apiBase && sessionToken) {
    try {
      backendResponse = await fetch(`${apiBase}${backendLogoutPath}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${sessionToken}`,
          'content-type': 'application/json'
        }
      })

      backendStatus = backendResponse.status

      // try to pass through body
      const text = await backendResponse.text()
      try {
        backendBody = text ? JSON.parse(text) : null
      } catch {
        backendBody = text
      }

      // pass through content-type if exists
      const ct = backendResponse.headers.get('content-type')
      if (ct) {
        backendHeaders = { 'content-type': ct }
      }
    } catch (err) {
      backendStatus = 502
      backendBody = {
        error: 'backend_unreachable',
        message: 'Unable to reach auth backend'
      }
    }
  } else {
    // no backend call possible
    backendStatus = 200
    backendBody = { ok: true }
  }

  // always clear cookies (logout = local session termination)
  cookies.delete('session_token', { path: cookiePath })
  cookies.delete('session_refresh', { path: cookiePath })

  return new Response(
    backendBody ? JSON.stringify(backendBody) : null,
    {
      status: backendStatus,
      headers: backendHeaders
    }
  )
}
