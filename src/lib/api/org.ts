// src/lib/api/org.ts
import type { ApiResponse, Org, IngestConfig } from '$lib/types/org'

const APP_BASE = (import.meta.env.PUBLIC_APP_BASE_PATH ?? '').replace(/\/$/, '')
const BASE = `${APP_BASE}/api`

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  orgId?: string
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(orgId ? { 'x-active-org': orgId } : {}),
      ...init?.headers
    },
    ...init
  })
  const json = await res.json()
  if (!res.ok) throw json
  return json as ApiResponse<T>
}

// ────────────────────────────────────────────
// Organizations
// ────────────────────────────────────────────
export async function listOrgs(): Promise<Org[]> {
  const r = await apiFetch<Org[]>('/orgs')
  return r.details ?? []
}

export async function createOrg(body: {
  name: string
  description?: string
}): Promise<Org> {
  const r = await apiFetch<Org>('/orgs', {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return r.details
}

export async function getOrg(id: string): Promise<Org> {
  const r = await apiFetch<Org>(`/orgs/${id}`)
  return r.details
}

export async function updateOrg(
  id: string,
  body: { name?: string; description?: string }
): Promise<Org> {
  const r = await apiFetch<Org>(`/orgs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  return r.details
}

// ────────────────────────────────────────────
// Ingest Config  →  /ingest  (X-Active-Org required)
// ────────────────────────────────────────────
export async function getIngestConfig(orgId: string): Promise<IngestConfig> {
  const r = await apiFetch<IngestConfig>('/ingest', undefined, orgId)
  return r.details
}

export async function rotateIngestSecret(orgId: string): Promise<IngestConfig> {
  const r = await apiFetch<IngestConfig>('/ingest/rotateSecret', { method: 'POST' }, orgId)
  return r.details
}
