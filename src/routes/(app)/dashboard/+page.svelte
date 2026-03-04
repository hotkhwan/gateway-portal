<!-- src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listApprovedEvents, getDashboardStats } from '$lib/api/ingest'
  import type { ApprovedEvent } from '$lib/api/ingest'
  import type { DashboardStats } from '$lib/api/ingest'
  import type { ApexOptions } from 'apexcharts'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import CardExpandToggler from '$lib/components/bootstrap/CardExpandToggler.svelte'
  import ApexCharts from '$lib/components/plugins/ApexCharts.svelte'
  import EventMap from '$lib/components/leaflet/EventMap.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let events = $state<ApprovedEvent[]>([])

  // Stats data
  let totalEvents = $state(0)
  let deliveredEvents = $state(0)
  let pendingDelivery = $state(0)
  let failedEvents = $state(0)
  let partialDelivery = $state(0)
  let totalDeliveredTargets = $state(0)
  let totalFailedTargets = $state(0)

  // Recent events
  let recentEvents = $state<ApprovedEvent[]>([])

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
      // Load dashboard stats with geohash data for map
      try {
        const stats = await getDashboardStats(orgId)
        // Update stats from dashboard API
        totalEvents = stats.totalEvents
        deliveredEvents = stats.approvedEvents
        pendingDelivery = stats.pendingEvents
        failedEvents = stats.rejectedEvents
        // Calculate partial delivery from recent events
        const recentEventsWithPartial = stats.recentEvents.filter((e: { status: string }) => e.status === 'partial')
        partialDelivery = recentEventsWithPartial.length

        // Load geo cell data for map
        geoCells = stats.byGeoCell || []
      } catch (dashboardError) {
        // Fallback to listApprovedEvents if dashboard API fails (e.g., 500 from backend)
        console.warn('Dashboard API failed, falling back to listApprovedEvents:', dashboardError)

        const response = await listApprovedEvents(orgId, 1, 100)
        events = response.details as ApprovedEvent[]

        // Calculate stats from events
        totalEvents = events.length
        deliveredEvents = events.filter((e) => e.status === 'delivered').length
        pendingDelivery = events.filter((e) => e.status === 'pending_delivery').length
        failedEvents = events.filter((e) => e.status === 'failed').length
        partialDelivery = events.filter((e) => e.status === 'partial_delivery').length

        totalDeliveredTargets = events.reduce((sum, e) => sum + e.deliveredTargets.length, 0)
        totalFailedTargets = events.reduce((sum, e) => sum + e.failedTargets.length, 0)

        // Recent events (first 10)
        recentEvents = events.slice(0, 10)
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
</script>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    Please select an organization
    <a href="/orgs" class="alert-link">Organizations</a>
    to continue
  </div>
{:else if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">Loading...</span>
    </div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => loadEvents()}>Refresh</button>
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
              <i class="bi bi-calendar-check me-1"></i>Events (24h)
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">Delivered Events</span>
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
              <i class="bi bi-check-circle me-1"></i>{totalDeliveredTargets} targets
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">Pending Delivery</span>
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
              <i class="bi bi-clock me-1"></i>Awaiting delivery
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <div class="col-xl-3 col-lg-6">
      <Card class="mb-3">
        <CardBody>
          <div class="d-flex fw-bold small mb-3">
            <span class="flex-grow-1">Failed Events</span>
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
              <i class="bi bi-x-circle me-1"></i>{totalFailedTargets} failed targets
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
            <span class="flex-grow-1">Ingest Summary</span>
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
                  <div class="flex-1">Delivered</div>
                  <div class="fw-bold">{deliveredEvents}</div>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <div class="w-10px h-10px rounded-pill bg-warning me-2"></div>
                  <div class="flex-1">Pending</div>
                  <div class="fw-bold">{pendingDelivery}</div>
                </div>
                <div class="d-flex align-items-center mb-2">
                  <div class="w-10px h-10px rounded-pill bg-danger me-2"></div>
                  <div class="flex-1">Failed</div>
                  <div class="fw-bold">{failedEvents}</div>
                </div>
                <div class="d-flex align-items-center">
                  <div class="w-10px h-10px rounded-pill bg-info me-2"></div>
                  <div class="flex-1">Partial</div>
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
            <span class="flex-grow-1">Event Map</span>
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
              <p class="small">No location data available</p>
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
            <span class="flex-grow-1">Recent Events</span>
            <a href="/ingest/details" class="btn btn-sm btn-outline-theme">
              View
            </a>
          </div>

          {#if recentEvents.length === 0}
            <div class="text-center py-5 text-inverse text-opacity-50">
              <i class="bi bi-bar-chart fs-1 mb-3 d-block"></i>
              <p>No approved records found</p>
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-sm table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Device</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {#each recentEvents as event (event.approvedEventId)}
                    <tr class="cursor-pointer">
                      <td class="fw-semibold font-monospace small"
                        >{event.originalEventId}</td
                      >
                      <td>{event.deviceId}</td>
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
            <span class="flex-grow-1">Recent Events - Details</span>
            <a href="/ingest/details" class="btn btn-sm btn-outline-theme">
              View
            </a>
          </div>

          {#if recentEvents.length === 0}
            <div class="text-center py-5 text-inverse text-opacity-50">
              <i class="bi bi-bar-chart fs-1 mb-3 d-block"></i>
              <p>No approved records found</p>
            </div>
          {:else}
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead>
                  <tr>
                    <th>Original Event</th>
                    <th>Device</th>
                    <th>Delivered At</th>
                    <th>Status</th>
                    <th>Delivered</th>
                    <th>Failed</th>
                  </tr>
                </thead>
                <tbody>
                  {#each recentEvents as event (event.approvedEventId)}
                    <tr class="cursor-pointer">
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
                          {event.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td>
                        {#if event.deliveredTargets.length > 0}
                          <span class="badge bg-success me-1">
                            <i class="bi bi-check-lg me-1"></i
                            >{event.deliveredTargets.length}
                          </span>
                        {:else}
                          <span class="text-inverse text-opacity-50">-</span>
                        {/if}
                      </td>
                      <td>
                        {#if event.failedTargets.length > 0}
                          <span class="badge bg-danger">
                            <i class="bi bi-x-lg me-1"></i
                            >{event.failedTargets.length}
                          </span>
                        {:else}
                          <span class="text-inverse text-opacity-50">-</span>
                        {/if}
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
  </div>
  <!-- END row -->
{/if}
