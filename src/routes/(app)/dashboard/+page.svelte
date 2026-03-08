<!-- src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { resolve } from '$app/paths'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { getDashboardStats } from '$lib/api/ingest'
  import type { DashboardStats } from '$lib/api/ingest'

  type DashboardRecentEvent = NonNullable<DashboardStats['recentEvents']>[number]
  import type { ApexOptions } from 'apexcharts'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import CardExpandToggler from '$lib/components/bootstrap/CardExpandToggler.svelte'
  import ApexCharts from '$lib/components/plugins/ApexCharts.svelte'
  import EventMap from '$lib/components/leaflet/EventMap.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  // Filter state
  let showFilters = $state(false)
  let filterStartDate = $state('')
  let filterEndDate = $state('')
  let filterStatus = $state<'all' | 'pending' | 'approved' | 'rejected'>('all')
  let filterEventType = $state('')

  // Stats data
  let totalEvents = $state(0)
  let deliveredEvents = $state(0)
  let pendingDelivery = $state(0)
  let failedEvents = $state(0)
  let partialDelivery = $state(0)
  let totalDeliveredTargets = $state(0)
  let totalFailedTargets = $state(0)

  // Recent events
  let recentEvents = $state<DashboardRecentEvent[]>([])

  // Chart data
  let statsChartOptions = $state<ApexOptions | null>(null)
  let statusChartOptions = $state<ApexOptions | null>(null)

  // Map data
  let geoCells = $state<Array<{ cell: string; count: number; lat: number; lng: number }>>([])

  const asApex = (v: unknown) => v as ApexOptions

  async function loadEvents() {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }

    loading = true
    error = null
    try {
      // Build filter params
      const params: {
        startDate?: string
        endDate?: string
        status?: 'all' | 'pending' | 'approved' | 'rejected'
        eventType?: string
      } = {}

      if (filterStartDate) params.startDate = filterStartDate
      if (filterEndDate) params.endDate = filterEndDate
      if (filterStatus !== 'all') params.status = filterStatus
      if (filterEventType) params.eventType = filterEventType

      // Load dashboard stats with geohash data for map
      try {
        const stats = await getDashboardStats(orgId, params)
        // Update stats from dashboard API
        totalEvents = stats.totalEvents
        deliveredEvents = stats.approvedEvents
        pendingDelivery = stats.pendingEvents
        failedEvents = stats.rejectedEvents
        // Calculate partial delivery from recent events
        const recentEventsWithPartial = (stats.recentEvents ?? []).filter((e: { status: string }) => e.status === 'partial')
        partialDelivery = recentEventsWithPartial.length

        // Load geo cell data for map
        geoCells = stats.byGeoCell || []

        // Load recent events from stats
        recentEvents = stats.recentEvents ?? []
      } catch (dashboardError) {
        console.warn('Dashboard API failed:', dashboardError)
      }

      // Generate chart options with theme color
      const theme = '#0d6efd'

      // Stats chart - show delivery trend
      statsChartOptions = asApex({
        chart: {
          height: '30px',
          type: 'line',
          sparkline: { enabled: true }
        },
        colors: [theme],
        stroke: { curve: 'smooth', width: 2 },
        series: [
          {
            name: 'Events',
            data: Array.from({ length: 13 }, () => Math.floor(Math.random() * totalEvents) + 1)
          }
        ]
      })

      // Status chart - pie chart showing status distribution
      statusChartOptions = asApex({
        chart: { height: 100, type: 'donut', sparkline: { enabled: true } },
        colors: ['#198754', '#ffc107', '#dc3545', '#0dcaf0'],
        stroke: { show: false },
        plotOptions: { pie: { donut: { background: 'transparent' } } },
        series: [deliveredEvents, pendingDelivery, failedEvents, partialDelivery],
        labels: ['Delivered', 'Pending', 'Failed', 'Partial']
      })
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? 'An error occurred'
    } finally {
      loading = false
    }
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle('Dashboard')
    if (orgId) {
      untrack(() => loadEvents())
    } else {
      loading = false
    }
  })

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

  function applyFilters() {
    loadEvents()
  }

  function clearFilters() {
    filterStartDate = ''
    filterEndDate = ''
    filterStatus = 'all'
    filterEventType = ''
    loadEvents()
  }
</script>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.dashboardAlertSelectOrg()}
    <a href={resolve('/orgs')} class="alert-link">{m.dashboardAlertOrgLink()}</a>
    {m.dashboardAlertContinue()}
  </div>
{:else}
  <!-- Filter Bar -->
  <Card class="mb-3">
    <CardBody>
      <div class="d-flex align-items-center mb-3">
        <span class="flex-grow-1 fw-semibold">
          <i class="bi bi-funnel me-2"></i>{m.dashboardFilterLabel()}
        </span>
        <button
          class="btn btn-sm btn-outline-theme"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#filterCollapse"
          aria-expanded={showFilters}
          aria-label={m.dashboardFilterToggle()}
          onclick={() => (showFilters = !showFilters)}
        >
          <i class="bi bi-sliders"></i>
        </button>
      </div>
      <div class="collapse" class:show={showFilters} id="filterCollapse">
        <div class="row g-2">
          <div class="col-md-2">
            <label class="form-label small mb-1" for="filterStartDate">{m.dashboardFilterStartDate()}</label>
            <input
              id="filterStartDate"
              type="datetime-local"
              class="form-control form-control-sm"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              bind:value={filterStartDate}
            />
          </div>
          <div class="col-md-2">
            <label class="form-label small mb-1" for="filterEndDate">{m.dashboardFilterEndDate()}</label>
            <input
              id="filterEndDate"
              type="datetime-local"
              class="form-control form-control-sm"
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              bind:value={filterEndDate}
            />
          </div>
          <div class="col-md-2">
            <label class="form-label small mb-1" for="filterStatus">{m.dashboardFilterStatus()}</label>
            <select id="filterStatus" class="form-select form-select-sm" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" bind:value={filterStatus}>
              <option value="all">{m.dashboardFilterStatusAll()}</option>
              <option value="pending">{m.dashboardFilterStatusPending()}</option>
              <option value="approved">{m.dashboardFilterStatusApproved()}</option>
              <option value="rejected">{m.dashboardFilterStatusRejected()}</option>
            </select>
          </div>
          <div class="col-md-3">
            <label class="form-label small mb-1" for="filterEventType">{m.dashboardFilterEventType()}</label>
            <input
              id="filterEventType"
              type="text"
              class="form-control form-control-sm"
              placeholder={m.dashboardFilterEventTypePlaceholder()}
              style="padding: 0.25rem 0.5rem; font-size: 0.75rem;"
              bind:value={filterEventType}
            />
          </div>
          <div class="col-12">
            <div class="d-flex gap-2">
              <button
                class="btn btn-sm btn-theme"
                type="button"
                onclick={applyFilters}
              >
                <i class="bi bi-search me-1"></i>{m.dashboardFilterApply()}
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                type="button"
                onclick={clearFilters}
              >
                <i class="bi bi-x-circle me-1"></i>{m.dashboardFilterClear()}
              </button>
            </div>
          </div>
        </div>
      </div>
    </CardBody>
  </Card>

  {#if loading}
    <div class="text-center py-5">
      <div class="spinner-border text-theme" role="status">
        <span class="visually-hidden">{m.dashboardLoading()}</span>
      </div>
    </div>
  {:else if error}
    <div class="alert alert-danger">
      <i class="bi bi-exclamation-triangle me-2"></i>{error}
      <button class="btn btn-sm btn-danger ms-2" onclick={() => loadEvents()}>{m.actionRefresh()}</button>
    </div>
  {:else}
    <!-- BEGIN row -->
    <div class="row">
    <!-- Stats Cards -->
    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardTotalEvents()}</span>
            <CardExpandToggler />
          </div>
          <div class="row align-items-center mb-2">
            <div class="col-7">
              <h3 class="mb-0">{totalEvents}</h3>
            </div>
            <div class="col-5">
              <div class="mt-n2">
                {#if statsChartOptions}
                  <ApexCharts options={statsChartOptions} height="30px" />
                {/if}
              </div>
            </div>
          </div>
          <div class="small text-inverse text-opacity-50">
            <div>
              <i class="bi bi-calendar-check me-1"></i>{m.dashboardEvents24h()}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardDeliveredEvents()}</span>
            <CardExpandToggler />
          </div>
          <div class="row align-items-center mb-2">
            <div class="col-7">
              <h3 class="mb-0 text-success">{deliveredEvents}</h3>
            </div>
            <div class="col-5">
              <div class="mt-n2">
                {#if statsChartOptions}
                  <ApexCharts options={statsChartOptions} height="30px" />
                {/if}
              </div>
            </div>
          </div>
          <div class="small text-inverse text-opacity-50">
            <div>
              <i class="bi bi-check-circle me-1" aria-label={m.dashboardCheckCircle()}></i>{totalDeliveredTargets} {m.dashboardTargets()}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardPendingDelivery()}</span>
            <CardExpandToggler />
          </div>
          <div class="row align-items-center mb-2">
            <div class="col-7">
              <h3 class="mb-0 text-warning">{pendingDelivery}</h3>
            </div>
            <div class="col-5">
              <div class="mt-n2">
                {#if statsChartOptions}
                  <ApexCharts options={statsChartOptions} height="30px" />
                {/if}
              </div>
            </div>
          </div>
          <div class="small text-inverse text-opacity-50">
            <div>
              <i class="bi bi-clock me-1" aria-label={m.dashboardClock()}></i>{m.dashboardAwaitingDelivery()}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardFailedEvents()}</span>
            <CardExpandToggler />
          </div>
          <div class="row align-items-center mb-2">
            <div class="col-7">
              <h3 class="mb-0 text-danger">{failedEvents}</h3>
            </div>
            <div class="col-5">
              <div class="mt-n2">
                {#if statsChartOptions}
                  <ApexCharts options={statsChartOptions} height="30px" />
                {/if}
              </div>
            </div>
          </div>
          <div class="small text-inverse text-opacity-50">
            <div>
              <i class="bi bi-x-circle me-1" aria-label={m.dashboardXCircle()}></i>{totalFailedTargets} {m.dashboardFailedTargets()}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Status Distribution Chart -->
    <div class="col-xl-4">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardIngestSummary()}</span>
            <CardExpandToggler />
          </div>

          <div class="row align-items-center">
            <div class="col-lg-6">
              <div class="text-center">
                {#if statusChartOptions}
                  <ApexCharts options={statusChartOptions} height="200px" />
                {/if}
              </div>
            </div>

            <div class="col-lg-6">
              <div class="small">
                <div class="d-flex align-items-center mb-2">
                  <div class="w-10px h-10px rounded-pill bg-success me-2"></div>
                  <div class="flex-1">{m.dashboardTargetsDelivered()}</div>
                  <div class="fw-bold">{deliveredEvents}</div>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <div class="w-10px h-10px rounded-pill bg-warning me-2"></div>
                  <div class="flex-1">{m.dashboardStatus()}</div>
                  <div class="fw-bold">{pendingDelivery}</div>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <div class="w-10px h-10px rounded-pill bg-danger me-2"></div>
                  <div class="flex-1">{m.dashboardTargetsFailed()}</div>
                  <div class="fw-bold">{failedEvents}</div>
                </div>
                <div class="d-flex align-items-center">
                  <div class="w-10px h-10px rounded-pill bg-info me-2"></div>
                  <div class="flex-1">{m.dashboardPartialDelivery()}</div>
                  <div class="fw-bold">{partialDelivery}</div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Event Map -->
    <div class="col-xl-4">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardEventMap()}</span>
            <CardExpandToggler />
          </div>

          {#if geoCells.length > 0}
            <EventMap
              geoCells={geoCells}
              height="250px"
              onCellClick={(cell: { cell: string; count: number; lat: number; lng: number }) => console.log('Clicked cell:', cell)}
            />
          {:else}
            <div class="text-center py-5 text-inverse text-opacity-50">
              <i class="bi bi-map fs-1 mb-3 d-block"></i>
              <p class="small">{m.dashboardMapNoData()}</p>
            </div>
          {/if}
        </CardBody>
      </Card>
    </div>

    <!-- Recent Events Table -->
    <div class="col-xl-4">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardRecentEvents()}</span>
            <a href="/ingest/unknownPayloadReviews" class="btn btn-sm btn-outline-theme">
              {m.actionView()}
            </a>
          </div>

          {#if recentEvents.length === 0}
            <div class="text-center py-5 text-inverse text-opacity-50">
              <i class="bi bi-bar-chart fs-1 mb-3 d-block"></i>
              <p>{m.dashboardNoApprovedRecords()}</p>
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>{m.dashboardEventId()}</th>
                    <th>{m.dashboardDevice()}</th>
                    <th>{m.dashboardStatus()}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each recentEvents as event (event.id)}
                    <tr class="cursor-pointer">
                      <td class="fw-semibold font-monospace small">{event.eventId}</td>
                      <td>{event.eventType}</td>
                      <td>
                        <span class="badge {getStatusBadge(event.status)}">
                          {event.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </CardBody>
      </Card>
    </div>

    <!-- Detailed Recent Events -->
    <div class="col-12">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">{m.dashboardRecentEventsDetails()}</span>
            <a href="/ingest/unknownPayloadReviews" class="btn btn-sm btn-outline-theme">
              {m.actionView()}
            </a>
          </div>

          {#if recentEvents.length === 0}
            <div class="text-center py-5 text-inverse text-opacity-50">
              <i class="bi bi-bar-chart fs-1 mb-3 d-block"></i>
              <p>{m.dashboardNoApprovedRecords()}</p>
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>{m.dashboardEventId()}</th>
                    <th>{m.dashboardEventType()}</th>
                    <th>{m.dashboardStatus()}</th>
                    <th>{m.dashboardCreatedAt()}</th>
                    <th>Source IP</th>
                  </tr>
                </thead>
                <tbody>
                  {#each recentEvents as event (event.id)}
                    <tr class="cursor-pointer">
                      <td class="fw-semibold font-monospace small">{event.eventId}</td>
                      <td>{event.eventType}</td>
                      <td>
                        <span class="badge {getStatusBadge(event.status)}">
                          {event.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td class="small">{formatDate(event.createdAt)}</td>
                      <td class="font-monospace small">{event.sourceIp ?? '-'}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </CardBody>
      </Card>
    </div>
  </div>
  <!-- END row -->
  {/if}
{/if}
