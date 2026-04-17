# Plan: AI Mapping Suggestion — Frontend

**Date:** 2026-04-14
**Scope:** `gateway-portal` (SvelteKit 5 + Bootstrap 5 + Paraglide i18n)
**Depends on:** `gateway-api` — routes `/ingest/ai-config`, `/ingest/mappingTemplates/ai-suggest`, `/ingest/config-drafts/*` (all implemented)

---

## 1. Feature Summary

| Feature | คำอธิบาย |
|---|---|
| **AI Config** | ตั้งค่า provider (Gemini/OpenAI/Claude), API key (encrypted), test connection |
| **AI Suggest** | ปุ่มบน Templates page → AI generate fieldMappings + matchRules + valueCodes → review + apply |
| **Prompt to Draft (Feature B)** | พิมพ์ natural language → AI สร้าง draft config → Refine / Dry Run / Save เป็น template |

---

## 2. Backend API Reference

```
GET    /api/ingest/ai-config                  → WorkspaceAIConfig (ไม่ return key)
PUT    /api/ingest/ai-config                  body: { provider, model, apiKey?, enabled }
DELETE /api/ingest/ai-config/key             → clear encrypted key (กลับ free tier)
POST   /api/ingest/ai-config/validate        → test connection

POST   /api/ingest/mappingTemplates/ai-suggest  body: { sourceFamily, samplePayload?, templateId? }
                                             → AISuggestResult

POST   /api/ingest/config-drafts/from-prompt body: { prompt }           → ConfigDraft (201)
POST   /api/ingest/config-drafts/:id/refine  body: { instruction }      → ConfigDraft
POST   /api/ingest/config-drafts/:id/dry-run body: { samplePayload? }   → DryRunResult
POST   /api/ingest/config-drafts/:id/save    body: { name?, enabled? }  → MappingTemplate
```

---

## 3. TypeScript Types ที่ต้องสร้าง

**File:** `src/lib/types/aiMapping.ts`

```typescript
export interface WorkspaceAIConfig {
  workspaceId: string
  enabled: boolean
  provider: string         // 'gemini' | 'openai' | 'claude'
  model: string
  providerMode: string     // 'freeSharedProvider' | 'userKey'
  hasKey: boolean          // true ถ้ามี encrypted key — key ไม่ถูก return
  updatedAt?: string
}

export interface AISuggestResult {
  mode: string             // 'aiAssisted' | 'systemOnly' | 'aiFailedFallback'
  suggestedEventType: string
  fieldMappings: SuggestFieldMapping[]
  matchRules: SuggestMatchRule[]
  aiProvider?: string
  aiModel?: string
  fallbackReason?: string  // กรณี mode = aiFailedFallback
}

export interface SuggestFieldMapping {
  sourcePath: string
  targetPath: string
  valueCodes?: Record<string, string>
  origin: string           // 'system' | 'ai' | 'merged'
}

export interface SuggestMatchRule {
  field: string
  operator: string
  value: string
  origin: string
}

export interface ConfigDraft {
  draftId: string
  workspaceId: string
  version: number
  status: string           // 'draft' | 'dryRanOk' | 'dryRanFail' | 'saved'
  prompt: string
  fieldMappings: SuggestFieldMapping[]
  matchRules: SuggestMatchRule[]
  suggestedEventType?: string
  dryRunResult?: DryRunResult
  createdAt: string
  updatedAt: string
}

export interface DryRunResult {
  ok: boolean
  normalizedSample?: Record<string, unknown>
  issues?: string[]
}
```

---

## 4. API Functions ที่ต้องสร้าง

**File:** `src/lib/api/aiMapping.ts`

```typescript
// AI Config
getAIConfig(orgId)                    → WorkspaceAIConfig | null
upsertAIConfig(orgId, body)           → WorkspaceAIConfig
clearAIApiKey(orgId)                  → void
validateAIConfig(orgId)               → { ok: boolean; latencyMs?: number; error?: string }

// AI Suggest
aiSuggest(orgId, body)                → AISuggestResult

// Config Drafts
createDraftFromPrompt(orgId, body)    → ConfigDraft
refineDraft(orgId, draftId, body)     → ConfigDraft
dryRunDraft(orgId, draftId, body)     → ConfigDraft   (with dryRunResult populated)
saveDraft(orgId, draftId, body)       → MappingTemplate
```

---

## 5. Pages & Routes

```
(app)/
  ingest/
    aiConfig/
      +page.svelte         ← NEW: AI provider settings
    templates/
      +page.svelte         ← MODIFY: เพิ่ม AI Suggest button + modal
                                      เพิ่ม "Create from Prompt" button + modal
```

---

## 6. Menu Update

เพิ่ม **AI Settings** ใน Configuration group:

**File:** `src/lib/stores/appSidebarMenus.ts`
```typescript
// Configuration children:
{ id: 'aiConfig', url: 'ingest/aiConfig', textKey: 'navAiConfig' }
```

---

## 7. i18n Keys ที่ต้องเพิ่ม

**Files:** `i18n/en/nav.json`, `i18n/th/nav.json`
ต้อง merge → `messages/en.json` → paraglide compile ทุกครั้งที่เพิ่มkey

| Key | EN | TH |
|---|---|---|
| `navAiConfig` | AI Settings | การตั้งค่า AI |
| `aiConfigTitle` | AI Configuration | การตั้งค่า AI |
| `aiConfigSubtitle` | Configure AI provider for mapping assistance | ตั้งค่า AI provider สำหรับช่วย mapping |
| `aiConfigProvider` | Provider | ผู้ให้บริการ |
| `aiConfigModel` | Model | โมเดล |
| `aiConfigApiKey` | API Key | API Key |
| `aiConfigApiKeyHint` | Leave blank to use free shared tier (Gemini). Key is encrypted at rest. | เว้นว่างเพื่อใช้ Gemini free tier. Key ถูกเข้ารหัสก่อนเก็บ |
| `aiConfigApiKeySet` | Key configured | ตั้งค่า Key แล้ว |
| `aiConfigApiKeyNotSet` | Not set (free tier) | ไม่ได้ตั้งค่า (free tier) |
| `aiConfigClearKey` | Remove Key | ลบ Key |
| `aiConfigValidate` | Test Connection | ทดสอบการเชื่อมต่อ |
| `aiConfigValidating` | Testing... | กำลังทดสอบ... |
| `aiConfigValidateOk` | Connection successful | เชื่อมต่อสำเร็จ |
| `aiConfigValidateFail` | Connection failed | เชื่อมต่อล้มเหลว |
| `aiConfigEnabled` | Enable AI Features | เปิดใช้งาน AI |
| `aiConfigModeFree` | Free Shared Tier | Free Tier |
| `aiConfigModeUserKey` | Your API Key | API Key ของคุณ |
| `aiConfigSaved` | AI configuration saved | บันทึกการตั้งค่า AI แล้ว |
| `aiSuggestBtn` | AI Suggest | AI แนะนำ |
| `aiSuggestTitle` | AI Mapping Suggestion | AI แนะนำ Mapping |
| `aiSuggestLoading` | Generating suggestions... | กำลังสร้างคำแนะนำ... |
| `aiSuggestApply` | Apply to Template | นำไปใช้กับ Template |
| `aiSuggestDiscard` | Discard | ยกเลิก |
| `aiSuggestModeAi` | AI Assisted | AI ช่วย |
| `aiSuggestModeSystem` | System Only | ระบบเท่านั้น |
| `aiSuggestModeFallback` | AI Failed — System Fallback | AI ล้มเหลว — ใช้ระบบแทน |
| `aiSuggestFieldMappings` | Field Mappings | Field Mappings |
| `aiSuggestMatchRules` | Match Rules | Match Rules |
| `aiSuggestEventType` | Suggested Event Type | ประเภท Event ที่แนะนำ |
| `aiSuggestOriginSystem` | System | ระบบ |
| `aiSuggestOriginAi` | AI | AI |
| `aiSuggestOriginMerged` | Merged | Merged |
| `aiSuggestNoMappings` | No field mappings generated | ไม่มี field mappings |
| `aiSuggestSelectTemplate` | Select template to apply to | เลือก template ที่จะนำไปใช้ |
| `aiSuggestSourceFamily` | Source Family | Source Family |
| `aiSuggestSamplePayload` | Sample Payload (optional) | Sample Payload (ไม่บังคับ) |
| `aiPromptBtn` | Create from Prompt | สร้างจาก Prompt |
| `aiPromptTitle` | Create Config from Prompt | สร้าง Config จาก Prompt |
| `aiPromptLabel` | Describe what you want to configure | อธิบายสิ่งที่ต้องการตั้งค่า |
| `aiPromptPlaceholder` | e.g. "If AIBOX detects a blacklist person, send webhook to..." | เช่น "ถ้า AIBOX เจอ blacklist ให้ส่ง webhook ไปที่..." |
| `aiPromptGenerate` | Generate Draft | สร้าง Draft |
| `aiPromptGenerating` | Generating... | กำลังสร้าง... |
| `aiPromptRefine` | Refine | ปรับปรุง |
| `aiPromptRefineLabel` | Refinement instruction | คำสั่งปรับปรุง |
| `aiPromptRefinePlaceholder` | e.g. "Also send LINE notification" | เช่น "เพิ่ม LINE notification ด้วย" |
| `aiPromptDryRun` | Dry Run | Dry Run |
| `aiPromptDryRunning` | Running... | กำลังรัน... |
| `aiPromptSave` | Save as Template | บันทึกเป็น Template |
| `aiPromptSaving` | Saving... | กำลังบันทึก... |
| `aiPromptResult` | Generated Draft | Draft ที่สร้าง |
| `aiPromptDryRunOk` | Dry run passed | Dry run ผ่าน |
| `aiPromptDryRunFail` | Dry run found issues | Dry run พบปัญหา |
| `aiPromptSavedAs` | Saved as template | บันทึกเป็น template แล้ว |
| `aiPromptVersion` | Version | เวอร์ชัน |
| `aiPromptStatus` | Status | สถานะ |

---

## 8. AI Config Page — Layout

**Route:** `src/routes/(app)/ingest/aiConfig/+page.svelte`

```
[Page Header]
  title: AI Configuration
  subtitle: Configure AI provider for mapping assistance

[Card: Provider Settings]
  Toggle: Enable AI Features
  Select: Provider  [gemini | openai | claude]
  Select: Model     (options ขึ้นกับ provider)
  Input:  API Key   (type="password", placeholder)
  Hint:   Key is encrypted at rest. Leave blank to use free shared tier.
  Badge:  Current mode (Free Tier / Your API Key)

  [Footer]
    [Remove Key] (แสดงเฉพาะ hasKey=true)  [Test Connection]  [Save]

[Alert: success / error (auto-dismiss)]
```

**Provider → Model mapping (client-side):**
```typescript
const MODELS: Record<string, string[]> = {
  gemini: ['gemini-2.0-flash-lite', 'gemini-1.5-pro'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
  claude: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']
}
```

---

## 9. AI Suggest Modal — บน Templates page

**Trigger:** ปุ่ม `<i class="bi bi-stars me-1"></i> AI Suggest` ข้างปุ่ม New Template

**Modal Flow:**

```
Step 1: Input
  Select: Source Family   (dropdown ดึงจาก sourceProfiles ที่โหลดอยู่แล้ว)
  Textarea: Sample Payload (optional, JSON)
  [Cancel]  [Generate]  ← เรียก POST /ingest/mappingTemplates/ai-suggest

Step 2: Result (replace modal body)
  Badge: mode (AI Assisted / System Only / AI Failed–Fallback)
  [ถ้า fallback: Alert warning + fallbackReason]

  Section: Suggested Event Type
    → plain text label

  Section: Match Rules (N items)
    → table: field | operator | value | origin badge

  Section: Field Mappings (N items)
    → table: sourcePath | targetPath | valueCodes count | origin badge

  [Discard]  [Apply to New Template]
    → Apply: pre-fill template form กับ suggestResult
              (formMappings, formMatchAll, formSourceFamily, formName)
              แล้ว openCreate() ใน template form
```

---

## 10. Prompt to Draft Modal — บน Templates page

**Trigger:** ปุ่ม `<i class="bi bi-magic me-1"></i> From Prompt`

**Modal Flow (multi-step):**

```
Step 1: Prompt input
  Textarea: "Describe what you want to configure"
  [Cancel]  [Generate Draft]

Step 2: Draft Review
  Info: Version N | Status badge
  
  Tabs: [Field Mappings] [Match Rules] [Event Type]
    → แสดง draft content แบบ read-only table

  Actions (horizontal row):
    [Refine...]  [Dry Run]  [Save as Template]

  Refine sub-step (inline form ใต้ tabs):
    Input: "Refinement instruction"
    [Apply Refine]  → เรียก /refine → reload draft

  Dry Run result (ถ้ากด Dry Run):
    Badge: Passed / Failed
    Pre: normalizedSample JSON (collapsible)
    List: issues (ถ้า failed)

Step 3: After Save
  Alert: "Saved as template: <name>"
  [Close]  [Go to Templates]
```

---

## 11. ลำดับการ Implement

```
Step 1  Types & API layer
        src/lib/types/aiMapping.ts
        src/lib/api/aiMapping.ts

Step 2  i18n keys
        i18n/en/nav.json  ← เพิ่ม keys
        i18n/th/nav.json  ← เพิ่ม keys (ภาษาไทย)
        bun run i18n:merge
        npx paraglide compile

Step 3  AI Config page
        src/routes/(app)/ingest/aiConfig/+page.svelte

Step 4  เพิ่ม aiConfig ใน sidebar menu
        src/lib/stores/appSidebarMenus.ts

Step 5  AI Suggest modal (ใน templates/+page.svelte)
        เพิ่ม state + modal HTML

Step 6  Prompt to Draft modal (ใน templates/+page.svelte)
        เพิ่ม state + modal HTML

Step 7  svelte-check → bun run i18n:merge + paraglide compile → 0 errors
```

---

## 12. UX Notes

- **AI Suggest apply flow**: เมื่อ apply → ปิด AI modal → เปิด template form ทันที โดย pre-fill ค่าจาก suggestion → user ยัง review + adjust ได้ก่อน save
- **Prompt Draft**: ไม่ navigate ออกจาก templates page — ทุกอย่างเป็น modal
- **Mode badge colors**:
  - `aiAssisted` → `bg-success`
  - `systemOnly` → `bg-secondary`
  - `aiFailedFallback` → `bg-warning text-dark`
- **Origin badge colors**:
  - `system` → `bg-secondary`
  - `ai` → `bg-theme`
  - `merged` → `bg-info text-dark`
- **Free tier mode**: แสดง badge `Free Tier` สีฟ้าอ่อน ใน AI Config และใน Suggest result
- **hasKey=true**: field API Key แสดง placeholder "••••••••" + ปุ่ม Remove Key
- **Long JSON payload**: textarea + pre block ใช้ `font-monospace small` + max-height + overflow-y-auto
