# Plan: UI Workspace Migration (Organization → Workspace)

## Goal
ย้าย frontend จาก Organization model เป็น Workspace model ทั้งหมด โดยเปลี่ยน types, stores, API layer, routes, sidebar, i18n และ entitlement page ให้ตรงกับ backend API ชุดใหม่ที่พร้อมแล้ว

## Scope
- in-scope: types, stores, API client, routes (workspaces/*), sidebar nav, i18n keys, header workspace switcher, entitlement page ใหม่, ลบ orgunit/permission APIs และ routes
- out-of-scope: ingest API internals (เปลี่ยนแค่ header key), delivery/targets pages (ไม่มี route เปลี่ยน), backend proxy (`src/routes/(base)/api/[...path]/+server.ts`)

## User Flow
1. User เปิดแอป → AppSidebar แสดง Workspace Switcher พร้อม workspace list
2. User เลือก workspace → store บันทึก activeWorkspaceId → ทุก API call แนบ `X-Active-Workspace` header
3. User ไปหน้า `/workspaces` → เห็น card list ของ workspaces ทั้งหมด, สร้าง/แก้ไข/ลบได้
4. User ไปหน้า `/workspaces/members` → เห็น member list พร้อม 4 roles, invite/remove members ได้
5. User ไปหน้า `/workspaces/roles` → เห็น role matrix แบบ read-only
6. User ไปหน้า `/workspaces/access` → เห็น access ของตัวเองในงาน workspace
7. User ไปหน้า `/subscriptions/current` → เห็น entitlement fields แบบ read-only (ไม่มีปุ่ม Upgrade แล้ว)

## Data Flow
```
Svelte component
  → import activeWorkspaceId from $lib/stores/activeWorkspace
  → call listWorkspaceMembers($activeWorkspaceId, ...)
  → src/lib/api/workspace.ts: apiFetch('/workspaces/members', workspaceId)
  → fetch(`${BASE}/workspaces/members`, headers: { 'x-active-workspace': workspaceId })
  → SvelteKit proxy: src/routes/(base)/api/[...path]/+server.ts
  → backend: GET /workspaces/members
```

---

## Impacted Files

| Action | File | Description |
|--------|------|-------------|
| create | `src/lib/types/workspace.ts` | Types ใหม่ทั้งหมด: Workspace, WorkspaceMember, WorkspaceMemberRole, RuntimeEntitlement |
| modify | `src/lib/types/org.ts` | ลบ OrgUnit, OrgUnitMember, OrgUnitRelation, TargetPermissionProfile; คง IngestConfig, DeliveryTarget, ApiResponse, PaginatedResponse, OrgMember, OrgInviteUser (ยังใช้ในช่วงเปลี่ยนผ่าน) |
| create | `src/lib/stores/activeWorkspace.ts` | store ใหม่: workspaceList, activeWorkspaceId, activeWorkspace, setActiveWorkspace, setWorkspaceList + localStorage migration |
| create | `src/lib/api/workspace.ts` | API client ใหม่: CRUD workspaces + member management + changeRole |
| delete | `src/lib/api/orgunit.ts` | ลบทั้งไฟล์ (orgUnit concept ยกเลิก) |
| delete | `src/lib/api/permission.ts` | ลบทั้งไฟล์ (permission profile ยกเลิก) |
| create | `src/lib/api/entitlement.ts` | GET /workspaces/entitlement |
| modify | `src/lib/api/ingest.ts` | เปลี่ยน header key `x-active-org` → `x-active-workspace` ในทุก apiFetch call |
| modify | `src/lib/api/org.ts` | เปลี่ยน header key `x-active-org` → `x-active-workspace`; เปลี่ยน orgId param เป็น workspaceId (ใช้ org.ts เดิมสำหรับ ingest config ชั่วคราวจนกว่า ingest.ts รับผิดชอบทั้งหมด) |
| modify | `src/lib/api/target.ts` | เปลี่ยน header key `x-active-org` → `x-active-workspace` |
| create | `src/routes/(app)/workspaces/+page.svelte` | List + Create/Edit/Delete workspace (clone จาก orgs/+page.svelte แล้วปรับ import/names) |
| create | `src/routes/(app)/workspaces/members/+page.svelte` | Members page (clone จาก orgs/users/+page.svelte แล้วปรับ roles เป็น 4 roles + เพิ่ม changeRole) |
| create | `src/routes/(app)/workspaces/roles/+page.svelte` | Role matrix read-only (หน้าใหม่ทั้งหมด) |
| create | `src/routes/(app)/workspaces/access/+page.svelte` | My Access page (clone จาก orgs/access/+page.svelte แล้วปรับ import) |
| delete | `src/routes/(app)/orgs/permissions/+page.svelte` | ลบทั้งไฟล์ |
| delete | `src/routes/(app)/orgs/units/+page.svelte` | ลบทั้งไฟล์ |
| delete | `src/routes/(app)/orgs/units/[unitId]/members/+page.svelte` | ลบทั้งไฟล์ |
| modify | `src/routes/(app)/orgs/+page.svelte` | เพิ่ม redirect ไปยัง `/workspaces` (ชั่วคราวเพื่อไม่ให้ link เก่าพัง) |
| modify | `src/routes/(app)/orgs/users/+page.svelte` | เพิ่ม redirect ไปยัง `/workspaces/members` |
| modify | `src/routes/(app)/orgs/access/+page.svelte` | เพิ่ม redirect ไปยัง `/workspaces/access` |
| modify | `src/routes/(app)/subscriptions/current/+page.svelte` | เปลี่ยนเป็น entitlement view (ลบ upgrade link, ลบ old subscription fields, ใช้ getEntitlement()) |
| delete | `src/routes/(app)/subscriptions/packages/+page.svelte` | ลบ (commercial plan อยู่ใน klynx-api) |
| modify | `src/lib/stores/appSidebarMenus.ts` | ลบ orgUnits item; เปลี่ยน orgs → workspaces; เปลี่ยน orgTenancy children; ลบ subscriptionPackages item |
| modify | `src/lib/components/app/AppSidebar.svelte` | เปลี่ยน import จาก activeOrg → activeWorkspace; เปลี่ยน label workspace switcher |
| modify | `src/lib/components/app/AppHeader.svelte` | เปลี่ยน import: listOrgs → listWorkspaces, setOrgList → setWorkspaceList (จาก activeWorkspace store) |
| modify | `src/routes/(app)/+layout.server.ts` | ไม่ต้องแก้ (load function return แค่ user ซึ่งยังเหมือนเดิม) |
| modify | `messages/en.json` | เพิ่ม workspace keys ใหม่, ลบ/deprecate org keys เก่า |
| modify | `messages/th.json` | เพิ่ม workspace keys ใหม่ (Thai translations) |

---

## API Dependencies

### Workspace CRUD
- endpoint: `GET /workspaces`
- method: GET
- request: header `X-Active-Workspace` ไม่จำเป็น (list ทั้งหมดที่ user มีสิทธิ์)
- response: `ApiResponse<Workspace[]>` → `.details`
- auth: proxy cookie
- errorCases: 401

- endpoint: `POST /workspaces`
- method: POST
- request: `{ name: string, description?: string }`
- response: `ApiResponse<Workspace>` → `.details`

- endpoint: `GET /workspaces/:id`
- method: GET
- response: `ApiResponse<Workspace>` → `.details`

- endpoint: `PATCH /workspaces/:id`
- method: PATCH
- request: `{ name?: string, description?: string }`
- response: `ApiResponse<Workspace>` → `.details`

- endpoint: `DELETE /workspaces/:id`
- method: DELETE
- response: no body (204)

### Members
- endpoint: `GET /workspaces/members`
- method: GET
- request: header `X-Active-Workspace: <workspaceId>`, query: `?page=&perPages=&search=&sortField=&sortOrder=`
- response: `ApiResponse<WorkspaceMember[]>` → `.details` + `.pagination`
- errorCases: 401, 403

- endpoint: `POST /workspaces/members/invite`
- method: POST
- request: `{ users: [{ userId: string, role: WorkspaceMemberRole }] }`
- response: success/error

- endpoint: `POST /workspaces/members/invite-by-email`
- method: POST
- request: `{ email: string, role: WorkspaceMemberRole }`
- response: success/error

- endpoint: `PATCH /workspaces/members/remove`
- method: PATCH
- request: `{ users: [{ userId: string }] }`
- response: success/error

- endpoint: `PATCH /workspaces/members/:userId/role`
- method: PATCH
- request: `{ role: WorkspaceMemberRole }`
- response: success/error

### Entitlement
- endpoint: `GET /workspaces/entitlement`
- method: GET
- request: header `X-Active-Workspace: <workspaceId>`
- response: `ApiResponse<RuntimeEntitlement>` → `.details`
- errorCases: 401, 404 (workspace ไม่มี entitlement)

---

## Implementation Steps

### Phase 1 — Types (ทำก่อนสุด เพราะทุก phase ขึ้นกับนี้)

**Step 1.1** สร้าง `/home/phibek/gateway-portal/src/lib/types/workspace.ts`

```ts
// src/lib/types/workspace.ts

export type WorkspaceStatus = 'active' | 'inactive'

export interface Workspace {
  id: string
  name: string
  description?: string
  status: WorkspaceStatus
  createdAt: string
  updatedAt?: string
}

export type WorkspaceMemberRole = 'owner' | 'admin' | 'operator' | 'viewer'

export interface WorkspaceMember {
  userId: string
  email?: string
  firstName?: string
  lastName?: string
  fullName?: string
  role: WorkspaceMemberRole
  enabled?: boolean
  createdAt: string
  joinedAt?: string
}

export interface WorkspaceInviteUser {
  userId: string
  role: WorkspaceMemberRole
}

export interface RuntimeEntitlement {
  workspaceId: string
  planCode: string
  maxEventsPerSecond: number
  maxPayloadBytes: number
  maxAssets: number
  maxSources: number
  maxPipelines: number
  maxSites: number
  allowedSourceFamilies: string[]
  retentionDays: number
  webhookTargetsLimit: number
  eventExportEnabled: boolean
  assetTrackingEnabled: boolean
}
```

**Step 1.2** แก้ `/home/phibek/gateway-portal/src/lib/types/org.ts`
ลบ interfaces ต่อไปนี้ออก:
- `OrgUnitRelation` (type alias)
- `OrgUnit` (interface)
- `OrgUnitMember` (interface)
- `TargetPermissionProfile` (interface)

คงไว้: `OrgStatus`, `Org`, `IngestConfig`, `TargetType`, `DeliveryTarget`, `WebhookConfig`, `LineConfig`, `TelegramConfig`, `DiscordConfig`, `ApiResponse<T>`, `PaginatedResponse<T>`, `OrgMemberRole`, `OrgMember`, `OrgInviteUser`

---

### Phase 2 — Store

**Step 2.1** สร้าง `/home/phibek/gateway-portal/src/lib/stores/activeWorkspace.ts`

```ts
// src/lib/stores/activeWorkspace.ts
import { writable, derived } from 'svelte/store'
import type { Workspace } from '$lib/types/workspace'

const STORAGE_KEY = 'activeWorkspaceId'
const LEGACY_KEY = 'activeOrgId'

function getStoredWorkspaceId(): string | null {
  if (typeof localStorage === 'undefined') return null
  // localStorage migration: ถ้ามี key เก่าให้ copy ค่า แล้วลบ key เก่า
  const legacy = localStorage.getItem(LEGACY_KEY)
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy)
    localStorage.removeItem(LEGACY_KEY)
    return legacy
  }
  return localStorage.getItem(STORAGE_KEY)
}

function storeWorkspaceId(id: string | null) {
  if (typeof localStorage === 'undefined') return
  if (id) {
    localStorage.setItem(STORAGE_KEY, id)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const workspaceList = writable<Workspace[]>([])
export const activeWorkspaceId = writable<string | null>(getStoredWorkspaceId())

const activeWorkspaceIdSynced = {
  ...activeWorkspaceId,
  set(value: string | null) {
    activeWorkspaceId.set(value)
    storeWorkspaceId(value)
  },
  update(fn: (value: string | null) => string | null) {
    activeWorkspaceId.update((current) => {
      const next = fn(current)
      storeWorkspaceId(next)
      return next
    })
  }
}

export const activeWorkspace = derived(
  [workspaceList, activeWorkspaceId],
  ([$workspaceList, $activeWorkspaceId]) =>
    $workspaceList.find((w) => w.id === $activeWorkspaceId) ?? null
)

export async function setActiveWorkspace(id: string | null) {
  activeWorkspaceIdSynced.set(id)
}

export function setWorkspaceList(workspaces: Workspace[]) {
  workspaceList.set(workspaces)
  activeWorkspaceIdSynced.update((current) => {
    if (!current && workspaces.length > 0) return workspaces[0].id
    if (current && !workspaces.find((w) => w.id === current)) return workspaces[0]?.id ?? null
    return current
  })
}
```

หมายเหตุ: ลบ `updateOrg` import ออก เพราะ setActiveWorkspace ใหม่ไม่ต้อง call PATCH /orgs/:id แล้ว

---

### Phase 3 — API Layer

**Step 3.1** สร้าง `/home/phibek/gateway-portal/src/lib/api/workspace.ts`

Pattern เหมือน `org.ts` เดิม — ใช้ `x-active-workspace` header แทน `x-active-org`:

```ts
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
  const r = await apiFetch<any[]>('/workspaces')
  const now = new Date().toISOString()
  return (r.details ?? []).map((item: any) => ({
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
  const r = await apiFetch<any>(`/workspaces/${id}`)
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
  const r = await apiFetch<any>(`/workspaces/${id}`, undefined, {
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
  await apiFetch(`/workspaces/${id}`, undefined, { method: 'DELETE' })
}

// ── Members ────────────────────────────────────────────
export async function listWorkspaceMembers(
  workspaceId: string,
  params?: {
    page?: number
    perPages?: number
    sortField?: string
    sortOrder?: 'asc' | 'desc'
    search?: string
  }
): Promise<PaginatedResponse<WorkspaceMember>> {
  const q = new URLSearchParams()
  if (params?.page !== undefined) q.set('page', String(params.page))
  if (params?.perPages !== undefined) q.set('perPages', String(params.perPages))
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
    perPages: r.pagination?.perPages ?? 10,
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
```

**Step 3.2** สร้าง `/home/phibek/gateway-portal/src/lib/api/entitlement.ts`

```ts
// src/lib/api/entitlement.ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
import type { ApiResponse } from '$lib/types/org'
import type { RuntimeEntitlement } from '$lib/types/workspace'
import { guardAuth } from '$lib/api/authGuard'

const BASE = `${(PUBLIC_APP_BASE_PATH ?? '').replace(/\/$/, '')}/api`

async function apiFetch<T>(
  path: string,
  workspaceId: string,
  init?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'content-type': 'application/json',
      'x-active-workspace': workspaceId,
      ...init?.headers
    },
    ...init
  })
  guardAuth(res)
  const json = await res.json()
  if (!res.ok) throw json
  return json as ApiResponse<T>
}

export async function getEntitlement(workspaceId: string): Promise<RuntimeEntitlement> {
  const r = await apiFetch<RuntimeEntitlement>('/workspaces/entitlement', workspaceId)
  if (!r.details) throw new Error('entitlement not found')
  return r.details
}
```

**Step 3.3** แก้ header key ในทุก API file ที่ยังใช้ `x-active-org`

ไฟล์ที่ต้องเปลี่ยน `'x-active-org'` → `'x-active-workspace'`:
- `/home/phibek/gateway-portal/src/lib/api/ingest.ts` (3 จุด: apiFetch header + listPendingEvents raw fetch + listTemplates raw fetch และ fetch calls อื่นๆ ที่ hardcode header)
- `/home/phibek/gateway-portal/src/lib/api/org.ts` (1 จุด: apiFetch header)
- `/home/phibek/gateway-portal/src/lib/api/target.ts` (ตรวจสอบก่อน)

ค้นหาทั้งโปรเจกต์ด้วย: `grep -r "x-active-org" src/` แล้วแก้ทีเดียวทั้งหมด

**Step 3.4** ลบไฟล์
- ลบ `/home/phibek/gateway-portal/src/lib/api/orgunit.ts`
- ลบ `/home/phibek/gateway-portal/src/lib/api/permission.ts`

---

### Phase 4 — Routes

**Step 4.1** สร้างโฟลเดอร์ `src/routes/(app)/workspaces/` พร้อมไฟล์ต่อไปนี้

**`/home/phibek/gateway-portal/src/routes/(app)/workspaces/+page.svelte`**
Clone จาก `orgs/+page.svelte` แล้วปรับ:
- เปลี่ยน import: `orgList, activeOrgId, setOrgList, setActiveOrg` → `workspaceList, activeWorkspaceId, setWorkspaceList, setActiveWorkspace` จาก `$lib/stores/activeWorkspace`
- เปลี่ยน import: `listOrgs, createOrg, updateOrg, deleteOrg` → `listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace` จาก `$lib/api/workspace`
- เปลี่ยน type: `Org` → `Workspace` จาก `$lib/types/workspace`
- เปลี่ยน `getIngestConfig` import จาก `$lib/api/ingest` (ยังใช้ได้ แต่ parameter ชื่อเปลี่ยนเป็น `workspaceId`)
- เปลี่ยน i18n key: `m.orgTitle()` → `m.workspaceTitle()` ฯลฯ (ดูหัวข้อ i18n)
- เปลี่ยน goto path: `'orgs/users'` → `'workspaces/members'`
- เปลี่ยน icon: `bi-building` → `bi-grid`

**`/home/phibek/gateway-portal/src/routes/(app)/workspaces/members/+page.svelte`**
Clone จาก `orgs/users/+page.svelte` แล้วปรับ:
- เปลี่ยน import: `activeOrgId` → `activeWorkspaceId` จาก `$lib/stores/activeWorkspace`
- เปลี่ยน import: `listOrgMembers, inviteOrgUsers, removeOrgUsers, inviteUserByEmail` → `listWorkspaceMembers, inviteWorkspaceUsers, removeWorkspaceMembers, inviteWorkspaceMemberByEmail` จาก `$lib/api/workspace`
- เปลี่ยน type: `OrgMember` → `WorkspaceMember`, `OrgMemberRole` → `WorkspaceMemberRole` จาก `$lib/types/workspace`
- เปลี่ยน role dropdown ทุกที่: เดิม `['member', 'admin']` (2 ตัว) → ใหม่ `['owner', 'admin', 'operator', 'viewer']` (4 ตัว)
- เปลี่ยน default role ใน inviteUsers/emailInvites: `'member'` → `'viewer'`
- เพิ่ม role badge rendering:
  - `owner` → `bg-danger`
  - `admin` → `bg-theme`
  - `operator` → `bg-warning text-dark`
  - `viewer` → `bg-secondary`
- เปลี่ยน `removeOrgUsers(orgId, users.map(...))` → `removeWorkspaceMembers(workspaceId, selectedUserIds)` (signature ต่างกัน — ใหม่รับ `userIds: string[]` ตรงๆ)
- เพิ่ม inline role change: ปุ่ม dropdown ใน action column ของแต่ละ member row เรียก `changeWorkspaceMemberRole(workspaceId, member.userId, newRole)`
- เปลี่ยน guard link: `href="/orgs"` → `href="/workspaces"`
- เปลี่ยน i18n keys ที่เกี่ยวกับ role label

**`/home/phibek/gateway-portal/src/routes/(app)/workspaces/roles/+page.svelte`**
หน้าใหม่ทั้งหมด — แสดง role permission matrix แบบ read-only:

```svelte
<!-- แสดงตาราง role × permission matrix -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'

  const roles = ['owner', 'admin', 'operator', 'viewer'] as const

  const permissions = [
    { key: 'manageWorkspace', label: 'Manage Workspace', roles: ['owner'] },
    { key: 'manageMembers', label: 'Manage Members', roles: ['owner', 'admin'] },
    { key: 'manageAssets', label: 'Manage Assets', roles: ['owner', 'admin'] },
    { key: 'manageSources', label: 'Manage Sources', roles: ['owner', 'admin'] },
    { key: 'managePipelines', label: 'Manage Pipelines', roles: ['owner', 'admin', 'operator'] },
    { key: 'manageDeliveryTargets', label: 'Manage Delivery Targets', roles: ['owner', 'admin'] },
    { key: 'viewEvents', label: 'View Events', roles: ['owner', 'admin', 'operator', 'viewer'] },
  ]

  onMount(() => setPageTitle(m.workspaceRolesTitle()))
</script>
```
layout: ตาราง Bootstrap กับ `<i class="bi bi-check-circle-fill text-theme">` ถ้ามีสิทธิ์ หรือ `-` ถ้าไม่มี

**`/home/phibek/gateway-portal/src/routes/(app)/workspaces/access/+page.svelte`**
Clone จาก `orgs/access/+page.svelte` แล้วปรับ:
- เปลี่ยน import: `activeOrg` → `activeWorkspace` จาก `$lib/stores/activeWorkspace`
- เพราะ `getMyTargetAccess` และ `getMyMenuAccess` ใน `permission.ts` ถูกลบ → ต้องตัดสินใจ:
  - **ตัวเลือก A (แนะนำ):** ถ้า backend ยังไม่มี endpoint สำหรับ access query แบบ workspace-scoped ให้แสดงหน้าแบบ static โดย derive จาก `activeWorkspace.role` ของ current user
  - **ตัวเลือก B:** ถ้า backend มี endpoint ใหม่ ให้สร้าง `getMyWorkspaceAccess` ใน `workspace.ts` แล้วเรียก
  - **สำหรับ Phase นี้ให้ใช้ตัวเลือก A:** แสดง role ปัจจุบันของ user ใน workspace + อธิบาย permissions ที่ได้รับ (เหมือน roles page แต่ highlight role ของ user)
- ลบ import `getMyTargetAccess`, `getMyMenuAccess`, `AccessEntry`
- เปลี่ยน guard link: `href={resolve('/orgs')}` → `href={resolve('/workspaces')}`

**Step 4.2** แก้ redirect ใน orgs pages เก่า

`/home/phibek/gateway-portal/src/routes/(app)/orgs/+page.svelte` — เพิ่มที่ต้นไฟล์ script:
```svelte
<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  onMount(() => goto(resolve('/workspaces'), { replaceState: true }))
</script>
```
(ทำเหมือนกันสำหรับ `orgs/users/+page.svelte` → redirect ไป `/workspaces/members`, `orgs/access/+page.svelte` → redirect ไป `/workspaces/access`)

**Step 4.3** ลบไฟล์
- ลบ `/home/phibek/gateway-portal/src/routes/(app)/orgs/permissions/+page.svelte`
- ลบ `/home/phibek/gateway-portal/src/routes/(app)/orgs/units/+page.svelte`
- ลบ `/home/phibek/gateway-portal/src/routes/(app)/orgs/units/[unitId]/members/+page.svelte`
- ลบ `/home/phibek/gateway-portal/src/routes/(app)/subscriptions/packages/+page.svelte`

---

### Phase 5 — Subscription → Entitlement Page

แก้ `/home/phibek/gateway-portal/src/routes/(app)/subscriptions/current/+page.svelte`

เปลี่ยน script ทั้งหมด:
```ts
import { onMount } from 'svelte'
import { setPageTitle } from '$lib/utils'
import { m } from '$lib/i18n/messages'
import { getEntitlement } from '$lib/api/entitlement'
import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
import type { RuntimeEntitlement } from '$lib/types/workspace'
import Card from '$lib/components/bootstrap/Card.svelte'
import CardBody from '$lib/components/bootstrap/CardBody.svelte'

let loading = $state(true)
let error = $state<string | null>(null)
let data = $state<RuntimeEntitlement | null>(null)

async function loadData() {
  const wsId = $activeWorkspaceId
  if (!wsId) { loading = false; return }
  loading = true
  error = null
  try {
    data = await getEntitlement(wsId)
  } catch (e: unknown) {
    error = (e as { message?: string })?.message ?? m.commonError()
  } finally {
    loading = false
  }
}

$effect(() => {
  if ($activeWorkspaceId) loadData()
})

onMount(() => {
  setPageTitle(m.entitlementTitle())
  loadData()
})
```

Template ใหม่ — แสดง fields จาก `RuntimeEntitlement`:
- planCode, maxEventsPerSecond, maxPayloadBytes, maxAssets, maxSources, maxPipelines, maxSites, retentionDays, webhookTargetsLimit, allowedSourceFamilies (comma-joined), eventExportEnabled, assetTrackingEnabled
- ลบปุ่ม Upgrade และ link ไป `/subscriptions/packages`
- ใช้ Bootstrap table แบบ read-only 2 column (Resource | Value)

---

### Phase 6 — Sidebar & Navigation

**Step 6.1** แก้ `/home/phibek/gateway-portal/src/lib/stores/appSidebarMenus.ts`

เปลี่ยน Tenancy section:
```ts
// ลบออก:
{ kind: 'link', id: 'orgs', url: 'orgs', icon: 'bi bi-building', textKey: 'navOrgs' },
// และ children ของ orgTanancy ที่มี orgUnits และ orgPermissions

// แทนด้วย:
{
  kind: 'link',
  id: 'workspaces',
  url: 'workspaces',
  icon: 'bi bi-grid',
  textKey: 'navWorkspaces'
},
{
  kind: 'link',
  id: 'workspaceTenancy',
  icon: 'bi bi-diagram-3',
  textKey: 'navWorkspaceTenancy',
  children: [
    { id: 'workspaceMembers', url: 'workspaces/members', textKey: 'workspaceMembersTitle' },
    { id: 'workspaceRoles', url: 'workspaces/roles', textKey: 'workspaceRolesTitle' },
    { id: 'workspaceAccess', url: 'workspaces/access', textKey: 'navWorkspaceAccess' }
  ]
},
```

เปลี่ยน subscription section — ลบ subscriptionPackages:
```ts
// เดิม:
{
  kind: 'link', id: 'subscription', icon: 'bi bi-gem', textKey: 'navSubscription',
  children: [
    { id: 'subscriptionPackages', url: 'subscriptions/packages', textKey: 'subscriptionPackagesTitle' },
    { id: 'subscriptionCurrent', url: 'subscriptions/current', textKey: 'subscriptionCurrentTitle' }
  ]
}
// ใหม่: เปลี่ยน subscriptionCurrent label เป็น entitlement
{
  kind: 'link', id: 'subscription', icon: 'bi bi-gem', textKey: 'navSubscription',
  children: [
    { id: 'subscriptionCurrent', url: 'subscriptions/current', textKey: 'entitlementTitle' }
  ]
}
```

**Step 6.2** แก้ `/home/phibek/gateway-portal/src/lib/components/app/AppSidebar.svelte`

เปลี่ยน import บรรทัด 7:
```ts
// เดิม:
import { orgList, activeOrg, activeOrgId, setActiveOrg } from '$lib/stores/activeOrg'
// ใหม่:
import { workspaceList, activeWorkspace, activeWorkspaceId, setActiveWorkspace } from '$lib/stores/activeWorkspace'
```

เปลี่ยน template ใน Workspace Switcher dropdown:
- `$orgList` → `$workspaceList`
- `$activeOrg?.name` → `$activeWorkspace?.name`
- `$activeOrgId` → `$activeWorkspaceId`
- `setActiveOrg(org.id)` → `setActiveWorkspace(workspace.id)`
- `href={withBase('/orgs')}` → `href={withBase('/workspaces')}`
- icon: `bi-building` → `bi-grid`
- i18n: `m.orgSwitchLabel()` → `m.workspaceSwitchLabel()`, `m.orgSwitchPlaceholder()` → `m.workspaceSwitchPlaceholder()`

**Step 6.3** แก้ `/home/phibek/gateway-portal/src/lib/components/app/AppHeader.svelte`

เปลี่ยน onMount:
```ts
// เดิม:
import { listOrgs } from '$lib/api/org'
...
onMount(async () => {
  const { setOrgList } = await import('$lib/stores/activeOrg')
  const orgs = await Promise.race([listOrgs(), ...timeout])
  setOrgList(orgs)
})

// ใหม่:
import { listWorkspaces } from '$lib/api/workspace'
...
onMount(async () => {
  try {
    const { setWorkspaceList } = await import('$lib/stores/activeWorkspace')
    const workspaces = await Promise.race([
      listWorkspaces(),
      new Promise<[]>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 10000)
      )
    ])
    setWorkspaceList(workspaces)
  } catch (e) {
    console.error('Failed to load workspaces:', e)
  }
})
```

---

### Phase 7 — i18n

**Step 7.1** แก้ `/home/phibek/gateway-portal/messages/en.json`

เพิ่ม keys ใหม่ (ใส่ในส่วนที่เหมาะสมตามลำดับ alphabet หรือ section):
```json
"entitlementTitle": "Usage & Limits",
"entitlementPlanCode": "Plan",
"entitlementMaxEventsPerSecond": "Max Events/s",
"entitlementMaxPayloadBytes": "Max Payload Size",
"entitlementMaxAssets": "Max Assets",
"entitlementMaxSources": "Max Sources",
"entitlementMaxPipelines": "Max Pipelines",
"entitlementMaxSites": "Max Sites",
"entitlementRetentionDays": "Retention (days)",
"entitlementWebhookTargetsLimit": "Webhook Targets Limit",
"entitlementEventExportEnabled": "Event Export",
"entitlementAssetTrackingEnabled": "Asset Tracking",
"entitlementAllowedSourceFamilies": "Allowed Source Families",
"navWorkspaces": "Workspaces",
"navWorkspaceTenancy": "Workspace",
"workspaceMembersTitle": "Members",
"workspaceRolesTitle": "Roles & Permissions",
"navWorkspaceAccess": "My Access",
"workspaceSwitchLabel": "Active Workspace",
"workspaceSwitchPlaceholder": "Select a workspace…",
"workspaceTitle": "Workspaces",
"workspaceCreateBtn": "New Workspace",
"workspaceCreateTitle": "Create Workspace",
"workspaceEditTitle": "Edit Workspace",
"workspaceDeleteTitle": "Delete Workspace",
"workspaceDeleteConfirm": "Are you sure you want to delete this workspace?",
"workspaceDeleteWarning": "This action cannot be undone.",
"workspaceDeleteDeleting": "Deleting…",
"workspaceName": "Workspace Name",
"workspaceNamePlaceholder": "e.g. Production",
"workspaceDescription": "Description",
"workspaceDescriptionPlaceholder": "Optional description",
"workspaceDescriptionNoDesc": "No description",
"workspaceStatusActive": "Active",
"workspaceStatusInactive": "Inactive",
"workspaceCreatedAt": "Created",
"workspaceSwitchActive": "Active",
"workspaceSwitchTo": "Switch to",
"workspaceNoRecords": "No workspaces yet",
"workspaceIngestSection": "Ingest Config",
"workspaceIngestFailed": "Failed to load ingest config",
"workspaceIngestEndpointLabel": "Endpoint",
"workspaceIngestSecretLabel": "Secret",
"workspaceIngestSignatureLabel": "Signature",
"workspaceIngestRateLimitLabel": "Rate Limit",
"workspaceIngestRequired": "Required",
"workspaceIngestOptional": "Optional",
"workspaceIngestBurst": "burst",
"roleOwner": "Owner",
"roleAdmin": "Admin",
"roleOperator": "Operator",
"roleViewer": "Viewer",
"workspaceMembersInviteBtn": "Invite Member",
"workspaceMembersRemoveBtn": "Remove",
"workspaceMembersInviteModalTitle": "Invite to Workspace",
"workspaceMembersInviteModalDesc": "Invite users to this workspace by email or user ID",
"workspaceMembersInviteTabEmail": "By Email",
"workspaceMembersInviteTabExisting": "Existing User",
"workspaceMembersInviteByEmail": "Invite by Email",
"workspaceMembersInviteEmailPlaceholder": "user@example.com",
"workspaceMembersInviteAddEmail": "Add another email",
"workspaceMembersInviteSelectExisting": "Select Existing User",
"workspaceMembersInviteUserIdPlaceholder": "Select a user",
"workspaceMembersInviteAddRow": "Add row",
"workspaceMembersInviteRoleLabel": "Role",
"workspaceMembersInviteUserIdsRequired": "Please select a user for each row",
"workspaceMembersInviteEmailsRequired": "Please enter an email for each row",
"workspaceMembersInviteSelectUser": "Select user",
"workspaceMembersRemoveConfirmTitle": "Remove Members",
"workspaceMembersRemoveConfirmDesc": "Are you sure you want to remove selected members?",
"workspaceMembersSearchPlaceholder": "Search by name or email",
"workspaceMembersNoRecords": "No members yet",
"workspaceMembersPickerTitle": "Select User",
"workspaceMembersPickerSearchPlaceholder": "Search users",
"workspaceMembersPickerNoResults": "No users found",
"workspaceMembersTableName": "Name",
"workspaceMembersTableEmail": "Email",
"workspaceMembersTableRole": "Role",
"workspaceMembersTableStatus": "Status",
"workspaceMembersTableJoined": "Joined",
"workspaceMembersStatusEnabled": "Active",
"workspaceMembersStatusDisabled": "Inactive",
"workspaceMembersChangeRole": "Change Role",
"workspaceSelectPre": "Please select a workspace from",
"workspaceSelectPost": "to view this page",
"workspaceRolesDesc": "Role permissions matrix for this workspace"
```

**Step 7.2** แก้ `/home/phibek/gateway-portal/messages/th.json` — แปล keys ทั้งหมดข้างต้นเป็นภาษาไทย (ตามรูปแบบ Thai ที่มีอยู่ใน file)

**Step 7.3** รัน `bun i18n:merge` หลังจากแก้ทั้ง en.json และ th.json

---

## Risks

1. **`x-active-org` header ยังถูกส่งใน ingest.ts** — มีหลายจุดที่ hardcode ทั้งใน `apiFetch` function และใน raw `fetch` calls (เช่น `listPendingEvents`, `listTemplates`, `listDlq` ฯลฯ) ต้องเปลี่ยนครบทุกจุด ไม่งั้น request จะไปถึง backend โดยไม่มี workspace context
2. **TypeScript errors จาก import เก่า** — หลังลบ `orgunit.ts` และ `permission.ts` แล้ว `orgs/permissions/+page.svelte` จะ error ทันที ให้ลบ/redirect page นั้นก่อน (Phase 4 Step 4.3) ก่อน Phase 3 Step 3.4
3. **`orgs/access/+page.svelte` ยังใช้ `getMyTargetAccess`, `getMyMenuAccess`** — ถ้าลบ `permission.ts` ก่อนแก้ access page จะ error ให้แก้ access page ก่อนหรือพร้อมกัน
4. **localStorage migration** — browser ที่เคย login อยู่แล้วจะมี key `activeOrgId` เก่า logic migration ใน `getStoredWorkspaceId()` จะจัดการให้อัตโนมัติ แต่ต้องแน่ใจว่า store ถูก import ก่อนที่ user จะ interact กับ workspace switcher
5. **i18n key mismatch** — `bun check` จะแจ้ง TypeScript error ถ้า i18n key ที่เรียกใน `.svelte` ไม่มีใน messages — ต้องรัน `bun i18n:merge` ก่อน `bun check`
6. **Workspace API field name** — backend อาจส่ง `workspaceId` หรือ `id` ใน response ขึ้นกับ endpoint ให้ใช้ pattern `item.workspaceId ?? item.id` แบบเดียวกับ org.ts เดิมที่ใช้ `item.orgId ?? item.id`
7. **Breaking change: `/orgs` routes** — ถ้า user มี bookmark เก่าไปยัง `/orgs/*` redirect ชั่วคราวใน Step 4.2 จะช่วยได้

---

## Linting/Type Check Order

ทำตามลำดับนี้เพื่อลด cascade errors:
1. Phase 1 (types) → Phase 2 (store) → `bun check` ครั้งแรก (expect errors จาก api files)
2. Phase 3.1–3.2 (workspace.ts, entitlement.ts) → Phase 3.3 (header fix) → `bun check` ครั้งสอง
3. Phase 4 (routes) → Phase 3.4 (ลบ orgunit/permission) → `bun check` ครั้งสาม
4. Phase 5–6–7 → `bun i18n:merge` → `bun check` ครั้งสุดท้าย → `bun lint`

---

## Test Plan

- `bun check` ผ่าน (no type errors)
- `bun lint` ผ่าน
- Workspace list page: loading state, empty state, error state, happy path (cards แสดงครบ)
- Create workspace: modal เปิด/ปิด, validation (ชื่อว่าง), success, error
- Edit workspace: pre-fill ข้อมูล, success
- Delete workspace: confirmation modal, success
- Workspace switcher (sidebar): dropdown แสดง workspace list, สลับ workspace ได้, activeWorkspaceId เปลี่ยนใน localStorage
- localStorage migration: ลบ `activeWorkspaceId` ออกจาก localStorage แล้ว set `activeOrgId` ด้วย value เก่า → reload page → ต้องย้าย key อัตโนมัติ
- Members page: load members, invite by email (4 roles), invite by userId, remove members, change role inline
- Role permission matrix: แสดงตารางครบ 4 roles × permissions
- Entitlement page: แสดง fields ครบทุก field จาก RuntimeEntitlement, ไม่มีปุ่ม Upgrade
- ตรวจว่าไม่มี `x-active-org` header ถูกส่งออกใน Network tab (ทุก request ต้องใช้ `x-active-workspace` แทน)
- `/orgs` → redirect ไป `/workspaces`
- `/orgs/users` → redirect ไป `/workspaces/members`
- `/orgs/access` → redirect ไป `/workspaces/access`
- `/subscriptions/packages` → 404 หรือ redirect (route ถูกลบ)

## Rollback Plan
- เก็บ `src/lib/api/orgunit.ts` และ `src/lib/api/permission.ts` ไว้ใน feature branch จนกว่า QA ผ่าน
- ถ้า backend มีปัญหา: revert header key กลับเป็น `x-active-org` (เปลี่ยนจุดเดียวใน apiFetch ของแต่ละ file)
- Branch: `feature/ui-workspace-migration` — อย่า merge เข้า develop จนกว่า `bun check` + `bun lint` ผ่านทั้งหมด
