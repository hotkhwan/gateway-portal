<!-- src/routes/(app)/delivery/dlq/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import { listDlq, getDlqStats } from '$lib/api/ingest'
  import type { DlqMessage, DlqStats, DlqStatus, DlqStage } from '$lib/api/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let messages = $state<DlqMessage[]>([])
  let stats = $state<DlqStats | null>(null)
  let page = $state(1)
  let totalPages = $state(1)
  let total = $state(0)

  // Filters
  let filterStatus = $state<DlqStatus | ''>('')
  let filterStage = $state<DlqStage | ''>('')
  let filterChannel = $state('')
  let filterEventId = $state('')
  let filterFrom = $state('')
  let filterTo = $state('')

  async function loadData() {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        listDlq(orgId, page, 20, {
          status: filterStatus || undefined,
          stage: filterStage || undefined,
          channel: filterChannel || undefined,
          eventId: filterEventId || undefined,
          from: filterFrom || undefined,
          to: filterTo || undefined
        }),
        getDlqStats(orgId)
      ])
      if (listRes.status === 'fulfilled') {
        messages = listRes.value.details
        totalPages = listRes.value.totalPages
        total = listRes.value.total
      } else {
        throw listRes.reason
      }
      stats = statsRes.status === 'fulfilled' ? statsRes.value : null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function applyFilters() {
    page = 1
    loadData()
  }

  function clearFilters() {
    filterStatus = ''
    filterStage = ''
    filterChannel = ''
    filterEventId = ''
    filterFrom = ''
    filterTo = ''
    page = 1
    loadData()
  }

  function goToPage(p: number) {
    page = p
    loadData()
  }

  function statusBadgeClass(s: string): string {
    const map: Record<string, string> = {
      pending: 'bg-warning text-dark',
      retrying: 'bg-info text-dark',
      resolved: 'bg-success',
      abandoned: 'bg-secondary'
    }
    return map[s] ?? 'bg-secondary'
  }

  function statusLabel(s: string): string {
    const map: Record<string, () => string> = {
      pending: () => m.deliveryDlqStatusPending(),
      retrying: () => m.deliveryDlqStatusRetrying(),
      resolved: () => m.deliveryDlqStatusResolved(),
      abandoned: () => m.deliveryDlqStatusAbandoned()
    }
    return (map[s] ?? (() => s))()
  }

  function stageLabel(s: string): string {
    const map: Record<string, () => string> = {
      deliver: () => m.deliveryDlqStageDeliver(),
      normalize: () => m.deliveryDlqStageNormalize()
    }
    return (map[s] ?? (() => s))()
  }

  onMount(() => {
    setPageTitle(m.deliveryDlqTitle())
    loadData()
  })

  $effect(() => {
    if ($activeWorkspaceId) loadData()
  })
</script>

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.deliveryDlqTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.deliveryDlqSubtitle()}</small>
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
  <!-- Stats bar -->
  {#if stats}
    <div class="row g-2 mb-3">
      {#each [
        { label: m.deliveryDlqStatsPending(), value: stats.pending, color: 'warning' },
        { label: m.deliveryDlqStatsRetrying(), value: stats.retrying, color: 'info' },
        { label: m.deliveryDlqStatsResolved(), value: stats.resolved, color: 'success' },
        { label: m.deliveryDlqStatsAbandoned(), value: stats.abandoned, color: 'secondary' },
        { label: m.deliveryDlqStatsTotal(), value: stats.total, color: 'theme' }
      ] as s}
        <div class="col">
          <div class="card bg-inverse bg-opacity-10 border-0">
            <div class="card-body py-2 px-3 text-center">
              <small class="text-inverse text-opacity-50 d-block">{s.label}</small>
              <span class="fw-bold fs-5">{s.value}</span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Filter bar -->
  <Card>
    <CardBody>
      <div class="row g-2 align-items-end">
        <div class="col-md-2">
          <label class="form-label small mb-1" for="fStatus">{m.deliveryDlqFilterStatus()}</label>
          <select id="fStatus" class="form-select form-select-sm" bind:value={filterStatus}>
            <option value="">{m.deliveryDlqFilterAll()}</option>
            <option value="pending">{m.deliveryDlqStatusPending()}</option>
            <option value="retrying">{m.deliveryDlqStatusRetrying()}</option>
            <option value="resolved">{m.deliveryDlqStatusResolved()}</option>
            <option value="abandoned">{m.deliveryDlqStatusAbandoned()}</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1" for="fStage">{m.deliveryDlqFilterStage()}</label>
          <select id="fStage" class="form-select form-select-sm" bind:value={filterStage}>
            <option value="">{m.deliveryDlqFilterAll()}</option>
            <option value="deliver">{m.deliveryDlqStageDeliver()}</option>
            <option value="normalize">{m.deliveryDlqStageNormalize()}</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1" for="fChannel">{m.deliveryDlqFilterChannel()}</label>
          <select id="fChannel" class="form-select form-select-sm" bind:value={filterChannel}>
            <option value="">{m.deliveryDlqFilterAll()}</option>
            <option value="webhook">{m.deliveryChannelWebhook()}</option>
            <option value="line">{m.deliveryChannelLine()}</option>
            <option value="discord">{m.deliveryChannelDiscord()}</option>
            <option value="telegram">{m.deliveryChannelTelegram()}</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1" for="fDateFrom">{m.deliveryDlqFilterDateFrom()}</label>
          <input id="fDateFrom" type="date" class="form-control form-control-sm" bind:value={filterFrom} />
        </div>
        <div class="col-md-2">
          <label class="form-label small mb-1" for="fDateTo">{m.deliveryDlqFilterDateTo()}</label>
          <input id="fDateTo" type="date" class="form-control form-control-sm" bind:value={filterTo} />
        </div>
        <div class="col-md-2 d-flex gap-1">
          <button class="btn btn-sm btn-theme flex-fill" onclick={applyFilters}>
            <i class="bi bi-search me-1"></i>{m.actionSearch()}
          </button>
          <button class="btn btn-sm btn-outline-secondary" onclick={clearFilters} title={m.deliveryDlqClearFilters()}>
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>
    </CardBody>
  </Card>

  <!-- Table -->
  {#if loading}
    <div class="text-center py-5">
      <div class="spinner-border text-theme" role="status">
        <span class="visually-hidden">{m.actionLoading()}</span>
      </div>
    </div>
  {:else if error}
    <div class="alert alert-danger mt-3">
      <i class="bi bi-exclamation-triangle me-2"></i>{error}
      <button class="btn btn-sm btn-danger ms-2" onclick={loadData}>{m.actionRefresh()}</button>
    </div>
  {:else if messages.length === 0}
    <div class="text-center py-5 text-inverse text-opacity-50 mt-3">
      <i class="bi bi-inbox fs-1 d-block mb-2"></i>
      {m.deliveryDlqNoRecords()}
    </div>
  {:else}
    <div class="table-responsive mt-3">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{m.deliveryDlqEventId()}</th>
            <th>{m.deliveryDlqStage()}</th>
            <th>{m.deliveryDlqStatus()}</th>
            <th>{m.deliveryDlqRetryCount()}</th>
            <th>{m.deliveryDlqReason()}</th>
            <th>{m.deliveryDlqCreated()}</th>
          </tr>
        </thead>
        <tbody>
          {#each messages as msg (msg.messageId)}
            <tr class="cursor-pointer" onclick={() => window.location.href = resolve(`/delivery/dlq/${msg.messageId}`)}>
              <td>
                <code class="small">{msg.eventId.slice(0, 12)}...</code>
              </td>
              <td>
                <span class="badge bg-inverse bg-opacity-25 text-inverse">{stageLabel(msg.stage)}</span>
              </td>
              <td>
                <span class="badge {statusBadgeClass(msg.status)}">{statusLabel(msg.status)}</span>
              </td>
              <td>{msg.retryCount}/{msg.maxRetries}</td>
              <td>
                <small class="text-inverse text-opacity-50 text-truncate d-inline-block" style="max-width:200px">
                  {msg.reason}
                </small>
              </td>
              <td><small class="text-inverse text-opacity-50">{new Date(msg.createdAt).toLocaleString()}</small></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if totalPages > 1}
      <nav class="d-flex justify-content-between align-items-center mt-3">
        <small class="text-inverse text-opacity-50">{total} {m.deliveryDlqStatsTotal().toLowerCase()}</small>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" class:disabled={page <= 1}>
            <button class="page-link" onclick={() => goToPage(page - 1)}>&laquo;</button>
          </li>
          {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
            {#if p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2)}
              <li class="page-item" class:active={p === page}>
                <button class="page-link" onclick={() => goToPage(p)}>{p}</button>
              </li>
            {:else if p === page - 3 || p === page + 3}
              <li class="page-item disabled"><span class="page-link">...</span></li>
            {/if}
          {/each}
          <li class="page-item" class:disabled={page >= totalPages}>
            <button class="page-link" onclick={() => goToPage(page + 1)}>&raquo;</button>
          </li>
        </ul>
      </nav>
    {/if}
  {/if}
{/if}

<style>
  .cursor-pointer { cursor: pointer; }
</style>
