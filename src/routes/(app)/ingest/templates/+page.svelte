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

  // ── Prompt to Draft modal ──
  let showPromptModal = $state(false)
  let promptStep = $state<'input' | 'draft'>('input')
  let promptLoading = $state(false)
  let promptError = $state<string | null>(null)
  let promptText = $state('')
  let promptDraft = $state<ConfigDraft | null>(null)
  let refineAnswers = $state<Record<string, string>>({})
  let refineLoading = $state(false)
  let dryRunPayload = $state('')
  let dryRunResult = $state<DryRunResult | null>(null)
  let dryRunLoading = $state(false)
  let promptSaveLoading = $state(false)
  let promptSaved = $state(false)

  const OPERATORS = ['eq', 'in', 'contains', 'prefix'] as const
  const MESSAGING_TYPES = new Set(['line', 'telegram', 'discord'])

  // Derived: sourcePaths from formMappings for match condition field selector
  let mappingSourcePaths = $derived(
    formMappings.map(m => m.sourcePath).filter(Boolean)
  )

  // Suggested message template fields based on mappings
  const SUGGESTED_MSG_FIELDS = ['sourceFamily', 'deviceName', 'lat', 'lng', 'eventType', 'imageUrl']

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

  function resetForm() {
    formName = ''
    formSourceFamily = ''
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

    const payload = {
      name: formName.trim(),
      enabled: formEnabled,
      sourceFamily: formSourceFamily || undefined,
      matchAll: formMatchAll.length ? formMatchAll : undefined,
      matchAny: formMatchAny.length ? formMatchAny : undefined,
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
    return { ...c, values: raw.split(',').map(v => v.trim()).filter(Boolean) }
  }

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
          title: `{{.eventType}} - {{.deviceName}}`,
          body: bodyLines.join('\n') || '{{.eventType}}'
        }]
      }
    }
  }

  // Message template helpers
  function addMessageTemplate(): void {
    formMessageTemplates = [...formMessageTemplates, { channelType: 'line', locale: 'th', title: '', body: '' }]
  }
  function removeMessageTemplate(i: number): void {
    formMessageTemplates = formMessageTemplates.filter((_, idx) => idx !== i)
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

  // ── Prompt to Draft handlers ──
  function openPromptModal() {
    promptStep = 'input'
    promptText = ''
    promptDraft = null
    promptError = null
    refineAnswers = {}
    dryRunPayload = ''
    dryRunResult = null
    promptSaved = false
    showPromptModal = true
  }

  async function handleGenerateDraft() {
    const orgId = $activeWorkspaceId
    if (!orgId || !promptText.trim()) {
      promptError = 'Please describe what you want to configure'
      return
    }
    promptLoading = true
    promptError = null
    try {
      promptDraft = await createDraftFromPrompt(orgId, { prompt: promptText.trim() })
      refineAnswers = {}
      dryRunResult = null
      promptStep = 'draft'
    } catch (e: unknown) {
      promptError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      promptLoading = false
    }
  }

  async function handleRefine() {
    const orgId = $activeWorkspaceId
    if (!orgId || !promptDraft) return
    const answersToSend = Object.fromEntries(
      Object.entries(refineAnswers).filter(([, v]) => v.trim() !== '')
    )
    if (Object.keys(answersToSend).length === 0) return
    refineLoading = true
    promptError = null
    try {
      promptDraft = await refineDraft(orgId, promptDraft.draftId, answersToSend)
      refineAnswers = {}
      dryRunResult = null
    } catch (e: unknown) {
      promptError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      refineLoading = false
    }
  }

  async function handleDryRun() {
    const orgId = $activeWorkspaceId
    if (!orgId || !promptDraft) return
    let payload: Record<string, unknown> = {}
    if (dryRunPayload.trim()) {
      try {
        payload = JSON.parse(dryRunPayload)
      } catch {
        promptError = 'Sample payload must be valid JSON'
        return
      }
    }
    dryRunLoading = true
    promptError = null
    try {
      dryRunResult = await dryRunDraft(orgId, promptDraft.draftId, payload)
    } catch (e: unknown) {
      promptError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      dryRunLoading = false
    }
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
                {#if tpl.enabled}
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
              { key: 'mapping', label: m.ingestTemplateTabFieldMapping() },
              { key: 'target', label: m.ingestTemplateTabTarget() }
            ] as tab}
              <li class="nav-item">
                <button class="nav-link" class:active={formTab === tab.key}
                  onclick={() => { formTab = tab.key as 'basic' | 'match' | 'mapping' | 'target' }}>
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
            <div class="form-check form-switch">
              <input id="tplEnabled" type="checkbox" class="form-check-input" bind:checked={formEnabled} disabled={formLoading} />
              <label class="form-check-label" for="tplEnabled">{m.ingestTemplateEnabled()}</label>
            </div>
          {/if}

          <!-- Tab: Match Rule -->
          {#if formTab === 'match'}
            <div class="mb-4">
              <div class="d-flex align-items-center mb-2">
                <h6 class="mb-0 me-2">{m.ingestTemplateMatchAll()}</h6>
                <small class="text-inverse text-opacity-50">{m.ingestTemplateMatchAllHint()}</small>
                <button class="btn btn-xs btn-outline-theme ms-auto" onclick={() => (formMatchAll = addCondition(formMatchAll))}>
                  <i class="bi bi-plus me-1"></i>{m.ingestTemplateAddCondition()}
                </button>
              </div>
              {#each formMatchAll as cond, i}
                <div class="row g-2 mb-2 align-items-center">
                  <div class="col-md-4">
                    {#if mappingSourcePaths.length > 0}
                      <select class="form-select form-select-sm font-monospace" bind:value={cond.field} disabled={formLoading}>
                        <option value="">— {m.ingestTemplateConditionField()} —</option>
                        {#each mappingSourcePaths as sp}
                          <option value={sp}>{sp}</option>
                        {/each}
                      </select>
                    {:else}
                      <input type="text" class="form-control form-control-sm font-monospace"
                        placeholder={m.ingestTemplateConditionFieldPlaceholder()}
                        bind:value={cond.field} disabled={formLoading} />
                    {/if}
                  </div>
                  <div class="col-md-3">
                    <select class="form-select form-select-sm" bind:value={cond.operator} disabled={formLoading}>
                      {#each OPERATORS as op}
                        <option value={op}>{op}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm"
                      placeholder="value1, value2"
                      value={cond.values.join(', ')}
                      oninput={(e) => { formMatchAll = formMatchAll.map((c, idx) => idx === i ? updateConditionValues(c, (e.target as HTMLInputElement).value) : c) }}
                      disabled={formLoading} />
                  </div>
                  <div class="col-md-1">
                    <button class="btn btn-sm btn-outline-danger" aria-label={m.actionDelete()} onclick={() => (formMatchAll = removeCondition(formMatchAll, i))}>
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              {/each}
              {#if formMatchAll.length === 0}
                <p class="text-inverse text-opacity-50 small">{m.ingestTemplateNoConditions()}</p>
              {/if}
            </div>

            <div>
              <div class="d-flex align-items-center mb-2">
                <h6 class="mb-0 me-2">{m.ingestTemplateMatchAny()}</h6>
                <small class="text-inverse text-opacity-50">{m.ingestTemplateMatchAnyHint()}</small>
                <button class="btn btn-xs btn-outline-theme ms-auto" onclick={() => (formMatchAny = addCondition(formMatchAny))}>
                  <i class="bi bi-plus me-1"></i>{m.ingestTemplateAddCondition()}
                </button>
              </div>
              {#each formMatchAny as cond, i}
                <div class="row g-2 mb-2 align-items-center">
                  <div class="col-md-4">
                    {#if mappingSourcePaths.length > 0}
                      <select class="form-select form-select-sm font-monospace" bind:value={cond.field} disabled={formLoading}>
                        <option value="">— {m.ingestTemplateConditionField()} —</option>
                        {#each mappingSourcePaths as sp}
                          <option value={sp}>{sp}</option>
                        {/each}
                      </select>
                    {:else}
                      <input type="text" class="form-control form-control-sm font-monospace"
                        placeholder={m.ingestTemplateConditionFieldPlaceholder()}
                        bind:value={cond.field} disabled={formLoading} />
                    {/if}
                  </div>
                  <div class="col-md-3">
                    <select class="form-select form-select-sm" bind:value={cond.operator} disabled={formLoading}>
                      {#each OPERATORS as op}
                        <option value={op}>{op}</option>
                      {/each}
                    </select>
                  </div>
                  <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm"
                      placeholder="value1, value2"
                      value={cond.values.join(', ')}
                      oninput={(e) => { formMatchAny = formMatchAny.map((c, idx) => idx === i ? updateConditionValues(c, (e.target as HTMLInputElement).value) : c) }}
                      disabled={formLoading} />
                  </div>
                  <div class="col-md-1">
                    <button class="btn btn-sm btn-outline-danger" aria-label={m.actionDelete()} onclick={() => (formMatchAny = removeCondition(formMatchAny, i))}>
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              {/each}
              {#if formMatchAny.length === 0}
                <p class="text-inverse text-opacity-50 small">{m.ingestTemplateNoConditions()}</p>
              {/if}
            </div>
          {/if}

          <!-- Tab: Field Mapping -->
          {#if formTab === 'mapping'}
            <div class="d-flex align-items-center mb-3">
              <h6 class="mb-0">{m.ingestTemplateMappings()}</h6>
              <button class="btn btn-xs btn-outline-theme ms-auto" onclick={addMapping}>
                <i class="bi bi-plus me-1"></i>{m.actionAdd()}
              </button>
            </div>
            {#if formMappings.length === 0}
              <p class="text-inverse text-opacity-50 small">{m.ingestNoMappings()}</p>
            {:else}
              <div class="table-responsive">
                <table class="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>{m.ingestMappingSourcePath()}</th>
                      <th>{m.ingestMappingTargetPath()}</th>
                      <th class="text-center">{m.ingestMappingRequired()}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each formMappings as mapping, i}
                      <tr>
                        <td>
                          <input type="text" class="form-control form-control-sm font-monospace"
                            bind:value={mapping.sourcePath} disabled={formLoading} placeholder="raw.type" />
                        </td>
                        <td>
                          <input type="text" class="form-control form-control-sm font-monospace"
                            bind:value={mapping.targetPath} disabled={formLoading} placeholder="eventType" />
                        </td>
                        <td class="text-center">
                          <input type="checkbox" class="form-check-input" bind:checked={mapping.required} disabled={formLoading} />
                        </td>
                        <td>
                          <button class="btn btn-sm btn-outline-danger" aria-label={m.actionDelete()} onclick={() => removeMapping(i)}>
                            <i class="bi bi-trash"></i>
                          </button>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
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
                    <div class="row g-2">
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
                        {#each SUGGESTED_MSG_FIELDS as f, fi}
                          <code class="me-1">{`{{.${f}}}`}</code>
                        {/each}
                      </div>
                    </div>
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
            <!-- Sample Payload -->
            <div class="mb-1">
              <label class="form-label fw-semibold">{m.aiSuggestSamplePayload()}</label>
              <textarea
                class="form-control font-monospace small"
                rows="6"
                placeholder={'{\n  "alarmType": 2,\n  "eventAttribute": { "gender": 1 }\n}'}
                bind:value={aiSuggestPayload}
                disabled={aiSuggestLoading}
              ></textarea>
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
     Prompt to Draft Modal
════════════════════════════════════════════════════════════ -->
{#if showPromptModal}
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
            <i class="bi bi-magic me-2 text-theme"></i>{m.aiPromptTitle()}
          </h5>
          <button
            type="button"
            class="btn-close"
            onclick={() => (showPromptModal = false)}
            disabled={promptLoading || refineLoading || dryRunLoading || promptSaveLoading}
          ></button>
        </div>

        <div class="modal-body" style="max-height:70vh;overflow-y:auto">
          {#if promptError}
            <div class="alert alert-danger small py-2 mb-3">
              <button type="button" class="btn-close btn-close-sm float-end" onclick={() => (promptError = null)}></button>
              {promptError}
            </div>
          {/if}

          {#if promptStep === 'input'}
            <div class="mb-3">
              <label class="form-label fw-semibold">{m.aiPromptLabel()}</label>
              <textarea
                class="form-control"
                rows="5"
                placeholder={m.aiPromptPlaceholder()}
                bind:value={promptText}
                disabled={promptLoading}
              ></textarea>
            </div>

          {:else if promptStep === 'draft' && promptDraft}
            <!-- Draft status header -->
            <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
              <span class="badge {draftStatusBadge(promptDraft.status)}">
                {draftStatusLabel(promptDraft.status)}
              </span>
              {#if promptDraft.sourceFamily}
                <span class="badge bg-secondary fw-normal">{promptDraft.sourceFamily}</span>
              {/if}
              {#if promptSaved}
                <span class="badge bg-success">
                  <i class="bi bi-check-circle me-1"></i>{m.aiPromptStatusSaved()}
                </span>
              {/if}
            </div>

            <!-- Prompt as parsed -->
            {#if promptDraft.redactedPrompt}
              <div class="mb-3 p-2 rounded bg-inverse-subtle border small text-inverse text-opacity-75">
                <i class="bi bi-chat-quote me-1 text-theme"></i>{promptDraft.redactedPrompt}
              </div>
            {/if}

            <!-- Warnings -->
            {#if promptDraft.warnings?.length}
              <div class="alert alert-warning small py-2 mb-3">
                <i class="bi bi-exclamation-triangle me-2"></i>
                <ul class="mb-0 mt-1 ps-3">
                  {#each promptDraft.warnings as w}<li>{w}</li>{/each}
                </ul>
              </div>
            {/if}

            <!-- Match Conditions -->
            <div class="mb-3">
              <div class="fw-semibold small mb-2">{m.aiSuggestMatchRules()}</div>
              {#if promptDraft.matchConditions?.length}
                <div class="table-responsive">
                  <table class="table table-sm align-middle mb-0 small">
                    <thead><tr><th>Field</th><th>Operator</th><th>Value</th></tr></thead>
                    <tbody>
                      {#each promptDraft.matchConditions as cond}
                        <tr>
                          <td class="font-monospace">{cond.field}</td>
                          <td>{cond.operator}</td>
                          <td class="font-monospace">{String(cond.value ?? '—')}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {:else}
                <p class="text-muted small mb-0">No conditions detected</p>
              {/if}
            </div>

            <!-- Missing Fields — show answer form -->
            {#if promptDraft.missingFields?.length}
              <div class="mb-3 border-top pt-3">
                <div class="fw-semibold small mb-2 text-warning">
                  <i class="bi bi-exclamation-circle me-1"></i>
                  Missing information — please fill in the fields below then click Refine
                </div>
                {#each promptDraft.missingFields as hint}
                  <div class="mb-2">
                    <label class="form-label small mb-1">
                      <code class="text-theme">{hint.field}</code>
                      <span class="text-muted ms-1">— {hint.reason}</span>
                    </label>
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      placeholder="Enter value for {hint.field}..."
                      bind:value={refineAnswers[hint.field]}
                      disabled={refineLoading}
                    />
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Review Summary -->
            {#if promptDraft.reviewSummary?.length}
              <div class="mb-3">
                <div class="fw-semibold small mb-1">Review</div>
                <ul class="small mb-0 ps-3">
                  {#each promptDraft.reviewSummary as line}<li>{line}</li>{/each}
                </ul>
              </div>
            {/if}

            <!-- Dry Run section (show only when ready) -->
            {#if promptDraft.status === 'ready' || promptDraft.status === 'reviewed'}
              <div class="border-top pt-3 mb-3">
                <div class="fw-semibold small mb-2">{m.aiPromptDryRun()}</div>
                <textarea
                  class="form-control form-control-sm font-monospace mb-2"
                  rows="3"
                  placeholder={`{"type": "generalDetect", "value": 1}`}
                  bind:value={dryRunPayload}
                  disabled={dryRunLoading}
                ></textarea>
                <button
                  class="btn btn-sm btn-outline-secondary"
                  onclick={handleDryRun}
                  disabled={dryRunLoading || !dryRunPayload.trim()}
                >
                  {#if dryRunLoading}
                    <span class="spinner-border spinner-border-sm me-1"></span>{m.aiPromptDryRunning()}
                  {:else}
                    <i class="bi bi-play me-1"></i>{m.aiPromptDryRun()}
                  {/if}
                </button>
              </div>
            {/if}

            <!-- Dry Run Result -->
            {#if dryRunResult}
              <div class="alert {dryRunResult.matched ? 'alert-success' : 'alert-warning'} small py-2 mb-3">
                <i class="bi {dryRunResult.matched ? 'bi-check-circle' : 'bi-x-circle'} me-2"></i>
                {dryRunResult.matched ? m.aiPromptDryRunOk() : m.aiPromptDryRunFail()}
                {#if dryRunResult.webhookTargetsCount || dryRunResult.lineTargetsCount || dryRunResult.discordTargetsCount}
                  <span class="ms-2 text-muted">
                    webhook:{dryRunResult.webhookTargetsCount}
                    line:{dryRunResult.lineTargetsCount}
                    discord:{dryRunResult.discordTargetsCount}
                  </span>
                {/if}
                {#if dryRunResult.evaluationDetails?.length}
                  <ul class="mb-0 mt-1 ps-3">
                    {#each dryRunResult.evaluationDetails as d}<li>{d}</li>{/each}
                  </ul>
                {/if}
                {#if dryRunResult.incompleteTargets?.length}
                  <div class="mt-1 text-danger small">Incomplete targets: {dryRunResult.incompleteTargets.join(', ')}</div>
                {/if}
              </div>
            {/if}
          {/if}
        </div>

        <div class="modal-footer flex-wrap gap-2">
          <button
            class="btn btn-secondary"
            onclick={() => (showPromptModal = false)}
            disabled={promptLoading || refineLoading || dryRunLoading || promptSaveLoading}
          >{m.actionCancel()}</button>

          {#if promptStep === 'input'}
            <button
              class="btn btn-theme ms-auto"
              onclick={handleGenerateDraft}
              disabled={promptLoading || !promptText.trim()}
            >
              {#if promptLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>
                {m.aiPromptGenerating()}
              {:else}
                <i class="bi bi-magic me-1"></i>{m.aiPromptGenerate()}
              {/if}
            </button>

          {:else if promptDraft && !promptSaved}
            {#if promptDraft.missingFields?.length}
              <button
                class="btn btn-outline-theme btn-sm"
                onclick={handleRefine}
                disabled={refineLoading || Object.values(refineAnswers).every(v => !v?.trim())}
              >
                {#if refineLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                <i class="bi bi-pencil me-1"></i>{m.aiPromptRefine()}
              </button>
            {/if}
            <button
              class="btn btn-theme ms-auto"
              onclick={handleSaveDraft}
              disabled={promptSaveLoading || refineLoading || dryRunLoading || promptDraft.status === 'incomplete'}
            >
              {#if promptSaveLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>
                {m.aiPromptSaving()}
              {:else}
                <i class="bi bi-floppy me-1"></i>{m.aiPromptSave()}
              {/if}
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
