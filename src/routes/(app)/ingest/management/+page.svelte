<!-- src/routes/(app)/ingest/management/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
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
    listTemplates
  } from '$lib/api/ingest'
  import type { PendingEvent, MappingTemplate, BulkResult } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let events = $state<PendingEvent[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })

  // Filters
  let filterStatus = $state('all')
  let filterEventType = $state('')

  // Detail / Edit
  let selectedEvent = $state<PendingEvent | null>(null)
  let detailLoading = $state(false)
  let showEditModal = $state(false)
  let editLoading = $state(false)
  let editError = $state<string | null>(null)
  let editName = $state('')
  let editDescription = $state('')
  let editEventType = $state('')
  let editPriority = $state<'low' | 'medium' | 'high'>('medium')
  let editTags = $state('')
  let editLat = $state<number | undefined>(undefined)
  let editLng = $state<number | undefined>(undefined)

  // Confirm modals
  let showApproveModal = $state(false)
  let showRejectModal = $state(false)
  let showDeleteModal = $state(false)
  let actionEventId = $state<string | null>(null)
  let actionLoading = $state(false)
  let actionSuccess = $state<string | null>(null)

  // Bulk
  let selectedIds = $state<Set<string>>(new Set())
  let showBulkModal = $state(false)
  let bulkAction = $state<'approve' | 'reject' | 'delete' | 'applyTemplate'>('approve')
  let bulkLoading = $state(false)
  let bulkResult = $state<BulkResult | null>(null)
  let templates = $state<MappingTemplate[]>([])
  let bulkTemplateId = $state('')

  let allSelected = $derived(events.length > 0 && events.every(e => selectedIds.has(e.eventId)))

  async function load(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    selectedIds = new Set()
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listPendingEvents(orgId, page, perPage, {
        status: filterStatus || undefined,
        eventType: filterEventType || undefined
      })
      events = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function openDetail(eventId: string) {
    const orgId = $activeOrg?.id
    if (!orgId) return
    detailLoading = true
    try {
      selectedEvent = await getPendingEvent(orgId, eventId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      detailLoading = false
    }
  }

  function closeDetail() {
    selectedEvent = null
  }

  function openEdit(evt: PendingEvent) {
    editName = evt.name ?? ''
    editDescription = evt.description ?? ''
    editEventType = evt.eventType ?? ''
    editPriority = evt.priority ?? 'medium'
    editTags = (evt.tags ?? []).join(', ')
    editLat = evt.lat
    editLng = evt.lng
    editError = null
    actionEventId = evt.eventId
    showEditModal = true
  }

  async function handleEditSubmit() {
    const orgId = $activeOrg?.id
    if (!orgId || !actionEventId) return
    editLoading = true
    editError = null
    try {
      const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
      await updatePendingEvent(orgId, actionEventId, {
        name: editName.trim() || undefined,
        description: editDescription.trim() || undefined,
        eventType: editEventType.trim() || undefined,
        priority: editPriority,
        tags: tags.length ? tags : undefined,
        lat: editLat,
        lng: editLng
      })
      actionSuccess = m.ingestManagementSaved()
      showEditModal = false
      load(pagination.page)
    } catch (e: unknown) {
      editError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      editLoading = false
    }
  }

  function openApprove(eventId: string) {
    actionEventId = eventId
    showApproveModal = true
  }

  function openReject(eventId: string) {
    actionEventId = eventId
    showRejectModal = true
  }

  function openDelete(eventId: string) {
    actionEventId = eventId
    showDeleteModal = true
  }

  async function handleApprove() {
    const orgId = $activeOrg?.id
    if (!orgId || !actionEventId) return
    actionLoading = true
    try {
      await approveEvent(orgId, actionEventId)
      actionSuccess = m.ingestManagementApproved()
      showApproveModal = false
      if (selectedEvent?.eventId === actionEventId) selectedEvent = null
      load(pagination.page)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      actionLoading = false
    }
  }

  async function handleReject() {
    const orgId = $activeOrg?.id
    if (!orgId || !actionEventId) return
    actionLoading = true
    try {
      await rejectEvent(orgId, actionEventId)
      actionSuccess = m.ingestManagementRejected()
      showRejectModal = false
      if (selectedEvent?.eventId === actionEventId) selectedEvent = null
      load(pagination.page)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      actionLoading = false
    }
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !actionEventId) return
    actionLoading = true
    try {
      await deletePendingEvent(orgId, actionEventId)
      actionSuccess = m.ingestManagementDeleted()
      showDeleteModal = false
      if (selectedEvent?.eventId === actionEventId) selectedEvent = null
      load(pagination.page)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      actionLoading = false
    }
  }

  // Bulk operations
  function toggleSelect(eventId: string) {
    const next = new Set(selectedIds)
    if (next.has(eventId)) next.delete(eventId)
    else next.add(eventId)
    selectedIds = next
  }

  function toggleAll() {
    if (allSelected) {
      selectedIds = new Set()
    } else {
      selectedIds = new Set(events.map(e => e.eventId))
    }
  }

  async function openBulkAction(action: 'approve' | 'reject' | 'delete' | 'applyTemplate') {
    bulkAction = action
    bulkResult = null
    bulkTemplateId = ''
    if (action === 'applyTemplate') {
      const orgId = $activeOrg?.id
      if (orgId) {
        try {
          const r = await listTemplates(orgId, 1, 100)
          templates = r.details
        } catch { templates = [] }
      }
    }
    showBulkModal = true
  }

  async function handleBulk() {
    const orgId = $activeOrg?.id
    if (!orgId) return
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    bulkLoading = true
    try {
      let result: BulkResult
      switch (bulkAction) {
        case 'approve': result = await bulkApprove(orgId, ids); break
        case 'reject': result = await bulkReject(orgId, ids); break
        case 'delete': result = await bulkDelete(orgId, ids); break
        case 'applyTemplate':
          if (!bulkTemplateId) return
          result = await bulkApplyTemplate(orgId, bulkTemplateId, ids)
          break
      }
      bulkResult = result!
      actionSuccess = m.ingestBulkSuccess()
      selectedIds = new Set()
      load(pagination.page)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
      showBulkModal = false
    } finally {
      bulkLoading = false
    }
  }

  function statusBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'bg-warning text-dark'
      case 'approved': return 'bg-success'
      case 'rejected': return 'bg-danger'
      default: return 'bg-secondary'
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'pending': return m.ingestManagementStatusPending()
      case 'approved': return m.ingestManagementStatusApproved()
      case 'rejected': return m.ingestManagementStatusRejected()
      default: return status
    }
  }

  function priorityBadgeClass(p?: string): string {
    switch (p) {
      case 'high': return 'bg-danger'
      case 'medium': return 'bg-warning text-dark'
      case 'low': return 'bg-info text-dark'
      default: return 'bg-secondary'
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
    setPageTitle(m.ingestManagementTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

{#if selectedEvent}
  <!-- Detail View -->
  <div class="d-flex align-items-center mb-3">
    <button class="btn btn-sm btn-outline-secondary me-3" onclick={closeDetail}>
      <i class="bi bi-arrow-left me-1"></i>{m.ingestDetailsBackToList()}
    </button>
    <div class="flex-grow-1">
      <h1 class="page-header mb-0">{m.ingestManagementTitle()}</h1>
      <small class="text-inverse text-opacity-50 font-monospace">{selectedEvent.eventId}</small>
    </div>
    <div class="d-flex gap-1">
      {#if selectedEvent.status === 'pending'}
        <button class="btn btn-sm btn-outline-secondary" onclick={() => openEdit(selectedEvent!)} title={m.actionEdit()}>
          <i class="bi bi-pencil me-1"></i>{m.actionEdit()}
        </button>
        <button class="btn btn-sm btn-success" onclick={() => openApprove(selectedEvent!.eventId)}>
          <i class="bi bi-check-lg me-1"></i>{m.ingestManagementApprove()}
        </button>
        <button class="btn btn-sm btn-danger" onclick={() => openReject(selectedEvent!.eventId)}>
          <i class="bi bi-x-lg me-1"></i>{m.ingestManagementReject()}
        </button>
      {/if}
    </div>
  </div>

  <div class="row g-3">
    <div class="col-md-6">
      <Card>
        <CardBody>
          <table class="table table-sm mb-0">
            <tbody>
              <tr><th class="w-40">{m.ingestManagementEventId()}</th><td class="font-monospace small">{selectedEvent.eventId}</td></tr>
              <tr><th>{m.ingestManagementName()}</th><td>{selectedEvent.name ?? '-'}</td></tr>
              <tr><th>{m.ingestManagementEventType()}</th><td>{selectedEvent.eventType ?? '-'}</td></tr>
              <tr><th>{m.ingestManagementPriority()}</th><td>
                {#if selectedEvent.priority}
                  <span class="badge {priorityBadgeClass(selectedEvent.priority)}">{selectedEvent.priority}</span>
                {:else}-{/if}
              </td></tr>
              <tr><th>{m.ingestManagementStatus()}</th><td><span class="badge {statusBadgeClass(selectedEvent.status)}">{statusLabel(selectedEvent.status)}</span></td></tr>
              <tr><th>{m.ingestManagementTags()}</th><td>{selectedEvent.tags?.join(', ') ?? '-'}</td></tr>
              <tr><th>{m.ingestManagementLat()} / {m.ingestManagementLng()}</th><td>
                {#if selectedEvent.lat != null && selectedEvent.lng != null}
                  {selectedEvent.lat}, {selectedEvent.lng}
                {:else}-{/if}
              </td></tr>
              <tr><th>{m.ingestManagementContentType()}</th><td class="small">{selectedEvent.contentType ?? '-'}</td></tr>
              <tr><th>{m.ingestManagementSourceIp()}</th><td class="font-monospace small">{selectedEvent.sourceIp ?? '-'}</td></tr>
              <tr><th>{m.ingestManagementFingerprint()}</th><td class="font-monospace small">{selectedEvent.fingerprint ?? '-'}</td></tr>
              <tr><th>{m.ingestManagementSuggestedType()}</th><td>{selectedEvent.suggestedType ?? '-'}</td></tr>
              <tr><th>{m.eventsCreatedAt()}</th><td>{formatDate(selectedEvent.createdAt)}</td></tr>
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
    <div class="col-md-6">
      {#if selectedEvent.description}
        <Card>
          <CardBody>
            <h6 class="mb-2">{m.ingestManagementDescription()}</h6>
            <p class="mb-0">{selectedEvent.description}</p>
          </CardBody>
        </Card>
      {/if}
      {#if selectedEvent.rawBody && Object.keys(selectedEvent.rawBody).length}
        <Card>
          <CardBody>
            <h6 class="mb-2"><i class="bi bi-file-earmark-code me-1"></i>{m.ingestManagementRawBody()}</h6>
            <pre class="bg-dark text-light p-3 rounded small mb-0" style="max-height:400px;overflow:auto">{JSON.stringify(selectedEvent.rawBody, null, 2)}</pre>
          </CardBody>
        </Card>
      {/if}
    </div>
  </div>
{:else}
  <!-- List View -->
  <div class="d-flex align-items-center mb-3">
    <div class="flex-grow-1">
      <h1 class="page-header mb-0">{m.ingestManagementTitle()}</h1>
      {#if $activeOrg}
        <small class="text-inverse text-opacity-50">
          <i class="bi bi-building me-1"></i>{$activeOrg.name} &mdash; {m.ingestManagementSubtitle()}
        </small>
      {/if}
    </div>
  </div>

  {#if actionSuccess}
    <div class="alert alert-success alert-dismissible mb-3">
      <i class="bi bi-check-circle me-2"></i>{actionSuccess}
      <button type="button" class="btn-close" onclick={() => (actionSuccess = null)} aria-label={m.actionClose()}></button>
    </div>
  {/if}

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
          <div class="col-md-3">
            <label class="form-label small mb-1" for="filterStatus">{m.ingestManagementFilterStatus()}</label>
            <select id="filterStatus" class="form-select form-select-sm" bind:value={filterStatus} onchange={() => load(1)}>
              <option value="all">{m.ingestManagementFilterAll()}</option>
              <option value="pending">{m.ingestManagementStatusPending()}</option>
              <option value="approved">{m.ingestManagementStatusApproved()}</option>
              <option value="rejected">{m.ingestManagementStatusRejected()}</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label small mb-1" for="filterEventType">{m.ingestManagementEventType()}</label>
            <input id="filterEventType" type="text" class="form-control form-control-sm" placeholder={m.ingestManagementEventType()}
              bind:value={filterEventType} onkeydown={(e) => e.key === 'Enter' && load(1)} />
          </div>
          <div class="col-md-3 d-flex gap-1">
            <button class="btn btn-sm btn-theme flex-fill" onclick={() => load(1)}>
              <i class="bi bi-search me-1"></i>{m.actionSearch()}
            </button>
            <button class="btn btn-sm btn-outline-secondary" aria-label={m.actionClear()} onclick={() => { filterStatus = 'all'; filterEventType = ''; load(1) }}>
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          {#if selectedIds.size > 0}
            <div class="col-md-2">
              <div class="dropdown">
                <button class="btn btn-sm btn-outline-theme dropdown-toggle w-100" type="button" data-bs-toggle="dropdown">
                  <i class="bi bi-list-check me-1"></i>{m.ingestBulkActions()} ({selectedIds.size})
                </button>
                <ul class="dropdown-menu">
                  <li><button class="dropdown-item" onclick={() => openBulkAction('approve')}><i class="bi bi-check-lg me-2 text-success"></i>{m.ingestBulkApprove()}</button></li>
                  <li><button class="dropdown-item" onclick={() => openBulkAction('reject')}><i class="bi bi-x-lg me-2 text-danger"></i>{m.ingestBulkReject()}</button></li>
                  <li><button class="dropdown-item" onclick={() => openBulkAction('applyTemplate')}><i class="bi bi-file-earmark-text me-2"></i>{m.ingestBulkApplyTemplate()}</button></li>
                  <li><hr class="dropdown-divider" /></li>
                  <li><button class="dropdown-item text-danger" onclick={() => openBulkAction('delete')}><i class="bi bi-trash me-2"></i>{m.ingestBulkDelete()}</button></li>
                </ul>
              </div>
            </div>
          {/if}
        </div>
      </CardBody>
    </Card>

    {#if loading || detailLoading}
      <div class="text-center py-5">
        <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
      </div>
    {:else if error}
      <div class="alert alert-danger mt-3">
        <i class="bi bi-exclamation-triangle me-2"></i>{error}
        <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
      </div>
    {:else if events.length === 0}
      <Card>
        <CardBody>
          <div class="text-center py-5">
            <i class="bi bi-inbox fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
            <p class="text-inverse text-opacity-50 mb-0">{m.ingestManagementNoRecords()}</p>
          </div>
        </CardBody>
      </Card>
    {:else}
      <div class="table-responsive mt-3">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th style="width:40px">
                <input type="checkbox" class="form-check-input" checked={allSelected} onchange={toggleAll} title={allSelected ? m.ingestBulkDeselectAll() : m.ingestBulkSelectAll()} />
              </th>
              <th>{m.ingestManagementEventId()}</th>
              <th>{m.ingestManagementName()}</th>
              <th>{m.ingestManagementEventType()}</th>
              <th>{m.ingestManagementPriority()}</th>
              <th>{m.ingestManagementStatus()}</th>
              <th>{m.eventsCreatedAt()}</th>
              <th class="text-end">{m.eventsActions()}</th>
            </tr>
          </thead>
          <tbody>
            {#each events as evt (evt.eventId)}
              <tr>
                <td>
                  <input type="checkbox" class="form-check-input" checked={selectedIds.has(evt.eventId)} onchange={() => toggleSelect(evt.eventId)} />
                </td>
                <td class="font-monospace small">{evt.eventId.substring(0, 12)}...</td>
                <td>{evt.name ?? '-'}</td>
                <td>{evt.eventType ?? '-'}</td>
                <td>
                  {#if evt.priority}
                    <span class="badge {priorityBadgeClass(evt.priority)}">{evt.priority}</span>
                  {:else}
                    <span class="text-inverse text-opacity-50 small">-</span>
                  {/if}
                </td>
                <td><span class="badge {statusBadgeClass(evt.status)}">{statusLabel(evt.status)}</span></td>
                <td class="small">{formatDate(evt.createdAt)}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary me-1" onclick={() => openDetail(evt.eventId)} title={m.actionView()}>
                    <i class="bi bi-eye"></i>
                  </button>
                  {#if evt.status === 'pending'}
                    <button class="btn btn-sm btn-outline-secondary me-1" onclick={() => openEdit(evt)} title={m.actionEdit()}>
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-success me-1" onclick={() => openApprove(evt.eventId)} title={m.ingestManagementApprove()}>
                      <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger me-1" onclick={() => openReject(evt.eventId)} title={m.ingestManagementReject()}>
                      <i class="bi bi-x-lg"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick={() => openDelete(evt.eventId)} title={m.actionDelete()}>
                      <i class="bi bi-trash"></i>
                    </button>
                  {/if}
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
{/if}

<!-- Edit Modal -->
{#if showEditModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.ingestManagementEdit()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showEditModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if editError}
            <div class="alert alert-danger small py-2">{editError}</div>
          {/if}
          <div class="mb-3">
            <label class="form-label fw-semibold" for="mgmtName">{m.ingestManagementName()}</label>
            <input id="mgmtName" type="text" class="form-control" bind:value={editName} disabled={editLoading} />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold" for="mgmtDesc">{m.ingestManagementDescription()}</label>
            <textarea id="mgmtDesc" class="form-control" rows="2" bind:value={editDescription} disabled={editLoading}></textarea>
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="mgmtEventType">{m.ingestManagementEventType()}</label>
              <input id="mgmtEventType" type="text" class="form-control" bind:value={editEventType} disabled={editLoading} />
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="mgmtPriority">{m.ingestManagementPriority()}</label>
              <select id="mgmtPriority" class="form-select" bind:value={editPriority} disabled={editLoading}>
                <option value="low">{m.ingestManagementPriorityLow()}</option>
                <option value="medium">{m.ingestManagementPriorityMedium()}</option>
                <option value="high">{m.ingestManagementPriorityHigh()}</option>
              </select>
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold" for="mgmtTags">{m.ingestManagementTags()}</label>
            <input id="mgmtTags" type="text" class="form-control" bind:value={editTags} disabled={editLoading} placeholder={m.ingestManagementTagsHint()} />
          </div>
          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="mgmtLat">{m.ingestManagementLat()}</label>
              <input id="mgmtLat" type="number" step="any" class="form-control" bind:value={editLat} disabled={editLoading} />
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="mgmtLng">{m.ingestManagementLng()}</label>
              <input id="mgmtLng" type="number" step="any" class="form-control" bind:value={editLng} disabled={editLoading} />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => (showEditModal = false)} disabled={editLoading}>{m.actionCancel()}</button>
          <button type="button" class="btn btn-theme" onclick={handleEditSubmit} disabled={editLoading}>
            {#if editLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionSave()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Approve Confirm Modal -->
{#if showApproveModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-check-circle me-2 text-success"></i>{m.ingestManagementApprove()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestManagementApproveConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showApproveModal = false; actionEventId = null }} disabled={actionLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-success" onclick={handleApprove} disabled={actionLoading}>
            {#if actionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.ingestManagementApprove()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Reject Confirm Modal -->
{#if showRejectModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-x-circle me-2 text-danger"></i>{m.ingestManagementReject()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestManagementRejectConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showRejectModal = false; actionEventId = null }} disabled={actionLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleReject} disabled={actionLoading}>
            {#if actionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.ingestManagementReject()}
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
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestManagementDeleteConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; actionEventId = null }} disabled={actionLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleDelete} disabled={actionLoading}>
            {#if actionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Bulk Action Modal -->
{#if showBulkModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title"><i class="bi bi-list-check me-2"></i>{m.ingestBulkActions()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showBulkModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if bulkResult}
            <div class="alert alert-info small">
              <div><strong>{m.ingestBulkSucceeded()}:</strong> {bulkResult.succeeded.length}</div>
              {#if bulkResult.failed.length > 0}
                <div class="mt-1"><strong>{m.ingestBulkFailed()}:</strong> {bulkResult.failed.length}</div>
                <ul class="mb-0 mt-1">
                  {#each bulkResult.failed as f}
                    <li class="font-monospace small">{f.id}: {f.reason}</li>
                  {/each}
                </ul>
              {/if}
            </div>
            <div class="text-end">
              <button class="btn btn-sm btn-secondary" onclick={() => (showBulkModal = false)}>{m.actionClose()}</button>
            </div>
          {:else}
            <p class="mb-3">
              <strong>{selectedIds.size}</strong> {m.ingestBulkSelected()}
            </p>
            {#if bulkAction === 'approve'}
              <p class="text-inverse text-opacity-60">{m.ingestBulkConfirmApprove()}</p>
            {:else if bulkAction === 'reject'}
              <p class="text-inverse text-opacity-60">{m.ingestBulkConfirmReject()}</p>
            {:else if bulkAction === 'delete'}
              <p class="text-danger">{m.ingestBulkConfirmDelete()}</p>
            {:else if bulkAction === 'applyTemplate'}
              <p class="text-inverse text-opacity-60 mb-2">{m.ingestBulkSelectTemplate()}</p>
              <select class="form-select mb-3" bind:value={bulkTemplateId}>
                <option value="">— {m.actionSelect()} —</option>
                {#each templates as t}
                  <option value={t.templateId}>{t.name}</option>
                {/each}
              </select>
            {/if}
            <div class="d-flex justify-content-end gap-2">
              <button class="btn btn-sm btn-secondary" onclick={() => (showBulkModal = false)} disabled={bulkLoading}>{m.actionCancel()}</button>
              <button
                class="btn btn-sm {bulkAction === 'delete' ? 'btn-danger' : bulkAction === 'reject' ? 'btn-warning' : 'btn-success'}"
                onclick={handleBulk}
                disabled={bulkLoading || (bulkAction === 'applyTemplate' && !bulkTemplateId)}
              >
                {#if bulkLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
                {m.actionConfirm()}
              </button>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
