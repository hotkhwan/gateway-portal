// src/routes/(app)/+layout.server.ts
import { error } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'

export const load = (event: RequestEvent) => {
  if (!event.locals.user) {
    throw error(401)
  }

  return {
    user: event.locals.user
  }
}

