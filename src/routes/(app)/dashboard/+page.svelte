<!-- src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { resolve } from '$app/paths'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import { getDashboardStats, listApprovedEvents } from '$lib/api/ingest'
  import type { ApprovedEvent } from '$lib/types/ingest'
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
  let filterEventType = $state('')

  // Stats from dashboard API
  let failedEvents = $state(0)
  let byEventType = $state<Record<string, number>>({})

  // Data from event_details
  let recentEvents = $state<ApprovedEvent[]>([])
  let totalEventDetails = $state(0)

  // Map data
  let geoCells = $state<
    Array<{ cell: string; count: number; lat: number; lng: number }>
  >([])

  // Derived: top categories (split eventType by '.')
  let topCategories = $derived(
    Object.entries(
      (Object.keys(byEventType).length > 0
        ? Object.entries(byEventType)
        : recentEvents.map((e) => [e.eventType, 1] as [string, number])
      ).reduce(
        (acc, [type, count]) => {
          const cat = type.includes('.') ? type.split('.')[0] : type
          acc[cat] = (acc[cat] ?? 0) + count
          return acc
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  )

  // Derived: top actions (part after '.')
  let topActions = $derived(
    Object.entries(
      (Object.keys(byEventType).length > 0
        ? Object.entries(byEventType)
        : recentEvents.map((e) => [e.eventType, 1] as [string, number])
      ).reduce(
        (acc, [type, count]) => {
          const act = type.includes('.')
            ? type.split('.').slice(1).join('.')
            : type
          acc[act] = (acc[act] ?? 0) + count
          return acc
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  )

  // Derived: top 10 devices from recent events (50 fetched)
  let topDevices = $derived(
    Object.entries(
      recentEvents.reduce(
        (acc, e) => {
          const dev = e.source?.deviceName ?? e.source?.deviceId ?? '-'
          acc[dev] = (acc[dev] ?? 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  )

  // Derived: top 10 event types for treemap
  let topEventTypes = $derived(
    Object.keys(byEventType).length > 0
      ? Object.entries(byEventType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
      : Object.entries(
          recentEvents.reduce(
            (acc, e) => {
              acc[e.eventType] = (acc[e.eventType] ?? 0) + 1
              return acc
            },
            {} as Record<string, number>
          )
        )
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
  )

  async function loadEvents() {
    const orgId = $activeWorkspaceId
    if (!orgId) {
      loading = false
      return
    }

    loading = true
    error = null
    try {
      // Dashboard stats (counts + byEventType)
      try {
        const stats = await getDashboardStats(orgId, {
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
          eventType: filterEventType || undefined
        })
        failedEvents = stats.rejectedEvents
        byEventType = stats.byEventType ?? {}
        if (stats.byGeoCell && stats.byGeoCell.length > 0) {
          geoCells = stats.byGeoCell
        }
      } catch (e) {
        console.warn('Dashboard stats failed:', e)
      }

      // Recent events from event_details (fetch 50 for better device/type stats)
      try {
        const result = await listApprovedEvents(orgId, 1, 50, {
          eventType: filterEventType || undefined
        })
        recentEvents = result.details
        totalEventDetails = result.total

        // Build geo cells from geoCell data if stats had none
        if (geoCells.length === 0 && recentEvents.length > 0) {
          const cellMap = new Map<
            string,
            { cell: string; count: number; lat: number; lng: number }
          >()
          for (const ev of recentEvents) {
            if (ev.geoCell?.cell) {
              const existing = cellMap.get(ev.geoCell.cell)
              if (existing) {
                existing.count++
              } else {
                cellMap.set(ev.geoCell.cell, {
                  cell: ev.geoCell.cell,
                  count: 1,
                  lat: ev.location?.lat ?? ev.lat,
                  lng: ev.location?.lng ?? ev.lng
                })
              }
            }
          }
          geoCells = Array.from(cellMap.values())
        }
      } catch (e) {
        console.warn('Event details failed:', e)
      }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? 'An error occurred'
    } finally {
      loading = false
    }
  }

  $effect(() => {
    const orgId = $activeWorkspaceId
    setPageTitle('Dashboard')
    if (orgId) untrack(() => loadEvents())
    else loading = false
  })

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString()
  }

  function getDeviceLabel(event: ApprovedEvent): string {
    return event.source?.deviceName ?? event.source?.deviceId ?? '-'
  }

  function getLocationLabel(event: ApprovedEvent): string {
    return event.geo?.adminName ?? event.location?.zone ?? '-'
  }

  function getEventCategory(eventType: string): string {
    return eventType.includes('.') ? eventType.split('.')[0] : eventType
  }

  function getEventAction(eventType: string): string {
    return eventType.includes('.')
      ? eventType.split('.').slice(1).join('.')
      : '-'
  }

  const asApex = (v: unknown) => v as ApexOptions

  // Sparkline for Total Events card (uses byEventType values as shape indicator)
  let totalSparklineOptions = $derived(
    asApex({
      chart: { type: 'area', height: 40, sparkline: { enabled: true } },
      stroke: { curve: 'smooth', width: 2 },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1 }
      },
      colors: ['#4fc9da'],
      series: [
        {
          name: 'Events',
          data:
            Object.values(byEventType).length > 0
              ? Object.values(byEventType).sort((a, b) => a - b)
              : [0, 0]
        }
      ],
      tooltip: { enabled: false }
    })
  )

  // Horizontal bar — Top 10 Event Types
  let eventTypesChartOptions = $derived(
    asApex({
      chart: {
        type: 'bar',
        height: 200,
        toolbar: { show: false },
        animations: { enabled: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 3,
          dataLabels: { position: 'center' }
        }
      },
      colors: ['#4fc9da'],
      dataLabels: {
        enabled: true,
        style: { fontSize: '10px', colors: ['#fff'] },
        formatter: (v: number) => String(v)
      },
      xaxis: {
        categories: topEventTypes.map(([t]) => t),
        labels: { style: { fontSize: '9px' } }
      },
      yaxis: { labels: { style: { fontSize: '9px' }, maxWidth: 120 } },
      series: [{ name: 'Count', data: topEventTypes.map(([, c]) => c) }],
      grid: { show: false },
      tooltip: { y: { formatter: (v: number) => `${v} events` } }
    })
  )

  // Horizontal bar — Top 10 Devices
  let topDevicesChartOptions = $derived(
    asApex({
      chart: {
        type: 'bar',
        height: 200,
        toolbar: { show: false },
        animations: { enabled: false }
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '60%',
          borderRadius: 3,
          dataLabels: { position: 'center' }
        }
      },
      colors: ['#f6c23e'],
      dataLabels: {
        enabled: true,
        style: { fontSize: '10px', colors: ['#000'] },
        formatter: (v: number) => String(v)
      },
      xaxis: {
        categories: topDevices.map(([d]) => d),
        labels: { style: { fontSize: '9px' } }
      },
      yaxis: { labels: { style: { fontSize: '9px' }, maxWidth: 120 } },
      series: [{ name: 'Events', data: topDevices.map(([, c]) => c) }],
      grid: { show: false },
      tooltip: { y: { formatter: (v: number) => `${v} events` } }
    })
  )

  function applyFilters() {
    loadEvents()
  }

  function clearFilters() {
    filterStartDate = ''
    filterEndDate = ''
    filterEventType = ''
    loadEvents()
  }
</script>

{#if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()}
    <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
  </div>
{:else}
  <!-- Filter Bar (compact inline) -->
  <div class="d-flex align-items-center gap-2 mb-3 flex-wrap">
    <i class="bi bi-funnel text-theme"></i>
    <input
      id="filterStartDate"
      type="datetime-local"
      class="form-control form-control-sm"
      style="width:auto;font-size:0.75rem;"
      title={m.dashboardFilterStartDate()}
      bind:value={filterStartDate}
    />
    <span class="text-inverse text-opacity-50 small">–</span>
    <input
      id="filterEndDate"
      type="datetime-local"
      class="form-control form-control-sm"
      style="width:auto;font-size:0.75rem;"
      title={m.dashboardFilterEndDate()}
      bind:value={filterEndDate}
    />
    <input
      id="filterEventType"
      type="text"
      class="form-control form-control-sm"
      style="width:180px;font-size:0.75rem;"
      placeholder={m.dashboardFilterEventType()}
      bind:value={filterEventType}
    />
    <button
      class="btn btn-sm btn-theme"
      type="button"
      onclick={applyFilters}
      aria-label={m.dashboardFilterApply()}
    >
      <i class="bi bi-search"></i>
    </button>
    <button
      class="btn btn-sm btn-outline-secondary"
      type="button"
      onclick={clearFilters}
      aria-label={m.dashboardFilterClear()}
    >
      <i class="bi bi-x-lg"></i>
    </button>
  </div>

  {#if loading}
    <div class="text-center py-5">
      <div class="spinner-border text-theme" role="status">
        <span class="visually-hidden">{m.dashboardLoading()}</span>
      </div>
    </div>
  {:else if error}
    <div class="alert alert-danger">
      <i class="bi bi-exclamation-triangle me-2"></i>{error}
      <button class="btn btn-sm btn-danger ms-2" onclick={() => loadEvents()}
        >{m.actionRefresh()}</button
      >
    </div>
  {:else}
    <!-- Row 1: Stat cards -->
    <div class="row g-3 mb-4">
      <!-- Card 1: Total Events -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-3 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">{m.dashboardTotalEvents()}</span>
              <CardExpandToggler />
            </div>
            <div class="row align-items-center mb-2">
              <div class="col-7">
                <h3 class="mb-0">{totalEventDetails}</h3>
              </div>
              <div class="col-5">
                <ApexCharts options={totalSparklineOptions} height="40px" />
              </div>
            </div>
            <div class="small text-inverse text-opacity-50">
              <i class="bi bi-calendar-check me-1"></i>{m.dashboardEvents24h()}
            </div>
          </CardBody>
        </Card>
      </div>

      <!-- Card 2: Event Category -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-3 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">{m.dashboardCategory()}</span>
              <CardExpandToggler />
            </div>
            <h3 class="mb-2">{topCategories.length}</h3>
            {#if topCategories.length === 0}
              <div class="small text-inverse text-opacity-50">
                {m.dashboardNoData()}
              </div>
            {:else}
              <div class="small">
                {#each topCategories as [cat, count]}
                  <div
                    class="d-flex justify-content-between align-items-center mb-1"
                  >
                    <span class="text-truncate me-2" title={cat}>{cat}</span>
                    <span class="badge bg-theme">{count}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </CardBody>
        </Card>
      </div>

      <!-- Card 3: Event Action -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-3 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">{m.dashboardAction()}</span>
              <CardExpandToggler />
            </div>
            <h3 class="mb-2">{topActions.length}</h3>
            {#if topActions.length === 0}
              <div class="small text-inverse text-opacity-50">
                {m.dashboardNoData()}
              </div>
            {:else}
              <div class="small">
                {#each topActions as [act, count]}
                  <div
                    class="d-flex justify-content-between align-items-center mb-1"
                  >
                    <span class="text-truncate me-2" title={act}>{act}</span>
                    <span class="badge bg-success">{count}</span>
                  </div>
                {/each}
              </div>
            {/if}
          </CardBody>
        </Card>
      </div>

      <!-- Card 4: Failed Events -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-3 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">{m.dashboardFailedEvents()}</span>
              <CardExpandToggler />
            </div>
            <h3 class="mb-1 text-danger">{failedEvents}</h3>
            <div class="small text-inverse text-opacity-50">
              <i class="bi bi-x-circle me-1"></i>{m.dashboardFailedTargets()}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- Row 2: Charts + Map -->
    <div class="row g-3 mb-4">
      <!-- Left column: Event Types + Top Devices stacked -->
      <div class="col-xl-4">
        <!-- Top 10 Event Types -->
        <Card class="mb-3">
          <CardBody>
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardTopEventTypes()}</span>
              <CardExpandToggler />
            </div>
            {#if topEventTypes.length === 0}
              <div class="text-center py-3 text-inverse text-opacity-50">
                <p class="small mb-0">{m.dashboardNoData()}</p>
              </div>
            {:else}
              <ApexCharts options={eventTypesChartOptions} height="200px" />
            {/if}
          </CardBody>
        </Card>

        <!-- Top 10 Device Events -->
        <Card class="mb-3">
          <CardBody>
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardTopDeviceEvents()}</span>
              <CardExpandToggler />
            </div>
            {#if topDevices.length === 0}
              <div class="text-center py-3 text-inverse text-opacity-50">
                <p class="small mb-0">{m.dashboardNoData()}</p>
              </div>
            {:else}
              <ApexCharts options={topDevicesChartOptions} height="200px" />
            {/if}
          </CardBody>
        </Card>
      </div>

      <!-- Event Map — ใหญ่ครอบคลุม Thailand -->
      <div class="col-xl-8">
        <Card class="mb-3">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">{m.dashboardEventMap()}</span>
              <CardExpandToggler />
            </div>
            <EventMap
              {geoCells}
              height="460px"
              zoom={3}
              onCellClick={(cell: {
                cell: string
                count: number
                lat: number
                lng: number
              }) => console.log('Clicked cell:', cell)}
            />
          </CardBody>
        </Card>
      </div>

    </div>

    <!-- Row 3: Recent Events -->
    <div class="row g-3">
      <div class="col-12">
        <Card class="mb-3">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">
                {m.dashboardRecentEvents()}
                {#if totalEventDetails > 0}
                  <span class="badge bg-secondary ms-2 fw-normal"
                    >{totalEventDetails} {m.dashboardTotal()}</span
                  >
                {/if}
              </span>
              <a
                href={resolve('/ingest/details')}
                class="btn btn-sm btn-outline-theme"
              >
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
                      <th>{m.dashboardCategory()}</th>
                      <th>{m.dashboardAction()}</th>
                      <th>{m.dashboardDevice()}</th>
                      <th>{m.dashboardLocation()}</th>
                      <th>{m.dashboardCreatedAt()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each recentEvents as event (event.id)}
                      <tr class="cursor-pointer">
                        <td class="fw-semibold font-monospace small"
                          >{event.eventId}</td
                        >
                        <td
                          ><span class="badge bg-theme"
                            >{getEventCategory(event.eventType)}</span
                          ></td
                        >
                        <td
                          ><span class="badge bg-success"
                            >{getEventAction(event.eventType)}</span
                          ></td
                        >
                        <td class="small">{getDeviceLabel(event)}</td>
                        <td class="small">{getLocationLabel(event)}</td>
                        <td class="small">{formatDate(event.createdAt)}</td>
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
  {/if}
{/if}
