// src/lib/api/permission.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, TargetPermissionProfile, OrgUnitRelation } from '$lib/types/org'
import { guardAuth } from '$lib/api/authGuard'

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
  guardAuth(res)
  const json = await res.json()
  if (!res.ok) throw json
  return json as ApiResponse<T>
}

// Backend wire format differs from our frontend type:
//   orgUnits       ↔  orgUnitIds
//   resourceGroups ↔  targetIds
//   status: boolean ↔  status: 'active'|'inactive'
interface BackendProfile {
  id: string
  orgId: string
  name: string
  description?: string
  status: boolean
  orgUnits: string[]
  resourceGroups: string[]
  relations: OrgUnitRelation[]
  createdAt: string
  updatedAt?: string
}

function fromBackend(b: BackendProfile): TargetPermissionProfile {
  return {
    id: b.id,
    orgId: b.orgId,
    name: b.name,
    description: b.description,
    status: b.status ? 'active' : 'inactive',
    orgUnitIds: b.orgUnits ?? [],
    targetIds: b.resourceGroups ?? [],
    relations: b.relations ?? [],
    createdAt: b.createdAt,
    updatedAt: b.updatedAt
  }
}

type ProfileBody = Omit<TargetPermissionProfile, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>

function toBackendBody(f: Partial<ProfileBody>) {
  return {
    ...(f.name !== undefined && { name: f.name }),
    ...(f.description !== undefined && { description: f.description }),
    ...(f.status !== undefined && { status: f.status === 'active' }),
    ...(f.orgUnitIds !== undefined && { orgUnits: f.orgUnitIds }),
    ...(f.targetIds !== undefined && { resourceGroups: f.targetIds }),
    ...(f.relations !== undefined && { relations: f.relations })
  }
}

// ────────────────────────────────────────────
// Target Permission Profiles  →  /orgs/resource/permissions
// ────────────────────────────────────────────
export async function listPermissionProfiles(
  orgId: string
): Promise<TargetPermissionProfile[]> {
  const r = await apiFetch<BackendProfile[]>('/orgs/resource/permissions', orgId)
  return (r.details ?? []).map(fromBackend)       // array → details
}

export async function createPermissionProfile(
  orgId: string,
  body: Omit<TargetPermissionProfile, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>
): Promise<TargetPermissionProfile> {
  const r = await apiFetch<BackendProfile>('/orgs/resource/permissions', orgId, {
    method: 'POST',
    body: JSON.stringify(toBackendBody(body))
  })
  if (!r.detail) throw new Error('created profile not returned')
  return fromBackend(r.detail)                    // single → detail
}

export async function updatePermissionProfile(
  orgId: string,
  profileId: string,
  body: Partial<Omit<TargetPermissionProfile, 'id' | 'orgId' | 'createdAt' | 'updatedAt'>>
): Promise<TargetPermissionProfile> {
  const r = await apiFetch<BackendProfile>(
    `/orgs/resource/permissions/${profileId}`,
    orgId,
    { method: 'PATCH', body: JSON.stringify(toBackendBody(body)) }
  )
  if (!r.detail) throw new Error('updated profile not returned')
  return fromBackend(r.detail)                    // single → detail
}

export async function deletePermissionProfile(
  orgId: string,
  profileId: string
): Promise<void> {
  await apiFetch<void>(`/orgs/resource/permissions/${profileId}`, orgId, {
    method: 'DELETE'
  })
}

// ────────────────────────────────────────────
// Access queries (what can I see?)
// ────────────────────────────────────────────
export interface AccessEntry {
  id: string
  name: string
  relation?: string
  type?: string
}

export async function getMyTargetAccess(orgId: string): Promise<AccessEntry[]> {
  const r = await apiFetch<AccessEntry[]>('/orgs/resource/access', orgId)
  return r.details ?? []                          // array → details
}

export async function getMyMenuAccess(orgId: string): Promise<AccessEntry[]> {
  const r = await apiFetch<AccessEntry[]>('/orgs/menu/access', orgId)
  return r.details ?? []                          // array → details
}