// src/lib/api/workspace.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse, PaginatedResponse } from '$lib/types/org'
import type { Workspace, WorkspaceMember, WorkspaceMemberRole } from '$lib/types/workspace'
import { guardAuth } from '$lib/api/authGuard'

const BASE = `${(PUBLIC_APP_BASE_PATH ?? '').replace(/\/$/, '')}/api`

async function apiFetch<T>(
  path: string,
  workspaceId?: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(workspaceId ? { 'x-active-workspace': workspaceId } : {}),
      ...init?.headers
    },
    ...init
  })
  guardAuth(res)
  const json = await res.json()
  if (!res.ok) throw json
  return json as ApiResponse<T>
}

// ── Workspaces CRUD ────────────────────────────────────────────
export async function listWorkspaces(): Promise<Workspace[]> {
  const r = await apiFetch<any>('/workspaces')
  const now = new Date().toISOString()
  // รองรับทั้ง response แบบ { details: [...] } และ { details: { items: [...] } }
  const raw = r.details
  const items: any[] = Array.isArray(raw) ? raw : (raw?.items ?? [])
  return items.map((item: any) => ({
    id: item.workspaceId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }))
}

export async function createWorkspace(body: { name: string; description?: string }): Promise<Workspace> {
  const r = await apiFetch<any>('/workspaces', undefined, {
    method: 'POST',
    body: JSON.stringify(body)
  })
  const item = r.details ?? r
  if (!item) throw new Error('Failed to create workspace: no data returned')
  const now = new Date().toISOString()
  return {
    id: item.id ?? item.workspaceId,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const r = await apiFetch<any>(`/workspaces/${id}`, id)
  const item = r.details ?? r
  if (!item) throw new Error('workspace not found')
  const now = new Date().toISOString()
  return {
    id: item.workspaceId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }
}

export async function updateWorkspace(
  id: string,
  body: { name?: string; description?: string }
): Promise<Workspace> {
  const r = await apiFetch<any>(`/workspaces/${id}`, id, {
    method: 'PATCH',
    body: JSON.stringify(body)
  })
  const item = r.details ?? r
  if (!item) throw new Error('workspace not found')
  const now = new Date().toISOString()
  return {
    id: item.workspaceId ?? item.id,
    name: item.name,
    description: item.description ?? '',
    status: item.status ?? 'active',
    createdAt: item.createdAt ?? now,
    updatedAt: item.updatedAt ?? now
  }
}

export async function deleteWorkspace(id: string): Promise<void> {
  await apiFetch(`/workspaces/${id}`, id, { method: 'DELETE' })
}

// ── Members ────────────────────────────────────────────
export async function listWorkspaceMembers(
  workspaceId: string,
  params?: {
    page?: number
    perPage?: number
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  }
): Promise<PaginatedResponse<WorkspaceMember>> {
  const q = new URLSearchParams()
  if (params?.page !== undefined) q.set('page', String(params.page))
  if (params?.perPage !== undefined) q.set('perPage', String(params.perPage))
  if (params?.sortField) q.set('sortField', params.sortField)
  if (params?.sortOrder) q.set('sortOrder', params.sortOrder)
  if (params?.search) q.set('search', params.search)
  const r = await apiFetch<any>(
    `/workspaces/members${q.toString() ? '?' + q.toString() : ''}`,
    workspaceId
  )
  return {
    items: r.details ?? [],
    total: r.pagination?.totalRecords ?? 0,
    page: r.pagination?.page ?? 1,
    perPage: r.pagination?.perPage ?? 10,
    totalPages: r.pagination?.totalPages ?? 1
  }
}

export async function inviteWorkspaceUsers(
  workspaceId: string,
  users: { userId: string; role: WorkspaceMemberRole }[]
): Promise<void> {
  await apiFetch('/workspaces/members/invite', workspaceId, {
    method: 'POST',
    body: JSON.stringify({ users })
  })
}

export async function inviteWorkspaceMemberByEmail(
  workspaceId: string,
  email: string,
  role: WorkspaceMemberRole
): Promise<void> {
  await apiFetch('/workspaces/members/invite-by-email', workspaceId, {
    method: 'POST',
    body: JSON.stringify({ email, role })
  })
}

export async function removeWorkspaceMembers(
  workspaceId: string,
  userIds: string[]
): Promise<void> {
  await apiFetch('/workspaces/members/remove', workspaceId, {
    method: 'PATCH',
    body: JSON.stringify({ users: userIds.map((userId) => ({ userId })) })
  })
}

export async function changeWorkspaceMemberRole(
  workspaceId: string,
  userId: string,
  role: WorkspaceMemberRole
): Promise<void> {
  await apiFetch(`/workspaces/members/${userId}/role`, workspaceId, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  })
}
