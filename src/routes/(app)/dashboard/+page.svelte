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

  // Sentinel key สำหรับรายการ "อื่นๆ" ที่รวมส่วนที่เหลือ (อยู่นอก Top 3)
  const OTHER_KEY = '__other__'
  const TOP_N = 3

  // ย่อ list ให้เหลือ Top N + รวมที่เหลือเป็น "อื่นๆ" (ถ้ามีรายการเกิน N+1)
  function condenseTopN(
    sorted: Array<[string, number]>
  ): Array<[string, number]> {
    if (sorted.length <= TOP_N + 1) return sorted
    const top = sorted.slice(0, TOP_N)
    const otherCount = sorted
      .slice(TOP_N)
      .reduce((sum, [, c]) => sum + c, 0)
    return [...top, [OTHER_KEY, otherCount]]
  }

  // รวม eventType counts → Record<key, count> โดย extract key จาก eventType ผ่าน keyOf()
  function aggregateBy(
    keyOf: (eventType: string) => string
  ): Array<[string, number]> {
    const source =
      Object.keys(byEventType).length > 0
        ? Object.entries(byEventType)
        : recentEvents.map((e) => [e.eventType, 1] as [string, number])
    const acc = source.reduce(
      (m, [type, count]) => {
        const k = keyOf(type)
        m[k] = (m[k] ?? 0) + count
        return m
      },
      {} as Record<string, number>
    )
    return Object.entries(acc).sort((a, b) => b[1] - a[1])
  }

  // Aggregations เต็ม (ใช้แสดง unique count ในการ์ด)
  let allCategories = $derived(
    aggregateBy((t) => (t.includes('.') ? t.split('.')[0] : t))
  )
  let allActions = $derived(
    aggregateBy((t) => (t.includes('.') ? t.split('.').slice(1).join('.') : t))
  )

  // เวอร์ชัน Top 3 + Other สำหรับ list ในการ์ด
  let topCategories = $derived(condenseTopN(allCategories))
  let topActions = $derived(condenseTopN(allActions))

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

  const asApex = (v: unknown) => v as ApexOptions

  // Horizontal bar — Top 10 Event Types
  let eventTypesChartOptions = $derived(
    asApex({
      chart: {
        type: 'bar',
        height: '100%',
        toolbar: { show: false },
        animations: { enabled: false },
        offsetY: -8
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '55%',
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
        labels: { style: { fontSize: '9px' } },
        axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontSize: '9px' }, maxWidth: 120 } },
      series: [{ name: 'Count', data: topEventTypes.map(([, c]) => c) }],
      grid: { show: false, padding: { top: -10, right: 0, bottom: -10, left: 0 } },
      tooltip: { y: { formatter: (v: number) => `${v} events` } }
    })
  )

  // Horizontal bar — Top 10 Devices
  let topDevicesChartOptions = $derived(
    asApex({
      chart: {
        type: 'bar',
        height: '100%',
        toolbar: { show: false },
        animations: { enabled: false },
        offsetY: -8
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '55%',
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
        labels: { style: { fontSize: '9px' } },
        axisTicks: { show: false }
      },
      yaxis: { labels: { style: { fontSize: '9px' }, maxWidth: 120 } },
      series: [{ name: 'Events', data: topDevices.map(([, c]) => c) }],
      grid: { show: false, padding: { top: -10, right: 0, bottom: -10, left: 0 } },
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
    <div class="row g-3 mb-3">
      <!-- Card 1: Total Events -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-0 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardTotalEvents()}</span>
              <CardExpandToggler />
            </div>
            <div
              class="d-flex align-items-center justify-content-between gap-2 mb-2"
            >
              <div class="d-flex align-items-center gap-2">
                <i class="bi bi-bar-chart-fill fs-2 text-theme opacity-50"></i>
                <h3 class="mb-0 fw-bold">{totalEventDetails}</h3>
              </div>
              <a
                href={resolve('/ingest/details')}
                class="btn btn-sm btn-outline-theme"
              >
                {m.actionView()}
              </a>
            </div>
            <div class="small text-inverse text-opacity-50">
              <i class="bi bi-calendar-check me-1"></i>{m.dashboardEvents24h()}
            </div>
          </CardBody>
        </Card>
      </div>

      <!-- Card 2: Event Category -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-0 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardCategory()}</span>
              <CardExpandToggler />
            </div>
            <h4 class="mb-2">{allCategories.length}</h4>
            {#if topCategories.length === 0}
              <div class="small text-inverse text-opacity-50">
                {m.dashboardNoData()}
              </div>
            {:else}
              <div class="small">
                {#each topCategories as [cat, count]}
                  {@const label =
                    cat === OTHER_KEY ? m.dashboardOther() : cat}
                  <div
                    class="d-flex justify-content-between align-items-center mb-1"
                  >
                    <span class="text-truncate me-2" title={label}>{label}</span
                    >
                    <span
                      class="badge {cat === OTHER_KEY
                        ? 'bg-secondary'
                        : 'bg-theme'}">{count}</span
                    >
                  </div>
                {/each}
              </div>
            {/if}
          </CardBody>
        </Card>
      </div>

      <!-- Card 3: Event Action -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-0 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardAction()}</span>
              <CardExpandToggler />
            </div>
            <h4 class="mb-2">{allActions.length}</h4>
            {#if topActions.length === 0}
              <div class="small text-inverse text-opacity-50">
                {m.dashboardNoData()}
              </div>
            {:else}
              <div class="small">
                {#each topActions as [act, count]}
                  {@const label =
                    act === OTHER_KEY ? m.dashboardOther() : act}
                  <div
                    class="d-flex justify-content-between align-items-center mb-1"
                  >
                    <span class="text-truncate me-2" title={label}>{label}</span
                    >
                    <span
                      class="badge {act === OTHER_KEY
                        ? 'bg-secondary'
                        : 'bg-success'}">{count}</span
                    >
                  </div>
                {/each}
              </div>
            {/if}
          </CardBody>
        </Card>
      </div>

      <!-- Card 4: Failed Events -->
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-0 h-100">
          <CardBody>
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardFailedEvents()}</span>
              <CardExpandToggler />
            </div>
            <h4 class="mb-1 text-danger">{failedEvents}</h4>
            <div class="small text-inverse text-opacity-50">
              <i class="bi bi-x-circle me-1"></i>{m.dashboardFailedTargets()}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- Row 2: Charts + Map — stretch เต็มความสูง viewport ที่เหลือ -->
    <div
      class="row g-3 mb-0 dashboard-row-2"
    >
      <!-- Left column: Event Types + Top Devices stacked -->
      <div class="col-xl-4 d-flex flex-column">
        <!-- Top 10 Event Types -->
        <Card class="mb-3 flex-grow-1" style="min-height: 0;">
          <CardBody class="py-2 d-flex flex-column h-100">
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardTopEventTypes()}</span>
              <CardExpandToggler />
            </div>
            {#if topEventTypes.length === 0}
              <div class="text-center py-3 text-inverse text-opacity-50">
                <p class="small mb-0">{m.dashboardNoData()}</p>
              </div>
            {:else}
              <div class="overflow-hidden flex-grow-1" style="min-height: 0;">
                <ApexCharts options={eventTypesChartOptions} height="100%" />
              </div>
            {/if}
          </CardBody>
        </Card>

        <!-- Top 10 Device Events -->
        <Card class="mb-0 flex-grow-1" style="min-height: 0;">
          <CardBody class="py-2 d-flex flex-column h-100">
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardTopDeviceEvents()}</span>
              <CardExpandToggler />
            </div>
            {#if topDevices.length === 0}
              <div class="text-center py-3 text-inverse text-opacity-50">
                <p class="small mb-0">{m.dashboardNoData()}</p>
              </div>
            {:else}
              <div class="overflow-hidden flex-grow-1" style="min-height: 0;">
                <ApexCharts options={topDevicesChartOptions} height="100%" />
              </div>
            {/if}
          </CardBody>
        </Card>
      </div>

      <!-- Event Map — ใหญ่ครอบคลุม Thailand -->
      <div class="col-xl-8 d-flex flex-column">
        <Card class="mb-0 flex-grow-1" style="min-height: 0;">
          <CardBody class="d-flex flex-column h-100">
            <div class="d-flex fw-bold small mb-2">
              <span class="flex-grow-1">{m.dashboardEventMap()}</span>
              <CardExpandToggler />
            </div>
            <div class="flex-grow-1" style="min-height: 280px;">
              <EventMap
                {geoCells}
                height="100%"
                zoom={6}
                onCellClick={(cell: {
                  cell: string
                  count: number
                  lat: number
                  lng: number
                }) => console.log('Clicked cell:', cell)}
              />
            </div>
          </CardBody>
        </Card>
      </div>

    </div>
  {/if}
{/if}

<style>
  /* ให้ row charts+map ขยายเต็มพื้นที่ viewport ที่เหลือ */
  .dashboard-row-2 {
    min-height: calc(100vh - 380px);
  }
</style>
