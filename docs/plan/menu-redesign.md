# Plan: Menu Redesign — Gateway Portal

**Date:** 2026-04-14
**Scope:** `gateway-portal` (SvelteKit + Bootstrap 5)
**Goal:** ลด menu จาก 20+ items → 14 items ที่ครบ function ใช้งานง่าย

---

## 1. ปัญหาของ Menu ปัจจุบัน

| ปัญหา | รายละเอียด |
|---|---|
| Events section บวม | 8 children — ผู้ใช้งานใช้จริงแค่ 3-4 items |
| Parent ที่ไม่มี default route | "Delivery", "Workspace" click ได้แต่ไม่นำทาง |
| Duplicate Workspaces | อยู่ทั้ง sidebar menu + workspace switcher |
| Single-child parent | Subscription → Usage & Limits (1 item ไม่ต้องมี parent) |
| Items ที่ไม่ใช้งานบ่อย | Mapping Suggestions (read-only), My Access, Rejected Patterns |
| Legacy keys ใน nav.json | navPosSystem, navAiStudio, navUiKits ฯลฯ ไม่ได้ใช้งาน |

---

## 2. หลักการออกแบบใหม่

1. **Function-first grouping** — จัดกลุ่มตาม "ทำอะไร" ไม่ใช่ "ส่วนไหนของระบบ"
2. **ลด depth** — ไม่เกิน 2 ชั้น (parent + children)
3. **ตัดสิ่งที่ accessible จาก page อื่น** — Mapping Suggestions → เข้าถึงจาก Templates page
4. **Workspace section ชัดเจน** — Members / Roles / Usage อยู่ด้วยกัน
5. **Bottom bar สำหรับ account** — Profile + Settings แยกออกมาด้านล่าง

---

## 3. Menu Structure ใหม่ vs เก่า

### Before (20 items)
```
NAVIGATION
  Dashboard
  Events (8 children)
    Event Management / Mapping Templates / Unknown Payload Reviews /
    Source Profiles / Device Management / Rejected Payload Patterns /
    Mapping Suggestions / Event Details
  Delivery (3 children)
    Targets / Message Templates / Dead Letter Queue
  Workspaces
  Workspace (3 children)
    Members / Roles & Permissions / My Access
  ────────
  USERS
  Profile
  Settings
  Subscription (1 child)
    Usage & Limits
```

### After (14 items)
```
NAVIGATION
  Dashboard
  Events (3 children)           ← ลดจาก 8 → 3
    Event Feed / Pending Review / Unknown Payloads
  Configuration (3 children)    ← ใหม่ รวม config items
    Mapping Templates / Source Profiles / Devices
  Delivery (3 children)
    Targets / Message Templates / Dead Letter Queue

  ──── WORKSPACE ────
  Members                       ← direct links (ไม่มี parent)
  Roles & Permissions
  Usage & Limits
  ────────────────
  Profile
  Settings
```

---

## 4. รายการที่ตัดออก + เหตุผล

| รายการ | เหตุผล | ยังเข้าถึงได้จาก |
|---|---|---|
| **Mapping Suggestions** | Read-only reference เท่านั้น | Templates page → link/button |
| **Rejected Payload Patterns** | ใช้งานน้อย / operational edge case | — |
| **My Access** | ข้อมูลเดียวกับ Roles page | Roles & Permissions page |
| **Workspaces List** | Duplicate กับ workspace switcher dropdown | Workspace switcher |
| **Workspace (parent wrapper)** | ถูกแยกเป็น direct links แล้ว | — |
| **Subscription (parent)** | มีแค่ 1 child — ย้ายเป็น direct link | — |

---

## 5. Icon Map

| Menu Item | Icon |
|---|---|
| Dashboard | `bi bi-speedometer2` |
| Events | `bi bi-collection` |
| Configuration | `bi bi-sliders` |
| Delivery | `bi bi-send` |
| Members | `bi bi-people` |
| Roles & Permissions | `bi bi-shield-check` |
| Usage & Limits | `bi bi-gem` |
| Profile | `bi bi-person-circle` |
| Settings | `bi bi-gear` |

---

## 6. ไฟล์ที่แก้ไข

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `src/lib/stores/appSidebarMenus.ts` | เขียน menu structure ใหม่ทั้งหมด |
| `i18n/en/nav.json` | ลบ legacy keys + เพิ่ม keys ใหม่ |
| `i18n/th/nav.json` | ลบ legacy keys + เพิ่ม keys ใหม่ (ภาษาไทย) |

---

## 7. i18n Keys ที่เพิ่ม

| Key | EN | TH |
|---|---|---|
| `navEventFeed` | Event Feed | ฟีดกิจกรรม |
| `navPendingReview` | Pending Review | รอตรวจสอบ |
| `navUnknownPayloads` | Unknown Payloads | Payload ไม่รู้จัก |
| `navConfiguration` | Configuration | การตั้งค่า |
| `navDevices` | Devices | อุปกรณ์ |
| `navMembers` | Members | สมาชิก |
| `navRoles` | Roles & Permissions | บทบาทและสิทธิ์ |
| `navUsageLimits` | Usage & Limits | การใช้งานและขีดจำกัด |
| `navWorkspace` | Workspace | พื้นที่ทำงาน |

## 8. i18n Keys ที่ลบ (legacy ไม่ใช้แล้ว)

`navHome` `navAbout` `navFeatures` `navContact` `navWidgets` `navSearch`
`navEmail` `navEmailInbox` `navEmailCompose` `navEmailDetail` `navComponents`
`navAiStudio` `navAiChat` `navAiImage` `navAnalytics`
`navPosSystem` `navPosCustomer` `navPosKitchen` `navPosCounter` `navPosTable` `navPosStock`
`navUiKits` `navUiBootstrap` `navUiButtons` `navUiCard` `navUiIcons`
`navUiModalNotifications` `navUiTypography` `navUiTabsAccordions`
`navForms` `navFormElements` `navFormPlugins` `navFormWizards`
`navTables` `navTableElements` `navTablePlugins`
`navCharts` `navChartJs` `navChartApex`
`navMap` `navLandingPage` `navCalendar` `navHelper`
`navWorkspaceTenancy` `navWorkspaceAccess` `navSubscription` `navUsers`
