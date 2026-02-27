// src/lib/api/org.ts
import type { ApiResponse, Org, IngestConfig, OrgMember, PaginatedResponse } from '$lib/types/org'

// Client-side ใช้ import.meta.env.PUBLIC_*
const APP_BASE = (import.meta.env.PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')
const BASE = `${APP_BASE}/api`

// Debug: log เพื่อเช็คค่า
console.log('🔍 [org.ts] PUBLIC_APP_BASE_PATH =', import.meta.env.PUBLIC_APP_BASE_PATH)
console.log('🔍 [org.ts] APP_BASE =', APP_BASE)
console.log('🔍 [org.ts] BASE =', BASE)

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
  const r = await apiFetch<any[]>('/orgs')
  // Map backend response (orgId) to frontend type (id)
  const items = r.details ?? []
  console.log('🔍 [listOrgs] response:', JSON.stringify(r))
  const now = new Date().toISOString()
  return items.map((item: any) => ({
    id: item.orgId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }))
}

export async function createOrg(body: {
  name: string
  description?: string
}): Promise<Org> {
  const r = await apiFetch<any>('/orgs', {
    method: 'POST',
    body: JSON.stringify(body)
  })
  const item = r.details ?? r // Backend might return data directly or wrapped in details
  console.log('🔍 [createOrg] response:', JSON.stringify(r))
  // Handle both 'id' and 'orgId' from backend response
  if (!item) {
    throw new Error('Failed to create org: no data returned')
  }
  const now = new Date().toISOString()
  return {
    id: item.id ?? item.orgId,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }
}

export async function getOrg(id: string): Promise<Org> {
  const r = await apiFetch<any>(`/orgs/${id}`)
  const item = r.details ?? r // Backend might return data directly or wrapped in details
  console.log('🔍 [getOrg] response:', JSON.stringify(r))
  if (!item) {
    throw new Error('Failed to get org: no data returned')
  }
  const now = new Date().toISOString()
  return {
    id: item.orgId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }
}

export async function updateOrg(
  id: string,
  body: { name?: string; description?: string; isActive?: boolean }
): Promise<Org> {
  const r = await apiFetch<any>(`/orgs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  const item = r.details ?? r // Backend might return data directly or wrapped in details
  console.log('🔍 [updateOrg] response:', JSON.stringify(r))
  if (!item) {
    throw new Error('Failed to update org: no data returned')
  }
  const now = new Date().toISOString()
  return {
    id: item.orgId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }
}

export async function deleteOrg(id: string): Promise<void> {
  await apiFetch(`/orgs/${id}`, {
    method: 'DELETE'
  })
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

// ────────────────────────────────────────────
// Org Members  →  /users/members, /users/invite, /users/remove
// ────────────────────────────────────────────
export async function listOrgMembers(
  orgId: string,
  params?: {
    page?: number
    perPages?: number
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  }
): Promise<PaginatedResponse<OrgMember>> {
  const queryParams = new URLSearchParams()
  if (params) {
    if (params.page !== undefined) queryParams.set('page', String(params.page))
    if (params.perPages !== undefined) queryParams.set('perPages', String(params.perPages))
    if (params.sortField) queryParams.set('sortField', params.sortField)
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
    if (params.search) queryParams.set('search', params.search)
  }

  const queryString = queryParams.toString()
  console.log('🔍 [listOrgMembers] calling with orgId:', orgId, 'params:', params, 'queryString:', queryString)
  const r = await apiFetch<PaginatedResponse<OrgMember>>(
    `/orgs/users/members${queryString ? '?' + queryString : ''}`,
    undefined,
    orgId
  )
  console.log('🔍 [listOrgMembers] response:', JSON.stringify(r))
  return r.details
}

export async function inviteOrgUsers(
  orgId: string,
  users: { userId: string; role: 'admin' | 'member' }[]
): Promise<void> {
  await apiFetch('/orgs/users/invite', {
    method: 'POST',
    body: JSON.stringify({ users })
  }, orgId)
}

export async function inviteUserByEmail(
  orgId: string,
  email: string,
  role: 'admin' | 'member'
): Promise<void> {
  await apiFetch('/orgs/users/invite-by-email', {
    method: 'POST',
    body: JSON.stringify({ email, role })
  }, orgId)
}

export async function removeOrgUsers(
  orgId: string,
  users: { userId: string; role: 'admin' | 'member' }[]
): Promise<void> {
  await apiFetch('/orgs/users/remove', {
    method: 'PATCH',
    body: JSON.stringify({ users })
  }, orgId)
}
