// src/lib/api/authGuard.ts
// Centralized auth guard: redirects to login when session is expired (401/403)
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'

const basePath = (PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')

/**
 * Check API response for auth errors (401/403).
 * If detected, redirect to login page and throw to stop further execution.
 * Call this after fetch() but before processing the response body.
 */
export function guardAuth(res: Response): void {
	if (res.status === 401 || res.status === 403) {
		if (typeof window !== 'undefined') {
			const returnTo = window.location.pathname + window.location.search
			window.location.href = `${basePath}/auth/session/start?returnTo=${encodeURIComponent(returnTo)}`
		}
		throw { code: 'SESSION_EXPIRED', message: 'Session expired', status: false }
	}
}
