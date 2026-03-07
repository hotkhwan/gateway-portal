<!-- src/routes/(app)/ingest/details/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listApprovedEvents, getApprovedEvent } from '$lib/api/ingest'
  import type { ApprovedEvent } from '$lib/api/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let events = $state<ApprovedEvent[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })

  // View modal
  let showViewModal = $state(false)
  let viewEvent = $state<ApprovedEvent | null>(null)
  let viewLoading = $state(false)

  async function loadEvents(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }
    const perPage = untrack(() => pagination.perPage)

    loading = true
    error = null
    try {
      const response = await listApprovedEvents(orgId, page, perPage)
      events = response.details as ApprovedEvent[]
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

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.eventsDetailsTitle())
    if (orgId) {
      untrack(() => loadEvents())
    } else {
      loading = false
    }
  })

  async function viewEventDetails(approvedEventId: string) {
    const orgId = $activeOrg?.id
    if (!orgId) return

    viewLoading = true
    showViewModal = true
    viewEvent = null

    try {
      viewEvent = await getApprovedEvent(orgId, approvedEventId)
    } catch (e: unknown) {
      // Fallback to event from list if API call fails
      viewEvent =
        events.find((ev) => ev.approvedEventId === approvedEventId) || null
      // Don't set page error, modal shows event from list as fallback
      console.error('[viewEventDetails] error:', e)
    } finally {
      viewLoading = false
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString()
  }

  function getStatusBadge(status: string): string {
    switch (status) {
      case 'pending_delivery':
        return 'bg-warning'
      case 'delivered':
        return 'bg-success'
      case 'partial_delivery':
        return 'bg-info'
      case 'failed':
        return 'bg-danger'
      default:
        return 'bg-secondary'
    }
  }
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.eventsDetailsTitle()}</h1>
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
        <p class="text-inverse text-opacity-50">
          {m.eventsNoApprovedRecords()}
        </p>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.eventsOriginalEvent()}</th>
          <th>{m.eventsDevice()}</th>
          <th>{m.eventsDeliveredAt()}</th>
          <th>{m.eventsDeliveryStatus()}</th>
          <th>{m.eventsTargets()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each events as event (event.approvedEventId)}
          <tr>
            <td class="fw-semibold font-monospace small"
              >{event.originalEventId}</td
            >
            <td>{event.deviceId}</td>
            <td class="small">
              {#if event.deliveredAt}
                {formatDate(event.deliveredAt)}
              {:else}
                <span class="text-inverse text-opacity-50">-</span>
              {/if}
            </td>
            <td>
              <span class="badge {getStatusBadge(event.status)}">
                {event.status === 'delivered' ? m.eventsStatusDelivered() : event.status === 'pending_delivery' ? m.eventsStatusPendingDelivery() : event.status === 'partial_delivery' ? m.eventsStatusPartialDelivery() : event.status === 'failed' ? m.eventsStatusFailed() : event.status}
              </span>
            </td>
            <td>
              {#if event.deliveredTargets.length > 0}
                <span class="badge bg-success me-1">
                  <i class="bi bi-check-lg me-1"></i>{event.deliveredTargets
                    .length}
                </span>
              {/if}
              {#if event.failedTargets.length > 0}
                <span class="badge bg-danger">
                  <i class="bi bi-x-lg me-1"></i>{event.failedTargets.length}
                </span>
              {/if}
              {#if event.deliveredTargets.length === 0 && event.failedTargets.length === 0}
                <span class="text-inverse text-opacity-50">-</span>
              {/if}
            </td>
            <td class="text-end">
              <button
                class="btn btn-sm btn-outline-theme"
                onclick={() => viewEventDetails(event.approvedEventId)}
                title={m.actionView()}
              >
                <i class="bi bi-eye"></i>
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

<!-- View Modal -->
{#if showViewModal && viewEvent}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
    >
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.eventsViewApprovedTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
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
          {:else if !viewEvent}
            <div class="alert alert-warning">
              <i class="bi bi-exclamation-triangle me-2"></i>
              {m.commonError()}
            </div>
          {:else}
            <table class="table table-sm">
              <tbody>
                <tr>
                  <th style="width:30%">{m.eventsApprovedEventId()}</th>
                  <td class="font-monospace small"
                    >{viewEvent.approvedEventId}</td
                  >
                </tr>
                <tr>
                  <th>{m.eventsOriginalEvent()}</th>
                  <td class="font-monospace small"
                    >{viewEvent.originalEventId}</td
                  >
                </tr>
                <tr>
                  <th>{m.eventsDevice()}</th>
                  <td>{viewEvent.deviceId}</td>
                </tr>
                <tr>
                  <th>{m.eventsDeliveryStatus()}</th>
                  <td>
                    <span class="badge {getStatusBadge(viewEvent.status)}">
                      {viewEvent.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                </tr>
                <tr>
                  <th>{m.eventsCreatedAt()}</th>
                  <td>{formatDate(viewEvent.createdAt)}</td>
                </tr>
                <tr>
                  <th>{m.eventsDeliveredAt()}</th>
                  <td>
                    {#if viewEvent.deliveredAt}
                      {formatDate(viewEvent.deliveredAt)}
                    {:else}
                      <span class="text-inverse text-opacity-50">-</span>
                    {/if}
                  </td>
                </tr>
              </tbody>
            </table>

            <hr />

            <h6 class="mb-2">{m.eventsDeliveredTargets()}</h6>
            {#if viewEvent.deliveredTargets.length > 0}
              <ul class="list-unstyled">
                {#each viewEvent.deliveredTargets as target}
                  <li class="mb-1">
                    <i class="bi bi-check-circle-fill text-success me-2"></i>
                    <span class="font-monospace small">{target}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-inverse text-opacity-50 small">
                {m.eventsNoDeliveredTargets()}
              </p>
            {/if}

            <hr />

            <h6 class="mb-2">{m.eventsFailedTargets()}</h6>
            {#if viewEvent.failedTargets.length > 0}
              <ul class="list-unstyled">
                {#each viewEvent.failedTargets as target}
                  <li class="mb-1">
                    <i class="bi bi-x-circle-fill text-danger me-2"></i>
                    <span class="font-monospace small">{target}</span>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-inverse text-opacity-50 small">
                {m.eventsNoFailedTargets()}
              </p>
            {/if}

            <hr />

            <h6 class="mb-2">{m.eventsNormalizedData()}</h6>
            <pre class="bg-dark text-light p-3 rounded small">{JSON.stringify(
                viewEvent.normalizedData,
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
