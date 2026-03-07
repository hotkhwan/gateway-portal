# PLAN_INGEST.md — Frontend Plan: Ingest V2 Source Family Architecture

> Scope: Portal (FE) pages for Ingest V2 — Source Profiles, Device Management, Template Reviews, updated Mapping Templates
> Ref: `gw/PLAN.md` (BE V2 API spec), `portal/baseline/README.md` (FE conventions)
> Updated: 2026-03-08

---

## 1) Current State (Portal FE)

### Existing Ingest Pages

| Route | Status | Description |
|---|---|---|
| `ingest/management` | Done | Event management: list, view, approve, reject, bulk ops |
| `ingest/details` | Done | Approved events list + detail view |
| `ingest/mappingTemplates` | Done | Mapping template CRUD (name, match, field mappings, delivery targets, DLQ, classification rules, message templates) |
| `delivery/targets` | Done | Delivery targets CRUD (webhook, LINE, Discord, Telegram) + quota display |
| `delivery/templates` | Done | Message templates convenience view |
| `delivery/dlq` | Done | DLQ list + detail with retry/replay/abandon |

### Existing API Library (`lib/api/ingest.ts`)

| Function | Endpoint |
|---|---|
| `getIngestConfig()` | `GET /ingest/` |
| `rotateIngestSecret()` | `POST /ingest/rotateSecret` |
| `getDashboardStats()` | `GET /ingest/dashboard` |
| `listPendingEvents()` | `GET /ingest/management` |
| `getPendingEvent()` | `GET /ingest/management/:eventId` |
| `updatePendingEvent()` | `PATCH /ingest/management/:eventId` |
| `approveEvent()` | `POST /ingest/management/:eventId/approve` |
| `rejectEvent()` | `POST /ingest/management/:eventId/reject` |
| `deletePendingEvent()` | `DELETE /ingest/management/:eventId` |
| `bulkApprove/Reject/Delete/ApplyTemplate()` | `POST /ingest/management/bulk/*` |
| `listTemplates()` | `GET /ingest/mappingTemplates` |
| `createTemplate()` | `POST /ingest/mappingTemplates` |
| `getTemplate()` | `GET /ingest/mappingTemplates/:id` |
| `updateTemplate()` | `PATCH /ingest/mappingTemplates/:id` |
| `deleteTemplate()` | `DELETE /ingest/mappingTemplates/:id` |
| `listDlq()` | `GET /ingest/dlq` |
| `getDlqStats()` | `GET /ingest/dlq/stats` |
| `getDlqDetail()` | `GET /ingest/dlq/:id` |
| `retryDlq/replayDlq/abandonDlq()` | `POST /ingest/dlq/:id/*` |

### Existing Types (`lib/api/ingest.ts`)

- `PendingEvent`, `ApprovedEvent`, `FieldMapping`, `MatchRule`
- `PayloadCondition`, `ClassificationRule`, `ClassificationSet`
- `TemplateDeliveryTarget`, `MessageTemplate`, `DLQConfig`
- `MappingTemplate` (with delivery targets, classification, DLQ — already V1.5)
- `DlqMessage`, `DlqStats`

---

## 2) V2 Changes — What's New from Backend

### New BE Endpoints (V2 Source Family)

| Method | Path | Description |
|---|---|---|
| `GET` | `/ingest/sourceProfiles` | List all source profiles |
| `POST` | `/ingest/sourceProfiles` | Create source profile |
| `GET` | `/ingest/sourceProfiles/:sourceFamily` | Get source profile |
| `PATCH` | `/ingest/sourceProfiles/:sourceFamily` | Update source profile |
| `GET` | `/ingest/deviceManagement?page=1&perPages=20` | List device management records |
| `POST` | `/ingest/deviceManagement` | Create device management record |
| `GET` | `/ingest/deviceManagement/:id` | Get device management record |
| `PATCH` | `/ingest/deviceManagement/:id` | Update device management record |
| `GET` | `/ingest/templateReviews?page=1&perPages=10` | List template reviews |
| `GET` | `/ingest/templateReviews/:id` | Get template review |
| `POST` | `/ingest/templateReviews/:id/archive` | Archive template review |

### Updated MappingTemplate — New V2 Fields

| Field | Type | Description |
|---|---|---|
| `sourceFamily` | `string` | Which source family this template belongs to (e.g. "aibox") |
| `finalEventType` | `string` | Canonical event type override |
| `matchAll` | `MatchCondition[]` | V2 AND conditions — all must pass |
| `matchAny` | `MatchCondition[]` | V2 OR conditions — at least one must pass |
| `priority` | `number` | Higher = evaluated first (default 0) |

### New V2 Data Models

```typescript
// MatchCondition — V2 template matching
interface MatchCondition {
  field: string              // e.g. "raw.type", "raw.channel"
  operator: "eq" | "in" | "contains" | "prefix"
  values: string[]
}

interface SourceProfile {
  sourceFamily: string
  displayName: string
  multiRef: boolean
  refRules: {
    primaryRefFields?: string[]
    secondaryRefFields?: string[]
    siteFields?: string[]
  }
  suggestedMatchFields?: string[]
  createdAt: string
  updatedAt: string
}

interface DeviceManagement {
  deviceMgmtId: string
  tenantId: string
  orgId: string
  sourceFamily: string
  entityType: "channel" | "device" | "sourceSerial"
  entityId: string
  deviceId?: string
  lat?: number
  lng?: number
  site?: string
  zone?: string
  createdAt: string
  updatedAt: string
}

interface TemplateReview {
  reviewId: string
  tenantId: string
  orgId: string
  sourceFamily: string
  fingerprint: string          // SHA256 of sorted top-level keys
  samplePayload: Record<string, any>
  suggestedMatchFields?: string[]
  status: "pending" | "archived"
  createdAt: string
  updatedAt: string
}
```

---

## 3) Target State — Pages

### New Pages

| Route | Description |
|---|---|
| `ingest/sourceProfiles` | Source profile CRUD — define source families (aibox, ailpr, etc.) |
| `ingest/deviceManagement` | Device management CRUD — entity enrichment (lat/lng/site/zone) |
| `ingest/templateReviews` | Template review queue — unmatched payloads waiting for template creation |

### Updated Pages

| Route | Changes |
|---|---|
| `ingest/mappingTemplates` | Add V2 fields: `sourceFamily` dropdown, `finalEventType`, `priority`, `matchAll`/`matchAny` condition builder |
| `ingest/management` | When event has `templateId` -> "Edit Template" link. Template reviews replace pending approval flow. |
| Sidebar | Add 3 new menu items under Events section |

---

## 4) Implementation Plan (PRs)

### PR-FE-V2-1: Types + API Library + i18n + Sidebar

**Files to update:**

| File | Changes |
|---|---|
| `lib/api/ingest.ts` | Add `MatchCondition`, `SourceProfile`, `DeviceManagement`, `TemplateReview` types. Add API functions: `listSourceProfiles()`, `getSourceProfile()`, `createSourceProfile()`, `updateSourceProfile()`, `listDeviceManagement()`, `getDeviceManagement()`, `createDeviceManagement()`, `updateDeviceManagement()`, `listTemplateReviews()`, `getTemplateReview()`, `archiveTemplateReview()`. Update `MappingTemplate` type with V2 fields. Update `createTemplate()`/`updateTemplate()` to accept V2 fields. |
| `i18n/en/ingest.json` | Add keys for source profiles, device management, template reviews, V2 match conditions |
| `i18n/th/ingest.json` | Thai translations for all new keys |
| `lib/stores/appSidebarMenus.ts` | Add children under Events: Source Profiles, Device Management, Template Reviews |

**New types to add to `lib/api/ingest.ts`:**

```typescript
// V2 Match Condition
export interface MatchCondition {
  field: string
  operator: 'eq' | 'in' | 'contains' | 'prefix'
  values: string[]
}

// Source Profile
export interface SourceProfile {
  sourceFamily: string
  displayName: string
  multiRef: boolean
  refRules: {
    primaryRefFields?: string[]
    secondaryRefFields?: string[]
    siteFields?: string[]
  }
  suggestedMatchFields?: string[]
  createdAt: string
  updatedAt: string
}

// Device Management
export interface DeviceManagement {
  deviceMgmtId: string
  tenantId: string
  orgId: string
  sourceFamily: string
  entityType: 'channel' | 'device' | 'sourceSerial'
  entityId: string
  deviceId?: string
  lat?: number
  lng?: number
  site?: string
  zone?: string
  createdAt: string
  updatedAt: string
}

// Template Review
export interface TemplateReview {
  reviewId: string
  tenantId: string
  orgId: string
  sourceFamily: string
  fingerprint: string
  samplePayload: Record<string, unknown>
  suggestedMatchFields?: string[]
  status: 'pending' | 'archived'
  createdAt: string
  updatedAt: string
}

// Updated MappingTemplate — add V2 fields
export interface MappingTemplate {
  // ... existing fields ...
  sourceFamily?: string
  finalEventType?: string
  matchAll?: MatchCondition[]
  matchAny?: MatchCondition[]
  priority?: number
}
```

**New API functions to add:**

```typescript
// Source Profiles (no orgId — global scope)
export async function listSourceProfiles(): Promise<SourceProfile[]>
export async function getSourceProfile(sourceFamily: string): Promise<SourceProfile>
export async function createSourceProfile(data: { sourceFamily: string; displayName: string; multiRef?: boolean; refRules?: ...; suggestedMatchFields?: string[] }): Promise<SourceProfile>
export async function updateSourceProfile(sourceFamily: string, data: Partial<...>): Promise<void>

// Device Management (org-scoped)
export async function listDeviceManagement(orgId: string, page?: number, perPage?: number): Promise<{ details: DeviceManagement[]; ... }>
export async function getDeviceManagement(orgId: string, id: string): Promise<DeviceManagement>
export async function createDeviceManagement(orgId: string, data: { sourceFamily: string; entityType: string; entityId: string; ... }): Promise<DeviceManagement>
export async function updateDeviceManagement(orgId: string, id: string, data: { deviceId?: string; lat?: number; lng?: number; site?: string; zone?: string }): Promise<void>

// Template Reviews (org-scoped)
export async function listTemplateReviews(orgId: string, page?: number, perPage?: number): Promise<{ details: TemplateReview[]; ... }>
export async function getTemplateReview(orgId: string, id: string): Promise<TemplateReview>
export async function archiveTemplateReview(orgId: string, id: string): Promise<void>
```

**Sidebar update:**

```typescript
// Current Events section
{
  kind: 'link',
  id: 'events',
  url: 'ingest/management',
  icon: 'bi bi-bar-chart',
  textKey: 'navEvents',
  children: [
    { id: 'eventsManagement', url: 'ingest/management', textKey: 'eventsManagement' },
    { id: 'eventsDetails', url: 'ingest/details', textKey: 'eventsDetails' },
    { id: 'ingestMappingTemplates', url: 'ingest/mappingTemplates', textKey: 'ingestMappingTemplatesTitle' },
    // NEW V2 items:
    { id: 'ingestSourceProfiles', url: 'ingest/sourceProfiles', textKey: 'ingestSourceProfilesTitle' },
    { id: 'ingestDeviceManagement', url: 'ingest/deviceManagement', textKey: 'ingestDeviceManagementTitle' },
    { id: 'ingestTemplateReviews', url: 'ingest/templateReviews', textKey: 'ingestTemplateReviewsTitle' }
  ]
}
```

**i18n keys to add (`i18n/en/ingest.json`):**

```json
{
  "ingestSourceProfilesTitle": "Source Profiles",
  "ingestSourceProfilesSubtitle": "Define source family behavior and reference extraction rules",
  "ingestSourceProfileCreate": "New Source Profile",
  "ingestSourceProfileEdit": "Edit Source Profile",
  "ingestSourceProfileFamily": "Source Family",
  "ingestSourceProfileFamilyPlaceholder": "e.g. aibox, ailpr, xconnector",
  "ingestSourceProfileDisplayName": "Display Name",
  "ingestSourceProfileMultiRef": "Multi-Reference",
  "ingestSourceProfileMultiRefHint": "Enable multi-reference extraction from payload",
  "ingestSourceProfileRefRules": "Reference Extraction Rules",
  "ingestSourceProfilePrimaryRefFields": "Primary Ref Fields",
  "ingestSourceProfileSecondaryRefFields": "Secondary Ref Fields",
  "ingestSourceProfileSiteFields": "Site Fields",
  "ingestSourceProfileSuggestedMatchFields": "Suggested Match Fields",
  "ingestSourceProfileSuggestedMatchFieldsHint": "Fields suggested for template matching (e.g. raw.type)",
  "ingestSourceProfileNoRecords": "No source profiles found",
  "ingestSourceProfileDeleteWarning": "This will delete this source profile.",
  "ingestSourceProfileSaved": "Source profile saved successfully",

  "ingestDeviceManagementTitle": "Device Management",
  "ingestDeviceManagementSubtitle": "Manage device/entity enrichment (location, site, zone)",
  "ingestDeviceManagementCreate": "New Device Record",
  "ingestDeviceManagementEdit": "Edit Device Record",
  "ingestDeviceManagementSourceFamily": "Source Family",
  "ingestDeviceManagementEntityType": "Entity Type",
  "ingestDeviceManagementEntityId": "Entity ID",
  "ingestDeviceManagementDeviceId": "Device ID Override",
  "ingestDeviceManagementLat": "Latitude",
  "ingestDeviceManagementLng": "Longitude",
  "ingestDeviceManagementSite": "Site",
  "ingestDeviceManagementZone": "Zone",
  "ingestDeviceManagementEntityTypeChannel": "Channel",
  "ingestDeviceManagementEntityTypeDevice": "Device",
  "ingestDeviceManagementEntityTypeSerial": "Source Serial",
  "ingestDeviceManagementNoRecords": "No device management records found",
  "ingestDeviceManagementSaved": "Device management record saved",

  "ingestTemplateReviewsTitle": "Template Reviews",
  "ingestTemplateReviewsSubtitle": "Unmatched payload samples awaiting template creation",
  "ingestTemplateReviewSourceFamily": "Source Family",
  "ingestTemplateReviewFingerprint": "Fingerprint",
  "ingestTemplateReviewSamplePayload": "Sample Payload",
  "ingestTemplateReviewSuggestedFields": "Suggested Match Fields",
  "ingestTemplateReviewStatus": "Status",
  "ingestTemplateReviewStatusPending": "Pending",
  "ingestTemplateReviewStatusArchived": "Archived",
  "ingestTemplateReviewArchive": "Archive",
  "ingestTemplateReviewArchiveConfirm": "Archive this review?",
  "ingestTemplateReviewArchived": "Template review archived",
  "ingestTemplateReviewCreateTemplate": "Create Template from Review",
  "ingestTemplateReviewNoRecords": "No template reviews found",

  "ingestTemplateSourceFamily": "Source Family",
  "ingestTemplateSourceFamilyHint": "Select source family for this template",
  "ingestTemplateFinalEventType": "Final Event Type",
  "ingestTemplateFinalEventTypeHint": "Override canonical event type (optional)",
  "ingestTemplatePriority": "Priority",
  "ingestTemplatePriorityHint": "Higher value = evaluated first (default 0)",
  "ingestTemplateMatchAll": "Match All (AND)",
  "ingestTemplateMatchAllHint": "All conditions must pass",
  "ingestTemplateMatchAny": "Match Any (OR)",
  "ingestTemplateMatchAnyHint": "At least one condition must pass",
  "ingestTemplateAddCondition": "Add Condition",
  "ingestTemplateConditionField": "Field",
  "ingestTemplateConditionFieldPlaceholder": "e.g. raw.type",
  "ingestTemplateConditionOperator": "Operator",
  "ingestTemplateConditionValues": "Values",
  "ingestTemplateConditionOperatorEq": "equals",
  "ingestTemplateConditionOperatorIn": "in list",
  "ingestTemplateConditionOperatorContains": "contains",
  "ingestTemplateConditionOperatorPrefix": "starts with",
  "ingestTemplateNoConditions": "No conditions defined"
}
```

---

### PR-FE-V2-2: Source Profiles Page

**Create `src/routes/(app)/ingest/sourceProfiles/+page.svelte`**

Layout:
1. **Header:** Title + "New Source Profile" button
2. **Table:**
   - Columns: Source Family, Display Name, Multi-Ref (badge), Suggested Match Fields (tags), Created
   - Click row -> open edit modal
3. **Create/Edit Modal:**
   - `sourceFamily` — text input (readonly on edit, it's the unique key)
   - `displayName` — text input (required)
   - `multiRef` — toggle switch
   - `refRules` — expandable section:
     - Primary Ref Fields — tag input
     - Secondary Ref Fields — tag input
     - Site Fields — tag input
   - `suggestedMatchFields` — tag input (e.g. "raw.type", "raw.typeValue")
4. **Note:** Source profiles are global (not per-org). The API does not require `x-active-org`.

---

### PR-FE-V2-3: Device Management Page

**Create `src/routes/(app)/ingest/deviceManagement/+page.svelte`**

Layout:
1. **Header:** Title + "New Device Record" button
2. **Table (paginated):**
   - Columns: Source Family, Entity Type (badge), Entity ID, Device ID, Site, Zone, Lat/Lng, Created
   - Click row -> open edit modal
3. **Create Modal:**
   - `sourceFamily` — dropdown populated from source profiles (call `listSourceProfiles()`)
   - `entityType` — select: "channel" | "device" | "sourceSerial"
   - `entityId` — text input (required)
   - `deviceId` — text input (optional override)
   - `lat` / `lng` — number inputs + optional map picker (reuse `MapPicker.svelte` if available)
   - `site` — text input
   - `zone` — text input
4. **Edit Modal:** Same fields, but `sourceFamily`, `entityType`, `entityId` are readonly.
   - Updatable: `deviceId`, `lat`, `lng`, `site`, `zone`

---

### PR-FE-V2-4: Template Reviews Page

**Create `src/routes/(app)/ingest/templateReviews/+page.svelte`**

Layout:
1. **Header:** Title + subtitle
2. **Table (paginated):**
   - Columns: Source Family (badge), Fingerprint (truncated), Status (badge), Suggested Fields (tags), Created
   - Click row -> expand/modal showing `samplePayload` as JSON viewer
3. **Detail view / modal:**
   - Source Family, Fingerprint (full), Status
   - Sample Payload — collapsible JSON viewer (syntax highlighted)
   - Suggested Match Fields — tag list
   - Created / Updated timestamps
4. **Actions per review:**
   - **"Create Template"** — opens mapping template create form pre-filled:
     - `sourceFamily` = review's sourceFamily
     - `matchAll` = auto-generate conditions from suggestedMatchFields using sample payload values
     - `name` = auto-generate from sourceFamily + fingerprint prefix
   - **"Archive"** — calls `POST /ingest/templateReviews/:id/archive` with confirm dialog
5. **Filters:**
   - Status: all | pending | archived (default: pending)

**Workflow flow:**
```
Template Reviews list
  -> user clicks "Create Template"
  -> navigate to ingest/mappingTemplates with pre-filled data (query params or store)
  -> user completes template (add field mappings, delivery targets, etc.)
  -> saves template
  -> future events with same fingerprint auto-match
  -> user archives the review
```

---

### PR-FE-V2-5: Mapping Template V2 Enhancement

**Update `src/routes/(app)/ingest/mappingTemplates/+page.svelte`**

Add to template create/edit form:

1. **`sourceFamily`** — Dropdown populated from `listSourceProfiles()`
   - Show displayName, store sourceFamily value
   - Position: at top of form, before name

2. **`finalEventType`** — Text input
   - Hint: "Override canonical event type (optional)"
   - Position: after name

3. **`priority`** — Number input (default 0)
   - Hint: "Higher = evaluated first"
   - Position: after finalEventType

4. **`matchAll` (AND conditions)** — Condition builder section
   - Each condition row: `field` (text) + `operator` (select) + `values` (tag input)
   - Operators: eq, in, contains, prefix
   - "Add Condition" button
   - Visual indicator: "All must match (AND)"

5. **`matchAny` (OR conditions)** — Same UI as matchAll
   - Visual indicator: "At least one must match (OR)"

6. **Legacy `match` (V1)** — Keep existing match rule section but mark as "Legacy (V1)"
   - Show collapsed by default for new templates
   - Show expanded for existing templates that use V1 match

**Form layout order:**
```
Source Family (dropdown)    [NEW]
Name (text)                 [existing]
Final Event Type (text)     [NEW]
Priority (number)           [NEW]
--- V2 Match Conditions --- [NEW]
  matchAll (AND builder)
  matchAny (OR builder)
--- Legacy Match (V1) ---   [existing, collapsed]
  match rule fields
--- Field Mappings ---      [existing]
--- Classification Rules --- [existing]
--- Delivery Targets ---    [existing]
--- Message Templates ---   [existing]
--- DLQ Config ---          [existing]
```

---

## 5) V2 Workflow Overview (for FE context)

### Old flow (V1):
```
Event arrives -> device fingerprint check -> approved?
  -> yes: apply template -> Kafka
  -> no:  insert to event_management (pending queue)
       -> admin approves via FE -> device approved cache set
```

### New flow (V2):
```
Event arrives (with sourceFamily in URL)
  -> V2 template matching (matchAll/matchAny by priority)
  -> matched?
    -> deviceManagement enrichment (lat/lng/site/zone)
    -> apply field mappings -> Kafka -> delivery
  -> not matched?
    -> create templateReview (deduplicated by fingerprint)
    -> admin sees in Template Reviews page
    -> admin clicks "Create Template" (pre-fills from review)
    -> future events auto-match
    -> admin archives review
```

**Key FE impact:**
- `ingest/management` (pending events) is still useful for V1 events
- `ingest/templateReviews` is the new V2 equivalent for "unmatched events"
- Mapping templates now drive the V2 matching engine
- Device management replaces inline device normalization

---

## 6) Implementation Order

| Order | PR | Scope | Dependencies |
|---|---|---|---|
| 1 | PR-FE-V2-1 | Types, API lib, i18n, sidebar | None (API ready on BE) |
| 2 | PR-FE-V2-2 | Source Profiles page | PR-FE-V2-1 |
| 3 | PR-FE-V2-3 | Device Management page | PR-FE-V2-1 (+ source profiles dropdown) |
| 4 | PR-FE-V2-4 | Template Reviews page | PR-FE-V2-1 |
| 5 | PR-FE-V2-5 | Mapping Template V2 form | PR-FE-V2-1 (+ source profiles for dropdown) |

PR-FE-V2-2, V2-3, V2-4 can be done in parallel after PR-FE-V2-1.
PR-FE-V2-5 can also start in parallel but the "Create Template from Review" flow in V2-4 depends on V2-5's form.

---

## 7) API Response Shapes (Quick Reference)

### Source Profiles

```json
// GET /ingest/sourceProfiles
{
  "code": "SUCCESS",
  "message": "source profiles fetched successfully",
  "status": true,
  "details": [
    {
      "sourceFamily": "aibox",
      "displayName": "AI Box Camera",
      "multiRef": true,
      "refRules": {
        "primaryRefFields": ["channelId"],
        "secondaryRefFields": ["sourceSerial"],
        "siteFields": ["siteName"]
      },
      "suggestedMatchFields": ["raw.type", "raw.typeValue"],
      "createdAt": "2026-03-08T10:00:00Z",
      "updatedAt": "2026-03-08T10:00:00Z"
    }
  ]
}
```

### Device Management

```json
// GET /ingest/deviceManagement?page=1&perPages=20
{
  "code": "SUCCESS",
  "status": true,
  "details": [
    {
      "deviceMgmtId": "dm_abc123",
      "tenantId": "tenant1",
      "orgId": "org1",
      "sourceFamily": "aibox",
      "entityType": "channel",
      "entityId": "31",
      "deviceId": "CAM-EAST-31",
      "lat": 13.7563,
      "lng": 100.5018,
      "site": "HQ-East",
      "zone": "Parking-A",
      "createdAt": "2026-03-08T10:00:00Z",
      "updatedAt": "2026-03-08T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "perPages": 20, "totalRecords": 5, "totalPages": 1 }
}
```

### Template Reviews

```json
// GET /ingest/templateReviews?page=1&perPages=10
{
  "code": "SUCCESS",
  "status": true,
  "details": [
    {
      "reviewId": "rev_abc123",
      "tenantId": "tenant1",
      "orgId": "org1",
      "sourceFamily": "aibox",
      "fingerprint": "a1b2c3d4e5f6...",
      "samplePayload": { "type": "intrusion", "channel": "31", "confidence": 0.95 },
      "suggestedMatchFields": ["raw.type", "raw.typeValue"],
      "status": "pending",
      "createdAt": "2026-03-08T10:00:00Z",
      "updatedAt": "2026-03-08T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "perPages": 10, "totalRecords": 42, "totalPages": 5 }
}
```

### Create/Update Requests

```json
// POST /ingest/sourceProfiles
{ "sourceFamily": "aibox", "displayName": "AI Box Camera", "multiRef": true,
  "refRules": { "primaryRefFields": ["channelId"] },
  "suggestedMatchFields": ["raw.type"] }

// PATCH /ingest/sourceProfiles/:sourceFamily
{ "displayName": "AI Box v2", "suggestedMatchFields": ["raw.type", "raw.channel"] }

// POST /ingest/deviceManagement
{ "sourceFamily": "aibox", "entityType": "channel", "entityId": "31",
  "deviceId": "CAM-31", "lat": 13.75, "lng": 100.50, "site": "HQ", "zone": "A" }

// PATCH /ingest/deviceManagement/:id
{ "deviceId": "CAM-31-NEW", "lat": 13.76 }

// POST /ingest/templateReviews/:id/archive  (no body)

// POST /ingest/mappingTemplates (V2 template)
{ "name": "AIBox Intrusion", "sourceFamily": "aibox", "finalEventType": "intrusion",
  "priority": 10,
  "matchAll": [{ "field": "raw.type", "operator": "eq", "values": ["intrusion"] }],
  "matchAny": [],
  "mappings": [...], "deliveryTargets": [...], "dlq": { "enabled": true, "maxRetries": 3, "retryTimeoutSeconds": 60 } }
```

---

## 8) Acceptance Criteria

### PR-FE-V2-1
- [ ] New types compile without errors (`bun run check`)
- [ ] API functions callable from browser (BFF proxy passes through)
- [ ] i18n keys render in both EN and TH
- [ ] Sidebar shows 3 new items under Events

### PR-FE-V2-2 (Source Profiles)
- [ ] List source profiles with table
- [ ] Create source profile with validation (sourceFamily + displayName required)
- [ ] Edit source profile (sourceFamily readonly)
- [ ] Tag input works for refRules fields and suggestedMatchFields

### PR-FE-V2-3 (Device Management)
- [ ] List with pagination
- [ ] Create with source family dropdown (from source profiles)
- [ ] Edit with restricted updatable fields
- [ ] Lat/Lng display (map picker optional)

### PR-FE-V2-4 (Template Reviews)
- [ ] List with pagination, default filter: status=pending
- [ ] Detail view with JSON viewer for samplePayload
- [ ] "Create Template" navigates to mapping template form with pre-filled data
- [ ] "Archive" with confirmation dialog
- [ ] Archived reviews shown as read-only

### PR-FE-V2-5 (Mapping Template V2)
- [ ] Source family dropdown at top of form
- [ ] finalEventType and priority inputs
- [ ] matchAll / matchAny condition builder (add/remove conditions)
- [ ] Operators: eq, in, contains, prefix
- [ ] Legacy match section collapsed by default for new templates
- [ ] Existing V1 templates still editable (backwards compatible)
