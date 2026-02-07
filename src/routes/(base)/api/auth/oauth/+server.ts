// src/routes/(base)/api/auth/oauth/+server.ts
import type { RequestHandler } from './$types'

const apiBase = process.env.API_BASE || ''

export const POST: RequestHandler = async ({ request, fetch }) => {
    if (!apiBase) {
        return new Response(
            JSON.stringify({ code: 'CONFIG_ERROR', message: 'API_BASE is empty', status: false }),
            { status: 500, headers: { 'content-type': 'application/json' } }
        )
    }

    const body = await request.json().catch(() => null) as null | { code?: string; redirectUri?: string }
    const code = body?.code
    const redirectUri = body?.redirectUri

    if (!code || !redirectUri) {
        return new Response(
            JSON.stringify({ code: 'BAD_REQUEST', message: 'missing code or redirectUri', status: false }),
            { status: 400, headers: { 'content-type': 'application/json' } }
        )
    }

    // ✅ FIX: ยิงไป backend endpoint ที่เราจะเพิ่มจริง ๆ
    const targetUrl = new URL(apiBase.replace(/\/+$/, '') + '/auth/oauth')

    const res = await fetch(targetUrl.toString(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code, redirectUri })
    })

    const text = await res.text()

    return new Response(text, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') || 'application/json' }
    })
}
