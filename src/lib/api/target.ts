// src/lib/api/target.ts
import type { ApiResponse, DeliveryTarget } from '$lib/types/org'

// Client-side ใช้ import.meta.env.PUBLIC_*
const APP_BASE = (import.meta.env.PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')
const BASE = `${APP_BASE}/api`

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
// Delivery Targets  →  /targets  (X-Active-Org required)
// ────────────────────────────────────────────
export async function listTargets(orgId: string): Promise<DeliveryTarget[]> {
  const r = await apiFetch<DeliveryTarget[]>('/targets', orgId)
  return r.details ?? []
}

export async function createTarget(
  orgId: string,
  body: Omit<DeliveryTarget, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>
): Promise<DeliveryTarget> {
  const r = await apiFetch<DeliveryTarget>('/targets', orgId, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  return r.details
}

export async function getTarget(
  orgId: string,
  targetId: string
): Promise<DeliveryTarget> {
  const r = await apiFetch<DeliveryTarget>(`/targets/${targetId}`, orgId)
  return r.details
}

export async function updateTarget(
  orgId: string,
  targetId: string,
  body: Partial<Omit<DeliveryTarget, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>
): Promise<DeliveryTarget> {
  const r = await apiFetch<DeliveryTarget>(`/targets/${targetId}`, orgId, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  return r.details
}

export async function deleteTarget(orgId: string, targetId: string): Promise<void> {
  await apiFetch<void>(`/targets/${targetId}`, orgId, { method: 'DELETE' })
}
