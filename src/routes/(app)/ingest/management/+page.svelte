<!-- src/routes/(app)/ingest/management/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { resolve } from '$app/paths'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    listPendingEvents,
    getPendingEvent,
    updatePendingEvent,
    approveEvent,
    rejectEvent,
    deletePendingEvent,
    bulkApprove,
    bulkReject,
    bulkDelete,
    bulkApplyTemplate,
    listTemplates,
    createTemplate
  } from '$lib/api/ingest'
  import type { PendingEvent, MappingTemplate, MatchRule } from '$lib/api/ingest'

  // ── Template-from-event constants ───────────
  const MATCH_FIELDS = ['deviceId','deviceType','vendor','protocol','subType','eventType','rawSchemaVersion','rawBodyKeyHash'] as const
  type MatchField = typeof MATCH_FIELDS[number]
  const TARGET_PATHS = [
    { group: 'source',   paths: ['source.deviceId','source.deviceType','source.vendor','source.subType','source.protocol'] },
    { group: 'event',    paths: ['eventType','occurredAt'] },
    { group: 'location', paths: ['location.lat','location.lng','location.site','location.zone'] },
    { group: 'payload',  paths: ['payload.*'] }
  ] as const
  const CUSTOM_TARGET = '_custom_'

  function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    return Object.keys(obj).flatMap(key => {
      const full = prefix ? `${prefix}.${key}` : key
      const val = obj[key]
      if (val !== null && typeof val === 'object' && !Array.isArray(val))
        return [full, ...flattenKeys(val as Record<string, unknown>, full)]
      return [full]
    })
  }
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import MapPicker from '$lib/components/leaflet/MapPicker.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let events = $state<PendingEvent[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })

  // View modal
  let showViewModal = $state(false)
  let viewEvent = $state<PendingEvent | null>(null)
  let viewLoading = $state(false)

  // Edit modal
  let showEditModal = $state(false)
  let showMap = $state(false)
  let editEvent = $state<PendingEvent | null>(null)
  let editLoading = $state(false)
  let editError = $state<string | null>(null)
  let editEventType = $state('')
  let editName = $state('')
  let editNote = $state('')
  let editLat = $state<number | undefined>(undefined)
  let editLng = $state<number | undefined>(undefined)

  // Approve modal
  let showApproveModal = $state(false)
  let approveEventId = $state<string | null>(null)
  let approveNote = $state('')
  let approveLoading = $state(false)

  // Reject modal
  let showRejectModal = $state(false)
  let rejectEventId = $state<string | null>(null)
  let rejectNote = $state('')
  let rejectLoading = $state(false)

  // Delete modal
  let showDeleteModal = $state(false)
  let deleteEventId = $state<string | null>(null)
  let deleteLoading = $state(false)

  // Bulk
  let selected = $state<Set<string>>(new Set())
  let allChecked = $derived(events.length > 0 && events.every(e => selected.has(e.eventId)))
  let bulkLoading = $state(false)
  let bulkError = $state<string | null>(null)

  // Apply Template modal
  let showApplyTemplateModal = $state(false)
  let templates = $state<MappingTemplate[]>([])
  let templatesLoading = $state(false)
  let selectedTemplateId = $state('')
  let applyTemplateLoading = $state(false)

  // Create Template from Event panel (inside view modal)
  let showCreateTplPanel = $state(false)
  let tmplName = $state('')
  let tmplMatchKey = $state<MatchField>('eventType')
  let tmplMatchValue = $state('')
  let tmplMappings = $state<Array<{ sourcePath: string; targetPath: string; required: boolean }>>([])
  let tmplCustomTargets = $state<Record<number, string>>({})
  let tmplLoading = $state(false)
  let tmplError = $state<string | null>(null)
  let tmplSuccess = $state(false)
  let rawBodyKeys = $derived(viewEvent?.rawBody ? flattenKeys(viewEvent.rawBody as Record<string, unknown>) : [])

  async function loadEvents(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    const perPage = untrack(() => pagination.perPage)

    loading = true
    error = null
    try {
      const r = await listPendingEvents(orgId, page, perPage)
      events = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
      selected = new Set()
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function viewEventDetails(eventId: string) {
    const orgId = $activeOrg?.id
    if (!orgId) return
    viewLoading = true
    showViewModal = true
    viewEvent = null
    try {
      viewEvent = await getPendingEvent(orgId, eventId)
    } catch {
      viewEvent = events.find(e => e.eventId === eventId) ?? null
    } finally {
      viewLoading = false
    }
  }

  function openEditModal(event: PendingEvent) {
    editEvent = event
    editEventType = event.eventType ?? ''
    editName = event.name ?? ''
    editNote = event.note ?? ''
    editLat = event.lat
    editLng = event.lng
    editError = null
    showMap = false
    showEditModal = true
    setTimeout(() => { showMap = true }, 100)
  }

  async function handleSaveEdit() {
    const orgId = $activeOrg?.id
    if (!orgId || !editEvent) return
    editLoading = true
    editError = null
    try {
      await updatePendingEvent(orgId, editEvent.eventId, {
        eventType: editEventType || undefined,
        name: editName || undefined,
        lat: editLat,
        lng: editLng,
        note: editNote || undefined
      })
      const id = editEvent.eventId
      events = events.map(e =>
        e.eventId === id
          ? { ...e, eventType: editEventType, name: editName, note: editNote, lat: editLat, lng: editLng }
          : e
      )
      showEditModal = false
      showMap = false
    } catch (e: unknown) {
      editError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      editLoading = false
    }
  }

  function openApproveModal(eventId: string) {
    approveEventId = eventId
    approveNote = ''
    showApproveModal = true
  }

  async function handleApprove() {
    const orgId = $activeOrg?.id
    if (!orgId || !approveEventId) return
    approveLoading = true
    try {
      await approveEvent(orgId, approveEventId, approveNote)
      events = events.filter(e => e.eventId !== approveEventId)
      showApproveModal = false
      approveEventId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      approveLoading = false
    }
  }

  function openRejectModal(eventId: string) {
    rejectEventId = eventId
    rejectNote = ''
    showRejectModal = true
  }

  async function handleReject() {
    const orgId = $activeOrg?.id
    if (!orgId || !rejectEventId) return
    rejectLoading = true
    try {
      await rejectEvent(orgId, rejectEventId, rejectNote)
      events = events.map(e =>
        e.eventId === rejectEventId ? { ...e, statusName: 'rejected' } : e
      )
      showRejectModal = false
      rejectEventId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      rejectLoading = false
    }
  }

  function openDeleteModal(eventId: string) {
    deleteEventId = eventId
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteEventId) return
    deleteLoading = true
    try {
      await deletePendingEvent(orgId, deleteEventId)
      events = events.filter(e => e.eventId !== deleteEventId)
      showDeleteModal = false
      deleteEventId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  // ── Bulk ──────────────────────────────────
  function toggleAll() {
    if (allChecked) {
      selected = new Set()
    } else {
      selected = new Set(events.map(e => e.eventId))
    }
  }

  function toggleOne(eventId: string) {
    const next = new Set(selected)
    if (next.has(eventId)) next.delete(eventId)
    else next.add(eventId)
    selected = next
  }

  async function handleBulkApprove() {
    const orgId = $activeOrg?.id
    if (!orgId || selected.size === 0) return
    bulkLoading = true
    bulkError = null
    try {
      await bulkApprove(orgId, [...selected])
      await loadEvents(pagination.page)
    } catch (e: unknown) {
      bulkError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      bulkLoading = false
    }
  }

  async function handleBulkReject() {
    const orgId = $activeOrg?.id
    if (!orgId || selected.size === 0) return
    bulkLoading = true
    bulkError = null
    try {
      await bulkReject(orgId, [...selected])
      await loadEvents(pagination.page)
    } catch (e: unknown) {
      bulkError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      bulkLoading = false
    }
  }

  async function handleBulkDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || selected.size === 0) return
    bulkLoading = true
    bulkError = null
    try {
      await bulkDelete(orgId, [...selected])
      await loadEvents(pagination.page)
    } catch (e: unknown) {
      bulkError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      bulkLoading = false
    }
  }

  async function openApplyTemplateModal() {
    const orgId = $activeOrg?.id
    if (!orgId) return
    templatesLoading = true
    showApplyTemplateModal = true
    selectedTemplateId = ''
    try {
      const r = await listTemplates(orgId)
      templates = r.details
    } catch {
      templates = []
    } finally {
      templatesLoading = false
    }
  }

  async function handleApplyTemplate() {
    const orgId = $activeOrg?.id
    if (!orgId || !selectedTemplateId || selected.size === 0) return
    applyTemplateLoading = true
    try {
      await bulkApplyTemplate(orgId, selectedTemplateId, [...selected])
      showApplyTemplateModal = false
      await loadEvents(pagination.page)
    } catch (e: unknown) {
      bulkError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      applyTemplateLoading = false
    }
  }

  // ── Create Template from Event ──────────────
  function openCreateTemplate() {
    const keys = viewEvent?.rawBody ? flattenKeys(viewEvent.rawBody as Record<string, unknown>) : []
    tmplName = viewEvent?.eventType ? `${viewEvent.eventType} template` : ''
    tmplMatchKey = 'eventType'
    tmplMatchValue = viewEvent?.eventType ?? ''
    tmplMappings = keys.map(k => ({ sourcePath: k, targetPath: '', required: false }))
    tmplCustomTargets = {}
    tmplError = null
    tmplSuccess = false
    showCreateTplPanel = true
  }

  async function handleCreateTemplate() {
    const orgId = $activeOrg?.id
    if (!orgId || !tmplName.trim()) return
    tmplLoading = true
    tmplError = null
    tmplSuccess = false
    try {
      const matchRule: MatchRule = {}
      if (tmplMatchKey && tmplMatchValue.trim()) {
        matchRule[tmplMatchKey] = tmplMatchValue.trim()
      }
      const mappings = tmplMappings
        .map((row, i) => ({
          sourcePath: row.sourcePath,
          targetPath: row.targetPath === CUSTOM_TARGET ? (tmplCustomTargets[i] ?? '') : row.targetPath,
          required: row.required
        }))
        .filter(row => row.sourcePath.trim() && row.targetPath.trim())
      await createTemplate(orgId, {
        name: tmplName.trim(),
        match: Object.keys(matchRule).length ? matchRule : undefined,
        mappings: mappings.length ? mappings : undefined
      })
      tmplSuccess = true
      setTimeout(() => { tmplSuccess = false }, 3000)
    } catch (e: unknown) {
      tmplError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      tmplLoading = false
    }
  }

  // ── Helpers ────────────────────────────────
  function handleMapChange(lat: number, lng: number) {
    editLat = lat
    editLng = lng
  }

  function clearLocation() {
    editLat = undefined
    editLng = undefined
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

  function getStatusBadge(s: string): string {
    switch (s) {
      case 'pending': return 'bg-warning text-dark'
      case 'mapped':  return 'bg-info text-dark'
      case 'approved': return 'bg-success'
      case 'rejected': return 'bg-danger'
      default: return 'bg-secondary'
    }
  }

  function shortId(id: string): string {
    return id?.slice(-8) ?? '-'
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.eventsManagementTitle())
    if (orgId) {
      untrack(() => loadEvents())
    } else {
      loading = false
    }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.eventsManagementTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  <button class="btn btn-sm btn-outline-theme" onclick={() => loadEvents(pagination.page)}>
    <i class="bi bi-arrow-clockwise me-1"></i>{m.actionRefresh()}
  </button>
</div>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()}
    <a href={resolve('/orgs')} class="alert-link">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>
{:else if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => loadEvents()}>{m.actionRefresh()}</button>
  </div>
{:else if events.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-inbox fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50">{m.eventsNoRecords()}</p>
      </div>
    </CardBody>
  </Card>
{:else}
  <!-- Bulk action bar -->
  {#if selected.size > 0}
    <div class="alert alert-theme d-flex align-items-center gap-2 py-2 mb-3">
      {#if bulkError}
        <span class="text-danger small me-2"><i class="bi bi-exclamation-triangle me-1"></i>{bulkError}</span>
      {/if}
      <span class="fw-semibold">{m.ingestSelectedCount({ count: selected.size })}</span>
      <button class="btn btn-sm btn-success ms-auto" onclick={handleBulkApprove} disabled={bulkLoading}>
        {#if bulkLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
        {m.ingestBulkApprove()}
      </button>
      <button class="btn btn-sm btn-warning" onclick={handleBulkReject} disabled={bulkLoading}>
        {m.ingestBulkReject()}
      </button>
      <button class="btn btn-sm btn-outline-theme" onclick={openApplyTemplateModal} disabled={bulkLoading}>
        {m.ingestBulkApplyTemplate()}
      </button>
      <button class="btn btn-sm btn-danger" onclick={handleBulkDelete} disabled={bulkLoading}>
        {m.ingestBulkDelete()}
      </button>
    </div>
  {/if}

  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th style="width:40px">
            <input type="checkbox" class="form-check-input" checked={allChecked} onchange={toggleAll} />
          </th>
          <th>Event ID</th>
          <th>{m.eventsType()}</th>
          <th>{m.eventsNotes()}</th>
          <th>{m.eventsStatus()}</th>
          <th>{m.eventsLocation()}</th>
          <th>{m.eventsCreatedAt()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each events as event (event.eventId)}
          <tr>
            <td>
              <input
                type="checkbox"
                class="form-check-input"
                checked={selected.has(event.eventId)}
                onchange={() => toggleOne(event.eventId)}
              />
            </td>
            <td class="font-monospace small text-inverse text-opacity-75">
              {shortId(event.eventId)}
            </td>
            <td>
              {#if event.eventType}
                <span class="badge bg-theme-subtle text-theme border border-theme border-opacity-25">
                  {event.eventType}
                </span>
              {:else}
                <span class="text-inverse text-opacity-50 small">-</span>
              {/if}
            </td>
            <td class="small">{event.name || '-'}</td>
            <td>
              <span class="badge {getStatusBadge(event.statusName)}">
                {event.statusName.toUpperCase()}
              </span>
            </td>
            <td class="small font-monospace">
              {#if event.lat !== undefined && event.lng !== undefined}
                {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
              {:else}
                <span class="text-inverse text-opacity-50">-</span>
              {/if}
            </td>
            <td class="small">{formatDate(event.createdAt)}</td>
            <td class="text-end">
              <button
                class="btn btn-sm btn-outline-theme me-1"
                onclick={() => viewEventDetails(event.eventId)}
                title={m.actionView()}
              ><i class="bi bi-eye"></i></button>
              <button
                class="btn btn-sm btn-outline-secondary me-1"
                onclick={() => openEditModal(event)}
                title={m.actionEdit()}
              ><i class="bi bi-pencil"></i></button>
              <button
                class="btn btn-sm btn-outline-success me-1"
                onclick={() => openApproveModal(event.eventId)}
                title={m.eventsApprove()}
              ><i class="bi bi-check-lg"></i></button>
              <button
                class="btn btn-sm btn-outline-warning me-1"
                onclick={() => openRejectModal(event.eventId)}
                title={m.eventsReject()}
              ><i class="bi bi-x-lg"></i></button>
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => openDeleteModal(event.eventId)}
                title={m.actionDelete()}
              ><i class="bi bi-trash"></i></button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
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
            <button class="page-link" onclick={() => loadEvents(pagination.page - 1)}>{m.actionPrevPage()}</button>
          </li>
          {#each Array(pagination.totalPages) as _, i}
            <li class="page-item" class:active={i + 1 === pagination.page}>
              <button class="page-link" onclick={() => loadEvents(i + 1)}>{i + 1}</button>
            </li>
          {/each}
          <li class="page-item" class:disabled={pagination.page === pagination.totalPages}>
            <button class="page-link" onclick={() => loadEvents(pagination.page + 1)}>{m.actionNextPage()}</button>
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
    <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.eventsViewTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => { showViewModal = false; showCreateTplPanel = false }}></button>
        </div>
        <div class="modal-body">
          {#if viewLoading}
            <div class="text-center py-4">
              <div class="spinner-border text-theme" role="status"></div>
            </div>
          {:else if viewEvent}
            <table class="table table-sm">
              <tbody>
                <tr><th style="width:30%">Event ID</th><td><code class="small">{viewEvent.eventId}</code></td></tr>
                {#if viewEvent.eventType}
                  <tr><th>{m.eventsType()}</th><td>{viewEvent.eventType}</td></tr>
                {/if}
                {#if viewEvent.name}
                  <tr><th>{m.eventsNotes()}</th><td>{viewEvent.name}</td></tr>
                {/if}
                <tr>
                  <th>{m.eventsStatus()}</th>
                  <td><span class="badge {getStatusBadge(viewEvent.statusName)}">{viewEvent.statusName.toUpperCase()}</span></td>
                </tr>
                {#if viewEvent.sourceIp}
                  <tr><th>Source IP</th><td><code class="small">{viewEvent.sourceIp}</code></td></tr>
                {/if}
                {#if viewEvent.lat !== undefined}
                  <tr><th>Lat / Lng</th><td class="font-monospace small">{viewEvent.lat}, {viewEvent.lng}</td></tr>
                {/if}
                {#if viewEvent.note}
                  <tr><th>{m.eventsNotes()}</th><td>{viewEvent.note}</td></tr>
                {/if}
                <tr><th>{m.eventsCreatedAt()}</th><td>{formatDate(viewEvent.createdAt)}</td></tr>
                <tr><th>Updated At</th><td>{formatDate(viewEvent.updatedAt)}</td></tr>
                {#if viewEvent.approvedAt}
                  <tr><th>Approved At</th><td>{formatDate(viewEvent.approvedAt)}</td></tr>
                {/if}
                {#if viewEvent.approvedBy}
                  <tr><th>Approved By</th><td><code class="small">{viewEvent.approvedBy}</code></td></tr>
                {/if}
              </tbody>
            </table>

            {#if viewEvent.rawBody}
              <hr />
              <h6 class="mb-2">Raw Body</h6>
              <pre class="bg-dark text-light p-3 rounded small" style="max-height:250px;overflow-y:auto">{JSON.stringify(viewEvent.rawBody, null, 2)}</pre>
            {/if}

            <!-- ── Create Template Panel ── -->
            {#if showCreateTplPanel}
              <hr />
              <div class="d-flex align-items-center mb-3">
                <h6 class="mb-0 flex-grow-1">
                  <i class="bi bi-diagram-3 text-theme me-2"></i>{m.ingestCreateTemplateFromEvent()}
                </h6>
                <button class="btn btn-sm btn-outline-secondary" title={m.actionClose()} onclick={() => { showCreateTplPanel = false }}>
                  <i class="bi bi-x-lg"></i>
                </button>
              </div>

              {#if tmplError}
                <div class="alert alert-danger small py-2">{tmplError}</div>
              {/if}
              {#if tmplSuccess}
                <div class="alert alert-success small py-2">
                  <i class="bi bi-check-circle me-1"></i>{m.ingestTemplateSaved()}
                </div>
              {/if}

              <!-- Template name -->
              <div class="mb-3">
                <label class="form-label fw-semibold small" for="tmplName">{m.ingestTemplateName()}</label>
                <input id="tmplName" type="text" class="form-control form-control-sm" bind:value={tmplName} disabled={tmplLoading} />
              </div>

              <!-- Match Rule -->
              <div class="mb-3">
                <label class="form-label fw-semibold small" for="tmplMatchKey">{m.ingestTemplateMatch()}</label>
                <div class="d-flex gap-2 align-items-center">
                  <select id="tmplMatchKey" class="form-select form-select-sm" style="max-width:200px" bind:value={tmplMatchKey} disabled={tmplLoading}>
                    {#each MATCH_FIELDS as f}
                      <option value={f}>{f}</option>
                    {/each}
                  </select>
                  <span class="text-inverse text-opacity-50 small">=</span>
                  <input type="text" class="form-control form-control-sm" bind:value={tmplMatchValue} disabled={tmplLoading} placeholder="value" />
                  <button class="btn btn-sm btn-outline-secondary" type="button" onclick={() => { tmplMatchValue = '' }} disabled={tmplLoading} title="Clear">
                    <i class="bi bi-x"></i>
                  </button>
                </div>
              </div>

              <!-- Field Mappings -->
              <div class="mb-3">
                <div class="d-flex align-items-center mb-2">
                  <span class="form-label fw-semibold small mb-0 flex-grow-1">{m.ingestTemplateMappings()}</span>
                  <button class="btn btn-sm btn-outline-theme" type="button" onclick={() => { tmplMappings = [...tmplMappings, { sourcePath: '', targetPath: '', required: false }] }} disabled={tmplLoading}>
                    <i class="bi bi-plus-lg me-1"></i>Add
                  </button>
                </div>
                {#if tmplMappings.length === 0}
                  <div class="text-inverse text-opacity-50 small">{m.ingestNoMappings()}</div>
                {:else}
                  <!-- datalist for rawBody keys autocomplete -->
                  <datalist id="rawBodyKeysList">
                    {#each rawBodyKeys as key}
                      <option value={key}>{key}</option>
                    {/each}
                  </datalist>

                  <div class="table-responsive">
                    <table class="table table-sm align-middle mb-0">
                      <thead>
                        <tr>
                          <th style="width:35%">Source Path</th>
                          <th>Target Path</th>
                          <th style="width:80px" class="text-center">Required</th>
                          <th style="width:40px"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each tmplMappings as row, i (i)}
                          <tr>
                            <td>
                              <input
                                type="text"
                                list="rawBodyKeysList"
                                class="form-control form-control-sm font-monospace"
                                value={row.sourcePath}
                                oninput={(e) => { tmplMappings[i] = { ...tmplMappings[i], sourcePath: e.currentTarget.value } }}
                                disabled={tmplLoading}
                                placeholder="e.g. data.temperature"
                              />
                            </td>
                            <td>
                              <select
                                class="form-select form-select-sm font-monospace"
                                value={row.targetPath}
                                onchange={(e) => { tmplMappings[i] = { ...tmplMappings[i], targetPath: e.currentTarget.value } }}
                                disabled={tmplLoading}
                              >
                                <option value="">— select —</option>
                                {#each TARGET_PATHS as grp}
                                  <optgroup label={grp.group}>
                                    {#each grp.paths as p}
                                      <option value={p}>{p}</option>
                                    {/each}
                                  </optgroup>
                                {/each}
                                <option value={CUSTOM_TARGET}>custom…</option>
                              </select>
                              {#if row.targetPath === CUSTOM_TARGET}
                                <input
                                  type="text"
                                  class="form-control form-control-sm font-monospace mt-1"
                                  value={tmplCustomTargets[i] ?? ''}
                                  oninput={(e) => { tmplCustomTargets = { ...tmplCustomTargets, [i]: e.currentTarget.value } }}
                                  disabled={tmplLoading}
                                  placeholder="e.g. payload.temperature"
                                />
                              {/if}
                            </td>
                            <td class="text-center">
                              <input
                                type="checkbox"
                                class="form-check-input"
                                checked={row.required}
                                onchange={(e) => { tmplMappings[i] = { ...tmplMappings[i], required: e.currentTarget.checked } }}
                                disabled={tmplLoading}
                              />
                            </td>
                            <td>
                              <button
                                class="btn btn-sm btn-outline-danger"
                                type="button"
                                title={m.actionDelete()}
                                onclick={() => { tmplMappings = tmplMappings.filter((_, j) => j !== i); tmplCustomTargets = Object.fromEntries(Object.entries(tmplCustomTargets).filter(([k]) => Number(k) !== i)) }}
                                disabled={tmplLoading}
                              ><i class="bi bi-trash"></i></button>
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  </div>
                {/if}
              </div>

              <button class="btn btn-theme btn-sm" onclick={handleCreateTemplate} disabled={tmplLoading || !tmplName.trim()}>
                {#if tmplLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                <i class="bi bi-save me-1"></i>{m.ingestTemplateCreate()}
              </button>
            {/if}
          {/if}
        </div>
        <div class="modal-footer">
          {#if viewEvent && viewEvent.rawBody && !showCreateTplPanel}
            <button class="btn btn-sm btn-outline-theme me-auto" onclick={openCreateTemplate}>
              <i class="bi bi-diagram-3 me-1"></i>{m.ingestCreateTemplateFromEvent()}
            </button>
          {/if}
          <button type="button" class="btn btn-secondary btn-sm" onclick={() => { showViewModal = false; showCreateTplPanel = false }}>{m.actionClose()}</button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ══════════════════════════════════════════ -->
<!-- Edit Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showEditModal && editEvent}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.eventsEditTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => { showEditModal = false; showMap = false }}></button>
        </div>
        <div class="modal-body">
          {#if editError}
            <div class="alert alert-danger small py-2">{editError}</div>
          {/if}

          <div class="mb-3">
            <label class="form-label fw-semibold" for="eEventType">{m.eventsType()}</label>
            <input
              id="eEventType"
              type="text"
              class="form-control"
              placeholder="e.g. temperature_alert"
              bind:value={editEventType}
              disabled={editLoading}
            />
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="eName">{m.eventsName()}</label>
            <input
              id="eName"
              type="text"
              class="form-control"
              placeholder={m.eventsNamePlaceholder()}
              bind:value={editName}
              disabled={editLoading}
            />
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="eNote">{m.eventsNoteLabel()}</label>
            <textarea
              id="eNote"
              class="form-control"
              rows="2"
              placeholder={m.eventsNotePlaceholder()}
              bind:value={editNote}
              disabled={editLoading}
            ></textarea>
          </div>

          <div class="mb-3">
            <div class="d-flex align-items-center mb-2">
              <span class="form-label fw-semibold mb-0"><i class="bi bi-geo-alt me-1"></i>{m.eventsLocation()}</span>
            </div>
            <div class="input-group mb-2">
              <input
                type="text"
                class="form-control font-monospace small"
                placeholder="Lat, Lng"
                value={editLat !== undefined && editLng !== undefined ? `${editLat.toFixed(6)}, ${editLng.toFixed(6)}` : ''}
                readonly
                disabled={editLoading}
              />
              {#if editLat !== undefined && editLng !== undefined}
                <button class="btn btn-outline-danger" type="button" title={m.actionClear()} onclick={clearLocation} disabled={editLoading}>
                  <i class="bi bi-x-lg"></i>
                </button>
              {/if}
            </div>
            {#if showMap}
              {#key editEvent.eventId}
                <MapPicker
                  lat={editLat ?? 13.747722}
                  lng={editLng ?? 100.497437}
                  height="250px"
                  disabled={editLoading}
                  onchange={handleMapChange}
                />
              {/key}
            {:else}
              <div style="height:250px;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,0.08))" class="d-flex align-items-center justify-content-center">
                <div class="spinner-border spinner-border-sm" role="status"></div>
              </div>
            {/if}
            <small class="text-inverse text-opacity-50"><i class="bi bi-info-circle me-1"></i>{m.eventsLocationHint()}</small>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => { showEditModal = false; showMap = false }} disabled={editLoading}>{m.actionCancel()}</button>
          <button type="button" class="btn btn-theme" onclick={handleSaveEdit} disabled={editLoading}>
            {#if editLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionSave()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ══════════════════════════════════════════ -->
<!-- Approve Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showApproveModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-success">
            <i class="bi bi-check-circle me-2"></i>{m.eventsApprove()}
          </h6>
        </div>
        <div class="modal-body">
          <div class="mb-2">
            <label class="form-label small fw-semibold" for="approveNote">{m.eventsNoteLabel()} <span class="text-inverse text-opacity-50">({m.eventsNoteOptional()})</span></label>
            <textarea
              id="approveNote"
              class="form-control form-control-sm"
              rows="2"
              bind:value={approveNote}
              disabled={approveLoading}
              placeholder={m.eventsNotePlaceholder()}
            ></textarea>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showApproveModal = false; approveEventId = null }} disabled={approveLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-success" onclick={handleApprove} disabled={approveLoading}>
            {#if approveLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.eventsApprove()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ══════════════════════════════════════════ -->
<!-- Reject Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showRejectModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger"><i class="bi bi-x-lg me-2"></i>{m.eventsRejectTitle()}</h6>
        </div>
        <div class="modal-body">
          <div class="mb-2">
            <label class="form-label small fw-semibold" for="rejectNote">{m.eventsNoteLabel()}</label>
            <textarea
              id="rejectNote"
              class="form-control form-control-sm"
              rows="2"
              bind:value={rejectNote}
              disabled={rejectLoading}
            ></textarea>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showRejectModal = false; rejectEventId = null }} disabled={rejectLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleReject} disabled={rejectLoading || !rejectNote.trim()}>
            {#if rejectLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.eventsReject()}
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
        <div class="modal-body small text-inverse text-opacity-60">{m.eventsDeleteWarning()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; deleteEventId = null }} disabled={deleteLoading}>{m.actionCancel()}</button>
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

<!-- ══════════════════════════════════════════ -->
<!-- Apply Template Modal -->
<!-- ══════════════════════════════════════════ -->
{#if showApplyTemplateModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.ingestBulkApplyTemplate()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showApplyTemplateModal = false)}></button>
        </div>
        <div class="modal-body">
          <p class="small text-inverse text-opacity-60 mb-3">{m.ingestSelectedCount({ count: selected.size })}</p>
          {#if templatesLoading}
            <div class="text-center py-3"><div class="spinner-border spinner-border-sm text-theme" role="status"></div></div>
          {:else if templates.length === 0}
            <div class="alert alert-warning small">{m.ingestNoTemplates()}</div>
          {:else}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="selectTemplate">{m.ingestMappingTemplatesTitle()}</label>
              <select id="selectTemplate" class="form-select" bind:value={selectedTemplateId}>
                <option value="">— {m.actionSelect()} —</option>
                {#each templates as tpl}
                  <option value={tpl.templateId}>{tpl.name}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick={() => (showApplyTemplateModal = false)} disabled={applyTemplateLoading}>{m.actionCancel()}</button>
          <button class="btn btn-theme" onclick={handleApplyTemplate} disabled={applyTemplateLoading || !selectedTemplateId}>
            {#if applyTemplateLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionApply()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
