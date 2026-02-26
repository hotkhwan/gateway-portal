// src/lib/api/user.ts
import type { ApiResponse, PaginatedResponse, User } from '$lib/types/user'

// Client-side ใช้ import.meta.env.PUBLIC_*
const APP_BASE = (import.meta.env.PUBLIC_APP_BASE_PATH ?? '/aisom').replace(/\/$/, '')
const BASE = `${APP_BASE}/api`

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...init?.headers
    },
    ...init
  })
  const json = await res.json()
  if (!res.ok) throw json
  return json as ApiResponse<T>
}

// ────────────────────────────────────────────
// Users
// ────────────────────────────────────────────
export async function listUsers(params?: {
  page?: number
  perPages?: number
  sortOrder?: 'asc' | 'desc'
  search?: string
}): Promise<PaginatedResponse<User>> {
  const queryParams = new URLSearchParams()
  if (params) {
    if (params.page !== undefined) queryParams.set('page', String(params.page))
    if (params.perPages !== undefined) queryParams.set('perPages', String(params.perPages))
    if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder)
    if (params.search) queryParams.set('search', params.search)
  }

  const queryString = queryParams.toString()
  console.log('🔍 [listUsers] calling with params:', params, 'queryString:', queryString)
  const r = await apiFetch<PaginatedResponse<User>>(
    `/users${queryString ? '?' + queryString : ''}`
  )
  console.log('🔍 [listUsers] response:', JSON.stringify(r))
  return r.details
}
