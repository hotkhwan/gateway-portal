// src/lib/api/ingest.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, IngestConfig } from '$lib/types/org'

const BASE = `${(PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')}/api`

async function apiFetch<T>(
    path: string,
    orgId: string,
    init?: RequestInit
): Promise<ApiResponse<T>> {
    const res = await fetch(`${BASE}${path}`, {
        headers: {
            'content-type': 'application/json',
            'x-active-org': orgId,
            ...init?.headers
        },
        ...init
    })
    const json = await res.json()
    if (!res.ok) throw json
    return json as ApiResponse<T>
}

// ────────────────────────────────────────────
// Ingest Config  →  GET /ingest  (X-Active-Org required)
// ────────────────────────────────────────────
export async function getIngestConfig(orgId: string): Promise<IngestConfig> {
    const r = await apiFetch<IngestConfig>('/ingest', orgId)
    if (!r.detail) throw new Error('ingest config not found')
    return r.detail
}

export async function rotateIngestSecret(orgId: string): Promise<IngestConfig> {
    const r = await apiFetch<IngestConfig>('/ingest/rotateSecret', orgId, { method: 'POST' })
    if (!r.detail) throw new Error('ingest config not found')
    return r.detail
}