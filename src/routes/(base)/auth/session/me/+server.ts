// src/routes/auth/session/me/+server.ts
import type { RequestHandler } from './$types'
import { json } from '@sveltejs/kit'

export const GET: RequestHandler = async ({ cookies }) => {
  if (!cookies.get('session_token')) {
    return json({ authenticated: false })
  }

  return json({ authenticated: true })
}
