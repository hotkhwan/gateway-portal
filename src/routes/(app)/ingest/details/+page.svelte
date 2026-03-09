<!-- src/routes/(app)/ingest/details/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listApprovedEvents, getApprovedEvent } from '$lib/api/ingest'
  import type { ApprovedEvent } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let events = $state<ApprovedEvent[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })

  // Filters
  let filterSearch = $state('')
  let filterEventType = $state('')
  let filterSourceFamily = $state('')

  // Detail view
  let selectedEvent = $state<ApprovedEvent | null>(null)
  let detailLoading = $state(false)

  async function load(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listApprovedEvents(orgId, page, perPage, {
        search: filterSearch || undefined,
        eventType: filterEventType || undefined,
        sourceFamily: filterSourceFamily || undefined
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
      selectedEvent = await getApprovedEvent(orgId, eventId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      detailLoading = false
    }
  }

  function closeDetail() {
    selectedEvent = null
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
    setPageTitle(m.ingestDetailsTitle())
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
      <h1 class="page-header mb-0">{m.ingestDetailsTitle()}</h1>
      <small class="text-inverse text-opacity-50 font-monospace">{selectedEvent.eventId}</small>
    </div>
  </div>

  <div class="row g-3">
    <div class="col-md-6">
      <Card>
        <CardBody>
          <table class="table table-sm mb-0">
            <tbody>
              <tr><th class="w-40">{m.ingestDetailsEventId()}</th><td class="font-monospace small">{selectedEvent.eventId}</td></tr>
              <tr><th>{m.ingestDetailsEventType()}</th><td>{selectedEvent.finalEventType ?? selectedEvent.eventType ?? '-'}</td></tr>
              <tr><th>{m.ingestDetailsSourceFamily()}</th><td>
                {#if selectedEvent.sourceFamily}
                  <span class="badge bg-theme-subtle text-theme">{selectedEvent.sourceFamily}</span>
                {:else}
                  <span class="text-inverse text-opacity-50">-</span>
                {/if}
              </td></tr>
              <tr><th>{m.ingestDetailsDeviceId()}</th><td class="font-monospace small">{selectedEvent.deviceId ?? '-'}</td></tr>
              <tr><th>{m.ingestDetailsStatus()}</th><td><span class="badge bg-success">{selectedEvent.status}</span></td></tr>
              <tr><th>{m.ingestDetailsTemplateId()}</th><td class="font-monospace small">{selectedEvent.templateId ?? '-'}</td></tr>
              <tr><th>{m.ingestDetailsLocation()}</th><td>
                {#if selectedEvent.lat != null && selectedEvent.lng != null}
                  {selectedEvent.lat}, {selectedEvent.lng}
                  {#if selectedEvent.site} &mdash; {selectedEvent.site}{/if}
                  {#if selectedEvent.zone} ({selectedEvent.zone}){/if}
                {:else}
                  -
                {/if}
              </td></tr>
              <tr><th>{m.eventsCreatedAt()}</th><td>{formatDate(selectedEvent.createdAt)}</td></tr>
              <tr><th>{m.ingestDetailsApprovedAt()}</th><td>{formatDate(selectedEvent.approvedAt ?? '')}</td></tr>
              <tr><th>{m.ingestDetailsApprovedBy()}</th><td>{selectedEvent.approvedBy ?? '-'}</td></tr>
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
    <div class="col-md-6">
      {#if selectedEvent.normalized && Object.keys(selectedEvent.normalized).length}
        <Card>
          <CardBody>
            <h6 class="mb-2"><i class="bi bi-arrow-repeat me-1"></i>{m.ingestDetailsNormalized()}</h6>
            <pre class="bg-dark text-light p-3 rounded small mb-0" style="max-height:400px;overflow:auto">{JSON.stringify(selectedEvent.normalized, null, 2)}</pre>
          </CardBody>
        </Card>
      {/if}
      {#if selectedEvent.payload && Object.keys(selectedEvent.payload).length}
        <Card>
          <CardBody>
            <h6 class="mb-2"><i class="bi bi-file-earmark-code me-1"></i>{m.ingestDetailsPayload()}</h6>
            <pre class="bg-dark text-light p-3 rounded small mb-0" style="max-height:400px;overflow:auto">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
          </CardBody>
        </Card>
      {/if}
    </div>
  </div>
{:else}
  <!-- List View -->
  <div class="d-flex align-items-center mb-3">
    <div class="flex-grow-1">
      <h1 class="page-header mb-0">{m.ingestDetailsTitle()}</h1>
      {#if $activeOrg}
        <small class="text-inverse text-opacity-50">
          <i class="bi bi-building me-1"></i>{$activeOrg.name} &mdash; {m.ingestDetailsSubtitle()}
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
            <input type="text" class="form-control form-control-sm" placeholder={m.ingestDetailsEventType()}
              bind:value={filterEventType} onkeydown={(e) => e.key === 'Enter' && load(1)} />
          </div>
          <div class="col-md-2">
            <input type="text" class="form-control form-control-sm" placeholder={m.ingestDetailsSourceFamily()}
              bind:value={filterSourceFamily} onkeydown={(e) => e.key === 'Enter' && load(1)} />
          </div>
          <div class="col-md-3 d-flex gap-1">
            <button class="btn btn-sm btn-theme flex-fill" onclick={() => load(1)}>
              <i class="bi bi-search me-1"></i>{m.actionSearch()}
            </button>
            <button class="btn btn-sm btn-outline-secondary" aria-label={m.actionClear()} onclick={() => { filterSearch = ''; filterEventType = ''; filterSourceFamily = ''; load(1) }}>
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
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
            <i class="bi bi-check-circle fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
            <p class="text-inverse text-opacity-50 mb-0">{m.ingestDetailsNoRecords()}</p>
          </div>
        </CardBody>
      </Card>
    {:else}
      <div class="table-responsive mt-3">
        <table class="table table-hover align-middle mb-0">
          <thead>
            <tr>
              <th>{m.ingestDetailsEventId()}</th>
              <th>{m.ingestDetailsEventType()}</th>
              <th>{m.ingestDetailsSourceFamily()}</th>
              <th>{m.ingestDetailsDeviceId()}</th>
              <th>{m.ingestDetailsStatus()}</th>
              <th>{m.eventsCreatedAt()}</th>
              <th class="text-end">{m.eventsActions()}</th>
            </tr>
          </thead>
          <tbody>
            {#each events as evt (evt.eventId)}
              <tr>
                <td class="font-monospace small">{evt.eventId.substring(0, 12)}…</td>
                <td>{evt.finalEventType ?? evt.eventType ?? '-'}</td>
                <td>
                  {#if evt.sourceFamily}
                    <span class="badge bg-theme-subtle text-theme">{evt.sourceFamily}</span>
                  {:else}
                    <span class="text-inverse text-opacity-50 small">—</span>
                  {/if}
                </td>
                <td class="font-monospace small">{evt.deviceId ?? '-'}</td>
                <td><span class="badge bg-success">{evt.status}</span></td>
                <td class="small">{formatDate(evt.createdAt)}</td>
                <td class="text-end">
                  <button class="btn btn-sm btn-outline-secondary" onclick={() => openDetail(evt.eventId)} title={m.actionView()}>
                    <i class="bi bi-eye"></i>
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
{/if}
