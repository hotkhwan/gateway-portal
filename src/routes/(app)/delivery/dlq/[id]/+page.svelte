<!-- src/routes/(app)/delivery/dlq/[id]/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { page as pageStore } from '$app/stores'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { getDlqDetail, retryDlq, replayDlq, abandonDlq } from '$lib/api/ingest'
  import type { DlqMessage } from '$lib/api/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let msg = $state<DlqMessage | null>(null)
  let actionLoading = $state(false)
  let actionSuccess = $state<string | null>(null)

  // Abandon reason
  let showAbandonModal = $state(false)
  let abandonReason = $state('')

  // Confirm modals
  let showRetryConfirm = $state(false)
  let showReplayConfirm = $state(false)

  let messageId = $derived($pageStore.params.id)
  let isReadOnly = $derived(msg?.status === 'resolved' || msg?.status === 'abandoned')

  async function loadDetail() {
    const orgId = $activeOrg?.id
    if (!orgId || !messageId) { loading = false; return }
    loading = true
    error = null
    try {
      msg = await getDlqDetail(orgId, messageId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function handleRetry() {
    const orgId = $activeOrg?.id
    if (!orgId || !messageId) return
    actionLoading = true
    try {
      await retryDlq(orgId, messageId)
      actionSuccess = m.deliveryDlqRetrySuccess()
      showRetryConfirm = false
      await loadDetail()
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      actionLoading = false
    }
  }

  async function handleReplay() {
    const orgId = $activeOrg?.id
    if (!orgId || !messageId) return
    actionLoading = true
    try {
      await replayDlq(orgId, messageId)
      actionSuccess = m.deliveryDlqReplaySuccess()
      showReplayConfirm = false
      await loadDetail()
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      actionLoading = false
    }
  }

  async function handleAbandon() {
    const orgId = $activeOrg?.id
    if (!orgId || !messageId) return
    actionLoading = true
    try {
      await abandonDlq(orgId, messageId, abandonReason)
      actionSuccess = m.deliveryDlqAbandonSuccess()
      showAbandonModal = false
      abandonReason = ''
      await loadDetail()
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      actionLoading = false
    }
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
    loadDetail()
  })
</script>

<!-- Breadcrumb + Back -->
<div class="d-flex align-items-center mb-3">
  <a href={resolve('/delivery/dlq')} class="btn btn-sm btn-outline-secondary me-3">
    <i class="bi bi-arrow-left me-1"></i>{m.deliveryDlqTitle()}
  </a>
  <div class="flex-grow-1">
    {#if msg}
      <h1 class="page-header mb-0 fs-5">
        <code>{msg.eventId.slice(0, 16)}...</code>
      </h1>
    {/if}
  </div>
</div>

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
  </div>
{:else if msg}
  {#if actionSuccess}
    <div class="alert alert-success alert-dismissible">
      <i class="bi bi-check-circle me-2"></i>{actionSuccess}
      <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (actionSuccess = null)}></button>
    </div>
  {/if}

  <!-- Header badges -->
  <div class="d-flex gap-2 mb-3">
    <span class="badge {statusBadgeClass(msg.status)} fs-6">{statusLabel(msg.status)}</span>
    <span class="badge bg-inverse bg-opacity-25 text-inverse fs-6">{stageLabel(msg.stage)}</span>
  </div>

  <!-- Info table -->
  <Card>
    <CardBody>
      <table class="table table-sm mb-0">
        <tbody>
          <tr><th class="text-inverse text-opacity-50" style="width:180px">{m.deliveryDlqEventId()}</th><td><code>{msg.eventId}</code></td></tr>
          <tr><th class="text-inverse text-opacity-50">Message ID</th><td><code>{msg.messageId}</code></td></tr>
          <tr><th class="text-inverse text-opacity-50">{m.deliveryDlqStage()}</th><td>{stageLabel(msg.stage)}</td></tr>
          <tr><th class="text-inverse text-opacity-50">{m.deliveryDlqReason()}</th><td>{msg.reason}</td></tr>
          <tr><th class="text-inverse text-opacity-50">{m.deliveryDlqRetryCount()}</th><td>{msg.retryCount} / {msg.maxRetries}</td></tr>
          <tr><th class="text-inverse text-opacity-50">{m.deliveryDlqLastError()}</th><td><small>{msg.lastErrorAt ? new Date(msg.lastErrorAt).toLocaleString() : '-'}</small></td></tr>
          <tr><th class="text-inverse text-opacity-50">{m.deliveryDlqCreated()}</th><td><small>{new Date(msg.createdAt).toLocaleString()}</small></td></tr>
          <tr><th class="text-inverse text-opacity-50">{m.eventsUpdatedAt()}</th><td><small>{new Date(msg.updatedAt).toLocaleString()}</small></td></tr>
        </tbody>
      </table>
    </CardBody>
  </Card>

  <!-- Payload -->
  <Card>
    <CardBody>
      <h6 class="mb-2"><i class="bi bi-code-slash me-2"></i>{m.deliveryDlqPayload()}</h6>
      <pre class="bg-dark text-light p-3 rounded small mb-0" style="max-height:400px;overflow:auto">{JSON.stringify(msg.payload, null, 2)}</pre>
    </CardBody>
  </Card>

  <!-- Actions -->
  {#if !isReadOnly}
    <div class="d-flex gap-2 mt-3">
      <button class="btn btn-warning" onclick={() => (showRetryConfirm = true)} disabled={actionLoading}>
        <i class="bi bi-arrow-clockwise me-1"></i>{m.deliveryDlqRetry()}
      </button>
      <button class="btn btn-info" onclick={() => (showReplayConfirm = true)} disabled={actionLoading}>
        <i class="bi bi-skip-start me-1"></i>{m.deliveryDlqReplay()}
      </button>
      <button class="btn btn-outline-secondary" onclick={() => (showAbandonModal = true)} disabled={actionLoading}>
        <i class="bi bi-x-circle me-1"></i>{m.deliveryDlqAbandon()}
      </button>
    </div>
  {/if}
{/if}

<!-- Retry confirm -->
{#if showRetryConfirm}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title">{m.deliveryDlqRetry()}</h6>
        </div>
        <div class="modal-body small">{m.deliveryDlqRetryConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => (showRetryConfirm = false)} disabled={actionLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-warning" onclick={handleRetry} disabled={actionLoading}>
            {#if actionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.deliveryDlqRetry()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Replay confirm -->
{#if showReplayConfirm}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title">{m.deliveryDlqReplay()}</h6>
        </div>
        <div class="modal-body small text-warning">{m.deliveryDlqReplayConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => (showReplayConfirm = false)} disabled={actionLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-info" onclick={handleReplay} disabled={actionLoading}>
            {#if actionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.deliveryDlqReplay()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Abandon modal with reason -->
{#if showAbandonModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title">{m.deliveryDlqAbandon()}</h6>
        </div>
        <div class="modal-body">
          <p class="small">{m.deliveryDlqAbandonConfirm()}</p>
          <label class="form-label small" for="abandonReason">{m.deliveryDlqAbandonReason()}</label>
          <textarea id="abandonReason" class="form-control" rows="3" bind:value={abandonReason}></textarea>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => (showAbandonModal = false)} disabled={actionLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-outline-danger" onclick={handleAbandon} disabled={actionLoading}>
            {#if actionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.deliveryDlqAbandon()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
