// src/lib/api/orgunit.ts
import type { ApiResponse, OrgUnit, OrgUnitMember } from '$lib/types/org'
import { logger } from '$lib/utils/logger'

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
// Org Units
// ────────────────────────────────────────────
export async function getUnitTree(orgId: string): Promise<OrgUnit[]> {
  logger.log('🔍 [getUnitTree] calling with orgId:', orgId)
  const r = await apiFetch<OrgUnit[]>('/orgs/units/tree', orgId)
  logger.log('🔍 [getUnitTree] response:', JSON.stringify(r))
  return r.details ?? []
}

export async function getUnitDetails(
  orgId: string,
  unitId: string
): Promise<OrgUnit> {
  logger.log('🔍 [getUnitDetails] calling with orgId:', orgId, 'unitId:', unitId)
  const r = await apiFetch<OrgUnit>(`/orgs/units/tree/${unitId}`, orgId)
  logger.log('🔍 [getUnitDetails] response:', JSON.stringify(r))
  return r.details
}

export async function createUnit(
  orgId: string,
  body: { name: string; parentId?: string | null }
): Promise<OrgUnit> {
  logger.log('🔍 [createUnit] calling with orgId:', orgId, 'body:', body)
  const r = await apiFetch<OrgUnit>('/orgs/units', orgId, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  logger.log('🔍 [createUnit] response:', JSON.stringify(r))
  return r.details
}

export async function updateUnit(
  orgId: string,
  unitId: string,
  body: { name?: string }
): Promise<OrgUnit> {
  logger.log('🔍 [updateUnit] calling with orgId:', orgId, 'unitId:', unitId, 'body:', body)
  const r = await apiFetch<OrgUnit>(`/orgs/units/${unitId}`, orgId, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  logger.log('🔍 [updateUnit] response:', JSON.stringify(r))
  return r.details
}

export async function deleteUnit(orgId: string, unitId: string): Promise<void> {
  logger.log('🔍 [deleteUnit] calling with orgId:', orgId, 'unitId:', unitId)
  await apiFetch<void>(`/orgs/units/${unitId}`, orgId, { method: 'DELETE' })
}

// ────────────────────────────────────────────
// Unit Members
// ────────────────────────────────────────────
export async function listUnitMembers(
  orgId: string,
  unitId: string
): Promise<OrgUnitMember[]> {
  logger.log('🔍 [listUnitMembers] calling with orgId:', orgId, 'unitId:', unitId)
  const r = await apiFetch<OrgUnitMember[]>(`/orgs/units/${unitId}/members`, orgId)
  logger.log('🔍 [listUnitMembers] response:', JSON.stringify(r))
  return r.details ?? []
}

export async function assignMembers(
  orgId: string,
  unitId: string,
  users: { userId: string; role: string }[]
): Promise<void> {
  logger.log('🔍 [assignMembers] calling with orgId:', orgId, 'unitId:', unitId, 'users:', users)
  await apiFetch<void>(`/orgs/units/${unitId}/members`, orgId, {
    method: 'POST',
    body: JSON.stringify({ users })
  })
}

export async function removeMembers(
  orgId: string,
  unitId: string,
  userIds: string[]
): Promise<void> {
  logger.log('🔍 [removeMembers] calling with orgId:', orgId, 'unitId:', unitId, 'userIds:', userIds)
  await apiFetch<void>(`/orgs/units/${unitId}/members`, orgId, {
    method: 'PATCH',
    body: JSON.stringify({ users: userIds.map((userId) => ({ userId })) })
  })
}
