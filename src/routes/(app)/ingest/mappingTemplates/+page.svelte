<!-- src/routes/(app)/ingest/mappingTemplates/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { page } from '$app/stores'
  import {
    listTemplates,
    createTemplate,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    listSourceProfiles
  } from '$lib/api/ingest'
  import type {
    MappingTemplate, FieldMapping, MatchRule, MatchCondition,
    TemplateDeliveryTarget, ClassificationRule, MessageTemplate,
    DLQConfig, PayloadCondition, SourceProfile
  } from '$lib/api/ingest'
  import { listTargets } from '$lib/api/target'
  import type { DeliveryTarget } from '$lib/types/org'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let templates = $state<MappingTemplate[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })

  // View modal
  let showViewModal = $state(false)
  let viewTemplate = $state<MappingTemplate | null>(null)
  let viewLoading = $state(false)

  // Create / Edit modal
  let showFormModal = $state(false)
  let formMode = $state<'create' | 'edit'>('create')
  let formTemplate = $state<MappingTemplate | null>(null)
  let formLoading = $state(false)
  let formError = $state<string | null>(null)

  const MATCH_FIELDS = [
    'deviceId', 'deviceType', 'vendor', 'protocol',
    'subType', 'eventType', 'rawSchemaVersion', 'rawBodyKeyHash'
  ] as const

  const TARGET_PATHS = [
    { group: 'source',   paths: ['source.deviceId', 'source.deviceType', 'source.vendor', 'source.subType', 'source.protocol'] },
    { group: 'event',    paths: ['eventType', 'occurredAt'] },
    { group: 'location', paths: ['location.lat', 'location.lng', 'location.site', 'location.zone'] },
    { group: 'payload',  paths: ['payload.*'] },
  ]
  const CUSTOM_TARGET = '_custom_'
  let customTargetPaths = $state<Record<number, string>>({})

  let formName = $state('')
  let formMatchKey = $state('')
  let formMatchValue = $state('')
  let formMappings = $state<FieldMapping[]>([])

  // New template fields
  let formDefaultLocale = $state('en')
  let formDeliveryTargets = $state<TemplateDeliveryTarget[]>([])
  let formClassificationRules = $state<ClassificationRule[]>([])
  let formMessageTemplates = $state<MessageTemplate[]>([])
  let formDlqEnabled = $state(false)
  let formDlqMaxRetries = $state(3)
  let formDlqRetryTimeout = $state(300)

  // V2 fields
  let formSourceFamily = $state('')
  let formFinalEventType = $state('')
  let formPriority = $state(0)
  let formMatchAll = $state<MatchCondition[]>([])
  let formMatchAny = $state<MatchCondition[]>([])
  let sourceProfiles = $state<SourceProfile[]>([])
  let showLegacyMatch = $state(false)

  // Available targets for binding
  let availableTargets = $state<DeliveryTarget[]>([])

  // Delete modal
  let showDeleteModal = $state(false)
  let deleteTemplateId = $state<string | null>(null)
  let deleteLoading = $state(false)

  async function load(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    const perPage = untrack(() => pagination.perPage)
    loading = true
    error = null
    try {
      const r = await listTemplates(orgId, page, perPage)
      templates = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function openView(templateId: string) {
    const orgId = $activeOrg?.id
    if (!orgId) return
    viewLoading = true
    showViewModal = true
    viewTemplate = null
    try {
      viewTemplate = await getTemplate(orgId, templateId)
    } catch {
      viewTemplate = templates.find(t => t.templateId === templateId) ?? null
    } finally {
      viewLoading = false
    }
  }

  async function openCreate(prefill?: { sourceFamily?: string; suggestedFields?: string[]; samplePayload?: Record<string, unknown> }) {
    formMode = 'create'
    formTemplate = null
    formName = ''
    formMatchKey = ''
    formMatchValue = ''
    formMappings = [{ sourcePath: '', targetPath: '', required: true }]
    customTargetPaths = {}
    formDefaultLocale = 'en'
    formDeliveryTargets = []
    formClassificationRules = []
    formMessageTemplates = []
    formDlqEnabled = false
    formDlqMaxRetries = 3
    formDlqRetryTimeout = 300
    // V2 fields
    formSourceFamily = prefill?.sourceFamily ?? ''
    formFinalEventType = ''
    formPriority = 0
    formMatchAll = []
    formMatchAny = []
    showLegacyMatch = false
    // Pre-fill from template review
    if (prefill?.suggestedFields?.length && prefill?.samplePayload) {
      formName = `${prefill.sourceFamily ?? 'template'}-${Date.now().toString(36)}`
      formMatchAll = prefill.suggestedFields.map(field => {
        const value = getNestedValue(prefill.samplePayload!, field)
        return { field, operator: 'eq' as const, values: value != null ? [String(value)] : [] }
      })
    }
    formError = null
    showFormModal = true
    const orgId = $activeOrg?.id
    const [targets, profiles] = await Promise.all([
      orgId ? listTargets(orgId).catch(() => [] as DeliveryTarget[]) : Promise.resolve([] as DeliveryTarget[]),
      listSourceProfiles().catch(() => [] as SourceProfile[])
    ])
    availableTargets = targets
    sourceProfiles = profiles
  }

  function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const cleaned = path.startsWith('raw.') ? path.slice(4) : path
    return cleaned.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj)
  }

  async function openEdit(tpl: MappingTemplate) {
    formMode = 'edit'
    formTemplate = tpl
    formName = tpl.name
    const matchEntry = tpl.match
      ? Object.entries(tpl.match).find(([, v]) => v !== undefined && v !== '')
      : undefined
    formMatchKey = matchEntry ? matchEntry[0] : ''
    formMatchValue = matchEntry ? String(matchEntry[1]) : ''
    formMappings = tpl.mappings?.length
      ? tpl.mappings.map(m => ({ ...m }))
      : [{ sourcePath: '', targetPath: '', required: true }]
    const allPaths = TARGET_PATHS.flatMap(g => g.paths)
    const custom: Record<number, string> = {}
    formMappings.forEach((mp, i) => {
      if (mp.targetPath && !allPaths.includes(mp.targetPath)) {
        custom[i] = mp.targetPath
        formMappings[i] = { ...mp, targetPath: CUSTOM_TARGET }
      }
    })
    customTargetPaths = custom
    // New fields
    formDefaultLocale = tpl.defaultLocale ?? 'en'
    formDeliveryTargets = tpl.deliveryTargets?.map(dt => ({ ...dt })) ?? []
    formClassificationRules = tpl.classificationRules?.map(cr => ({ ...cr, when: cr.when.map(w => ({ ...w })), set: { ...cr.set } })) ?? []
    formMessageTemplates = tpl.messageTemplates?.map(mt => ({ ...mt })) ?? []
    formDlqEnabled = tpl.dlq?.enabled ?? false
    formDlqMaxRetries = tpl.dlq?.maxRetries ?? 3
    formDlqRetryTimeout = tpl.dlq?.retryTimeoutSeconds ?? 300
    // V2 fields
    formSourceFamily = tpl.sourceFamily ?? ''
    formFinalEventType = tpl.finalEventType ?? ''
    formPriority = tpl.priority ?? 0
    formMatchAll = tpl.matchAll?.map(c => ({ ...c, values: [...c.values] })) ?? []
    formMatchAny = tpl.matchAny?.map(c => ({ ...c, values: [...c.values] })) ?? []
    showLegacyMatch = !!(tpl.match && Object.values(tpl.match).some(v => v))
    formError = null
    showFormModal = true
    const orgId = $activeOrg?.id
    const [targets, profiles] = await Promise.all([
      orgId ? listTargets(orgId).catch(() => [] as DeliveryTarget[]) : Promise.resolve([] as DeliveryTarget[]),
      listSourceProfiles().catch(() => [] as SourceProfile[])
    ])
    availableTargets = targets
    sourceProfiles = profiles
  }

  function addMapping() {
    formMappings = [...formMappings, { sourcePath: '', targetPath: '', required: false }]
  }

  function removeMapping(i: number) {
    formMappings = formMappings.filter((_, idx) => idx !== i)
  }

  // Delivery Targets helpers
  function addDeliveryTarget() {
    formDeliveryTargets = [...formDeliveryTargets, { targetId: '' }]
  }
  function removeDeliveryTarget(i: number) {
    formDeliveryTargets = formDeliveryTargets.filter((_, idx) => idx !== i)
  }

  // Classification Rules helpers
  function addClassificationRule() {
    formClassificationRules = [...formClassificationRules, {
      name: '', when: [{ field: '', operator: 'eq', values: [] }], set: {}, order: formClassificationRules.length + 1
    }]
  }
  function removeClassificationRule(i: number) {
    formClassificationRules = formClassificationRules.filter((_, idx) => idx !== i)
  }

  // Message Templates helpers
  function addMessageTemplate() {
    formMessageTemplates = [...formMessageTemplates, { channelType: 'webhook', locale: formDefaultLocale, title: '', body: '' }]
  }
  function removeMessageTemplate(i: number) {
    formMessageTemplates = formMessageTemplates.filter((_, idx) => idx !== i)
  }

  // V2 MatchCondition helpers
  function addMatchAllCondition() {
    formMatchAll = [...formMatchAll, { field: '', operator: 'eq', values: [] }]
  }
  function removeMatchAllCondition(i: number) {
    formMatchAll = formMatchAll.filter((_, idx) => idx !== i)
  }
  function addMatchAnyCondition() {
    formMatchAny = [...formMatchAny, { field: '', operator: 'eq', values: [] }]
  }
  function removeMatchAnyCondition(i: number) {
    formMatchAny = formMatchAny.filter((_, idx) => idx !== i)
  }

  async function handleSubmit() {
    const orgId = $activeOrg?.id
    if (!orgId) return

    if (!formName.trim()) {
      formError = m.ingestTemplateNameRequired()
      return
    }

    const match: MatchRule = {}
    if (formMatchKey && formMatchValue.trim()) {
      (match as Record<string, string>)[formMatchKey] = formMatchValue.trim()
    }

    const mappings = formMappings
      .map((mp, i) => ({
        ...mp,
        targetPath: mp.targetPath === CUSTOM_TARGET ? (customTargetPaths[i] ?? '') : mp.targetPath
      }))
      .filter(mp => mp.sourcePath.trim() && mp.targetPath.trim())

    const dlq: DLQConfig = { enabled: formDlqEnabled, maxRetries: formDlqMaxRetries, retryTimeoutSeconds: formDlqRetryTimeout }
    const payload = {
      name: formName.trim(),
      match,
      mappings,
      defaultLocale: formDefaultLocale,
      deliveryTargets: formDeliveryTargets.filter(dt => dt.targetId),
      classificationRules: formClassificationRules.filter(cr => cr.name.trim()),
      messageTemplates: formMessageTemplates.filter(mt => mt.body.trim()),
      dlq,
      // V2 fields
      sourceFamily: formSourceFamily || undefined,
      finalEventType: formFinalEventType.trim() || undefined,
      priority: formPriority,
      matchAll: formMatchAll.filter(c => c.field.trim()),
      matchAny: formMatchAny.filter(c => c.field.trim())
    }

    formLoading = true
    formError = null
    try {
      if (formMode === 'create') {
        const tpl = await createTemplate(orgId, payload)
        templates = [tpl, ...templates]
      } else if (formTemplate) {
        await updateTemplate(orgId, formTemplate.templateId, payload)
        templates = templates.map(t =>
          t.templateId === formTemplate!.templateId
            ? { ...t, ...payload }
            : t
        )
      }
      showFormModal = false
    } catch (e: unknown) {
      formError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      formLoading = false
    }
  }

  function openDelete(templateId: string) {
    deleteTemplateId = templateId
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteTemplateId) return
    deleteLoading = true
    try {
      await deleteTemplate(orgId, deleteTemplateId)
      templates = templates.filter(t => t.templateId !== deleteTemplateId)
      showDeleteModal = false
      deleteTemplateId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function formatDate(d: string): string {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleString('th-TH', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return d }
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.ingestMappingTemplatesTitle())
    if (orgId) {
      untrack(() => {
        load()
        // Check for fromReview query param (navigated from Template Reviews)
        const params = $page.url.searchParams
        if (params.get('fromReview')) {
          const sourceFamily = params.get('sourceFamily') ?? ''
          const suggestedFields = params.get('suggestedFields')?.split(',').filter(Boolean) ?? []
          let samplePayload: Record<string, unknown> = {}
          try { samplePayload = JSON.parse(params.get('samplePayload') ?? '{}') } catch {}
          openCreate({ sourceFamily, suggestedFields, samplePayload })
        }
      })
    } else {
      loading = false
    }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestMappingTemplatesTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  {#if $activeOrg}
    <button class="btn btn-sm btn-theme" onclick={() => openCreate()}>
      <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateCreate()}
    </button>
  {/if}
</div>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()}
    <a href="/orgs" class="alert-link">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>
{:else if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
  </div>
{:else if templates.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-diagram-3 fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50 mb-3">{m.ingestNoTemplates()}</p>
        <button class="btn btn-theme btn-sm" onclick={() => openCreate()}>
          <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateCreate()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.ingestTemplateName()}</th>
          <th>{m.ingestTemplateSourceFamily()}</th>
          <th>{m.ingestTemplatePriority()}</th>
          <th>{m.ingestTemplateMatch()}</th>
          <th>{m.ingestTemplateMappings()}</th>
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
                <span class="text-inverse text-opacity-50 small">-</span>
              {/if}
            </td>
            <td>
              {#if tpl.priority}
                <span class="badge bg-info">{tpl.priority}</span>
              {:else}
                <span class="text-inverse text-opacity-50 small">0</span>
              {/if}
            </td>
            <td>
              {#if tpl.match?.deviceType}
                <span class="badge bg-secondary me-1">deviceType: {tpl.match.deviceType}</span>
              {/if}
              {#if tpl.match?.eventType}
                <span class="badge bg-secondary me-1">eventType: {tpl.match.eventType}</span>
              {/if}
              {#if !tpl.match?.deviceType && !tpl.match?.eventType}
                <span class="text-inverse text-opacity-50 small">-</span>
              {/if}
            </td>
            <td>
              <span class="badge bg-theme-subtle text-theme">{tpl.mappings?.length ?? 0} fields</span>
            </td>
            <td class="small">{formatDate(tpl.createdAt)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-theme me-1" onclick={() => openView(tpl.templateId)} title={m.actionView()}>
                <i class="bi bi-eye"></i>
              </button>
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
        {m.showing()}
        {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)}
        {m.of()} {pagination.total}
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

<!-- ══════════════════════════════════════════ -->
<!-- View Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showViewModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.ingestMappingTemplatesTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showViewModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if viewLoading}
            <div class="text-center py-4"><div class="spinner-border text-theme" role="status"></div></div>
          {:else if viewTemplate}
            <dl class="row mb-3">
              <dt class="col-sm-4">Template ID</dt>
              <dd class="col-sm-8"><code class="small">{viewTemplate.templateId}</code></dd>
              <dt class="col-sm-4">{m.ingestTemplateName()}</dt>
              <dd class="col-sm-8">{viewTemplate.name}</dd>
              <dt class="col-sm-4">{m.eventsCreatedAt()}</dt>
              <dd class="col-sm-8">{formatDate(viewTemplate.createdAt)}</dd>
            </dl>

            {#if viewTemplate.match && Object.keys(viewTemplate.match).some(k => (viewTemplate!.match as Record<string,unknown>)[k])}
              <h6 class="mb-2">{m.ingestTemplateMatch()}</h6>
              <table class="table table-sm mb-3">
                <tbody>
                  {#each Object.entries(viewTemplate.match) as [k, v]}
                    {#if v}
                      <tr><th style="width:40%">{k}</th><td>{v}</td></tr>
                    {/if}
                  {/each}
                </tbody>
              </table>
            {/if}

            <h6 class="mb-2">{m.ingestTemplateMappings()} ({viewTemplate.mappings?.length ?? 0})</h6>
            {#if viewTemplate.mappings?.length}
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>{m.ingestMappingSourcePath()}</th>
                    <th>{m.ingestMappingTargetPath()}</th>
                    <th>{m.ingestMappingRequired()}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each viewTemplate.mappings as mp}
                    <tr>
                      <td class="font-monospace small">{mp.sourcePath}</td>
                      <td class="font-monospace small">{mp.targetPath}</td>
                      <td>
                        {#if mp.required}
                          <i class="bi bi-check-circle-fill text-success"></i>
                        {:else}
                          <span class="text-inverse text-opacity-50">-</span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {:else}
              <p class="text-inverse text-opacity-50 small">{m.ingestNoMappings()}</p>
            {/if}
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ══════════════════════════════════════════ -->
<!-- Create / Edit Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showFormModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {formMode === 'create' ? m.ingestTemplateCreate() : m.ingestTemplateEdit()}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showFormModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if formError}
            <div class="alert alert-danger small py-2">{formError}</div>
          {/if}

          <!-- V2: Source Family -->
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

          <div class="mb-3">
            <label class="form-label fw-semibold" for="tplName">{m.ingestTemplateName()} <span class="text-danger">*</span></label>
            <input id="tplName" type="text" class="form-control" bind:value={formName} disabled={formLoading} placeholder="e.g. Camera Temperature Alert" />
          </div>

          <!-- V2: Final Event Type -->
          <div class="mb-3">
            <label class="form-label fw-semibold" for="tplFinalEventType">{m.ingestTemplateFinalEventType()}</label>
            <input id="tplFinalEventType" type="text" class="form-control" bind:value={formFinalEventType} disabled={formLoading} placeholder="e.g. intrusion" />
            <div class="form-text">{m.ingestTemplateFinalEventTypeHint()}</div>
          </div>

          <!-- V2: Priority -->
          <div class="mb-3">
            <label class="form-label fw-semibold" for="tplPriority">{m.ingestTemplatePriority()}</label>
            <input id="tplPriority" type="number" class="form-control" style="width:120px" bind:value={formPriority} disabled={formLoading} min={0} />
            <div class="form-text">{m.ingestTemplatePriorityHint()}</div>
          </div>

          <!-- V2: matchAll (AND) -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestTemplateMatchAll()}</legend>
            <small class="text-inverse text-opacity-50 d-block mb-2">{m.ingestTemplateMatchAllHint()}</small>
            {#if formMatchAll.length === 0}
              <p class="text-inverse text-opacity-50 small mb-2">{m.ingestTemplateNoConditions()}</p>
            {:else}
              {#each formMatchAll as cond, i}
                <div class="row g-1 mb-1 align-items-center">
                  <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm font-monospace" placeholder={m.ingestTemplateConditionFieldPlaceholder()} bind:value={formMatchAll[i].field} disabled={formLoading} />
                  </div>
                  <div class="col-md-2">
                    <select class="form-select form-select-sm" bind:value={formMatchAll[i].operator} disabled={formLoading}>
                      <option value="eq">{m.ingestTemplateConditionOperatorEq()}</option>
                      <option value="in">{m.ingestTemplateConditionOperatorIn()}</option>
                      <option value="contains">{m.ingestTemplateConditionOperatorContains()}</option>
                      <option value="prefix">{m.ingestTemplateConditionOperatorPrefix()}</option>
                    </select>
                  </div>
                  <div class="col-md-5">
                    <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateConditionValues() + ' (comma separated)'} value={formMatchAll[i].values.join(', ')} oninput={(e) => { formMatchAll[i].values = (e.currentTarget as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }} disabled={formLoading} />
                  </div>
                  <div class="col-md-1">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick={() => removeMatchAllCondition(i)} disabled={formLoading} title={m.actionDelete()}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
            <button type="button" class="btn btn-sm btn-outline-theme" onclick={addMatchAllCondition} disabled={formLoading}>
              <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateAddCondition()}
            </button>
          </fieldset>

          <!-- V2: matchAny (OR) -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestTemplateMatchAny()}</legend>
            <small class="text-inverse text-opacity-50 d-block mb-2">{m.ingestTemplateMatchAnyHint()}</small>
            {#if formMatchAny.length === 0}
              <p class="text-inverse text-opacity-50 small mb-2">{m.ingestTemplateNoConditions()}</p>
            {:else}
              {#each formMatchAny as cond, i}
                <div class="row g-1 mb-1 align-items-center">
                  <div class="col-md-4">
                    <input type="text" class="form-control form-control-sm font-monospace" placeholder={m.ingestTemplateConditionFieldPlaceholder()} bind:value={formMatchAny[i].field} disabled={formLoading} />
                  </div>
                  <div class="col-md-2">
                    <select class="form-select form-select-sm" bind:value={formMatchAny[i].operator} disabled={formLoading}>
                      <option value="eq">{m.ingestTemplateConditionOperatorEq()}</option>
                      <option value="in">{m.ingestTemplateConditionOperatorIn()}</option>
                      <option value="contains">{m.ingestTemplateConditionOperatorContains()}</option>
                      <option value="prefix">{m.ingestTemplateConditionOperatorPrefix()}</option>
                    </select>
                  </div>
                  <div class="col-md-5">
                    <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateConditionValues() + ' (comma separated)'} value={formMatchAny[i].values.join(', ')} oninput={(e) => { formMatchAny[i].values = (e.currentTarget as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }} disabled={formLoading} />
                  </div>
                  <div class="col-md-1">
                    <button type="button" class="btn btn-sm btn-outline-danger" onclick={() => removeMatchAnyCondition(i)} disabled={formLoading} title={m.actionDelete()}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
            <button type="button" class="btn btn-sm btn-outline-theme" onclick={addMatchAnyCondition} disabled={formLoading}>
              <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateAddCondition()}
            </button>
          </fieldset>

          <!-- Legacy Match (V1) — collapsible -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">
              <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" onclick={() => (showLegacyMatch = !showLegacyMatch)}>
                <i class="bi" class:bi-chevron-right={!showLegacyMatch} class:bi-chevron-down={showLegacyMatch}></i>
                {m.ingestTemplateLegacyMatch()} <span class="text-inverse text-opacity-50 fw-normal">({m.eventsNoteOptional()})</span>
              </button>
            </legend>
            {#if showLegacyMatch}
            <div class="row g-2 align-items-end">
              <div class="col-md-5">
                <label class="form-label small mb-1" for="matchKey">Field</label>
                <select
                  id="matchKey"
                  class="form-select form-select-sm font-monospace"
                  bind:value={formMatchKey}
                  disabled={formLoading}
                >
                  <option value="">— {m.actionSelect()} —</option>
                  {#each MATCH_FIELDS as f}
                    <option value={f}>{f}</option>
                  {/each}
                </select>
              </div>
              <div class="col-auto d-flex align-items-end pb-1">
                <span class="text-inverse text-opacity-50">=</span>
              </div>
              <div class="col">
                <label class="form-label small mb-1" for="matchValue">Value</label>
                <input
                  id="matchValue"
                  type="text"
                  class="form-control form-control-sm font-monospace"
                  bind:value={formMatchValue}
                  disabled={formLoading || !formMatchKey}
                  placeholder={formMatchKey ? `e.g. ${formMatchKey === 'deviceType' ? 'camera' : formMatchKey === 'eventType' ? 'temperature_alert' : '...'}` : ''}
                />
              </div>
              {#if formMatchKey && formMatchValue}
                <div class="col-auto d-flex align-items-end pb-1">
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-secondary"
                    onclick={() => { formMatchKey = ''; formMatchValue = '' }}
                    disabled={formLoading}
                    title="Clear"
                  ><i class="bi bi-x-lg"></i></button>
                </div>
              {/if}
            </div>
            {/if}
          </fieldset>

          <div class="mb-2">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <span class="fw-semibold">{m.ingestTemplateMappings()}</span>
              <button type="button" class="btn btn-sm btn-outline-theme" onclick={addMapping} disabled={formLoading}>
                <i class="bi bi-plus-lg me-1"></i>{m.actionAdd()}
              </button>
            </div>

            {#if formMappings.length === 0}
              <p class="text-inverse text-opacity-50 small">{m.ingestNoMappings()}</p>
            {:else}
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>Source Path</th>
                    <th>Target Path</th>
                    <th style="width:90px">{m.ingestMappingRequired()}</th>
                    <th style="width:40px"></th>
                  </tr>
                </thead>
                <tbody>
                  {#each formMappings as mp, i}
                    <tr>
                      <td>
                        <input
                          type="text"
                          class="form-control form-control-sm font-monospace"
                          bind:value={formMappings[i].sourcePath}
                          placeholder="e.g. deviceId"
                          disabled={formLoading}
                        />
                      </td>
                      <td>
                        <select
                          class="form-select form-select-sm font-monospace"
                          value={formMappings[i].targetPath}
                          onchange={(e) => {
                            formMappings[i].targetPath = (e.currentTarget as HTMLSelectElement).value
                            if ((e.currentTarget as HTMLSelectElement).value !== CUSTOM_TARGET) {
                              const next = { ...customTargetPaths }
                              delete next[i]
                              customTargetPaths = next
                            }
                          }}
                          disabled={formLoading}
                        >
                          <option value="">— {m.actionSelect()} —</option>
                          {#each TARGET_PATHS as group}
                            <optgroup label={group.group}>
                              {#each group.paths as p}
                                <option value={p}>{p}</option>
                              {/each}
                            </optgroup>
                          {/each}
                          <option value={CUSTOM_TARGET}>{m.ingestMappingTargetCustom()}</option>
                        </select>
                        {#if formMappings[i].targetPath === CUSTOM_TARGET}
                          <input
                            type="text"
                            class="form-control form-control-sm font-monospace mt-1"
                            placeholder="e.g. payload.temperature"
                            value={customTargetPaths[i] ?? ''}
                            oninput={(e) => { customTargetPaths = { ...customTargetPaths, [i]: (e.currentTarget as HTMLInputElement).value } }}
                            disabled={formLoading}
                          />
                        {/if}
                      </td>
                      <td class="text-center">
                        <input
                          type="checkbox"
                          class="form-check-input"
                          bind:checked={formMappings[i].required}
                          disabled={formLoading}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          title={m.actionDelete()}
                          onclick={() => removeMapping(i)}
                          disabled={formLoading || formMappings.length <= 1}
                        ><i class="bi bi-trash"></i></button>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            {/if}
          </div>

          <hr />

          <!-- Default Locale -->
          <div class="mb-3">
            <label class="form-label fw-semibold" for="tplLocale">{m.ingestTemplateDefaultLocale()}</label>
            <select id="tplLocale" class="form-select form-select-sm" style="width:auto" bind:value={formDefaultLocale} disabled={formLoading}>
              <option value="en">English</option>
              <option value="th">Thai</option>
            </select>
          </div>

          <!-- Delivery Targets binding -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestTemplateDeliveryTargets()}</legend>
            <small class="text-inverse text-opacity-50 d-block mb-2">{m.ingestTemplateDeliveryTargetsHint()}</small>
            {#if formDeliveryTargets.length === 0}
              <p class="text-inverse text-opacity-50 small mb-2">{m.ingestTemplateNoDeliveryTargets()}</p>
            {:else}
              {#each formDeliveryTargets as dt, i}
                <div class="border rounded p-2 mb-2 bg-inverse bg-opacity-5">
                  <div class="d-flex gap-2 align-items-start">
                    <div class="flex-grow-1">
                      <select class="form-select form-select-sm mb-1" bind:value={formDeliveryTargets[i].targetId} disabled={formLoading}>
                        <option value="">{m.ingestTemplateSelectTarget()}</option>
                        {#each availableTargets as at}
                          <option value={at.id}>{at.name} ({at.type})</option>
                        {/each}
                      </select>
                      <div class="row g-1">
                        <div class="col-md-6">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateEventClasses() + ' (comma separated)'} value={(formDeliveryTargets[i].eventClasses ?? []).join(', ')} oninput={(e) => { formDeliveryTargets[i].eventClasses = (e.currentTarget as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }} disabled={formLoading} />
                        </div>
                        <div class="col-md-6">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateEventSeverities() + ' (comma separated)'} value={(formDeliveryTargets[i].eventSeverities ?? []).join(', ')} oninput={(e) => { formDeliveryTargets[i].eventSeverities = (e.currentTarget as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }} disabled={formLoading} />
                        </div>
                      </div>
                      <input type="text" class="form-control form-control-sm mt-1" placeholder={m.ingestTemplateMessageTemplateKey()} bind:value={formDeliveryTargets[i].messageTemplateKey} disabled={formLoading} />
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" title={m.actionDelete()} onclick={() => removeDeliveryTarget(i)} disabled={formLoading}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
            <button type="button" class="btn btn-sm btn-outline-theme" onclick={addDeliveryTarget} disabled={formLoading}>
              <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateAddDeliveryTarget()}
            </button>
          </fieldset>

          <!-- Classification Rules -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestTemplateClassificationRules()}</legend>
            <small class="text-inverse text-opacity-50 d-block mb-2">{m.ingestTemplateClassificationRulesHint()}</small>
            {#if formClassificationRules.length === 0}
              <p class="text-inverse text-opacity-50 small mb-2">{m.ingestTemplateNoClassificationRules()}</p>
            {:else}
              {#each formClassificationRules as rule, i}
                <div class="border rounded p-2 mb-2 bg-inverse bg-opacity-5">
                  <div class="d-flex gap-2 align-items-start">
                    <div class="flex-grow-1">
                      <div class="row g-1 mb-1">
                        <div class="col-md-1">
                          <input type="number" class="form-control form-control-sm" bind:value={formClassificationRules[i].order} min={1} title={m.ingestTemplateRuleOrder()} disabled={formLoading} />
                        </div>
                        <div class="col-md-5">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateRuleName()} bind:value={formClassificationRules[i].name} disabled={formLoading} />
                        </div>
                        <div class="col-md-3">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateRuleSetClass()} bind:value={formClassificationRules[i].set.eventClass} disabled={formLoading} />
                        </div>
                        <div class="col-md-3">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateRuleSetSeverity()} bind:value={formClassificationRules[i].set.eventSeverity} disabled={formLoading} />
                        </div>
                      </div>
                      <small class="text-inverse text-opacity-50">{m.ingestTemplateRuleWhen()}</small>
                      {#each rule.when as cond, ci}
                        <div class="row g-1 mt-1">
                          <div class="col-md-4">
                            <input type="text" class="form-control form-control-sm font-monospace" placeholder={m.ingestTemplateFilterField()} bind:value={formClassificationRules[i].when[ci].field} disabled={formLoading} />
                          </div>
                          <div class="col-md-2">
                            <select class="form-select form-select-sm" bind:value={formClassificationRules[i].when[ci].operator} disabled={formLoading}>
                              <option value="eq">eq</option>
                              <option value="in">in</option>
                            </select>
                          </div>
                          <div class="col-md-6">
                            <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateFilterValues() + ' (comma separated)'} value={formClassificationRules[i].when[ci].values.join(', ')} oninput={(e) => { formClassificationRules[i].when[ci].values = (e.currentTarget as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }} disabled={formLoading} />
                          </div>
                        </div>
                      {/each}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" title={m.actionDelete()} onclick={() => removeClassificationRule(i)} disabled={formLoading}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
            <button type="button" class="btn btn-sm btn-outline-theme" onclick={addClassificationRule} disabled={formLoading}>
              <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateAddClassificationRule()}
            </button>
          </fieldset>

          <!-- Message Templates -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestTemplateMessageTemplates()}</legend>
            {#if formMessageTemplates.length === 0}
              <p class="text-inverse text-opacity-50 small mb-2">{m.ingestTemplateNoMessageTemplates()}</p>
            {:else}
              {#each formMessageTemplates as mt, i}
                <div class="border rounded p-2 mb-2 bg-inverse bg-opacity-5">
                  <div class="d-flex gap-2 align-items-start">
                    <div class="flex-grow-1">
                      <div class="row g-1 mb-1">
                        <div class="col-md-3">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateMessageKey()} bind:value={formMessageTemplates[i].key} disabled={formLoading} />
                        </div>
                        <div class="col-md-3">
                          <select class="form-select form-select-sm" bind:value={formMessageTemplates[i].channelType} disabled={formLoading}>
                            <option value="webhook">Webhook</option>
                            <option value="line">LINE</option>
                            <option value="discord">Discord</option>
                            <option value="telegram">Telegram</option>
                          </select>
                        </div>
                        <div class="col-md-2">
                          <select class="form-select form-select-sm" bind:value={formMessageTemplates[i].locale} disabled={formLoading}>
                            <option value="en">EN</option>
                            <option value="th">TH</option>
                          </select>
                        </div>
                        <div class="col-md-4">
                          <input type="text" class="form-control form-control-sm" placeholder={m.ingestTemplateMessageTitle()} bind:value={formMessageTemplates[i].title} disabled={formLoading} />
                        </div>
                      </div>
                      <textarea class="form-control form-control-sm" rows="2" placeholder={m.ingestTemplateMessageBody()} bind:value={formMessageTemplates[i].body} disabled={formLoading}></textarea>
                    </div>
                    <button type="button" class="btn btn-sm btn-outline-danger" title={m.actionDelete()} onclick={() => removeMessageTemplate(i)} disabled={formLoading}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
            <button type="button" class="btn btn-sm btn-outline-theme" onclick={addMessageTemplate} disabled={formLoading}>
              <i class="bi bi-plus-lg me-1"></i>{m.ingestTemplateAddMessageTemplate()}
            </button>
          </fieldset>

          <!-- DLQ Config -->
          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestTemplateDlqConfig()}</legend>
            <div class="form-check form-switch mb-2">
              <input id="dlqEnabled" type="checkbox" class="form-check-input" bind:checked={formDlqEnabled} disabled={formLoading} />
              <label class="form-check-label" for="dlqEnabled">{m.ingestTemplateDlqEnabled()}</label>
            </div>
            {#if formDlqEnabled}
              <div class="row g-2">
                <div class="col-md-6">
                  <label class="form-label small mb-1" for="dlqMaxRetries">{m.ingestTemplateDlqMaxRetries()}</label>
                  <input id="dlqMaxRetries" type="number" class="form-control form-control-sm" bind:value={formDlqMaxRetries} min={0} max={100} disabled={formLoading} />
                </div>
                <div class="col-md-6">
                  <label class="form-label small mb-1" for="dlqTimeout">{m.ingestTemplateDlqRetryTimeout()}</label>
                  <input id="dlqTimeout" type="number" class="form-control form-control-sm" bind:value={formDlqRetryTimeout} min={0} step={60} disabled={formLoading} />
                </div>
              </div>
            {/if}
          </fieldset>
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

<!-- ══════════════════════════════════════════ -->
<!-- Delete Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showDeleteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger"><i class="bi bi-exclamation-triangle me-2"></i>{m.eventsDeleteTitle()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestTemplateDeleteWarning()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; deleteTemplateId = null }} disabled={deleteLoading}>{m.actionCancel()}</button>
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
