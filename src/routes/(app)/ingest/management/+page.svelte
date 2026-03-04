<!-- src/routes/(app)/events/management/+page.svelte -->
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
    deletePendingEvent
  } from '$lib/api/ingest'
  import type { PendingEvent } from '$lib/api/ingest'
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
  let editEvent = $state<PendingEvent | null>(null)
  let editLoading = $state(false)
  let editError = $state<string | null>(null)
  let editDescription = $state('')
  let editTags = $state<string[]>([])
  let editPriority = $state('')
  let editLat = $state<number | undefined>(undefined)
  let editLng = $state<number | undefined>(undefined)

  // Reject modal
  let showRejectModal = $state(false)
  let rejectEventId = $state<string | null>(null)
  let rejectReason = $state('')
  let rejectLoading = $state(false)

  // Delete modal
  let showDeleteModal = $state(false)
  let deleteEventId = $state<string | null>(null)
  let deleteLoading = $state(false)

  // Search/Filter
  let searchQuery = $state('')
  let statusFilter = $state<'all' | 'pending' | 'approved' | 'rejected'>('all')

  async function loadEvents(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }
    // อ่าน perPage แบบ untrack เพื่อไม่ให้เป็น dependency
    const perPage = untrack(() => pagination.perPage)

    loading = true
    error = null
    try {
      const response = await listPendingEvents(orgId, page, perPage) // ← ใช้ perPage
      events = response.details as PendingEvent[]
      pagination = {
        page: response.page,
        perPage: response.perPage,
        total: response.total,
        totalPages: response.totalPages
      }
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
    } catch (e: unknown) {
      viewEvent = events.find((e) => e.eventId === eventId) || null
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      viewLoading = false
    }
  }

  function openEditModal(event: PendingEvent) {
    editEvent = event
    editDescription = event.description || ''
    editTags = event.tags || []
    editPriority = event.priority || ''
    editLat = event.lat
    editLng = event.lng
    editError = null
    showEditModal = true
  }

  async function handleSaveEdit() {
    const orgId = $activeOrg?.id
    if (!orgId || !editEvent) return

    editLoading = true
    editError = null
    try {
      await updatePendingEvent(orgId, editEvent.eventId, {
        description: editDescription,
        tags: editTags,
        priority: editPriority,
        lat: editLat,
        lng: editLng
      })
      // อัพเดท local state ด้วย current edit values แทนการใช้ response
      const updatedEventId = editEvent.eventId
      events = events.map((e) =>
        e.eventId === updatedEventId
          ? {
              ...e,
              description: editDescription,
              tags: editTags,
              priority: editPriority,
              lat: editLat,
              lng: editLng
            }
          : e
      )
      showEditModal = false
    } catch (e: unknown) {
      editError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      editLoading = false
    }
  }

  function openRejectModal(eventId: string) {
    rejectEventId = eventId
    rejectReason = ''
    showRejectModal = true
  }

  async function handleReject() {
    const orgId = $activeOrg?.id
    if (!orgId || !rejectEventId) return

    rejectLoading = true
    error = null
    try {
      const updated = await rejectEvent(orgId, rejectEventId, {
        reason: rejectReason
      })
      // Update the event in the list with the rejected status
      events = events.map((e) =>
        e.eventId === rejectEventId
          ? { ...e, status: updated.status, updatedAt: updated.updatedAt }
          : e
      )
      // Close modal and reset form
      showRejectModal = false
      rejectEventId = null
      rejectReason = ''
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      rejectLoading = false
    }
  }

  async function handleApprove(eventId: string) {
    const orgId = $activeOrg?.id
    if (!orgId) return

    try {
      await approveEvent(orgId, eventId, { normalize: true })
      events = events.filter((e) => e.eventId !== eventId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
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
      events = events.filter((e) => e.eventId !== deleteEventId)
      showDeleteModal = false
      deleteEventId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function addTag() {
    const input = document.getElementById('newTag') as HTMLInputElement
    const tag = input?.value.trim()
    if (tag && !editTags.includes(tag)) {
      editTags = [...editTags, tag]
    }
    if (input) input.value = ''
  }

  function removeTag(tag: string) {
    editTags = editTags.filter((t) => t !== tag)
  }

  function handleMapChange(lat: number, lng: number) {
    editLat = lat
    editLng = lng
  }

  function clearLocation() {
    editLat = undefined
    editLng = undefined
  }

  function formatDate(dateString: string): string {
    if (!dateString) return '-'
    try {
      return new Date(dateString).toLocaleString('th-TH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  function formatJson(jsonString: string): string {
    if (!jsonString) return ''
    try {
      const parsed = JSON.parse(jsonString)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return jsonString
    }
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case 'pending':
        return 'bg-warning'
      case 'approved':
        return 'bg-success'
      case 'rejected':
        return 'bg-danger'
      default:
        return 'bg-secondary'
    }
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.eventsManagementTitle()) // หรือ eventsDetailsTitle
    if (orgId) {
      untrack(() => loadEvents()) // ← ป้องกัน loadEvents เป็น dependency
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
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => loadEvents()}
      >{m.actionRefresh()}</button
    >
  </div>
{:else if events.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i
          class="bi bi-bar-chart fs-1 text-inverse text-opacity-25 d-block mb-3"
        ></i>
        <p class="text-inverse text-opacity-50">{m.eventsNoRecords()}</p>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.eventsDevice()}</th>
          <th>{m.eventsType()}</th>
          <th>{m.eventsTimestamp()}</th>
          <th>Lat</th>
          <th>Lng</th>
          <th>{m.eventsDescription()}</th>
          <th>{m.eventsStatus()}</th>
          <th>{m.eventsPriority()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each events as event (event.eventId)}
          <tr>
            <td class="fw-semibold">{event.deviceId}</td>
            <td>
              {#if event.plateNumber}
                <span class="badge bg-info me-1">LPR</span>
                {event.plateNumber}
              {/if}
              {#if event.faceId}
                <span class="badge bg-primary me-1">Face</span>
                {event.faceId}
              {/if}
              {#if event.sensorId}
                <span class="badge bg-success me-1">Sensor</span>
                {event.sensorId}
              {/if}
            </td>
            <td class="small">{formatDate(event.timestamp)}</td>
            <td class="small font-monospace">
              {event.lat !== undefined ? event.lat.toFixed(6) : '-'}
            </td>
            <td class="small font-monospace">
              {event.lng !== undefined ? event.lng.toFixed(6) : '-'}
            </td>
            <td class="small">
              {event.description
                ? event.description.length > 20
                  ? event.description.substring(0, 20) + '...'
                  : event.description
                : '-'}
            </td>
            <td>
              <span class="badge {getStatusBadge(event.status)}">
                {event.status.toUpperCase()}
              </span>
            </td>
            <td>
              {#if event.priority}
                <span
                  class="badge"
                  class:bg-danger={event.priority === 'high'}
                  class:bg-warning={event.priority === 'medium'}
                  class:bg-info={event.priority === 'low'}
                >
                  {event.priority.toUpperCase()}
                </span>
              {:else}
                <span class="text-inverse text-opacity-50">-</span>
              {/if}
            </td>
            <td class="text-end">
              <button
                class="btn btn-sm btn-outline-theme me-1"
                onclick={() => viewEventDetails(event.eventId)}
                title={m.actionView()}
              >
                <i class="bi bi-eye"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-theme me-1"
                onclick={() => openEditModal(event)}
                title={m.actionEdit()}
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-success me-1"
                onclick={() => handleApprove(event.eventId)}
                title={m.eventsApprove()}
              >
                <i class="bi bi-check-lg"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-danger me-1"
                onclick={() => openRejectModal(event.eventId)}
                title={m.eventsReject()}
              >
                <i class="bi bi-x-lg"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => openDeleteModal(event.eventId)}
                title={m.actionDelete()}
              >
                <i class="bi bi-trash"></i>
              </button>
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
        {(pagination.page - 1) * pagination.perPage + 1}-
        {Math.min(pagination.page * pagination.perPage, pagination.total)}
        {m.of()}
        {pagination.total}
      </small>
      <nav>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" class:disabled={pagination.page === 1}>
            <button
              class="page-link"
              onclick={() => loadEvents(pagination.page - 1)}
            >
              {m.actionPrevPage()}
            </button>
          </li>
          {#each Array(pagination.totalPages) as _, i}
            <li class="page-item" class:active={i + 1 === pagination.page}>
              <button class="page-link" onclick={() => loadEvents(i + 1)}>
                {i + 1}
              </button>
            </li>
          {/each}
          <li
            class="page-item"
            class:disabled={pagination.page === pagination.totalPages}
          >
            <button
              class="page-link"
              onclick={() => loadEvents(pagination.page + 1)}
            >
              {m.actionNextPage()}
            </button>
          </li>
        </ul>
      </nav>
    </div>
  {/if}
{/if}

<!-- View Modal - No click outside to close -->
{#if showViewModal && viewEvent}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div
      class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
    >
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.eventsViewTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={() => (showViewModal = false)}
          ></button>
        </div>
        <div class="modal-body">
          {#if viewLoading}
            <div class="text-center py-4">
              <div class="spinner-border text-theme" role="status">
                <span class="visually-hidden">{m.actionLoading()}</span>
              </div>
            </div>
          {:else}
            <table class="table table-sm">
              <tbody>
                <tr>
                  <th style="width:30%">Event ID</th>
                  <td><code class="small">{viewEvent.eventId}</code></td>
                </tr>
                {#if viewEvent.name}
                  <tr>
                    <th>Event Name</th>
                    <td>{viewEvent.name}</td>
                  </tr>
                {/if}
                <tr>
                  <th>{m.eventsDevice()}</th>
                  <td>{viewEvent.deviceId}</td>
                </tr>
                {#if viewEvent.deviceKey}
                  <tr>
                    <th>Device Key</th>
                    <td><code class="small">{viewEvent.deviceKey}</code></td>
                  </tr>
                {/if}
                {#if viewEvent.eventType}
                  <tr>
                    <th>Event Type</th>
                    <td>{viewEvent.eventType}</td>
                  </tr>
                {/if}
                {#if viewEvent.cameraId}
                  <tr>
                    <th>{m.eventsCamera()}</th>
                    <td>{viewEvent.cameraId}</td>
                  </tr>
                {/if}
                <tr>
                  <th>{m.eventsPlate()}</th>
                  <td>{viewEvent.plateNumber || '-'}</td>
                </tr>
                <tr>
                  <th>{m.eventsFace()}</th>
                  <td>{viewEvent.faceId || '-'}</td>
                </tr>
                <tr>
                  <th>{m.eventsSensor()}</th>
                  <td>{viewEvent.sensorId || '-'}</td>
                </tr>
                <tr>
                  <th>{m.eventsTimestamp()}</th>
                  <td>{formatDate(viewEvent.timestamp)}</td>
                </tr>
                <tr>
                  <th>Created At</th>
                  <td>{formatDate(viewEvent.createdAt)}</td>
                </tr>
                <tr>
                  <th>Updated At</th>
                  <td>{formatDate(viewEvent.updatedAt)}</td>
                </tr>
                {#if viewEvent.approvedAt}
                  <tr>
                    <th>Approved At</th>
                    <td>{formatDate(viewEvent.approvedAt)}</td>
                  </tr>
                {/if}
                {#if viewEvent.approvedBy}
                  <tr>
                    <th>Approved By</th>
                    <td><code class="small">{viewEvent.approvedBy}</code></td>
                  </tr>
                {/if}
                {#if viewEvent.sourceIp}
                  <tr>
                    <th>Source IP</th>
                    <td><code class="small">{viewEvent.sourceIp}</code></td>
                  </tr>
                {/if}
                {#if viewEvent.contentType}
                  <tr>
                    <th>Content Type</th>
                    <td><code class="small">{viewEvent.contentType}</code></td>
                  </tr>
                {/if}
                {#if viewEvent.suggestedType}
                  <tr>
                    <th>Suggested Type</th>
                    <td>{viewEvent.suggestedType}</td>
                  </tr>
                {/if}
                <tr>
                  <th>{m.eventsStatus()}</th>
                  <td>
                    <span class="badge {getStatusBadge(viewEvent.status)}">
                      {viewEvent.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
                {#if viewEvent.priority}
                  <tr>
                    <th>{m.eventsPriority()}</th>
                    <td>{viewEvent.priority.toUpperCase()}</td>
                  </tr>
                {/if}
                {#if viewEvent.description}
                  <tr>
                    <th>{m.eventsDescription()}</th>
                    <td>{viewEvent.description}</td>
                  </tr>
                {/if}
                {#if viewEvent.tags && viewEvent.tags.length > 0}
                  <tr>
                    <th>{m.eventsTags()}</th>
                    <td>
                      {#each viewEvent.tags as tag}
                        <span class="badge bg-secondary me-1">{tag}</span>
                      {/each}
                    </td>
                  </tr>
                {/if}
              </tbody>
            </table>

            {#if viewEvent.lat !== undefined && viewEvent.lng !== undefined}
              <div class="mb-3">
                <strong>Location:</strong> {viewEvent.lat.toFixed(6)}, {viewEvent.lng.toFixed(6)}
              </div>
            {/if}

            {#if viewEvent.rawAliases}
              <hr />
              <h6 class="mb-2">Raw Aliases</h6>
              <pre class="bg-dark text-light p-3 rounded small">{formatJson(JSON.stringify(viewEvent.rawAliases))}</pre>
            {/if}

            {#if viewEvent.rawBody}
              <hr />
              <h6 class="mb-2">Raw Body</h6>
              <pre class="bg-dark text-light p-3 rounded small" style="max-height: 300px; overflow-y: auto;">{formatJson(viewEvent.rawBody)}</pre>
            {/if}

            <hr />

            <h6 class="mb-2">{m.eventsPayload()}</h6>
            <pre class="bg-dark text-light p-3 rounded small" style="max-height: 300px; overflow-y: auto;">{JSON.stringify(
                viewEvent.payload,
                null,
                2
              )}</pre>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Edit Modal - No click outside to close -->
{#if showEditModal && editEvent}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.eventsEditTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={() => (showEditModal = false)}
          ></button>
        </div>
        <div class="modal-body">
          {#if editError}
            <div class="alert alert-danger small py-2">{editError}</div>
          {/if}

          <div class="mb-3">
            <label class="form-label fw-semibold" for="eDescription"
              >{m.eventsDescription()}</label
            >
            <textarea
              id="eDescription"
              class="form-control"
              rows="3"
              placeholder={m.eventsDescriptionPlaceholder()}
              bind:value={editDescription}
              disabled={editLoading}
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="ePriority"
              >{m.eventsPriority()}</label
            >
            <select
              id="ePriority"
              class="form-select"
              bind:value={editPriority}
              disabled={editLoading}
            >
              <option value="">-</option>
              <option value="low">{m.eventsPriorityLow()}</option>
              <option value="medium">{m.eventsPriorityMedium()}</option>
              <option value="high">{m.eventsPriorityHigh()}</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="newTag"
              >{m.eventsTags()}</label
            >
            <div class="input-group mb-2">
              <input
                id="newTag"
                type="text"
                class="form-control"
                placeholder={m.eventsTagsPlaceholder()}
                disabled={editLoading}
              />
              <button
                class="btn btn-outline-theme"
                type="button"
                onclick={addTag}
                disabled={editLoading}
                aria-label={m.actionAdd()}
              >
                <i class="bi bi-plus-lg"></i>
              </button>
            </div>
            <div>
              {#each editTags as tag}
                <span class="badge bg-secondary me-1 mb-1">
                  {tag}
                  <button
                    class="btn-close btn-close-white ms-1"
                    style="font-size: 0.6rem"
                    onclick={() => removeTag(tag)}
                    aria-label={m.actionRemove()}
                  ></button>
                </span>
              {/each}
              {#if editTags.length === 0}
                <span class="text-inverse text-opacity-50 small">
                  {m.eventsNoTags()}
                </span>
              {/if}
            </div>
          </div>

          <div class="mb-3">
            <div class="d-flex align-items-center mb-2">
              <span class="form-label fw-semibold mb-0">
                <i class="bi bi-geo-alt me-1"></i>{m.eventsLocation()}
              </span>
            </div>
            <div class="input-group mb-2">
              <input
                type="text"
                class="form-control font-monospace small"
                placeholder="Lat, Lng"
                value={editLat !== undefined && editLng !== undefined
                  ? `${editLat.toFixed(6)}, ${editLng.toFixed(6)}`
                  : ''}
                readonly
                disabled={editLoading}
              />
              {#if editLat !== undefined && editLng !== undefined}
                <button
                  class="btn btn-outline-danger"
                  type="button"
                  onclick={clearLocation}
                  disabled={editLoading}
                  aria-label={m.actionClear()}
                >
                  <i class="bi bi-x-lg"></i>
                </button>
              {/if}
            </div>
            {#key editEvent?.eventId}
              <MapPicker
                lat={!editLat || !editLng ? 13.747722 : editLat}
                lng={!editLat || !editLng ? 100.497437 : editLng}
                height="250px"
                disabled={editLoading}
                onchange={handleMapChange}
              />
            {/key}
            <small class="text-inverse text-opacity-50">
              <i class="bi bi-info-circle me-1"></i>{m.eventsLocationHint()}
            </small>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => (showEditModal = false)}
            disabled={editLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-theme"
            onclick={handleSaveEdit}
            disabled={editLoading}
          >
            {#if editLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              {m.actionSubmitting()}
            {:else}
              {m.actionSave()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Reject Modal -->
{#if showRejectModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-x-lg me-2"></i>{m.eventsRejectTitle()}
          </h6>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label fw-semibold" for="rejectReason">
              {m.eventsRejectReason()}
            </label>
            <textarea
              id="rejectReason"
              class="form-control"
              rows="3"
              bind:value={rejectReason}
              disabled={rejectLoading}
            ></textarea>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button
            class="btn btn-sm btn-secondary"
            onclick={() => {
              showRejectModal = false
              rejectEventId = null
              rejectReason = ''
            }}
            disabled={rejectLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            class="btn btn-sm btn-danger"
            onclick={handleReject}
            disabled={rejectLoading || !rejectReason.trim()}
          >
            {#if rejectLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
            {/if}
            {m.eventsReject()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete Modal -->
{#if showDeleteModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {m.eventsDeleteTitle()}
          </h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">
          {m.eventsDeleteWarning()}
        </div>
        <div class="modal-footer border-0 pt-0">
          <button
            class="btn btn-sm btn-secondary"
            onclick={() => {
              showDeleteModal = false
              deleteEventId = null
            }}
            disabled={deleteLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            class="btn btn-sm btn-danger"
            onclick={handleDelete}
            disabled={deleteLoading}
          >
            {#if deleteLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
            {/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
