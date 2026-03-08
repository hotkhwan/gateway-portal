<!-- src/routes/(app)/ingest/templates/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    listTemplates,
    createTemplate,
    getTemplate,
    updateTemplate,
    deleteTemplate,
    listSourceProfiles
  } from '$lib/api/ingest'
  import type { MappingTemplate, MatchCondition, FieldMapping } from '$lib/api/ingest'
  import type { SourceProfile } from '$lib/types/ingest'
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
  let formFinalEventType = $state('')
  let formPriority = $state(0)

  // Match tab
  let formMatchAll = $state<MatchCondition[]>([])
  let formMatchAny = $state<MatchCondition[]>([])

  // Field mapping tab
  let formMappings = $state<FieldMapping[]>([])

  // Target tab — delivery targets (IDs as comma-separated string for simplicity)
  let formDeliveryTargetIds = $state('')

  // Delete confirm
  let showDeleteModal = $state(false)
  let deleteId = $state<string | null>(null)
  let deleteLoading = $state(false)

  const OPERATORS = ['eq', 'in', 'contains', 'prefix'] as const

  async function load(page = 1) {
    const orgId = $activeOrg?.id
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
    formFinalEventType = ''
    formPriority = 0
    formMatchAll = []
    formMatchAny = []
    formMappings = []
    formDeliveryTargetIds = ''
    formError = null
    formTab = 'basic'
    editingId = null
  }

  async function openCreate() {
    resetForm()
    formMode = 'create'
    showFormModal = true
    try { sourceProfiles = await listSourceProfiles() } catch { sourceProfiles = [] }
  }

  async function openEdit(template: MappingTemplate) {
    resetForm()
    formMode = 'edit'
    editingId = template.templateId
    formName = template.name
    formSourceFamily = template.sourceFamily ?? ''
    formEnabled = template.enabled ?? true
    formFinalEventType = template.finalEventType ?? ''
    formPriority = template.priority ?? 0
    formMatchAll = (template.matchAll ?? []).map(c => ({ ...c, values: [...c.values] }))
    formMatchAny = (template.matchAny ?? []).map(c => ({ ...c, values: [...c.values] }))
    formMappings = (template.mappings ?? []).map(m => ({ ...m }))
    formDeliveryTargetIds = (template.deliveryTargets ?? []).map(t => t.targetId).join(', ')
    showFormModal = true
    try { sourceProfiles = await listSourceProfiles() } catch { sourceProfiles = [] }
  }

  async function handleSubmit() {
    if (!formName.trim()) { formError = m.ingestTemplateNameRequired(); return }
    const orgId = $activeOrg?.id
    if (!orgId) return

    const payload = {
      name: formName.trim(),
      enabled: formEnabled,
      sourceFamily: formSourceFamily || undefined,
      finalEventType: formFinalEventType.trim() || undefined,
      priority: formPriority || undefined,
      matchAll: formMatchAll.length ? formMatchAll : undefined,
      matchAny: formMatchAny.length ? formMatchAny : undefined,
      mappings: formMappings,
      deliveryTargets: formDeliveryTargetIds.trim()
        ? formDeliveryTargetIds.split(',').map(id => ({ targetId: id.trim() })).filter(t => t.targetId)
        : undefined
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
    const orgId = $activeOrg?.id
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

  function formatDate(d: string): string {
    if (!d) return '-'
    try { return new Date(d).toLocaleString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }
    catch { return d }
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.ingestTemplatesTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestTemplatesTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name} &mdash; {m.ingestTemplatesSubtitle()}
      </small>
    {/if}
  </div>
  {#if $activeOrg}
    <button class="btn btn-sm btn-theme" onclick={openCreate}>
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
            <th>{m.ingestTemplatePriority()}</th>
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
              <td class="small">{tpl.priority ?? 0}</td>
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
                  onclick={() => (formTab = tab.key as typeof formTab)}>
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
            <div class="row g-3 mb-3">
              <div class="col-md-6">
                <label class="form-label fw-semibold" for="tplFinalEventType">{m.ingestTemplateFinalEventType()}</label>
                <input id="tplFinalEventType" type="text" class="form-control" bind:value={formFinalEventType} disabled={formLoading} placeholder="e.g. motion_detected" />
                <div class="form-text">{m.ingestTemplateFinalEventTypeHint()}</div>
              </div>
              <div class="col-md-6">
                <label class="form-label fw-semibold" for="tplPriority">{m.ingestTemplatePriority()}</label>
                <input id="tplPriority" type="number" class="form-control" bind:value={formPriority} disabled={formLoading} min="0" />
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
                    <input type="text" class="form-control form-control-sm font-monospace"
                      placeholder={m.ingestTemplateConditionFieldPlaceholder()}
                      bind:value={cond.field} disabled={formLoading} />
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
                    <input type="text" class="form-control form-control-sm font-monospace"
                      placeholder={m.ingestTemplateConditionFieldPlaceholder()}
                      bind:value={cond.field} disabled={formLoading} />
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
            <div class="mb-3">
              <label class="form-label fw-semibold" for="tplDeliveryTargets">{m.ingestTemplateDeliveryTargets()}</label>
              <input id="tplDeliveryTargets" type="text" class="form-control"
                bind:value={formDeliveryTargetIds} disabled={formLoading}
                placeholder="target-id-1, target-id-2" />
              <div class="form-text">{m.ingestTemplateDeliveryTargetsHint()}</div>
            </div>
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
