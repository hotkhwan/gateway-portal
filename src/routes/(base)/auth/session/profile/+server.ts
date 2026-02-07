// src/routes/auth/session/profile/+server.ts
import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ fetch, cookies }) => {
  if (!cookies.get('session_token')) {
    return json({ authenticated: false })
  }

  const res = await fetch('/api/auth/introspect', {
    method: 'GET'
  })

  if (!res.ok) {
    return json({ authenticated: false })
  }

  const profile = await res.json()
  return json({ authenticated: true, profile })
}
