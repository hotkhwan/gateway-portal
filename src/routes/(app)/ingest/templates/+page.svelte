<!-- src/routes/(app)/ingest/templates/+page.svelte -->
<script lang="ts">
  import { resolve } from '$app/paths'
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId, activeWorkspace } from '$lib/stores/activeWorkspace'
  import {
    listTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    listSourceProfiles
  } from '$lib/api/ingest'
  import { listTargets } from '$lib/api/target'
  import { aiSuggest, createDraftFromPrompt, refineDraft, dryRunDraft, saveDraft } from '$lib/api/aiMapping'
  import type { MappingTemplate, MatchCondition, FieldMapping, TemplateDeliveryTarget, MessageTemplate } from '$lib/api/ingest'
  import type { SourceProfile } from '$lib/types/ingest'
  import type { DeliveryTarget } from '$lib/types/org'
  import type { AISuggestResult, ConfigDraft, DryRunResult } from '$lib/types/aiMapping'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let templates = $state<MappingTemplate[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })
  let sourceProfiles = $state<SourceProfile[]>([])

  // Filters
  let filterSearch = $state('')
  let filterSourceFamily = $state('')
  let filterEnabled = $state('')

  // Form modal
  let showFormModal = $state(false)
  let formMode = $state<'create' | 'edit'>('create')
  let formLoading = $state(false)
  let formError = $state<string | null>(null)
  let formTab = $state<'basic' | 'match' | 'mapping' | 'target'>('basic')
  let editingId = $state<string | null>(null)

  // Basic tab
  let formName = $state('')
  let formSourceFamily = $state('')
  let formFinalEventType = $state('')
  let formPriority = $state<number | ''>('')
  let formEnabled = $state(true)

  // Match tab
  let formMatchAll = $state<MatchCondition[]>([])
  let formMatchAny = $state<MatchCondition[]>([])

  // Field mapping tab
  let formMappings = $state<FieldMapping[]>([])

  // Target tab — delivery targets with message templates
  let availableTargets = $state<DeliveryTarget[]>([])
  let formDeliveryTargets = $state<TemplateDeliveryTarget[]>([])
  let formMessageTemplates = $state<MessageTemplate[]>([])

  // Delete confirm
  let showDeleteModal = $state(false)
  let deleteId = $state<string | null>(null)
  let deleteLoading = $state(false)

  // ── AI Suggest modal ──
  let showAISuggestModal = $state(false)
  let aiSuggestStep = $state<'input' | 'result'>('input')
  let aiSuggestLoading = $state(false)
  let aiSuggestError = $state<string | null>(null)
  let aiSuggestSourceFamily = $state('')
  let aiSuggestPayload = $state('')
  let aiSuggestResult = $state<AISuggestResult | null>(null)

  // ── Prompt chat modal ──
  type ChatMsg = { role: 'user' | 'ai'; content: string; options?: { label: string; value: string }[] }
  let showPromptModal = $state(false)
  let chatMsgs = $state<ChatMsg[]>([])
  let chatInput = $state('')
  let chatWaiting = $state(false)
  let chatPendingField = $state<string | null>(null)
  let promptDraft = $state<ConfigDraft | null>(null)
  let promptError = $state<string | null>(null)
  let promptSaveLoading = $state(false)
  let promptSaved = $state(false)

  const OPERATORS = ['eq', 'in', 'contains', 'prefix'] as const
  const MESSAGING_TYPES = new Set(['line', 'telegram', 'discord'])

  // Canonical fields exposed by backend buildMatchBag — match against these
  // ตรงกับสิ่งที่ user เห็นใน UI (เช่น Device ID 51) แทนที่จะอ้างอิง raw field name (channelId)
  const CANONICAL_FIELDS: Array<{ value: string; sample: string }> = [
    { value: 'source.deviceId',     sample: '"51"' },
    { value: 'source.deviceType',   sample: '"channel" | "camera" | "device"' },
    { value: 'source.deviceMgmtId', sample: '"eaf2f1da-..."' },
    { value: 'source.sn',           sample: '"6016600d431d6040"' },
    { value: 'source.sourceFamily', sample: '"AIBOX"' },
    { value: 'source.zone',         sample: '"PHK"' },
    { value: 'source.site',         sample: '"BANGKOK"' },
    { value: 'source.name',         sample: '"หน้าบ้าน"' }
  ]

  // ตรวจว่า field path เป็น canonical (source.*) หรือ raw payload
  function isCanonicalField(field: string): boolean {
    return field.trim().startsWith('source.')
  }

  // Derived: sourcePaths from formMappings for match condition field selector
  let mappingSourcePaths = $derived(
    formMappings.map(m => m.sourcePath).filter(Boolean)
  )

  // Suggested message template fields based on mappings
  const SUGGESTED_MSG_FIELDS = ['sourceFamily', 'deviceName', 'lat', 'lng', 'eventType', 'imageUrl']

  function onMatchAllValueInput(e: Event, i: number) {
    formMatchAll = formMatchAll.map((c, idx) => idx === i ? updateConditionValues(c, (e.target as HTMLInputElement).value) : c)
  }
  function onMatchAnyValueInput(e: Event, i: number) {
    formMatchAny = formMatchAny.map((c, idx) => idx === i ? updateConditionValues(c, (e.target as HTMLInputElement).value) : c)
  }

  async function load(page = 1) {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listTemplates(orgId, page, perPage, {
        search: filterSearch || undefined,
        sourceFamily: filterSourceFamily || undefined,
        enabled: filterEnabled !== '' ? filterEnabled === 'true' : undefined
      })
      templates = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function setTab(key: string) { formTab = key as typeof formTab }

  function resetForm() {
    formName = ''
    formSourceFamily = ''
    formFinalEventType = ''
    formPriority = ''
    formEnabled = true
    formMatchAll = []
    formMatchAny = []
    formMappings = []
    formDeliveryTargets = []
    formMessageTemplates = []
    formError = null
    formTab = 'basic'
    editingId = null
  }

  async function loadFormDeps() {
    const orgId = $activeWorkspaceId
    if (!orgId) return
    try { sourceProfiles = await listSourceProfiles(orgId) } catch { sourceProfiles = [] }
    try { availableTargets = await listTargets(orgId) } catch { availableTargets = [] }
  }

  async function openCreate() {
    resetForm()
    formMode = 'create'
    showFormModal = true
    await loadFormDeps()
  }

  async function openEdit(template: MappingTemplate) {
    resetForm()
    formMode = 'edit'
    editingId = template.templateId
    formName = template.name
    formSourceFamily = template.sourceFamily ?? ''
    formFinalEventType = template.finalEventType ?? ''
    formPriority = template.priority ?? ''
    formEnabled = template.enabled ?? true
    formMatchAll = (template.matchAll ?? []).map(c => ({ ...c, values: [...c.values] }))
    formMatchAny = (template.matchAny ?? []).map(c => ({ ...c, values: [...c.values] }))
    formMappings = (template.mappings ?? []).map(m => ({ ...m }))
    formDeliveryTargets = (template.deliveryTargets ?? []).map(t => ({ ...t }))
    formMessageTemplates = (template.messageTemplates ?? []).map(mt => ({ ...mt }))
    showFormModal = true
    await loadFormDeps()
  }

  async function handleSubmit() {
    if (!formName.trim()) { formError = m.ingestTemplateNameRequired(); return }
    const orgId = $activeWorkspaceId
    if (!orgId) return

    // กรองเงื่อนไขที่ field ว่าง หรือ values ว่างทั้งหมด — ป้องกัน junk เข้า DB
    const cleanMatchAll = formMatchAll.filter(c => c.field.trim() && c.values.some(v => v.trim()))
    const cleanMatchAny = formMatchAny.filter(c => c.field.trim() && c.values.some(v => v.trim()))
    const droppedAll = formMatchAll.length - cleanMatchAll.length
    const droppedAny = formMatchAny.length - cleanMatchAny.length

    // เตือน user ถ้ามีเงื่อนไขที่ถูกตัดออก (กัน save พลาด)
    if (droppedAll > 0 || droppedAny > 0) {
      const ok = confirm(m.ingestTemplateMatchEmptyConfirm({
        count: String(droppedAll + droppedAny)
      }))
      if (!ok) return
    }

    // matchAll/matchAny: ส่งเป็น "replace pattern" เสมอ — สิ่งที่ user เห็นในฟอร์ม = สิ่งที่จะถูกบันทึก
    // (ลบเงื่อนไขทิ้งหมดแล้วบันทึก = ส่ง [] = backend จะล้างเงื่อนไข)
    // finalEventType / priority: ส่งเฉพาะตอนมีค่า เพื่อไม่ทับค่าเดิม (semantics nil = คงเดิม)
    const payload = {
      name: formName.trim(),
      enabled: formEnabled,
      sourceFamily: formSourceFamily || undefined,
      finalEventType: formFinalEventType.trim() || undefined,
      priority: typeof formPriority === 'number' ? formPriority : undefined,
      matchAll: cleanMatchAll,
      matchAny: cleanMatchAny,
      mappings: formMappings,
      deliveryTargets: formDeliveryTargets.length ? formDeliveryTargets : undefined,
      messageTemplates: formMessageTemplates.length ? formMessageTemplates : undefined
    }

    formLoading = true
    formError = null
    try {
      if (formMode === 'create') {
        const created = await createTemplate(orgId, payload)
        templates = [created, ...templates]
      } else if (editingId) {
        await updateTemplate(orgId, editingId, payload)
        templates = templates.map(t => t.templateId === editingId ? { ...t, ...payload } : t)
      }
      showFormModal = false
    } catch (e: unknown) {
      formError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      formLoading = false
    }
  }

  function openDelete(templateId: string) {
    deleteId = templateId
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeWorkspaceId
    if (!orgId || !deleteId) return
    deleteLoading = true
    try {
      await deleteTemplate(orgId, deleteId)
      templates = templates.filter(t => t.templateId !== deleteId)
      showDeleteModal = false
      deleteId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  // Match condition helpers
  function addCondition(list: MatchCondition[]): MatchCondition[] {
    return [...list, { field: '', operator: 'eq', values: [''] }]
  }
  function removeCondition(list: MatchCondition[], i: number): MatchCondition[] {
    return list.filter((_, idx) => idx !== i)
  }
  function updateConditionValues(c: MatchCondition, raw: string): MatchCondition {
    const values = raw.split(',').map(v => v.trim()).filter(Boolean)
    const operator = values.length > 1 ? 'in' : 'eq'
    return { ...c, values, operator }
  }

  const OPERATOR_LABELS: Record<string, string> = {
    eq: 'equals',
    in: 'is one of',
    contains: 'contains',
    prefix: 'starts with'
  }

  function conditionText(c: MatchCondition): string {
    if (!c.field) return ''
    const op = OPERATOR_LABELS[c.operator] ?? c.operator
    const val = c.values.length === 0 ? '?' : c.values.length === 1 ? `"${c.values[0]}"` : `[${c.values.map(v => `"${v}"`).join(', ')}]`
    return `${c.field} ${op} ${val}`
  }

  let rulePreview = $derived(
    (() => {
      const all = formMatchAll.filter(c => c.field).map(conditionText)
      const any = formMatchAny.filter(c => c.field).map(conditionText)
      if (!all.length && !any.length) return ''
      const parts: string[] = []
      if (all.length) parts.push(all.join(' AND '))
      if (any.length) parts.push(`(${any.join(' OR ')})`)
      return parts.join(' AND ')
    })()
  )

  // Field mapping helpers
  function addMapping(): void {
    formMappings = [...formMappings, { sourcePath: '', targetPath: '', required: false }]
  }
  function removeMapping(i: number): void {
    formMappings = formMappings.filter((_, idx) => idx !== i)
  }

  // Delivery target helpers
  function addDeliveryTarget(): void {
    formDeliveryTargets = [...formDeliveryTargets, { targetId: '' }]
  }
  function removeDeliveryTarget(i: number): void {
    const removed = formDeliveryTargets[i]
    formDeliveryTargets = formDeliveryTargets.filter((_, idx) => idx !== i)
    // Also remove associated message templates
    if (removed?.targetId) {
      formMessageTemplates = formMessageTemplates.filter(mt => mt.key !== removed.targetId)
    }
  }
  function getTargetById(id: string): DeliveryTarget | undefined {
    return availableTargets.find(t => t.id === id)
  }
  function isMessagingTarget(targetId: string): boolean {
    const t = getTargetById(targetId)
    return t ? MESSAGING_TYPES.has(t.type) : false
  }
  function onTargetSelect(index: number, targetId: string): void {
    formDeliveryTargets = formDeliveryTargets.map((dt, i) =>
      i === index ? { ...dt, targetId } : dt
    )
    // Auto-add suggested message template for messaging targets
    if (targetId && isMessagingTarget(targetId)) {
      const existing = formMessageTemplates.find(mt => mt.key === targetId)
      if (!existing) {
        const target = getTargetById(targetId)
        const channelType = target?.type ?? 'line'
        const bodyLines = SUGGESTED_MSG_FIELDS
          .filter(f => mappingSourcePaths.includes(f) || ['eventType', 'sourceFamily'].includes(f))
          .map(f => `{{.${f}}}`)
        formMessageTemplates = [...formMessageTemplates, {
          key: targetId,
          channelType,
          locale: 'th',
          title: `{{.eventCategory}}`,
          body: bodyLines.join('\n') || '{{.eventType}}',
          extras: channelType === 'line' ? { ...LINE_CARD_DEFAULTS } : undefined
        }]
      }
    }
  }

  // Message template helpers
  function addMessageTemplate(): void {
    formMessageTemplates = [...formMessageTemplates, {
      channelType: 'line', locale: 'th', title: '', body: '',
      extras: { ...LINE_CARD_DEFAULTS }
    }]
  }
  function removeMessageTemplate(i: number): void {
    formMessageTemplates = formMessageTemplates.filter((_, idx) => idx !== i)
  }

  // ── LINE card extras helpers ──
  function getE(mt: MessageTemplate, key: string, def = ''): string {
    return mt.extras?.[key] ?? def
  }
  function setE(mt: MessageTemplate, key: string, value: string): MessageTemplate {
    return { ...mt, extras: { ...(mt.extras ?? {}), [key]: value } }
  }
  function updateMsgTemplate(i: number, updater: (mt: MessageTemplate) => MessageTemplate): void {
    formMessageTemplates = formMessageTemplates.map((mt, idx) => idx === i ? updater(mt) : mt)
  }
  const LINE_CARD_DEFAULTS: Record<string, string> = {
    imageType: 'fullframe',
    tagEnabled: 'true',
    tagText: '{{.source.deviceId}}',
    tagColor: 'gray',
    addressEnabled: 'true',
    addressText: '{{.geo.adminName}}',
    additionalInfoEnabled: 'true',
    additionalInfoType: 'Hours',
    additionalInfoText: '{{.occurredAt}}',
    action1Enabled: 'false',
    action1Label: '',
    action1Url: '',
    action2Enabled: 'false',
    action2Label: '',
    action2Url: ''
  }

  // Go text/template variables exposed by the backend renderContext().
  // Keep in sync with internal/kafka/deliverycons/render.go :: renderContext.
  const TEMPLATE_VARIABLES: Array<{ value: string; hint: string }> = [
    { value: '{{.eventId}}',             hint: 'event UUID' },
    { value: '{{.tenantId}}',            hint: 'tenant (e.g. klynx)' },
    { value: '{{.eventType}}',           hint: 'e.g. pedestrian.detected' },
    { value: '{{.eventCategory}}',       hint: 'e.g. pedestrian' },
    { value: '{{.eventAction}}',         hint: 'e.g. detected' },
    { value: '{{.eventClass}}',          hint: 'canonical eventClass' },
    { value: '{{.eventSeverity}}',       hint: 'canonical eventSeverity' },
    { value: '{{.sourceFamily}}',        hint: 'e.g. AIBOX' },
    { value: '{{.occurredAt}}',          hint: 'RFC3339 timestamp' },
    { value: '{{.source.deviceId}}',     hint: 'device ID (e.g. 51)' },
    { value: '{{.source.deviceType}}',   hint: 'device type / family' },
    { value: '{{.source.subType}}',      hint: 'sub-type' },
    { value: '{{.source.workspaceId}}',  hint: 'workspace UUID' },
    { value: '{{.source.vendor}}',       hint: 'vendor' },
    { value: '{{.location.zone}}',       hint: 'zone (e.g. PHK)' },
    { value: '{{.location.site}}',       hint: 'site name' },
    { value: '{{.location.lat}}',        hint: 'latitude' },
    { value: '{{.location.lng}}',        hint: 'longitude' },
    { value: '{{.geo.adminName}}',       hint: 'province / district name' },
    { value: '{{.geo.adminCode}}',       hint: 'ISO-3166-2 code (e.g. TH-73)' },
    { value: '{{.geo.countryCode}}',     hint: 'ISO alpha-2 country' },
    { value: '{{.payload.alarmType_label}}', hint: 'payload field (labelled enum)' }
  ]

  // Tag color palette — matches backend tagColorPalette in
  // internal/kafka/deliverycons/flex.go
  const TAG_COLORS: Array<{ key: string; bg: string; text: string }> = [
    { key: 'gray',   bg: '#6B7280', text: '#FFFFFF' },
    { key: 'white',  bg: '#FFFFFF', text: '#111827' },
    { key: 'red',    bg: '#EF4444', text: '#FFFFFF' },
    { key: 'orange', bg: '#F97316', text: '#FFFFFF' },
    { key: 'green',  bg: '#10B981', text: '#FFFFFF' },
    { key: 'blue',   bg: '#3B82F6', text: '#FFFFFF' }
  ]
  function tagPaletteFor(key: string): { bg: string; text: string } {
    const c = TAG_COLORS.find(c => c.key === key)
    return c ?? TAG_COLORS[0]
  }

  // ── Variable picker (type-ahead + click-to-open) ──
  // Tracks which input currently shows the suggestion menu. Key format:
  // "{field}-{msgTemplateIndex}" (e.g. "tag-0", "addr-0", "info-0").
  // Only one picker is open at a time; focus/input opens, blur closes (deferred).
  let openVarPicker = $state<string | null>(null)
  let varPickerFilter = $state('')

  // Filter TEMPLATE_VARIABLES by substring match across value + hint.
  // Empty filter shows the full list; this matches native datalist behaviour
  // on an empty input but in a styled dropdown we control.
  const filteredTemplateVars = $derived.by(() => {
    const q = varPickerFilter.trim().toLowerCase()
    if (!q) return TEMPLATE_VARIABLES
    return TEMPLATE_VARIABLES.filter(tv =>
      tv.value.toLowerCase().includes(q) || tv.hint.toLowerCase().includes(q)
    )
  })

  function openPicker(key: string, currentValue: string): void {
    openVarPicker = key
    varPickerFilter = currentValue
  }

  function toggleVarPicker(key: string, currentValue: string): void {
    if (openVarPicker === key) {
      openVarPicker = null
    } else {
      openPicker(key, currentValue)
    }
  }

  // closePickerDeferred waits briefly before closing so that a mousedown on a
  // dropdown item still fires (blur races with click in some browsers).
  function closePickerDeferred(key: string): void {
    setTimeout(() => {
      if (openVarPicker === key) openVarPicker = null
    }, 150)
  }

  // onVarInput updates the extras field and keeps the picker open with the new
  // filter (so suggestions narrow as the user types, like an autocomplete).
  function onVarInput(i: number, extrasKey: string, key: string, value: string): void {
    updateMsgTemplate(i, m => setE(m, extrasKey, value))
    varPickerFilter = value
    openVarPicker = key
  }

  // insertTemplateVar replaces the extras field with the chosen variable and
  // closes the picker. Full-replace is intentional for the quick-pick UX —
  // users can still type manually if they want to compose from multiple vars.
  function insertTemplateVar(i: number, extrasKey: string, variable: string): void {
    updateMsgTemplate(i, m => setE(m, extrasKey, variable))
    varPickerFilter = ''
    openVarPicker = null
  }

  // Title picker helpers — operate on the direct MessageTemplate.title field
  // (not extras). Header and the generic Discord/Telegram title both use this.
  function onTitleInput(i: number, key: string, value: string): void {
    updateMsgTemplate(i, m => ({ ...m, title: value }))
    varPickerFilter = value
    openVarPicker = key
  }
  function insertTitleVar(i: number, variable: string): void {
    updateMsgTemplate(i, m => ({ ...m, title: variable }))
    varPickerFilter = ''
    openVarPicker = null
  }

  function formatDate(d: string): string {
    if (!d) return '-'
    try { return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  // ── AI Suggest handlers ──
  function openAISuggest() {
    aiSuggestStep = 'input'
    aiSuggestSourceFamily = ''
    aiSuggestPayload = ''
    aiSuggestResult = null
    aiSuggestError = null
    showAISuggestModal = true
  }

  async function handleAISuggest() {
    const orgId = $activeWorkspaceId
    if (!orgId || !aiSuggestSourceFamily.trim()) {
      aiSuggestError = 'Source Family is required'
      return
    }
    aiSuggestLoading = true
    aiSuggestError = null
    try {
      aiSuggestResult = await aiSuggest(orgId, {
        sourceFamily: aiSuggestSourceFamily.trim(),
        samplePayload: aiSuggestPayload.trim() || undefined
      })
      aiSuggestStep = 'result'
    } catch (e: unknown) {
      aiSuggestError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      aiSuggestLoading = false
    }
  }

  function applyAISuggest() {
    if (!aiSuggestResult) return
    resetForm()
    formMode = 'create'
    formSourceFamily = aiSuggestSourceFamily
    formMappings = aiSuggestResult.fieldMappings.map(fm => ({
      sourcePath: fm.sourcePath,
      targetPath: fm.targetPath,
      valueCodes: fm.valueCodes,
      required: false
    }))
    formMatchAll = aiSuggestResult.matchRules.map(r => ({
      field: r.field,
      operator: r.operator as typeof OPERATORS[number],
      values: [r.value]
    }))
    if (aiSuggestResult.suggestedEventType) {
      formName = aiSuggestResult.suggestedEventType
    }
    showAISuggestModal = false
    loadFormDeps().then(() => { showFormModal = true })
  }

  function originBadge(origin: string): string {
    const map: Record<string, string> = {
      system: 'bg-secondary',
      ai: 'bg-theme',
      merged: 'bg-info text-dark'
    }
    return map[origin] ?? 'bg-secondary'
  }

  function originLabel(origin: string): string {
    if (origin === 'ai') return m.aiSuggestOriginAi()
    if (origin === 'merged') return m.aiSuggestOriginMerged()
    return m.aiSuggestOriginSystem()
  }

  function suggestModeBadge(mode: string): string {
    if (mode === 'aiAssisted') return 'bg-success'
    if (mode === 'aiFailedFallback') return 'bg-warning text-dark'
    return 'bg-secondary'
  }

  function suggestModeLabel(mode: string): string {
    if (mode === 'aiAssisted') return m.aiSuggestModeAi()
    if (mode === 'aiFailedFallback') return m.aiSuggestModeFallback()
    return m.aiSuggestModeSystem()
  }

  // ── Prompt chat handlers ──
  function initChat() {
    chatMsgs = [{ role: 'ai', content: m.ingestTemplateChatWelcome() }]
    chatInput = ''
    chatWaiting = false
    chatPendingField = null
  }

  function draftToAIMsgs(draft: ConfigDraft): ChatMsg[] {
    const msgs: ChatMsg[] = []
    if (draft.warnings?.length) {
      msgs.push({ role: 'ai', content: `⚠️ ${draft.warnings.join('\n')}` })
    }
    if (draft.matchConditions?.length) {
      const conds = draft.matchConditions.map(c => `${c.field} = "${String(c.value ?? '')}"`).join(', ')
      msgs.push({ role: 'ai', content: m.ingestTemplateChatUnderstand({ conditions: conds }) })
    }
    if (draft.missingFields?.length) {
      const first = draft.missingFields[0]
      chatPendingField = first.field
      let options: ChatMsg['options']
      if (first.field === 'sourceFamily' && sourceProfiles.length > 0) {
        options = sourceProfiles.map(sp => ({ label: sp.displayName ?? sp.sourceFamily, value: sp.sourceFamily }))
      } else if (first.field.toLowerCase().includes('target') && availableTargets.length > 0) {
        options = availableTargets.map(t => ({ label: `${t.name} (${t.type})`, value: t.id }))
      }
      msgs.push({ role: 'ai', content: first.reason || m.ingestTemplateChatNeedInfo({ field: first.field }), options })
    } else if (draft.status === 'ready' || draft.status === 'reviewed') {
      chatPendingField = null
      msgs.push({ role: 'ai', content: m.ingestTemplateChatReady() })
    } else {
      msgs.push({ role: 'ai', content: m.ingestTemplateChatAskMore() })
    }
    return msgs
  }

  async function sendChatMsg(text?: string) {
    const orgId = $activeWorkspaceId
    if (!orgId) return
    const msg = (text ?? chatInput).trim()
    if (!msg || chatWaiting) return
    chatInput = ''
    chatMsgs = [...chatMsgs, { role: 'user', content: msg }]
    chatWaiting = true
    promptError = null
    try {
      if (!promptDraft) {
        promptDraft = await createDraftFromPrompt(orgId, { prompt: msg })
      } else {
        const field = chatPendingField ?? promptDraft.missingFields?.[0]?.field
        if (field) {
          promptDraft = await refineDraft(orgId, promptDraft.draftId, { [field]: msg })
        }
      }
      chatMsgs = [...chatMsgs, ...draftToAIMsgs(promptDraft)]
    } catch (e: unknown) {
      chatMsgs = [...chatMsgs, { role: 'ai', content: m.ingestTemplateChatError({ error: (e as { message?: string })?.message ?? 'Unknown error' }) }]
    } finally {
      chatWaiting = false
    }
  }

  function openPromptModal() {
    promptDraft = null
    promptError = null
    promptSaved = false
    promptSaveLoading = false
    initChat()
    showPromptModal = true
    if (availableTargets.length === 0 || sourceProfiles.length === 0) loadFormDeps()
  }

  async function handleSaveDraft() {
    const orgId = $activeWorkspaceId
    if (!orgId || !promptDraft) return
    promptSaveLoading = true
    promptError = null
    try {
      promptDraft = await saveDraft(orgId, promptDraft.draftId)
      promptSaved = true
    } catch (e: unknown) {
      promptError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      promptSaveLoading = false
    }
  }

  function draftStatusBadge(status: string): string {
    if (status === 'ready') return 'bg-success'
    if (status === 'incomplete') return 'bg-warning text-dark'
    if (status === 'reviewed') return 'bg-info text-dark'
    if (status === 'published' || status === 'deployed') return 'bg-theme'
    return 'bg-secondary'
  }

  function draftStatusLabel(status: string): string {
    if (status === 'ready') return m.aiPromptStatusDryRanOk()
    if (status === 'incomplete') return m.aiPromptStatusDraft()
    if (status === 'reviewed') return 'Reviewed'
    if (status === 'published') return 'Published'
    if (status === 'deployed') return m.aiPromptStatusSaved()
    return status
  }

  $effect(() => {
    const orgId = $activeWorkspaceId
    setPageTitle(m.ingestTemplatesTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestTemplatesTitle()}</h1>
    {#if $activeWorkspace}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeWorkspace.name} &mdash; {m.ingestTemplatesSubtitle()}
      </small>
    {/if}
  </div>
  {#if $activeWorkspaceId}
    <button class="btn btn-sm btn-outline-secondary me-2" onclick={openPromptModal} title={m.aiPromptTitle()}>
      <i class="bi bi-magic me-1"></i>{m.aiPromptBtn()}
    </button>
    <button class="btn btn-sm btn-outline-theme me-2" onclick={openAISuggest} title={m.aiSuggestTitle()}>
      <i class="bi bi-stars me-1"></i>{m.aiSuggestBtn()}
    </button>
    <button class="btn btn-sm btn-theme" onclick={openCreate}>
      <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateCreate()}
    </button>
  {/if}
</div>

{#if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()}
    <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
  </div>
{:else}
  <!-- Filter bar -->
  <Card>
    <CardBody>
      <div class="row g-2 align-items-end">
        <div class="col-md-4">
          <input type="search" class="form-control form-control-sm" placeholder={m.actionSearch()}
            bind:value={filterSearch} onkeydown={(e) => e.key === 'Enter' && load(1)} />
        </div>
        <div class="col-md-3">
          <select class="form-select form-select-sm" bind:value={filterSourceFamily} onchange={() => load(1)}>
            <option value="">— {m.ingestTemplateSourceFamily()} —</option>
            {#each sourceProfiles as sp}
              <option value={sp.sourceFamily}>{sp.displayName} ({sp.sourceFamily})</option>
            {/each}
          </select>
        </div>
        <div class="col-md-2">
          <select class="form-select form-select-sm" bind:value={filterEnabled} onchange={() => load(1)}>
            <option value="">— {m.ingestTemplateEnabled()} —</option>
            <option value="true">{m.ingestTemplateEnableSuccess()}</option>
            <option value="false">{m.ingestTemplateDisableSuccess()}</option>
          </select>
        </div>
        <div class="col-md-3 d-flex gap-1">
          <button class="btn btn-sm btn-theme flex-fill" onclick={() => load(1)}>
            <i class="bi bi-search me-1"></i>{m.actionSearch()}
          </button>
          <button class="btn btn-sm btn-outline-secondary" aria-label={m.actionClear()} onclick={() => { filterSearch = ''; filterSourceFamily = ''; filterEnabled = ''; load(1) }}>
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </CardBody>
  </Card>

  {#if loading}
    <div class="text-center py-5">
      <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
    </div>
  {:else if error}
    <div class="alert alert-danger mt-3">
      <i class="bi bi-exclamation-triangle me-2"></i>{error}
      <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
    </div>
  {:else if templates.length === 0}
    <Card>
      <CardBody>
        <div class="text-center py-5">
          <i class="bi bi-file-earmark-code fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
          <p class="text-inverse text-opacity-50 mb-3">{m.ingestNoTemplates()}</p>
          <button class="btn btn-theme btn-sm" onclick={openCreate}>
            <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateCreate()}
          </button>
        </div>
      </CardBody>
    </Card>
  {:else}
    <div class="table-responsive mt-3">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{m.ingestTemplateName()}</th>
            <th>{m.ingestTemplateSourceFamily()}</th>
            <th>{m.ingestTemplateEnabled()}</th>
            <th>{m.eventsCreatedAt()}</th>
            <th class="text-end">{m.eventsActions()}</th>
          </tr>
        </thead>
        <tbody>
          {#each templates as tpl (tpl.templateId)}
            <tr>
              <td class="fw-semibold">{tpl.name}</td>
              <td>
                {#if tpl.sourceFamily}
                  <span class="badge bg-theme-subtle text-theme">{tpl.sourceFamily}</span>
                {:else}
                  <span class="text-inverse text-opacity-50 small">—</span>
                {/if}
              </td>
              <td>
                {#if tpl.enabled !== false}
                  <span class="badge bg-success">{m.ingestTemplateEnabled()}</span>
                {:else}
                  <span class="badge bg-secondary">{m.ingestTemplateDisableSuccess()}</span>
                {/if}
              </td>
              <td class="small">{formatDate(tpl.createdAt)}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-secondary me-1" onclick={() => openEdit(tpl)} title={m.actionEdit()}>
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick={() => openDelete(tpl.templateId)} title={m.actionDelete()}>
                  <i class="bi bi-trash"></i>
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if pagination.totalPages > 1}
      <div class="d-flex justify-content-between align-items-center mt-3">
        <small class="text-inverse text-opacity-50">
          {m.showing()} {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)} {m.of()} {pagination.total}
        </small>
        <nav>
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" class:disabled={pagination.page === 1}>
              <button class="page-link" onclick={() => load(pagination.page - 1)}>{m.actionPrevPage()}</button>
            </li>
            {#each Array(pagination.totalPages) as _, i}
              <li class="page-item" class:active={i + 1 === pagination.page}>
                <button class="page-link" onclick={() => load(i + 1)}>{i + 1}</button>
              </li>
            {/each}
            <li class="page-item" class:disabled={pagination.page === pagination.totalPages}>
              <button class="page-link" onclick={() => load(pagination.page + 1)}>{m.actionNextPage()}</button>
            </li>
          </ul>
        </nav>
      </div>
    {/if}
  {/if}
{/if}

<!-- Create / Edit Modal -->
{#if showFormModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{formMode === 'create' ? m.ingestTemplateCreate() : m.ingestTemplateEdit()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showFormModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if formError}
            <div class="alert alert-danger small py-2">{formError}</div>
          {/if}

          <!-- Tabs -->
          <ul class="nav nav-tabs mb-3">
            {#each [
              { key: 'basic', label: m.ingestTemplateTabBasic() },
              { key: 'match', label: m.ingestTemplateTabMatchRule() },
              { key: 'target', label: m.ingestTemplateTabTarget() }
            ] as tab}
              <li class="nav-item">
                <button class="nav-link" class:active={formTab === tab.key}
                  onclick={() => setTab(tab.key)}>
                  {tab.label}
                </button>
              </li>
            {/each}
          </ul>

          <!-- Tab: Basic -->
          {#if formTab === 'basic'}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="tplName">{m.ingestTemplateName()} <span class="text-danger">*</span></label>
              <input id="tplName" type="text" class="form-control" bind:value={formName} disabled={formLoading} placeholder="e.g. AIBOX Motion Event" />
            </div>
            {#if formMode === 'edit' && formSourceFamily}
              <div class="mb-3">
                <span class="form-label fw-semibold">{m.ingestTemplateSourceFamily()}</span>
                <div class="form-control bg-inverse bg-opacity-10" style="cursor:default">
                  <span class="badge bg-theme-subtle text-theme">{formSourceFamily}</span>
                </div>
              </div>
            {:else if formMode === 'create'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="tplSourceFamily">{m.ingestTemplateSourceFamily()}</label>
                <select id="tplSourceFamily" class="form-select" bind:value={formSourceFamily} disabled={formLoading}>
                  <option value="">— {m.actionSelect()} —</option>
                  {#each sourceProfiles as sp}
                    <option value={sp.sourceFamily}>{sp.displayName} ({sp.sourceFamily})</option>
                  {/each}
                </select>
                <div class="form-text">{m.ingestTemplateSourceFamilyHint()}</div>
              </div>
            {/if}
            <div class="row g-3 mb-3">
              <div class="col-md-8">
                <label class="form-label fw-semibold" for="tplFinalEventType">
                  {m.ingestTemplateFinalEventType()}
                </label>
                <input
                  id="tplFinalEventType"
                  type="text"
                  class="form-control font-monospace"
                  bind:value={formFinalEventType}
                  disabled={formLoading}
                  placeholder="e.g. motion.detected"
                />
                <div class="form-text">{m.ingestTemplateFinalEventTypeHint()}</div>
              </div>
              <div class="col-md-4">
                <label class="form-label fw-semibold" for="tplPriority">
                  {m.ingestTemplatePriority()}
                </label>
                <input
                  id="tplPriority"
                  type="number"
                  class="form-control"
                  bind:value={formPriority}
                  disabled={formLoading}
                  placeholder="0"
                  min="0"
                />
                <div class="form-text">{m.ingestTemplatePriorityHint()}</div>
              </div>
            </div>
            <div class="form-check form-switch">
              <input id="tplEnabled" type="checkbox" class="form-check-input" bind:checked={formEnabled} disabled={formLoading} />
              <label class="form-check-label" for="tplEnabled">{m.ingestTemplateEnabled()}</label>
            </div>
          {/if}

          <!-- Tab: Match Rule -->
          {#if formTab === 'match'}
            <!-- AI tip -->
            <div class="alert alert-theme border-0 py-2 px-3 mb-2 small d-flex align-items-center gap-2" style="background:var(--bs-theme-rgb, 26 188 156 / 0.08)">
              <i class="bi bi-stars text-theme fs-6"></i>
              <span>{@html m.ingestTemplateAISuggestHint()}</span>
            </div>

            <!-- Field type legend: canonical (source.*) vs raw payload -->
            <div class="alert alert-secondary border-0 py-2 px-3 mb-4 small">
              <div class="d-flex align-items-start gap-2">
                <i class="bi bi-info-circle text-info fs-6 mt-1"></i>
                <div class="flex-grow-1">
                  <div class="fw-semibold mb-1">{m.ingestTemplateMatchFieldGuide()}</div>
                  <div class="d-flex flex-wrap gap-3">
                    <div>
                      <span class="badge bg-info bg-opacity-25 text-info fw-normal me-1">
                        <i class="bi bi-stars me-1"></i>canonical
                      </span>
                      <span class="text-inverse text-opacity-75">{m.ingestTemplateMatchFieldCanonicalHint()}</span>
                    </div>
                    <div>
                      <span class="badge bg-warning bg-opacity-25 text-warning fw-normal me-1">
                        <i class="bi bi-box me-1"></i>raw
                      </span>
                      <span class="text-inverse text-opacity-75">{m.ingestTemplateMatchFieldRawHint()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Match ALL block -->
            <div class="mb-4">
              <div class="d-flex align-items-center mb-2">
                <span class="badge bg-success me-2 px-2 py-1" style="font-size:11px">AND</span>
                <span class="fw-semibold small">{m.ingestTemplateMatchAllLabel()}</span>
                <small class="text-inverse text-opacity-50 ms-2 d-none d-md-inline">{m.ingestTemplateMatchAllHint()}</small>
                <button class="btn btn-xs btn-outline-success ms-auto" onclick={() => (formMatchAll = addCondition(formMatchAll))}>
                  <i class="bi bi-plus me-1"></i>{m.ingestTemplateAddCondition()}
                </button>
              </div>

              {#if formMatchAll.length === 0}
                <div class="border border-dashed rounded px-3 py-3 text-center text-inverse text-opacity-40 small">
                  {@html m.ingestTemplateNoConditionsHint()}
                </div>
              {:else}
                {#each formMatchAll as cond, i}
                  {#if i > 0}
                    <div class="d-flex align-items-center my-1 px-1">
                      <span class="badge bg-success bg-opacity-25 text-success" style="font-size:10px">AND</span>
                    </div>
                  {/if}
                  <div class="d-flex gap-2 align-items-center p-2 rounded mb-1" style="border-left: 3px solid var(--bs-success); background:var(--bs-success-bg-subtle, rgba(25,135,84,0.06))">
                    <div style="min-width:0; flex:2">
                      <input type="text" list="match-fields-list" class="form-control form-control-sm font-monospace"
                        placeholder={m.ingestTemplateConditionFieldPlaceholderMatch()}
                        bind:value={cond.field} disabled={formLoading} />
                    </div>
                    {#if cond.field.trim()}
                      {#if isCanonicalField(cond.field)}
                        <span class="badge bg-info bg-opacity-25 text-info fw-normal" title={m.ingestTemplateMatchFieldCanonicalHint()}>
                          <i class="bi bi-stars me-1"></i>canonical
                        </span>
                      {:else}
                        <span class="badge bg-warning bg-opacity-25 text-warning fw-normal" title={m.ingestTemplateMatchFieldRawHint()}>
                          <i class="bi bi-box me-1"></i>raw
                        </span>
                      {/if}
                    {/if}
                    <span class="text-inverse text-opacity-40 small px-1">=</span>
                    <div style="min-width:0; flex:2">
                      <input type="text" class="form-control form-control-sm"
                        placeholder={m.ingestTemplateConditionValuesPlaceholder()}
                        value={cond.values.join(', ')}
                        oninput={(e) => onMatchAllValueInput(e, i)}
                        disabled={formLoading} />
                    </div>
                    {#if cond.operator !== 'eq' && cond.operator !== 'in'}
                      <span class="badge bg-secondary fw-normal" title="operator: {cond.operator}">{cond.operator}</span>
                    {/if}
                    <button class="btn btn-sm btn-link text-danger p-0 px-1" aria-label={m.actionDelete()} onclick={() => (formMatchAll = removeCondition(formMatchAll, i))}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Match ANY block -->
            <div class="mb-4">
              <div class="d-flex align-items-center mb-2">
                <span class="badge bg-warning text-dark me-2 px-2 py-1" style="font-size:11px">OR</span>
                <span class="fw-semibold small">{m.ingestTemplateMatchAnyLabel()}</span>
                <small class="text-inverse text-opacity-50 ms-2 d-none d-md-inline">{m.ingestTemplateMatchAnyHint()}</small>
                <button class="btn btn-xs btn-outline-warning ms-auto" onclick={() => (formMatchAny = addCondition(formMatchAny))}>
                  <i class="bi bi-plus me-1"></i>{m.ingestTemplateAddCondition()}
                </button>
              </div>

              {#if formMatchAny.length === 0}
                <div class="border border-dashed rounded px-3 py-3 text-center text-inverse text-opacity-40 small">
                  {m.ingestTemplateNoConditionsOptional()}
                </div>
              {:else}
                {#each formMatchAny as cond, i}
                  {#if i > 0}
                    <div class="d-flex align-items-center my-1 px-1">
                      <span class="badge bg-warning bg-opacity-25 text-warning" style="font-size:10px">OR</span>
                    </div>
                  {/if}
                  <div class="d-flex gap-2 align-items-center p-2 rounded mb-1" style="border-left: 3px solid var(--bs-warning); background:var(--bs-warning-bg-subtle, rgba(255,193,7,0.06))">
                    <div style="min-width:0; flex:2">
                      <input type="text" list="match-fields-list" class="form-control form-control-sm font-monospace"
                        placeholder={m.ingestTemplateConditionFieldPlaceholderMatch()}
                        bind:value={cond.field} disabled={formLoading} />
                    </div>
                    {#if cond.field.trim()}
                      {#if isCanonicalField(cond.field)}
                        <span class="badge bg-info bg-opacity-25 text-info fw-normal" title={m.ingestTemplateMatchFieldCanonicalHint()}>
                          <i class="bi bi-stars me-1"></i>canonical
                        </span>
                      {:else}
                        <span class="badge bg-warning bg-opacity-25 text-warning fw-normal" title={m.ingestTemplateMatchFieldRawHint()}>
                          <i class="bi bi-box me-1"></i>raw
                        </span>
                      {/if}
                    {/if}
                    <span class="text-inverse text-opacity-40 small px-1">=</span>
                    <div style="min-width:0; flex:2">
                      <input type="text" class="form-control form-control-sm"
                        placeholder={m.ingestTemplateConditionValuesPlaceholder()}
                        value={cond.values.join(', ')}
                        oninput={(e) => onMatchAnyValueInput(e, i)}
                        disabled={formLoading} />
                    </div>
                    {#if cond.operator !== 'eq' && cond.operator !== 'in'}
                      <span class="badge bg-secondary fw-normal" title="operator: {cond.operator}">{cond.operator}</span>
                    {/if}
                    <button class="btn btn-sm btn-link text-danger p-0 px-1" aria-label={m.actionDelete()} onclick={() => (formMatchAny = removeCondition(formMatchAny, i))}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Autocomplete list for match rule field inputs.
                 Canonical fields (source.*) ขึ้นก่อน — ตรงกับสิ่งที่ user เห็นใน UI
                 Raw payload fields (จาก template mappings) ตามมา — สำหรับ vendor-specific match -->
            <datalist id="match-fields-list">
              {#each CANONICAL_FIELDS as cf}
                <option value={cf.value} label="✨ canonical · sample: {cf.sample}"></option>
              {/each}
              {#each mappingSourcePaths as sp}
                <option value={sp} label="📦 raw payload"></option>
              {/each}
            </datalist>

            <!-- Autocomplete for Go text/template variables used in LINE card fields.
                 Same semantics as match-fields-list: browser shows typeahead suggestions
                 when user focuses an <input list="tmpl-vars-list">. -->
            <datalist id="tmpl-vars-list">
              {#each TEMPLATE_VARIABLES as tv}
                <option value={tv.value} label="✨ {tv.hint}"></option>
              {/each}
            </datalist>

            <!-- Rule preview -->
            {#if rulePreview}
              <div class="border rounded px-3 py-2 small" style="background:var(--bs-tertiary-bg)">
                <span class="text-inverse text-opacity-50 me-2">Preview:</span>
                <code class="text-theme">{rulePreview}</code>
              </div>
            {/if}
          {/if}

          <!-- Tab: Target & Message -->
          {#if formTab === 'target'}
            <!-- Delivery Targets -->
            <div class="mb-4">
              <div class="d-flex align-items-center mb-2">
                <h6 class="mb-0 me-2">{m.ingestTemplateDeliveryTargets()}</h6>
                <small class="text-inverse text-opacity-50">{m.ingestTemplateDeliveryTargetsHint()}</small>
                <button class="btn btn-xs btn-outline-theme ms-auto" onclick={addDeliveryTarget}>
                  <i class="bi bi-plus me-1"></i>{m.ingestTemplateAddDeliveryTarget()}
                </button>
              </div>
              {#if formDeliveryTargets.length === 0}
                <p class="text-inverse text-opacity-50 small">{m.ingestTemplateNoDeliveryTargets()}</p>
              {:else}
                {#each formDeliveryTargets as dt, i}
                  {@const target = getTargetById(dt.targetId)}
                  <div class="row g-2 mb-2 align-items-center">
                    <div class="col-md-6">
                      <select class="form-select form-select-sm" disabled={formLoading}
                        value={dt.targetId}
                        onchange={(e) => onTargetSelect(i, (e.target as HTMLSelectElement).value)}>
                        <option value="">— {m.ingestTemplateSelectTarget()} —</option>
                        {#each availableTargets as at}
                          <option value={at.id}>{at.name} ({at.type})</option>
                        {/each}
                      </select>
                    </div>
                    <div class="col-md-4">
                      {#if target}
                        <span class="badge {target.type === 'webhook' ? 'bg-secondary' : 'bg-info text-dark'}">{target.type}</span>
                        {#if target.enabled}
                          <span class="badge bg-success ms-1">{m.ingestTemplateEnabled()}</span>
                        {:else}
                          <span class="badge bg-warning text-dark ms-1">{m.ingestTemplateDisableSuccess()}</span>
                        {/if}
                      {/if}
                    </div>
                    <div class="col-md-2 text-end">
                      <button class="btn btn-sm btn-outline-danger" aria-label={m.actionDelete()} onclick={() => removeDeliveryTarget(i)}>
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>

            <!-- Message Templates (auto-shown for messaging targets) -->
            {@const hasMessagingTargets = formDeliveryTargets.some(dt => isMessagingTarget(dt.targetId))}
            {#if hasMessagingTargets || formMessageTemplates.length > 0}
              <hr />
              <div class="d-flex align-items-center mb-2">
                <h6 class="mb-0 me-2">{m.ingestTemplateMessageTemplates()}</h6>
                <small class="text-inverse text-opacity-50">{m.ingestTemplateMessageTemplatesSuggestedHint()}</small>
                <button class="btn btn-xs btn-outline-theme ms-auto" onclick={addMessageTemplate}>
                  <i class="bi bi-plus me-1"></i>{m.ingestTemplateAddMessageTemplate()}
                </button>
              </div>
              {#each formMessageTemplates as mt, i}
                <div class="card bg-inverse bg-opacity-5 mb-2">
                  <div class="card-body py-2 px-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <small class="fw-semibold">
                        {#if mt.key}
                          {@const linkedTarget = getTargetById(mt.key)}
                          {#if linkedTarget}
                            <i class="bi bi-link-45deg me-1"></i>{linkedTarget.name} ({linkedTarget.type})
                          {:else}
                            <span class="font-monospace">{mt.key}</span>
                          {/if}
                        {:else}
                          {m.ingestTemplateMessageTemplates()} #{i + 1}
                        {/if}
                      </small>
                      <button class="btn btn-xs btn-outline-danger" aria-label="Remove" onclick={() => removeMessageTemplate(i)}>
                        <i class="bi bi-trash"></i>
                      </button>
                    </div>
                    <!-- Channel / Locale / Key row -->
                    <div class="row g-2 mb-3">
                      <div class="col-md-4">
                        <label class="form-label small mb-0" for="mt-channel-{i}">{m.ingestTemplateMessageChannel()}</label>
                        <select id="mt-channel-{i}" class="form-select form-select-sm" bind:value={mt.channelType} disabled={formLoading}>
                          <option value="line">LINE</option>
                          <option value="discord">Discord</option>
                          <option value="telegram">Telegram</option>
                        </select>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small mb-0" for="mt-locale-{i}">{m.ingestTemplateMessageLocale()}</label>
                        <select id="mt-locale-{i}" class="form-select form-select-sm" bind:value={mt.locale} disabled={formLoading}>
                          <option value="th">TH</option>
                          <option value="en">EN</option>
                        </select>
                      </div>
                      <div class="col-md-4">
                        <label class="form-label small mb-0" for="mt-key-{i}">{m.ingestTemplateMessageKey()}</label>
                        <input id="mt-key-{i}" type="text" class="form-control form-control-sm font-monospace" bind:value={mt.key} disabled={formLoading} placeholder="target-id" />
                      </div>
                    </div>

                    {#if mt.channelType === 'line'}
                      <!-- LINE Card Editor -->
                      <div class="row g-3">
                        <!-- Left: Card Preview -->
                        <div class="col-md-5">
                          <div class="border rounded overflow-hidden" style="max-width:260px; font-size:12px; background:#fff; color:#111">
                            <!-- Image area -->
                            <div class="position-relative d-flex align-items-center justify-content-center" style="background:#5a8fa0; height:130px">
                              {#if getE(mt,'tagEnabled','true') === 'true'}
                                <span class="position-absolute top-0 start-0 m-2 px-2 py-1 rounded fw-semibold"
                                  style="background:{tagPaletteFor(getE(mt,'tagColor','gray')).bg}; color:{tagPaletteFor(getE(mt,'tagColor','gray')).text}; font-size:10px; border:1px solid rgba(0,0,0,0.12)">{getE(mt,'tagText','{{.source.deviceId}}') || '{{.source.deviceId}}'}</span>
                              {/if}
                              {#if getE(mt,'imageType','fullframe') === 'fullframe'}
                                <span class="text-white opacity-50" style="font-size:48px; font-weight:bold">A</span>
                              {:else}
                                <div class="d-flex gap-1 align-items-center">
                                  <div class="rounded" style="width:60px; height:80px; background:rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center">
                                    <span class="text-white opacity-75" style="font-size:24px; font-weight:bold">A</span>
                                  </div>
                                  <div class="rounded" style="width:60px; height:80px; background:rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center">
                                    <span class="text-white opacity-40 small">Default</span>
                                  </div>
                                </div>
                              {/if}
                            </div>
                            <!-- Card content -->
                            <div class="p-2">
                              <div class="fw-bold" style="font-size:13px">{mt.title || 'Enter header'}</div>
                              {#if getE(mt,'addressEnabled','true') === 'true'}
                                <div class="text-secondary mt-1" style="font-size:11px"><i class="bi bi-geo-alt-fill me-1"></i>{getE(mt,'addressText','{{.geo.adminName}}') || mt.body || '{{.geo.adminName}}'}</div>
                              {/if}
                              {#if getE(mt,'additionalInfoEnabled','true') === 'true'}
                                <div class="text-secondary" style="font-size:11px"><i class="bi bi-clock me-1"></i>{getE(mt,'additionalInfoText','{{.occurredAt}}') || '{{.occurredAt}}'}</div>
                              {/if}
                              {#if getE(mt,'action1Enabled','true') === 'true'}
                                <div class="text-center border-top mt-1 pt-1" style="color:#06c755; font-size:12px">{getE(mt,'action1Label','') || 'Enter action label'}</div>
                              {/if}
                              {#if getE(mt,'action2Enabled','false') === 'true'}
                                <div class="text-center border-top mt-1 pt-1" style="color:#06c755; font-size:12px">{getE(mt,'action2Label','') || 'Enter action label'}</div>
                              {/if}
                            </div>
                          </div>
                        </div>

                        <!-- Right: Form Fields -->
                        <div class="col-md-7">
                          <!-- Images -->
                          <div class="mb-3">
                            <div class="form-label small fw-semibold mb-1">Images</div>
                            <div class="d-flex gap-3">
                              <div class="form-check">
                                <input type="radio" class="form-check-input" name="imgType-{i}" id="imgFull-{i}"
                                  checked={getE(mt,'imageType','fullframe') === 'fullframe'}
                                  onchange={() => updateMsgTemplate(i, m => setE(m,'imageType','fullframe'))}
                                  disabled={formLoading} />
                                <label class="form-check-label small" for="imgFull-{i}">Full frame</label>
                              </div>
                              <div class="form-check">
                                <input type="radio" class="form-check-input" name="imgType-{i}" id="imgCrop-{i}"
                                  checked={getE(mt,'imageType','fullframe') === 'crop'}
                                  onchange={() => updateMsgTemplate(i, m => setE(m,'imageType','crop'))}
                                  disabled={formLoading} />
                                <label class="form-check-label small" for="imgCrop-{i}">Crop</label>
                              </div>
                            </div>
                          </div>

                          <!-- Tag -->
                          <div class="mb-3">
                            <div class="d-flex align-items-center gap-2">
                              <input type="checkbox" class="form-check-input" id="tag-{i}"
                                checked={getE(mt,'tagEnabled','true') === 'true'}
                                onchange={(e) => updateMsgTemplate(i, m => setE(m,'tagEnabled',(e.target as HTMLInputElement).checked ? 'true' : 'false'))}
                                disabled={formLoading} />
                              <label class="form-check-label small fw-semibold" for="tag-{i}">Tag</label>
                            </div>
                            {#if getE(mt,'tagEnabled','true') === 'true'}
                              <div class="mt-1 position-relative">
                                <div class="input-group input-group-sm">
                                  <input type="text" class="form-control font-monospace"
                                    placeholder="{'{{.source.deviceId}}'}"
                                    value={getE(mt,'tagText','{{.source.deviceId}}')}
                                    onfocus={() => openPicker(`tag-${i}`, getE(mt,'tagText',''))}
                                    oninput={(e) => onVarInput(i, 'tagText', `tag-${i}`, (e.target as HTMLInputElement).value)}
                                    onblur={() => closePickerDeferred(`tag-${i}`)}
                                    disabled={formLoading} />
                                  <button type="button" class="btn btn-outline-secondary" aria-label="Suggest variables"
                                    title="Suggest template variables"
                                    onclick={() => toggleVarPicker(`tag-${i}`, getE(mt,'tagText',''))} disabled={formLoading}>
                                    <i class="bi bi-stars"></i>
                                  </button>
                                </div>
                                {#if openVarPicker === `tag-${i}` && filteredTemplateVars.length > 0}
                                  <ul class="dropdown-menu show position-absolute mt-1" style="min-width:100%; max-height:280px; overflow:auto; z-index:10">
                                    {#each filteredTemplateVars as tv}
                                      <li>
                                        <button type="button" class="dropdown-item py-1"
                                          onmousedown={(e) => { e.preventDefault(); insertTemplateVar(i, 'tagText', tv.value) }}>
                                          <code class="text-theme small">{tv.value}</code>
                                          <div class="small text-inverse text-opacity-50">✨ {tv.hint}</div>
                                        </button>
                                      </li>
                                    {/each}
                                  </ul>
                                {/if}
                              </div>
                              <!-- Color palette -->
                              <div class="mt-2 d-flex gap-2 align-items-center">
                                <small class="text-inverse text-opacity-50">Color</small>
                                {#each TAG_COLORS as c}
                                  <button type="button" class="rounded-circle border-0"
                                    title={c.key}
                                    aria-label="tag color {c.key}"
                                    style="width:22px; height:22px; background:{c.bg}; outline: {getE(mt,'tagColor','gray') === c.key ? '2px solid var(--bs-theme)' : '1px solid rgba(0,0,0,0.2)'}; cursor:pointer"
                                    onclick={() => updateMsgTemplate(i, m => setE(m,'tagColor',c.key))}
                                    disabled={formLoading}>
                                    {#if getE(mt,'tagColor','gray') === c.key}
                                      <i class="bi bi-check-lg" style="color:{c.text}; font-size:12px"></i>
                                    {/if}
                                  </button>
                                {/each}
                              </div>
                            {/if}
                          </div>

                          <!-- Header -->
                          <div class="mb-3 position-relative">
                            <label class="form-label small fw-semibold mb-1" for="mt-header-{i}">Header <span class="text-danger">*</span></label>
                            <div class="input-group input-group-sm">
                              <input id="mt-header-{i}" type="text" class="form-control font-monospace"
                                value={mt.title ?? ''}
                                placeholder="{'{{.eventCategory}}'}"
                                onfocus={() => openPicker(`header-${i}`, mt.title ?? '')}
                                oninput={(e) => onTitleInput(i, `header-${i}`, (e.target as HTMLInputElement).value)}
                                onblur={() => closePickerDeferred(`header-${i}`)}
                                disabled={formLoading} />
                              <button type="button" class="btn btn-outline-secondary" aria-label="Suggest variables"
                                title="Suggest template variables"
                                onclick={() => toggleVarPicker(`header-${i}`, mt.title ?? '')} disabled={formLoading}>
                                <i class="bi bi-stars"></i>
                              </button>
                              <span class="input-group-text text-muted">{(mt.title?.length ?? 0)}/200</span>
                            </div>
                            {#if openVarPicker === `header-${i}` && filteredTemplateVars.length > 0}
                              <ul class="dropdown-menu show position-absolute mt-1" style="min-width:100%; max-height:280px; overflow:auto; z-index:10">
                                {#each filteredTemplateVars as tv}
                                  <li>
                                    <button type="button" class="dropdown-item py-1"
                                      onmousedown={(e) => { e.preventDefault(); insertTitleVar(i, tv.value) }}>
                                      <code class="text-theme small">{tv.value}</code>
                                      <div class="small text-inverse text-opacity-50">✨ {tv.hint}</div>
                                    </button>
                                  </li>
                                {/each}
                              </ul>
                            {/if}
                          </div>

                          <!-- Address -->
                          <div class="mb-3">
                            <div class="d-flex align-items-center gap-2">
                              <input type="checkbox" class="form-check-input" id="addr-{i}"
                                checked={getE(mt,'addressEnabled','true') === 'true'}
                                onchange={(e) => updateMsgTemplate(i, m => setE(m,'addressEnabled',(e.target as HTMLInputElement).checked ? 'true' : 'false'))}
                                disabled={formLoading} />
                              <label class="form-check-label small fw-semibold" for="addr-{i}">Address</label>
                            </div>
                            {#if getE(mt,'addressEnabled','true') === 'true'}
                              <div class="mt-1 position-relative">
                                <div class="input-group input-group-sm">
                                  <input type="text" class="form-control font-monospace"
                                    placeholder="{'{{.geo.adminName}}'}"
                                    value={getE(mt,'addressText','{{.geo.adminName}}')}
                                    onfocus={() => openPicker(`addr-${i}`, getE(mt,'addressText',''))}
                                    oninput={(e) => onVarInput(i, 'addressText', `addr-${i}`, (e.target as HTMLInputElement).value)}
                                    onblur={() => closePickerDeferred(`addr-${i}`)}
                                    disabled={formLoading} />
                                  <button type="button" class="btn btn-outline-secondary" aria-label="Suggest variables"
                                    title="Suggest template variables"
                                    onclick={() => toggleVarPicker(`addr-${i}`, getE(mt,'addressText',''))} disabled={formLoading}>
                                    <i class="bi bi-stars"></i>
                                  </button>
                                </div>
                                {#if openVarPicker === `addr-${i}` && filteredTemplateVars.length > 0}
                                  <ul class="dropdown-menu show position-absolute mt-1" style="min-width:100%; max-height:280px; overflow:auto; z-index:10">
                                    {#each filteredTemplateVars as tv}
                                      <li>
                                        <button type="button" class="dropdown-item py-1"
                                          onmousedown={(e) => { e.preventDefault(); insertTemplateVar(i, 'addressText', tv.value) }}>
                                          <code class="text-theme small">{tv.value}</code>
                                          <div class="small text-inverse text-opacity-50">✨ {tv.hint}</div>
                                        </button>
                                      </li>
                                    {/each}
                                  </ul>
                                {/if}
                              </div>
                            {/if}
                          </div>

                          <!-- Additional info -->
                          <div class="mb-3">
                            <div class="d-flex align-items-center gap-2">
                              <input type="checkbox" class="form-check-input" id="addinfo-{i}"
                                checked={getE(mt,'additionalInfoEnabled','true') === 'true'}
                                onchange={(e) => updateMsgTemplate(i, m => setE(m,'additionalInfoEnabled',(e.target as HTMLInputElement).checked ? 'true' : 'false'))}
                                disabled={formLoading} />
                              <label class="form-check-label small fw-semibold" for="addinfo-{i}">Additional info</label>
                            </div>
                            {#if getE(mt,'additionalInfoEnabled','true') === 'true'}
                              <div class="mt-1 d-flex gap-2 align-items-start">
                                <select class="form-select form-select-sm" style="max-width:110px; flex:0 0 auto"
                                  value={getE(mt,'additionalInfoType','Hours')}
                                  onchange={(e) => updateMsgTemplate(i, m => setE(m,'additionalInfoType',(e.target as HTMLSelectElement).value))}
                                  disabled={formLoading}>
                                  <option value="Hours">Hours</option>
                                  <option value="Days">Days</option>
                                  <option value="Custom">Custom</option>
                                </select>
                                <div class="position-relative flex-grow-1">
                                  <div class="input-group input-group-sm">
                                    <input type="text" class="form-control font-monospace"
                                      placeholder="{'{{.occurredAt}}'}"
                                      value={getE(mt,'additionalInfoText','{{.occurredAt}}')}
                                      onfocus={() => openPicker(`info-${i}`, getE(mt,'additionalInfoText',''))}
                                      oninput={(e) => onVarInput(i, 'additionalInfoText', `info-${i}`, (e.target as HTMLInputElement).value)}
                                      onblur={() => closePickerDeferred(`info-${i}`)}
                                      disabled={formLoading} />
                                    <button type="button" class="btn btn-outline-secondary" aria-label="Suggest variables"
                                      title="Suggest template variables"
                                      onclick={() => toggleVarPicker(`info-${i}`, getE(mt,'additionalInfoText',''))} disabled={formLoading}>
                                      <i class="bi bi-stars"></i>
                                    </button>
                                  </div>
                                  {#if openVarPicker === `info-${i}` && filteredTemplateVars.length > 0}
                                    <ul class="dropdown-menu show position-absolute mt-1" style="min-width:100%; max-height:280px; overflow:auto; z-index:10">
                                      {#each filteredTemplateVars as tv}
                                        <li>
                                          <button type="button" class="dropdown-item py-1"
                                            onmousedown={(e) => { e.preventDefault(); insertTemplateVar(i, 'additionalInfoText', tv.value) }}>
                                            <code class="text-theme small">{tv.value}</code>
                                            <div class="small text-inverse text-opacity-50">✨ {tv.hint}</div>
                                          </button>
                                        </li>
                                      {/each}
                                    </ul>
                                  {/if}
                                </div>
                              </div>
                            {/if}
                          </div>

                          <!-- Action 1 -->
                          <div class="mb-3">
                            <div class="d-flex align-items-center gap-2">
                              <input type="checkbox" class="form-check-input" id="act1-{i}"
                                checked={getE(mt,'action1Enabled','true') === 'true'}
                                onchange={(e) => updateMsgTemplate(i, m => setE(m,'action1Enabled',(e.target as HTMLInputElement).checked ? 'true' : 'false'))}
                                disabled={formLoading} />
                              <label class="form-check-label small fw-semibold" for="act1-{i}">Action 1</label>
                            </div>
                            {#if getE(mt,'action1Enabled','true') === 'true'}
                              <div class="mt-2">
                                <div class="input-group input-group-sm mb-1">
                                  <input type="text" class="form-control" placeholder="Enter action label"
                                    value={getE(mt,'action1Label','')}
                                    oninput={(e) => updateMsgTemplate(i, m => setE(m,'action1Label',(e.target as HTMLInputElement).value))}
                                    maxlength="15" disabled={formLoading} />
                                  <span class="input-group-text text-muted">{getE(mt,'action1Label','').length}/15</span>
                                </div>
                                <div class="row g-1">
                                  <div class="col-5">
                                    <select class="form-select form-select-sm" disabled><option>URL</option></select>
                                  </div>
                                  <div class="col-7">
                                    <input type="url" class="form-control form-control-sm" placeholder="https://"
                                      value={getE(mt,'action1Url','')}
                                      oninput={(e) => updateMsgTemplate(i, m => setE(m,'action1Url',(e.target as HTMLInputElement).value))}
                                      disabled={formLoading} />
                                  </div>
                                </div>
                              </div>
                            {/if}
                          </div>

                          <!-- Action 2 -->
                          <div class="mb-2">
                            <div class="d-flex align-items-center gap-2">
                              <input type="checkbox" class="form-check-input" id="act2-{i}"
                                checked={getE(mt,'action2Enabled','false') === 'true'}
                                onchange={(e) => updateMsgTemplate(i, m => setE(m,'action2Enabled',(e.target as HTMLInputElement).checked ? 'true' : 'false'))}
                                disabled={formLoading} />
                              <label class="form-check-label small fw-semibold" for="act2-{i}">Action 2</label>
                            </div>
                            {#if getE(mt,'action2Enabled','false') === 'true'}
                              <div class="mt-2">
                                <div class="input-group input-group-sm mb-1">
                                  <input type="text" class="form-control" placeholder="Enter action label"
                                    value={getE(mt,'action2Label','')}
                                    oninput={(e) => updateMsgTemplate(i, m => setE(m,'action2Label',(e.target as HTMLInputElement).value))}
                                    maxlength="15" disabled={formLoading} />
                                  <span class="input-group-text text-muted">{getE(mt,'action2Label','').length}/15</span>
                                </div>
                                <div class="row g-1">
                                  <div class="col-5">
                                    <select class="form-select form-select-sm" disabled><option>URL</option></select>
                                  </div>
                                  <div class="col-7">
                                    <input type="url" class="form-control form-control-sm" placeholder="https://"
                                      value={getE(mt,'action2Url','')}
                                      oninput={(e) => updateMsgTemplate(i, m => setE(m,'action2Url',(e.target as HTMLInputElement).value))}
                                      disabled={formLoading} />
                                  </div>
                                </div>
                              </div>
                            {/if}
                          </div>
                        </div>
                      </div>

                    {:else}
                      <!-- Generic editor for Discord / Telegram -->
                      <div class="mt-2">
                        <label class="form-label small mb-0" for="mt-title-{i}">{m.ingestTemplateMessageTitle()}</label>
                        <input id="mt-title-{i}" type="text" class="form-control form-control-sm" bind:value={mt.title} disabled={formLoading}
                          placeholder="{'{{.eventType}} - {{.deviceName}}'}" />
                      </div>
                      <div class="mt-2">
                        <label class="form-label small mb-0" for="mt-body-{i}">{m.ingestTemplateMessageBody()}</label>
                        <textarea id="mt-body-{i}" class="form-control form-control-sm font-monospace" rows="4" bind:value={mt.body} disabled={formLoading}
                          placeholder="{'{{.sourceFamily}}\n{{.deviceName}}\n{{.lat}}, {{.lng}}\n{{.eventType}}'}"></textarea>
                        <div class="form-text">
                          {m.ingestTemplateMessageTemplatePlaceholders()}:
                          {#each SUGGESTED_MSG_FIELDS as f}
                            <code class="me-1">{`{{.${f}}}`}</code>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </div>
                </div>
              {/each}
            {/if}
          {/if}
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => (showFormModal = false)} disabled={formLoading}>{m.actionCancel()}</button>
          <button type="button" class="btn btn-theme" onclick={handleSubmit} disabled={formLoading}>
            {#if formLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {formMode === 'create' ? m.actionCreate() : m.actionSave()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete Confirm Modal -->
{#if showDeleteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-trash me-2 text-danger"></i>{m.actionDelete()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestTemplateDeleteWarning()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; deleteId = null }} disabled={deleteLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleDelete} disabled={deleteLoading}>
            {#if deleteLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ═══════════════════════════════════════════════════════════
     AI Suggest Modal
════════════════════════════════════════════════════════════ -->
{#if showAISuggestModal}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-stars me-2 text-theme"></i>{m.aiSuggestTitle()}
          </h5>
          <button
            type="button"
            class="btn-close"
            onclick={() => (showAISuggestModal = false)}
            disabled={aiSuggestLoading}
          ></button>
        </div>

        <div class="modal-body">
          {#if aiSuggestStep === 'input'}
            {#if aiSuggestError}
              <div class="alert alert-danger small py-2">{aiSuggestError}</div>
            {/if}
            <!-- Source Family -->
            <div class="mb-3">
              <label class="form-label fw-semibold">
                {m.aiSuggestSourceFamily()} <span class="text-danger">*</span>
              </label>
              {#if sourceProfiles.length > 0}
                <select class="form-select" bind:value={aiSuggestSourceFamily} disabled={aiSuggestLoading}>
                  <option value="">— Select —</option>
                  {#each sourceProfiles as sp}
                    <option value={sp.sourceFamily}>{sp.displayName ?? sp.sourceFamily}</option>
                  {/each}
                </select>
              {:else}
                <input
                  type="text"
                  class="form-control"
                  placeholder="e.g. AIBOX"
                  bind:value={aiSuggestSourceFamily}
                  disabled={aiSuggestLoading}
                />
              {/if}
            </div>
            <!-- Event description (natural language) -->
            <div class="mb-1">
              <label class="form-label fw-semibold" for="ai-suggest-desc">{m.ingestTemplateAISuggestDescLabel()} <span class="text-inverse text-opacity-50 fw-normal">{m.ingestTemplateAISuggestDescOptional()}</span></label>
              <textarea
                id="ai-suggest-desc"
                class="form-control"
                rows="4"
                placeholder={m.ingestTemplateAISuggestDescPlaceholder()}
                bind:value={aiSuggestPayload}
                disabled={aiSuggestLoading}
              ></textarea>
              <div class="form-text">{m.ingestTemplateAISuggestDescHelp()}</div>
            </div>

          {:else if aiSuggestStep === 'result' && aiSuggestResult}
            <!-- Mode badge -->
            <div class="mb-3 d-flex align-items-center gap-2">
              <span class="badge {suggestModeBadge(aiSuggestResult.mode)}">
                {suggestModeLabel(aiSuggestResult.mode)}
              </span>
              {#if aiSuggestResult.aiProvider}
                <span class="badge bg-outline-secondary border text-inverse text-opacity-60 fw-normal small">
                  {aiSuggestResult.aiProvider} / {aiSuggestResult.aiModel ?? ''}
                </span>
              {/if}
            </div>

            {#if aiSuggestResult.fallbackReason}
              <div class="alert alert-warning small py-2 mb-3">
                <i class="bi bi-exclamation-triangle me-1"></i>{aiSuggestResult.fallbackReason}
              </div>
            {/if}

            <!-- Suggested Event Type -->
            {#if aiSuggestResult.suggestedEventType}
              <div class="mb-3">
                <div class="small fw-semibold text-inverse text-opacity-60 mb-1">{m.aiSuggestEventType()}</div>
                <code class="text-theme">{aiSuggestResult.suggestedEventType}</code>
              </div>
            {/if}

            <!-- Match Rules -->
            {#if aiSuggestResult.matchRules.length > 0}
              <div class="mb-3">
                <div class="small fw-semibold text-inverse text-opacity-60 mb-2">{m.aiSuggestMatchRules()} ({aiSuggestResult.matchRules.length})</div>
                <div class="table-responsive">
                  <table class="table table-sm align-middle mb-0 small">
                    <thead><tr>
                      <th>Field</th><th>Operator</th><th>Value</th><th>Origin</th>
                    </tr></thead>
                    <tbody>
                      {#each aiSuggestResult.matchRules as rule}
                        <tr>
                          <td class="font-monospace">{rule.field}</td>
                          <td>{rule.operator}</td>
                          <td class="font-monospace">{rule.value}</td>
                          <td><span class="badge {originBadge(rule.origin)}">{originLabel(rule.origin)}</span></td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              </div>
            {/if}

            <!-- Field Mappings -->
            <div class="mb-2">
              <div class="small fw-semibold text-inverse text-opacity-60 mb-2">{m.aiSuggestFieldMappings()} ({aiSuggestResult.fieldMappings.length})</div>
              {#if aiSuggestResult.fieldMappings.length === 0}
                <p class="text-muted small">{m.aiSuggestNoMappings()}</p>
              {:else}
                <div class="table-responsive" style="max-height:240px;overflow-y:auto">
                  <table class="table table-sm align-middle mb-0 small">
                    <thead><tr>
                      <th>Source</th><th>Target</th><th>{m.aiSuggestValueCodes()}</th><th>Origin</th>
                    </tr></thead>
                    <tbody>
                      {#each aiSuggestResult.fieldMappings as fm}
                        <tr>
                          <td class="font-monospace">{fm.sourcePath}</td>
                          <td class="font-monospace">{fm.targetPath}</td>
                          <td>
                            {#if fm.valueCodes && Object.keys(fm.valueCodes).length > 0}
                              <span class="badge bg-secondary fw-normal">{Object.keys(fm.valueCodes).length} codes</span>
                            {:else}
                              <span class="text-muted">—</span>
                            {/if}
                          </td>
                          <td><span class="badge {originBadge(fm.origin)}">{originLabel(fm.origin)}</span></td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div class="modal-footer">
          <button
            class="btn btn-secondary"
            onclick={() => (showAISuggestModal = false)}
            disabled={aiSuggestLoading}
          >{m.aiSuggestDiscard()}</button>

          {#if aiSuggestStep === 'input'}
            <button
              class="btn btn-theme"
              onclick={handleAISuggest}
              disabled={aiSuggestLoading || !aiSuggestSourceFamily.trim()}
            >
              {#if aiSuggestLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>
                {m.aiSuggestLoading()}
              {:else}
                <i class="bi bi-stars me-1"></i>{m.aiSuggestBtn()}
              {/if}
            </button>
          {:else}
            <button class="btn btn-outline-secondary" onclick={() => { aiSuggestStep = 'input' }} disabled={aiSuggestLoading}>
              <i class="bi bi-arrow-left me-1"></i>Back
            </button>
            <button class="btn btn-theme" onclick={applyAISuggest}>
              <i class="bi bi-check-lg me-1"></i>{m.aiSuggestApply()}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ═══════════════════════════════════════════════════════════
     Prompt Chat Modal
════════════════════════════════════════════════════════════ -->
{#if showPromptModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered" style="max-width:480px">
      <div class="modal-content bg-inverse-subtle d-flex flex-column" style="height:min(600px,85vh)">

        <!-- Header -->
        <div class="modal-header border-0 pb-2">
          <h6 class="modal-title fw-semibold">
            <i class="bi bi-stars me-2 text-theme"></i>{m.ingestTemplatePromptTitle()}
          </h6>
          <button type="button" class="btn-close" aria-label={m.actionClose()}
            onclick={() => (showPromptModal = false)} disabled={chatWaiting || promptSaveLoading}></button>
        </div>

        <!-- Chat messages -->
        <div class="flex-grow-1 overflow-y-auto px-3 py-2 d-flex flex-column gap-3">
          {#if promptError}
            <div class="alert alert-danger small py-2">
              <button type="button" class="btn-close btn-close-sm float-end" onclick={() => (promptError = null)} aria-label={m.actionClose()}></button>
              {promptError}
            </div>
          {/if}

          {#each chatMsgs as msg}
            {#if msg.role === 'ai'}
              <div class="d-flex gap-2 align-items-start">
                <div class="rounded-circle bg-theme d-flex align-items-center justify-content-center flex-shrink-0"
                  style="width:28px;height:28px;margin-top:2px">
                  <i class="bi bi-stars text-white" style="font-size:11px"></i>
                </div>
                <div style="max-width:88%">
                  <div class="rounded-3 rounded-top-start-0 px-3 py-2 small lh-base"
                    style="background:var(--bs-tertiary-bg)">
                    {#each msg.content.split('\n') as line, li}
                      {#if li > 0}<br>{/if}{line}
                    {/each}
                  </div>
                  {#if msg.options?.length}
                    <div class="d-flex flex-wrap gap-1 mt-2">
                      {#each msg.options as opt}
                        <button class="btn btn-sm btn-outline-theme py-1 px-2"
                          style="font-size:12px"
                          onclick={() => sendChatMsg(opt.value)}
                          disabled={chatWaiting || promptSaved}>
                          {opt.label}
                        </button>
                      {/each}
                    </div>
                  {/if}
                </div>
              </div>
            {:else}
              <div class="d-flex justify-content-end">
                <div class="rounded-3 rounded-top-end-0 px-3 py-2 small lh-base bg-theme text-white"
                  style="max-width:80%">
                  {msg.content}
                </div>
              </div>
            {/if}
          {/each}

          {#if chatWaiting}
            <div class="d-flex gap-2 align-items-center">
              <div class="rounded-circle bg-theme d-flex align-items-center justify-content-center flex-shrink-0"
                style="width:28px;height:28px">
                <i class="bi bi-stars text-white" style="font-size:11px"></i>
              </div>
              <div class="rounded-3 px-3 py-2 small" style="background:var(--bs-tertiary-bg)">
                <span class="spinner-border spinner-border-sm me-1" style="width:10px;height:10px"></span>
                {m.ingestTemplatePromptThinking()}
              </div>
            </div>
          {/if}

          {#if promptSaved}
            <div class="alert alert-success py-2 small text-center mb-0">
              <i class="bi bi-check-circle me-1"></i>{m.ingestTemplatePromptSaveSuccess()}
            </div>
          {/if}
        </div>

        <!-- Save button -->
        {#if promptDraft && (promptDraft.status === 'ready' || promptDraft.status === 'reviewed') && !promptSaved}
          <div class="px-3 py-2 border-top">
            <button class="btn btn-theme w-100 btn-sm" onclick={handleSaveDraft} disabled={promptSaveLoading}>
              {#if promptSaveLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>{m.ingestTemplatePromptSaving()}
              {:else}
                <i class="bi bi-floppy me-1"></i>{m.ingestTemplatePromptSave()}
              {/if}
            </button>
          </div>
        {/if}

        <!-- Input area -->
        <div class="px-3 pt-2 pb-3 border-top">
          <div class="d-flex gap-2 align-items-end">
            <textarea
              class="form-control form-control-sm"
              rows="2"
              placeholder={m.ingestTemplatePromptInputPlaceholder()}
              bind:value={chatInput}
              disabled={chatWaiting || promptSaved}
              style="resize:none; font-size:13px"
              onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMsg() } }}
            ></textarea>
            <button class="btn btn-theme btn-sm px-3" aria-label={m.ingestTemplatePromptSendAria()}
              onclick={() => sendChatMsg()}
              disabled={chatWaiting || !chatInput.trim() || promptSaved}>
              <i class="bi bi-send-fill"></i>
            </button>
          </div>
          <div class="text-inverse text-opacity-30 mt-1" style="font-size:10px">{m.ingestTemplatePromptInputHint()}</div>
        </div>

      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
