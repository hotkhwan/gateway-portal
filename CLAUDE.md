# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Rules

- สื่อสารกับผู้ใช้เป็น **ภาษาไทย** เสมอ (คำศัพท์เทคนิคให้อธิบายเป็นไทยกำกับ)
- ทำงานในบทบาทผสม: Frontend Dev, QA/Tester, PM/SA
- เมื่อแก้ไขโค้ด ต้องระบุ: ไฟล์ที่แก้, เหตุผล, ผลลัพธ์ที่คาดหวัง, ผลกระทบ, สิ่งที่ต้องทดสอบ
- เมื่อเปลี่ยนแปลง API contract ต้องเตือนเรื่อง compatibility และผลกระทบต่อ backend เสมอ
- หากมีหลายทางเลือก ให้เปรียบเทียบข้อดีข้อเสียก่อนเสนอ

## Project Overview

Gateway Portal is a SvelteKit + Svelte 5 frontend for managing API gateway configurations, delivery targets, ingest sources, and organization settings. Uses Bootstrap 5 for UI, paraglide for i18n, and cookie-based session auth proxied through a Nitro-style SvelteKit API route.

## Common Commands

```bash
bun install          # Install dependencies
bun dev              # Dev server (reads .env)
bun build            # Production build
bun start            # Run production build
bun check            # svelte-check + type check
bun check:watch      # Watch mode type check
bun lint             # ESLint
bun i18n:merge       # Merge i18n translation files
```

## Architecture

### Routing (`src/routes/`)

File-based routing with route groups:
- `(app)/` — Authenticated app pages (dashboard, delivery, ingest, orgs, settings, subscription)
- `(base)/` — Base routes including the API proxy
- `(public)/` — Public pages (login, etc.)

Key SvelteKit file conventions:
- `+page.svelte` — Page component
- `+page.ts` — Universal load function (runs on client + server)
- `+page.server.ts` — Server-only load / form actions
- `+layout.svelte` — Layout component
- `+layout.server.ts` — Server-only layout load
- `+server.ts` — API endpoint / route handler

### API Proxy

`src/routes/(base)/api/[...path]/+server.ts` — Proxies all `/api/*` requests to the backend (`API_BASE` env var). Handles:
- Cookie-based session token injection (`session_token`)
- Automatic token refresh via `session_refresh` cookie
- Hop-by-hop header filtering

### API Client Layer (`src/lib/api/`)

Each domain has its own module (e.g. `target.ts`, `ingest.ts`, `org.ts`).

All use the internal `apiFetch<T>()` pattern:
```ts
import { PUBLIC_APP_BASE_PATH } from '$env/static/public'
const BASE = `${(PUBLIC_APP_BASE_PATH ?? '').replace(/\/$/, '')}/api`

async function apiFetch<T>(path: string, orgId: string, init?: RequestInit): Promise<ApiResponse<T>>
```

- Response shape: `ApiResponse<T>` → access data via `.details`
- Auth header injected via proxy (cookie-based, not client-side)
- `guardAuth(res)` called to handle 401 redirect

### Stores (`src/lib/stores/`)

Svelte stores for shared state:
- `activeOrg.ts` — Current active organisation
- `appOptions.ts` — App-wide UI options
- `appSidebarMenus.ts` — Sidebar navigation
- `appTopNavMenus.ts` — Top nav menus
- `appVariables.ts` — App variables

### Types (`src/lib/types/`)

TypeScript type definitions per domain. `ApiResponse<T>` is the standard wrapper.

### i18n

Paraglide (`@inlang/paraglide-js`) with strategy: `localStorage → cookie → baseLocale`.
Translation files merged via `bun i18n:merge` before build/dev.

## Code Style

- **Svelte 5 runes**: Use `$state`, `$derived`, `$effect`, `$props()` — no legacy `export let`
- No semicolons
- Single quotes
- TypeScript strict
- Unused vars prefixed with `_`
- Bootstrap 5 utility classes for layout/spacing
- No inline styles unless truly one-off

## Modal Rules

**Never close a modal on backdrop click.**

Users lose unsaved work (form fields, AI-generated results, etc.) when clicking outside accidentally.

- Do **not** add `onclick={(e) => { if (e.target === e.currentTarget) closeModal() }}` to the modal wrapper `<div>`
- The only ways to close a modal are: the explicit close/cancel button, or a successful action (save/delete)
- Confirm modals (destructive actions) also follow this rule — user must click Cancel or Confirm explicitly

Correct pattern:
```svelte
<div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
  <div class="modal-dialog modal-dialog-centered">
    ...
    <div class="modal-footer">
      <button onclick={() => (showModal = false)}>{m.actionCancel()}</button>
    </div>
  </div>
</div>
```

Wrong pattern (do NOT do this):
```svelte
<!-- ❌ closes on accidental outside click -->
<div class="modal d-block" onclick={(e) => { if (e.target === e.currentTarget) showModal = false }}>
```

## Pagination Rules

- Default `perPage` = **10** สำหรับทุกหน้าที่มี pagination
- แสดง page numbers แบบ truncated: `1 … 7 8 [9] 10 11 … 30` (current ±2, first, last, ellipsis)
- ไม่ render ทุก page number ด้วย `Array(totalPages)` เพราะจะยาวเกินไป
- ใช้ pattern `{#if p === '…'}` เพื่อแสดง ellipsis ที่ไม่ clickable

## Security

- Never expose `API_BASE` or `session_token` to the client
- All backend calls go through the proxy route — never call backend directly from `+page.ts` or `.svelte` components
- `x-active-org` header set from store value, not user input

## Cross-Repo Planning & Contracts

`gateway-portal` is a frontend spoke in a hub-and-spoke contract model. ก่อน implement งานที่กระทบ API / event / sync / permission ให้ทำ FE plan/checklist + ระบุ contract source ให้ชัด ห้าม invent schema

### Contract Source of Truth (canonical order)

| ใช้กับ flow | Contract source | Notes |
|---|---|---|
| `gateway-portal` → `gateway-api` ตรง ๆ (admin / operator REST) | `gateway-api/docs/swagger.yaml` (OpenAPI = REST subset) + `gateway-api/docs/contracts/<name>.md` ถ้ามี | Swagger ครอบคลุมเฉพาะ REST schema; ถ้า flow มี Kafka / MQTT / Redis-visible / sync behavior ต้องอ้าง `.md` |
| Cross-repo flow ที่ `klynx-api` เป็น feature owner | `klynx-api/docs/contracts/<name>.md` (canonical hub) + `klynx-api/openapi/<name>.yaml` ถ้า contract `.md` link ไปถึง | hub authority — ครอบคลุม REST + Kafka + MQTT + Redis + sync + cache + rollout เป็น 1 contract ต่อ domain/flow |
| Domains ที่ `gateway-api` เป็น SoR (events canonical detail, `device_management`) | `gateway-api/docs/contracts/<name>.md` ถ้ามี; ถ้าไม่มี — อ่านจาก hub contract ที่ `klynx-api/docs/contracts/<name>.md` ที่ชี้กลับมาที่ gateway-api SoR | `device_management` identity / sync state เขียนผ่าน gateway-api เสมอ — ไม่ใช่ projection |

**สำคัญ — OpenAPI / Swagger ≠ contract เต็ม:** REST เป็นแค่หนึ่งใน surface; MQTT / Redis-visible / sync / cache / write authority อยู่ใน `.md` เท่านั้น

### FE Plan/Checklist Requirement

ก่อน implement task ที่กระทบ contract ต้องมี FE plan/checklist สั้น ๆ (ใส่ใน `docs/plan/<name>.md` หรือ PR description) ระบุ:

- **backend contract file + section ที่อ้างอิง** (ระบุชัด เช่น `gateway-api/docs/swagger.yaml#/paths/~1ingest~1sources/post` หรือ `klynx-api/docs/contracts/gateway-klynx-realtime.md §7.1`, ไม่ใช่แค่ "ดู swagger")
- impacted screens/files
- expected FE behavior
- fallback behavior / error UX (ถ้า contract ระบุ fallback path ให้อ้างถึง section ของ contract — ไม่ invent fallback ฝั่ง FE)
- smoke checklist
- version bump + CHANGELOG scope ถ้า ship behavior

### ห้าม invent schema (ครอบคลุมทุก surface)

- ห้ามเดา REST request/response/error shape จาก network trace, BE code, หรือ screenshot
- ห้ามเดา Kafka event payload (ถ้า FE สังเกตผ่าน proxy/aggregator)
- ห้ามเดา MQTT topic pattern, payload, QoS, retain, reconnect/resubscribe rule
- ห้ามเดา Redis-visible behavior (TTL, invalidation timing, stale-read window) แม้สังเกตเห็นจาก devtools
- ห้ามเดา permission rule, auth flow, device/camera sync behavior, write authority

ถ้าเจอ behavior ที่ contract ไม่ระบุ → **หยุด implement** แล้วขอ BE update contract ก่อน อย่า "ลองยิงดู" หรือ "ใช้ค่า default ไปก่อน" — โดยเฉพาะ MQTT / Redis-visible / realtime / event / permission / auth / device-camera sync — guesswork ทำให้ state corrupt เงียบ ๆ

### Workflow Gate

For Codex review and the full plan-review-implement workflow, see [`AGENTS.md`](AGENTS.md).
