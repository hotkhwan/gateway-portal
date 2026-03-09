// src/lib/api/orgunit.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, OrgUnit, OrgUnitMember } from '$lib/types/org'
import { logger } from '$lib/utils/logger'
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

// ────────────────────────────────────────────
// Org Units
// ────────────────────────────────────────────
export async function getUnitTree(orgId: string): Promise<OrgUnit[]> {
  logger.log('🔍 [getUnitTree] calling with orgId:', orgId)
  const r = await apiFetch<OrgUnit[]>('/orgs/units/tree', orgId)
  logger.log('🔍 [getUnitTree] response:', JSON.stringify(r))
  return r.details ?? []                        // array → details
}

export async function getUnitDetails(orgId: string, unitId: string): Promise<OrgUnit> {
  logger.log('🔍 [getUnitDetails] calling with orgId:', orgId, 'unitId:', unitId)
  const r = await apiFetch<OrgUnit>(`/orgs/units/tree/${unitId}`, orgId)
  logger.log('🔍 [getUnitDetails] response:', JSON.stringify(r))
  // backend อาจส่ง detail (singular) หรือ details (plural) ขึ้นกับ endpoint
  const result = r.detail ?? (r.details as unknown as OrgUnit)
  if (!result) throw new Error('unit not found')
  return result
}

export async function createUnit(
  orgId: string,
  body: { name: string; parentId?: string | null }
): Promise<void> {
  // Backend returns SuccessMessageCreateResponse: { code, status, message, id }
  // ไม่มี detail/details — ไม่ต้อง return unit, caller จะ loadTree() เอง
  logger.log('🔍 [createUnit] calling with orgId:', orgId, 'body:', body)
  await apiFetch<unknown>('/orgs/units', orgId, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  logger.log('🔍 [createUnit] done')
}

export async function updateUnit(
  orgId: string,
  unitId: string,
  body: { name?: string }
): Promise<void> {
  // Backend returns SuccessMessageResponse: { code, status, message }
  logger.log('🔍 [updateUnit] calling with orgId:', orgId, 'unitId:', unitId, 'body:', body)
  await apiFetch<unknown>(`/orgs/units/${unitId}`, orgId, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  logger.log('🔍 [updateUnit] done')
}

export async function deleteUnit(orgId: string, unitId: string): Promise<void> {
  logger.log('🔍 [deleteUnit] calling with orgId:', orgId, 'unitId:', unitId)
  await apiFetch<void>(`/orgs/units/${unitId}`, orgId, { method: 'DELETE' })
}

// ────────────────────────────────────────────
// Unit Members
// ────────────────────────────────────────────
export async function listUnitMembers(orgId: string, unitId: string): Promise<OrgUnitMember[]> {
  logger.log('🔍 [listUnitMembers] calling with orgId:', orgId, 'unitId:', unitId)
  const r = await apiFetch<OrgUnitMember[]>(`/orgs/units/${unitId}/members`, orgId)
  logger.log('🔍 [listUnitMembers] response:', JSON.stringify(r))
  return r.details ?? []                        // array → details
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