// src/lib/api/user.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { PaginatedResponse, User } from '$lib/types/user'

const BASE = `${(PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')}/api`

async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...init?.headers },
    ...init
  })
  const json = await res.json()
  if (!res.ok) throw json
  return json
}

export async function listUsers(params?: {
  page?: number
  perPages?: number
  sortOrder?: 'asc' | 'desc'
  search?: string
}): Promise<PaginatedResponse<User>> {
  const q = new URLSearchParams()
  if (params?.page !== undefined) q.set('page', String(params.page))
  if (params?.perPages !== undefined) q.set('perPages', String(params.perPages))
  if (params?.sortOrder) q.set('sortOrder', params.sortOrder)
  if (params?.search) q.set('search', params.search)

  const r = await apiFetch(`/users${q.toString() ? '?' + q.toString() : ''}`)
  console.log('🔍 [listUsers] response:', JSON.stringify(r))

  // Backend: { details: User[], pagination: { totalRecords, page, perPages, ... } }
  return {
    items: r.details ?? [],
    total: r.pagination?.totalRecords ?? 0,
    page: r.pagination?.page ?? 1,
    limit: r.pagination?.perPages ?? 10
  }
}