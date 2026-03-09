<!-- src/routes/(app)/ingest/rejectedPayloadPatterns/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { resolve } from '$app/paths'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listRejectedPayloadPatterns, deleteRejectedPayloadPattern } from '$lib/api/ingest'
  import type { RejectedPayloadPattern } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let patterns = $state<RejectedPayloadPattern[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })
  let actionSuccess = $state<string | null>(null)

  // Allow Again confirm modal
  let showAllowModal = $state(false)
  let allowId = $state<string | null>(null)
  let allowLoading = $state(false)
  let allowPattern = $state<RejectedPayloadPattern | null>(null)

  async function load(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listRejectedPayloadPatterns(orgId, page, perPage)
      patterns = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openAllow(pattern: RejectedPayloadPattern) {
    allowPattern = pattern
    allowId = pattern.patternId
    showAllowModal = true
  }

  async function handleAllow() {
    const orgId = $activeOrg?.id
    if (!orgId || !allowId) return
    allowLoading = true
    try {
      await deleteRejectedPayloadPattern(orgId, allowId)
      patterns = patterns.filter(p => p.patternId !== allowId)
      actionSuccess = m.ingestRejectedPayloadPatternAllowed()
      showAllowModal = false
      allowId = null
      allowPattern = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      allowLoading = false
    }
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

  function truncate(s: string, len = 24): string {
    return s.length > len ? s.slice(0, len) + '...' : s
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.ingestRejectedPayloadPatternsTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestRejectedPayloadPatternsTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name} &mdash; {m.ingestRejectedPayloadPatternsSubtitle()}
      </small>
    {/if}
  </div>
  <button class="btn btn-sm btn-outline-secondary" onclick={() => load(pagination.page)} title={m.actionRefresh()}>
    <i class="bi bi-arrow-clockwise"></i>
  </button>
</div>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()}
    <a href={resolve('/orgs')} class="alert-link">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>
{:else}
  {#if actionSuccess}
    <div class="alert alert-success alert-dismissible mb-3">
      <i class="bi bi-check-circle me-2"></i>{actionSuccess}
      <button type="button" class="btn-close" onclick={() => (actionSuccess = null)} aria-label={m.actionClose()}></button>
    </div>
  {/if}
  {#if error}
    <div class="alert alert-danger mb-3">
      <i class="bi bi-exclamation-triangle me-2"></i>{error}
      <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-5">
      <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
    </div>
  {:else if patterns.length === 0}
    <Card>
      <CardBody>
        <div class="text-center py-5">
          <i class="bi bi-shield-check fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
          <p class="text-inverse text-opacity-50 mb-0">{m.ingestRejectedPayloadPatternNoRecords()}</p>
        </div>
      </CardBody>
    </Card>
  {:else}
    <div class="alert alert-info small mb-3">
      <i class="bi bi-info-circle me-2"></i>
      Deleting a record here means <strong>"Allow Again"</strong> — the payload pattern will be accepted and may create new reviews.
    </div>

    <div class="table-responsive">
      <table class="table table-hover align-middle mb-0">
        <thead>
          <tr>
            <th>{m.ingestSourceProfileFamily()}</th>
            <th>{m.ingestRejectedPayloadPatternFingerprint()}</th>
            <th>{m.ingestRejectedPayloadPatternReason()}</th>
            <th>{m.ingestRejectedPayloadPatternCreatedBy()}</th>
            <th>{m.eventsCreatedAt()}</th>
            <th class="text-end">{m.eventsActions()}</th>
          </tr>
        </thead>
        <tbody>
          {#each patterns as pattern (pattern.patternId)}
            <tr>
              <td><span class="badge bg-theme-subtle text-theme">{pattern.sourceFamily}</span></td>
              <td>
                <code class="small" title={pattern.fingerprint}>{truncate(pattern.fingerprint)}</code>
              </td>
              <td class="small text-inverse text-opacity-60">{pattern.reason}</td>
              <td class="small text-inverse text-opacity-60">{pattern.createdBy}</td>
              <td class="small">{formatDate(pattern.createdAt)}</td>
              <td class="text-end">
                <button class="btn btn-sm btn-outline-success" onclick={() => openAllow(pattern)}
                  title={m.ingestRejectedPayloadPatternAllowAgain()}>
                  <i class="bi bi-unlock me-1"></i>{m.ingestRejectedPayloadPatternAllowAgain()}
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

<!-- Allow Again Confirm Modal -->
{#if showAllowModal && allowPattern}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title">
            <i class="bi bi-unlock me-2 text-success"></i>{m.ingestRejectedPayloadPatternAllowAgain()}
          </h6>
        </div>
        <div class="modal-body">
          <p class="small text-inverse text-opacity-60">{m.ingestRejectedPayloadPatternAllowConfirm()}</p>
          <div class="bg-inverse bg-opacity-10 rounded p-2">
            <small class="text-inverse text-opacity-50 d-block">{m.ingestSourceProfileFamily()}: <strong>{allowPattern.sourceFamily}</strong></small>
            <code class="small">{allowPattern.fingerprint}</code>
          </div>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showAllowModal = false; allowId = null; allowPattern = null }} disabled={allowLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-success" onclick={handleAllow} disabled={allowLoading}>
            {#if allowLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.ingestRejectedPayloadPatternAllowAgain()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
