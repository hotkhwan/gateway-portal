# UI Migration Plan: Organization → Workspace

**วันที่:** 2026-04-10  
**อัปเดต:** 2026-04-10 — Backend พร้อมทั้งหมด ✅  
**อ้างอิง backend plan:** `/home/phibek/gateway-api/docs/plan/dedicate-service.md`  
**Branch เป้าหมาย:** `feature/ui-workspace-migration`

> **สถานะ Backend (2026-04-10):** implement ครบทุก item แล้ว — FE เริ่ม Phase 1–7 ได้เลย

---

## สรุปการเปลี่ยนแปลงจาก Backend

| เดิม (Organization model) | ใหม่ (Workspace model) |
|--------------------------|------------------------|
| `organization` / `org` | `workspace` |
| `orgUnit` (tree hierarchy) | **ยกเลิก** — ไม่มี orgUnit แล้ว |
| Permify ReBAC (orgUnit-scoped) | Workspace-scoped RBAC (owner/admin/operator/viewer) |
| `orgId` ใน header | `workspaceId` ใน header |
| `/orgs/*` endpoints | `/workspaces/*` endpoints |
| Subscription UI (commercial) | Entitlement display only (read-only snapshot) |

### Permission Roles (ใหม่)

| Role | สิทธิ์ |
|------|--------|
| `owner` | ทุกอย่าง |
| `admin` | manageAssets, manageSources, managePipelines, manageDeliveryTargets, viewEvents |
| `operator` | managePipelines, viewEvents |
| `viewer` | viewEvents |

---

## สิ่งที่ต้องเปลี่ยน (จัดเป็น Phase)

---

## Phase 1 — Types & Stores

### 1.1 ปรับ `src/lib/types/org.ts` → `src/lib/types/workspace.ts`

**ลบออก:**
- `OrgUnit`, `OrgUnitMember`, `OrgUnitRelation`
- `TargetPermissionProfile` (ใช้ orgUnitIds) — เปลี่ยนเป็น WorkspaceMemberRole

**เพิ่ม/แก้ไข:**
```ts
// Workspace แทน Org
export type WorkspaceStatus = 'active' | 'inactive'

export interface Workspace {
  id: string
  name: string
  description?: string
  status: WorkspaceStatus
  createdAt: string
  updatedAt?: string
  ingestConfig?: IngestConfig  // ยังคงไว้ (endpoint, secret, rateLimit)
}

// Role ใหม่ (4 roles แทน admin|member เดิม)
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
```

**คงไว้ (ใช้ได้เหมือนเดิม):**
- `IngestConfig`
- `DeliveryTarget`, `WebhookConfig`, `LineConfig`, `TelegramConfig`, `DiscordConfig`
- `ApiResponse<T>`, `PaginatedResponse<T>`

**ลบ `TargetPermissionProfile`** — permission ใหม่เป็น workspace-scoped RBAC ไม่ต้องมี profile แยก

---

### 1.2 ปรับ `src/lib/stores/activeOrg.ts` → `src/lib/stores/activeWorkspace.ts`

```ts
// เปลี่ยนชื่อทุกอย่าง: org → workspace
const STORAGE_KEY = 'activeWorkspaceId'

export const workspaceList = writable<Workspace[]>([])
export const activeWorkspaceId = writable<string | null>(getStoredWorkspaceId())
export const activeWorkspace = derived(...)

export async function setActiveWorkspace(id: string | null) { ... }
export function setWorkspaceList(workspaces: Workspace[]) { ... }
```

**Header ที่ยืนยันแล้ว:** `X-Active-Workspace` ✅  
Backend middleware `activeWorkspace.go` อ่าน header นี้, check Permify workspace entity, set `c.Locals("activeWorkspace")`

> localStorage migration: store ใหม่ให้อ่าน `activeOrgId` เก่า → copy ค่า → เขียนลง `activeWorkspaceId` → ลบ key เก่าออก

---

## Phase 2 — API Layer

### 2.1 เปลี่ยน `src/lib/api/org.ts` → `src/lib/api/workspace.ts`

**Endpoint mapping:**

| เดิม | ใหม่ |
|------|------|
| `GET /orgs` | `GET /workspaces` |
| `POST /orgs` | `POST /workspaces` |
| `GET /orgs/:id` | `GET /workspaces/:id` |
| `PATCH /orgs/:id` | `PATCH /workspaces/:id` |
| `DELETE /orgs/:id` | `DELETE /workspaces/:id` |
| `GET /orgs/users/members` | `GET /workspaces/members` |
| `POST /orgs/users/invite` | `POST /workspaces/members/invite` |
| `POST /orgs/users/invite-by-email` | `POST /workspaces/members/invite-by-email` |
| `PATCH /orgs/users/remove` | `PATCH /workspaces/members/remove` |
| `GET /ingest` (orgId) | `GET /ingest` (workspaceId) |
| `POST /ingest/rotateSecret` | `POST /ingest/rotateSecret` |

**ฟังก์ชัน rename:**
- `listOrgs` → `listWorkspaces`
- `createOrg` → `createWorkspace`
- `getOrg` → `getWorkspace`
- `updateOrg` → `updateWorkspace`
- `deleteOrg` → `deleteWorkspace`
- `listOrgMembers` → `listWorkspaceMembers`
- `inviteOrgUsers` → `inviteWorkspaceUsers`
- `inviteUserByEmail` → ใช้ `inviteWorkspaceMemberByEmail`
- `removeOrgUsers` → `removeWorkspaceMembers`

**Role field:** เปลี่ยนจาก `'admin' | 'member'` เป็น `WorkspaceMemberRole`

---

### 2.2 ลบ `src/lib/api/orgunit.ts`

ทั้งไฟล์ลบออก — ไม่มี orgUnit ใน phibek domain แล้ว

---

### 2.3 ลบ `src/lib/api/permission.ts`

**ยืนยันแล้ว ✅:** permission profile (`/orgs/resource/permissions`) ถูกยกเลิก  
permission model ใหม่เป็น workspace-scoped RBAC ล้วนๆ — role อยู่ที่ `WorkspaceMember.role`

**สิ่งที่ต้องทำ:**
- ลบ `src/lib/api/permission.ts` ทั้งไฟล์
- ลบ `src/routes/(app)/orgs/permissions/+page.svelte` (เดิม)
- สร้าง `workspaces/roles/+page.svelte` ใหม่ → แสดง role matrix (4 roles × permission matrix) แบบ read-only reference

---

## Phase 3 — Routes

### 3.1 Rename route folder

```
src/routes/(app)/orgs/              →  src/routes/(app)/workspaces/
```

### 3.2 ไฟล์ที่เปลี่ยน

| เดิม | ใหม่ | หมายเหตุ |
|------|------|---------|
| `orgs/+page.svelte` | `workspaces/+page.svelte` | list + create workspace |
| `orgs/users/+page.svelte` | `workspaces/members/+page.svelte` | ปรับ role dropdown เป็น 4 roles |
| `orgs/permissions/+page.svelte` | `workspaces/roles/+page.svelte` | แสดง role matrix ของ workspace |
| `orgs/access/+page.svelte` | `workspaces/access/+page.svelte` | ยังคงไว้ (อาจปรับเล็กน้อย) |

### 3.3 ไฟล์ที่ **ลบออก**

```
src/routes/(app)/orgs/units/+page.svelte                   ← ลบ (orgUnit ยกเลิก)
src/routes/(app)/orgs/units/[unitId]/members/+page.svelte  ← ลบ (orgUnit ยกเลิก)
```

### 3.4 หน้า Subscription

**ปัจจุบัน:** `subscriptions/packages` + `subscriptions/current` — CRUD commercial plan

**ใหม่:**  
- `subscriptions/current` → เปลี่ยนเป็น **Entitlement** page (read-only)  
  แสดง RuntimeEntitlement ที่ได้รับ snapshot มา (maxEventsPerSecond, maxAssets, retentionDays ฯลฯ)  
- `subscriptions/packages` → ซ่อนหรือ disable (commercial plan อยู่ใน klynx-api ไม่ใช่ phibek)

---

## Phase 4 — Sidebar & Navigation

### 4.1 ปรับ `src/lib/stores/appSidebarMenus.ts`

**ลบออก:**
```ts
{ id: 'orgUnits', url: 'orgs/units', textKey: 'navOrgUnits' }
```

**เปลี่ยน:**
```ts
// เดิม
{ kind: 'link', id: 'orgs', url: 'orgs', icon: 'bi bi-building', textKey: 'navOrgs' }
{ id: 'orgUsers', url: 'orgs/users', textKey: 'orgUsersTitle' }
{ id: 'orgPermissions', url: 'orgs/permissions', textKey: 'navOrgPermissions' }
{ id: 'orgAccess', url: 'orgs/access', textKey: 'navOrgAccess' }

// ใหม่
{ kind: 'link', id: 'workspaces', url: 'workspaces', icon: 'bi bi-grid', textKey: 'navWorkspaces' }
{ id: 'workspaceMembers', url: 'workspaces/members', textKey: 'workspaceMembersTitle' }
{ id: 'workspaceRoles', url: 'workspaces/roles', textKey: 'workspaceRolesTitle' }
{ id: 'workspaceAccess', url: 'workspaces/access', textKey: 'navWorkspaceAccess' }
```

---

## Phase 5 — i18n Keys

### 5.1 เพิ่ม keys ใหม่ใน `messages/en.js` และ `messages/th.js`

**เพิ่ม:**
```js
navWorkspaces: 'Workspaces'               // th: 'เวิร์กสเปซ'
navWorkspaceTenancy: 'Workspace'          // th: 'เวิร์กสเปซ'
workspaceMembersTitle: 'Members'          // th: 'สมาชิก'
workspaceRolesTitle: 'Roles & Permissions' // th: 'สิทธิ์การใช้งาน'
navWorkspaceAccess: 'My Access'           // th: 'สิทธิ์ของฉัน'
roleOwner: 'Owner'                        // th: 'เจ้าของ'
roleAdmin: 'Admin'                        // th: 'ผู้ดูแล'
roleOperator: 'Operator'                  // th: 'ผู้ปฏิบัติงาน'
roleViewer: 'Viewer'                      // th: 'ผู้ชม'
entitlementTitle: 'Usage & Limits'        // th: 'การใช้งานและขีดจำกัด'
```

**ลบ (หรือ deprecate):**
```js
navOrgUnits       // ลบ — ไม่มี orgUnit แล้ว
navOrgPermissions // เปลี่ยนเป็น workspaceRolesTitle
navOrgs           // เปลี่ยนเป็น navWorkspaces
```

---

## Phase 6 — Layout & Header

### 6.1 Workspace Switcher

**ปัจจุบัน:** AppHeader แสดง org switcher (dropdown)  
**เปลี่ยน:** เปลี่ยน label และ store เป็น workspace

- `activeOrg` store → `activeWorkspace` store
- dropdown text: "Workspace: [name]" แทน "Org: [name]"
- `x-active-workspace` header (ยืนยันชื่อกับ backend ก่อน)

### 6.2 `src/routes/(app)/+layout.server.ts`

- เปลี่ยน load function จาก `listOrgs` → `listWorkspaces`
- เปลี่ยน `setOrgList` → `setWorkspaceList`

---

## Phase 7 — Entitlement Page (ใหม่)

แทน subscription packages page ด้วย entitlement display:

**`src/routes/(app)/subscriptions/current/+page.svelte`** → ปรับเป็น read-only

แสดง fields จาก `RuntimeEntitlement`:
- `planCode`
- `maxEventsPerSecond`
- `maxPayloadBytes`
- `maxAssets`, `maxSources`, `maxPipelines`, `maxSites`
- `retentionDays`
- `webhookTargetsLimit`
- `eventExportEnabled`, `assetTrackingEnabled`
- `allowedSourceFamilies`

**`src/lib/api/entitlement.ts`** — endpoint ยืนยันแล้ว ✅:
```ts
GET /workspaces/entitlement   // ✅ confirmed — workspaceapi/entitlement.go
```

Fields ที่ backend ส่งมา (จาก `RuntimeEntitlement`):
```ts
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

---

## Checklist การทำงาน

### Phase 1 — Types & Stores
- [ ] สร้าง `src/lib/types/workspace.ts` (Workspace, WorkspaceMember, WorkspaceMemberRole, RuntimeEntitlement)
- [ ] ลบ `OrgUnit`, `OrgUnitMember`, `OrgUnitRelation`, `TargetPermissionProfile` ออกจาก `org.ts`
- [ ] สร้าง `src/lib/stores/activeWorkspace.ts` — header: `X-Active-Workspace` ✅
  - migrate localStorage: อ่าน `activeOrgId` → copy → เขียน `activeWorkspaceId` → ลบ key เก่า

### Phase 2 — API Layer
- [ ] สร้าง `src/lib/api/workspace.ts` — endpoints `/workspaces/*` ✅
  - listWorkspaces, createWorkspace, getWorkspace, updateWorkspace, deleteWorkspace
  - listWorkspaceMembers, inviteWorkspaceUsers, inviteWorkspaceMemberByEmail, removeWorkspaceMembers, changeWorkspaceMemberRole
- [ ] ลบ `src/lib/api/orgunit.ts` ✅ (ไม่มี orgUnit แล้ว)
- [ ] ลบ `src/lib/api/permission.ts` ✅ (permission profile ยกเลิก — ใช้ role-based ล้วนๆ)
- [ ] สร้าง `src/lib/api/entitlement.ts` — `GET /workspaces/entitlement` ✅

### Phase 3 — Routes
- [ ] สร้าง `src/routes/(app)/workspaces/+page.svelte` (list + create workspace)
- [ ] สร้าง `src/routes/(app)/workspaces/members/+page.svelte` (role dropdown: owner/admin/operator/viewer)
- [ ] สร้าง `src/routes/(app)/workspaces/roles/+page.svelte` (role matrix — read-only reference)
- [ ] สร้าง `src/routes/(app)/workspaces/access/+page.svelte`
- [ ] ลบ `src/routes/(app)/orgs/units/` (ทั้ง folder)
- [ ] ลบ `src/routes/(app)/orgs/permissions/+page.svelte`
- [ ] ปรับ `src/routes/(app)/subscriptions/current/+page.svelte` → entitlement view (read-only)
- [ ] ลบ `src/routes/(app)/subscriptions/packages/+page.svelte` (commercial อยู่ใน klynx-api)

### Phase 4 — Navigation
- [ ] ปรับ `src/lib/stores/appSidebarMenus.ts` — ลบ orgUnits, เปลี่ยน orgs → workspaces
- [ ] ปรับ AppHeader workspace switcher (label + store)

### Phase 5 — i18n
- [ ] เพิ่ม keys ใหม่ใน `messages/en.js`
- [ ] เพิ่ม keys ใหม่ใน `messages/th.js`
- [ ] รัน `bun i18n:merge`

### Phase 6 — Layout
- [ ] ปรับ `src/routes/(app)/+layout.server.ts` — `listOrgs` → `listWorkspaces`, `setOrgList` → `setWorkspaceList`

### Phase 7 — QA
- [ ] `bun check` ผ่าน (no type errors)
- [ ] `bun lint` ผ่าน
- [ ] ทดสอบ workspace switcher + localStorage migration
- [ ] ทดสอบ create/edit/delete workspace
- [ ] ทดสอบ invite member (4 roles: owner/admin/operator/viewer)
- [ ] ทดสอบ change role
- [ ] ทดสอบ entitlement page (read-only fields ครบ)
- [ ] ตรวจว่าไม่มีไฟล์ที่ยัง import จาก `orgunit.ts`, `permission.ts`, หรือ `activeOrg.ts` เก่า
- [ ] ตรวจว่า `x-active-org` header ไม่ถูกส่งออกอีกแล้ว (ใช้ `X-Active-Workspace` แทน)

---

## คำถาม Backend — ยืนยันแล้วทั้งหมด ✅

| คำถาม | คำตอบ (ยืนยันแล้ว) |
|-------|-------------------|
| Header ชื่ออะไร? | `X-Active-Workspace` ✅ (`middleware/activeWorkspace.go`) |
| `/workspaces/*` endpoints พร้อมใช้งาน? | พร้อมแล้ว ✅ (`router/workspace.go` + `controllers/workspaceapi/`) |
| Permission profile ยังมีหรือเปล่า? | **ยกเลิกแล้ว** ✅ — ใช้ workspace RBAC role ล้วนๆ |
| Entitlement endpoint path? | `GET /workspaces/entitlement` ✅ (`workspaceapi/entitlement.go`) |
| Role บน invite รองรับกี่ตัว? | 4 roles ครบ: `owner`, `admin`, `operator`, `viewer` ✅ |
| `changeRole` endpoint? | `PATCH /workspaces/members/:userId/role` ✅ (`workspaceapi/member.go`) |

---

## ผลกระทบ / Risk

| ความเสี่ยง | ระดับ | วิธีลด |
|-----------|-------|--------|
| Breaking change ถ้า old org routes ยังถูกใช้ | สูง | ทำ redirect `/orgs` → `/workspaces` ชั่วคราว |
| localStorage key `activeOrgId` ยังอยู่บน browser เก่า | ต่ำ | migrate logic ใน store: อ่าน `activeOrgId` → copy → เขียน `activeWorkspaceId` → ลบ key เก่า |
| ~~API ยังไม่พร้อม~~ | ~~กลาง~~ | **ไม่มีแล้ว** — backend พร้อมทั้งหมด ✅ |
| TypeScript errors จาก import เก่า (`orgunit`, `permission`, `activeOrg`) | กลาง | ทำ Phase 1 ก่อน แล้ว fix import ทีเดียวทั้งโปรเจกต์ |
