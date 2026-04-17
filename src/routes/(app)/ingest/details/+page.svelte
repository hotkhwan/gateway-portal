<!-- src/routes/(app)/ingest/details/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId, activeWorkspace } from '$lib/stores/activeWorkspace'
  import { resolve } from '$app/paths'
  import { listApprovedEvents, getImageUrl } from '$lib/api/ingest'
  import type { ApprovedEvent } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let events = $state<ApprovedEvent[]>([])
  let pagination = $state({ page: 1, perPage: 10, total: 0, totalPages: 0 })

  let filterSearch = $state('')
  let filterEventType = $state('')

  let selectedEvent = $state<ApprovedEvent | null>(null)
  let lightboxIndex = $state<number | null>(null)

  let selectedIndex = $derived(selectedEvent ? events.findIndex(e => e.id === selectedEvent!.id) : -1)

  type PictureCoord = { x1: number; y1: number; x2: number; y2: number }
  let pictureCoords = $derived(
    (selectedEvent?.payload?.pictureCoordinates as PictureCoord[] | undefined) ?? []
  )
  let mainRef = $derived(selectedEvent?.binaryRefs?.find(r => r.sourceIndex === 0))
  let cropRefs = $derived(selectedEvent?.binaryRefs?.filter(r => r.sourceIndex !== 0) ?? [])

  async function load(page = 1) {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listApprovedEvents(orgId, page, perPage, {
        search: filterSearch || undefined,
        eventType: filterEventType || undefined,
      })
      events = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function formatDate(d: string): string {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleString('th-TH', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    } catch { return d }
  }

  function eventTypeBadgeClass(eventType: string): string {
    if (eventType.includes('pedestrian')) return 'bg-primary'
    if (eventType.includes('face')) return 'bg-warning text-dark'
    if (eventType.includes('vehicle')) return 'bg-danger'
    if (eventType.includes('statistic')) return 'bg-secondary'
    return 'bg-theme-subtle text-theme'
  }

  $effect(() => {
    const orgId = $activeWorkspaceId
    setPageTitle(m.ingestDetailsTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })

  $effect(() => {
    if (selectedEvent) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  })
</script>

{#if selectedEvent}
  <!-- ── Detail View: flex column เต็ม viewport ไม่ scroll page ── -->
  <div class="d-flex flex-column overflow-hidden" style="height:calc(100vh - 180px)">

  <div class="d-flex align-items-center mb-2 flex-shrink-0">
    <button class="btn btn-sm btn-outline-secondary me-3" onclick={() => (selectedEvent = null)}>
      <i class="bi bi-arrow-left me-1"></i>{m.ingestDetailsBackToList()}
    </button>
    <div class="flex-grow-1">
      <h1 class="page-header mb-0">{m.ingestDetailsTitle()}</h1>
      <small class="text-inverse text-opacity-50 font-monospace">{selectedEvent.eventId}</small>
    </div>
    <div class="d-flex gap-1">
      <button class="btn btn-sm btn-outline-secondary" title="Previous event"
        disabled={selectedIndex <= 0}
        onclick={() => { if (selectedIndex > 0) selectedEvent = events[selectedIndex - 1] }}>
        <i class="bi bi-chevron-left"></i>
      </button>
      <span class="btn btn-sm btn-outline-secondary disabled px-2" style="cursor:default">
        {selectedIndex + 1} / {events.length}
      </span>
      <button class="btn btn-sm btn-outline-secondary" title="Next event"
        disabled={selectedIndex >= events.length - 1}
        onclick={() => { if (selectedIndex < events.length - 1) selectedEvent = events[selectedIndex + 1] }}>
        <i class="bi bi-chevron-right"></i>
      </button>
    </div>
  </div>

  <!-- Row 1: Event Info | Source Device | Location -->
  <div class="row g-3 mb-3">
    <div class="col-lg-4 d-flex">
      <Card class="w-100">
        <CardBody>
          <div class="position-relative">
            <!-- crop thumbnail overlay มุมขวาบน — absolute ไม่กระทบ height card -->
            {#if cropRefs.length > 0}
              <button class="position-absolute rounded overflow-hidden bg-dark d-flex align-items-center justify-content-center border-0 p-0"
                style="width:64px;height:64px;top:0;right:0;cursor:zoom-in;z-index:1"
                onclick={() => (lightboxIndex = 1)}>
                <img src={getImageUrl(cropRefs[0].bucket, cropRefs[0].objectId)} alt="crop"
                  style="max-width:100%;max-height:100%;object-fit:contain"
                  onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
              </button>
            {/if}
            <h6 class="mb-3 text-inverse text-opacity-75"><i class="bi bi-info-circle me-1"></i>Event Info</h6>
            <table class="table table-sm mb-0">
              <tbody>
                <tr><th class="text-nowrap" style="width:40%">Event Type</th>
                  <td><span class="badge {eventTypeBadgeClass(selectedEvent.eventType)}">{selectedEvent.eventType}</span></td></tr>
                <tr><th>Created At</th><td class="small">{formatDate(selectedEvent.createdAt)}</td></tr>
                {#if selectedEvent.meta?.templateId}
                  <tr><th>Template</th><td class="small font-monospace">{selectedEvent.meta.templateId}</td></tr>
                {/if}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
    <div class="col-lg-4 d-flex">
      <Card class="w-100">
        <CardBody>
          <h6 class="mb-3 text-inverse text-opacity-75"><i class="bi bi-camera-video me-1"></i>Source Device</h6>
          <table class="table table-sm mb-0">
            <tbody>
              <tr><th style="width:40%">Device Name</th><td>{selectedEvent.source.deviceName || '-'}</td></tr>
              <tr><th>Device ID</th><td class="font-monospace small">{selectedEvent.source.deviceId}</td></tr>
              <tr><th>Device Type</th><td><span class="badge bg-secondary">{selectedEvent.source.deviceType}</span></td></tr>
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
    <div class="col-lg-4 d-flex">
      <Card class="w-100">
        <CardBody>
          <h6 class="mb-3 text-inverse text-opacity-75"><i class="bi bi-geo-alt me-1"></i>Location</h6>
          <table class="table table-sm mb-0">
            <tbody>
              <tr><th style="width:40%">Zone</th><td>{selectedEvent.location.zone || '-'}</td></tr>
              {#if selectedEvent.location.lat !== 0 || selectedEvent.location.lng !== 0}
                <tr><th>Coordinates</th><td class="small font-monospace">{selectedEvent.location.lat.toFixed(6)}, {selectedEvent.location.lng.toFixed(6)}</td></tr>
              {/if}
              {#if selectedEvent.geo?.adminName}
                <tr><th>Area</th><td>{selectedEvent.geo.adminName} ({selectedEvent.geo.countryCode})</td></tr>
                <tr><th>Admin Code</th><td class="small font-monospace">{selectedEvent.geo.adminCode}</td></tr>
              {/if}
              {#if selectedEvent.geoCell?.cell}
                <tr><th>Geohash</th><td class="small font-monospace">{selectedEvent.geoCell.cell}</td></tr>
              {/if}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  </div>

  <!-- Row 2: flex-grow-1 เต็มพื้นที่ที่เหลือ ใช้ d-flex แทน .row เพื่อหลีกเลี่ยง margin-top ของ gutter -->
  <div style="display:flex;gap:1rem;flex:1;min-height:0;overflow:hidden">
    <!-- Payload -->
    {#if selectedEvent.payload && Object.keys(selectedEvent.payload).length > 0}
      <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
        <div class="card-body" style="display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0;padding:1rem">
          <h6 class="mb-2 text-inverse text-opacity-75 flex-shrink-0"><i class="bi bi-file-earmark-code me-1"></i>Payload</h6>
          <pre class="bg-dark text-light p-3 rounded small mb-0 overflow-auto" style="flex:1;min-height:0">{JSON.stringify(selectedEvent.payload, null, 2)}</pre>
        </div>
        <div class="card-arrow">
          <div class="card-arrow-top-left"></div><div class="card-arrow-top-right"></div>
          <div class="card-arrow-bottom-left"></div><div class="card-arrow-bottom-right"></div>
        </div>
      </div>
    {/if}
    <!-- Captures -->
    {#if mainRef}
      <div class="card" style="flex:1;display:flex;flex-direction:column;min-height:0">
        <div class="card-body" style="display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0;padding:1rem">
          <h6 class="mb-2 text-inverse text-opacity-75 flex-shrink-0">
            <i class="bi bi-images me-1"></i>Captures
          </h6>
          <div class="position-relative rounded overflow-hidden bg-dark"
            style="flex:1;min-height:0;cursor:zoom-in"
            role="button" tabindex="0"
            onclick={() => (lightboxIndex = 0)}
            onkeydown={(e) => e.key === 'Enter' && (lightboxIndex = 0)}>
            <img src={getImageUrl(mainRef.bucket, mainRef.objectId)} alt={mainRef.fieldName ?? 'capture'}
              style="width:100%;height:100%;object-fit:cover;display:block"
              onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display='none' }} />
            {#if pictureCoords.length > 0}
              <svg class="position-absolute top-0 start-0 w-100 h-100" viewBox="0 0 1 1" preserveAspectRatio="none" style="pointer-events:none">
                {#each pictureCoords as coord}
                  <rect x={coord.x1} y={coord.y1} width={coord.x2 - coord.x1} height={coord.y2 - coord.y1}
                    fill="none" stroke="var(--bs-theme)" stroke-width="2" vector-effect="non-scaling-stroke" />
                {/each}
              </svg>
            {/if}
            <span class="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75 small">
              <i class="bi bi-arrows-fullscreen"></i>
            </span>
          </div>
        </div>
        <div class="card-arrow">
          <div class="card-arrow-top-left"></div><div class="card-arrow-top-right"></div>
          <div class="card-arrow-bottom-left"></div><div class="card-arrow-bottom-right"></div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Lightbox -->
  {#if lightboxIndex !== null && selectedEvent.binaryRefs}
    {@const refs = selectedEvent.binaryRefs}
    {@const lbRef = refs[lightboxIndex]}
    {@const isMain = lbRef?.sourceIndex === 0}
    <div class="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style="background:rgba(0,0,0,0.92);z-index:1055">
      <button class="btn-close btn-close-white position-absolute top-0 end-0 m-3" style="z-index:1"
        onclick={() => (lightboxIndex = null)} aria-label="ปิด"></button>

      <!-- Prev / Next -->
      {#if refs.length > 1}
        <button class="btn btn-dark position-absolute start-0 ms-3 rounded-circle" style="width:40px;height:40px;z-index:1"
          onclick={() => (lightboxIndex = ((lightboxIndex ?? 0) - 1 + refs.length) % refs.length)}
          disabled={refs.length < 2}>
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-dark position-absolute end-0 me-3 rounded-circle" style="width:40px;height:40px;z-index:1"
          onclick={() => (lightboxIndex = ((lightboxIndex ?? 0) + 1) % refs.length)}
          disabled={refs.length < 2}>
          <i class="bi bi-chevron-right"></i>
        </button>
      {/if}

      {#if lbRef}
        <div class="position-relative" style="max-width:92vw;max-height:92vh">
          <img
            src={getImageUrl(lbRef.bucket, lbRef.objectId)}
            alt={lbRef.fieldName ?? 'capture'}
            style="max-width:92vw;max-height:88vh;display:block;object-fit:contain;border-radius:4px"
          />
          {#if isMain && pictureCoords.length > 0}
            <svg class="position-absolute top-0 start-0 w-100 h-100" viewBox="0 0 1 1" preserveAspectRatio="none" style="pointer-events:none">
              {#each pictureCoords as coord}
                <rect x={coord.x1} y={coord.y1} width={coord.x2 - coord.x1} height={coord.y2 - coord.y1}
                  fill="none" stroke="var(--bs-theme)" stroke-width="2" vector-effect="non-scaling-stroke" />
              {/each}
            </svg>
          {/if}
          <div class="text-center mt-2 small text-white-50">{lbRef.fieldName ?? `capture ${lightboxIndex + 1}`} · {lightboxIndex + 1}/{refs.length}</div>
        </div>
      {/if}
    </div>
  {/if}

  </div><!-- end detail view wrapper -->

{:else}
  <!-- ── List View ── -->
  <div class="d-flex align-items-center mb-3">
    <div class="flex-grow-1">
      <h1 class="page-header mb-0">{m.ingestDetailsTitle()}</h1>
      {#if $activeWorkspace}
        <small class="text-inverse text-opacity-50">
          <i class="bi bi-building me-1"></i>{$activeWorkspace.name} &mdash; {m.ingestDetailsSubtitle()}
        </small>
      {/if}
    </div>
  </div>

  {#if !$activeWorkspaceId}
    <div class="alert alert-warning">
      <i class="bi bi-exclamation-circle me-2"></i>
      {m.workspaceSelectPre()}
      <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
      {m.workspaceSelectPost()}
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
            <select class="form-select form-select-sm"
              value={pagination.perPage}
              onchange={(e) => { pagination.perPage = Number((e.target as HTMLSelectElement).value); load(1) }}>
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
          </div>
          <div class="col-md-3 d-flex gap-1">
            <button class="btn btn-sm btn-theme flex-fill" onclick={() => load(1)}>
              <i class="bi bi-search me-1"></i>{m.actionSearch()}
            </button>
            <button class="btn btn-sm btn-outline-secondary" aria-label={m.actionClear()} onclick={() => { filterSearch = ''; filterEventType = ''; load(1) }}>
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
              <th style="width:28%">Event Type</th>
              <th style="width:22%">Device</th>
              <th style="width:10%">Zone</th>
              <th style="width:10%">Images</th>
              <th style="width:22%">Occurred At</th>
              <th class="text-end" style="width:8%">{m.eventsActions()}</th>
            </tr>
          </thead>
          <tbody>
            {#each events as evt (evt.id)}
              <tr class="cursor-pointer" onclick={() => (selectedEvent = evt)}>
                <td>
                  <span class="badge {eventTypeBadgeClass(evt.eventType)}">{evt.eventType}</span>
                </td>
                <td>
                  <div class="small fw-medium">{evt.source.deviceName || evt.source.deviceId}</div>
                  <div class="small text-inverse text-opacity-50">{evt.source.deviceType}</div>
                </td>
                <td>
                  {#if evt.location.zone}
                    <span class="badge bg-secondary">{evt.location.zone}</span>
                  {:else}
                    <span class="text-inverse text-opacity-25">—</span>
                  {/if}
                </td>
                <td>
                  {#if evt.binaryRefs && evt.binaryRefs.length > 0}
                    <span class="badge bg-theme-subtle text-theme">
                      <i class="bi bi-images me-1"></i>{evt.binaryRefs.length}
                    </span>
                  {:else}
                    <span class="text-inverse text-opacity-25">—</span>
                  {/if}
                </td>
                <td class="small">{formatDate(evt.occurredAt)}</td>
                <td class="text-end" onclick={(e) => e.stopPropagation()}>
                  <button class="btn btn-sm btn-outline-secondary" onclick={() => (selectedEvent = evt)} title={m.actionView()}>
                    <i class="bi bi-eye"></i>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if pagination.totalPages > 1}
        {@const cur = pagination.page}
        {@const total = pagination.totalPages}
        {@const pages = (() => {
          const delta = 2
          const range: (number | '…')[] = []
          const left = Math.max(2, cur - delta)
          const right = Math.min(total - 1, cur + delta)
          range.push(1)
          if (left > 2) range.push('…')
          for (let p = left; p <= right; p++) range.push(p)
          if (right < total - 1) range.push('…')
          if (total > 1) range.push(total)
          return range
        })()}
        <div class="d-flex justify-content-between align-items-center mt-3">
          <small class="text-inverse text-opacity-50">
            {m.showing()} {(cur - 1) * pagination.perPage + 1}–{Math.min(cur * pagination.perPage, pagination.total)} {m.of()} {pagination.total}
          </small>
          <nav>
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" class:disabled={cur === 1}>
                <button class="page-link" onclick={() => load(cur - 1)}>{m.actionPrevPage()}</button>
              </li>
              {#each pages as p}
                {#if p === '…'}
                  <li class="page-item disabled"><span class="page-link">…</span></li>
                {:else}
                  <li class="page-item" class:active={p === cur}>
                    <button class="page-link" onclick={() => load(p as number)}>{p}</button>
                  </li>
                {/if}
              {/each}
              <li class="page-item" class:disabled={cur === total}>
                <button class="page-link" onclick={() => load(cur + 1)}>{m.actionNextPage()}</button>
              </li>
            </ul>
          </nav>
        </div>
      {/if}
    {/if}
  {/if}
{/if}
