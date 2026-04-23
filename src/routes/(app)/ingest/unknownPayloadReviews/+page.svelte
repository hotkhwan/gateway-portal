<!-- src/routes/(app)/ingest/unknownPayloadReviews/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId, activeWorkspace } from '$lib/stores/activeWorkspace'
  import {
    listUnknownPayloadReviews,
    rejectUnknownPayload,
    deleteUnknownPayloadReview
  } from '$lib/api/ingest'
  import type { UnknownPayloadReview } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import DateRangeFilter from '$lib/components/filters/DateRangeFilter.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let reviews = $state<UnknownPayloadReview[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })
  let statusFilter = $state<string>('pending')
  let filterSourceFamily = $state('')
  let filterStartDate = $state('')
  let filterEndDate = $state('')

  // Collected source-family options from loaded reviews (union, sorted)
  let sourceFamilyOptions = $derived(
    Array.from(new Set(reviews.map(r => r.sourceFamily).filter(Boolean))).sort()
  )

  // Selected item for right panel
  let selectedReview = $state<UnknownPayloadReview | null>(null)

  // Reject modal
  let showRejectModal = $state(false)
  let rejectReason = $state('')
  let rejectLoading = $state(false)
  let rejectId = $state<string | null>(null)

  // Delete confirm
  let showDeleteModal = $state(false)
  let deleteId = $state<string | null>(null)
  let deleteLoading = $state(false)

  // Action success
  let actionSuccess = $state<string | null>(null)

  async function load(page = 1) {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listUnknownPayloadReviews(orgId, page, perPage, {
        status: statusFilter || undefined,
        sourceFamily: filterSourceFamily || undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined
      })
      reviews = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
      // Deselect if selected item is no longer in list
      if (selectedReview && !r.details.find(rv => rv.reviewId === selectedReview!.reviewId)) {
        selectedReview = null
      }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function selectReview(review: UnknownPayloadReview) {
    selectedReview = review
  }

  function openReject(id: string) {
    rejectId = id
    rejectReason = ''
    showRejectModal = true
  }

  async function handleReject() {
    const orgId = $activeWorkspaceId
    if (!orgId || !rejectId) return
    rejectLoading = true
    try {
      await rejectUnknownPayload(orgId, rejectId, rejectReason || undefined)
      actionSuccess = m.ingestUnknownPayloadReviewRejected()
      showRejectModal = false
      rejectId = null
      rejectReason = ''
      // Reload — rejected items leave the pending list
      await load(pagination.page)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      rejectLoading = false
    }
  }

  function openDelete(id: string) {
    deleteId = id
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeWorkspaceId
    if (!orgId || !deleteId) return
    deleteLoading = true
    try {
      await deleteUnknownPayloadReview(orgId, deleteId)
      actionSuccess = m.ingestUnknownPayloadReviewDeleted()
      showDeleteModal = false
      if (selectedReview?.reviewId === deleteId) selectedReview = null
      deleteId = null
      await load(pagination.page)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function goCreateTemplate(review: UnknownPayloadReview) {
    const params = new URLSearchParams()
    params.set('fromReview', review.reviewId)
    params.set('sourceFamily', review.sourceFamily)
    params.set('fingerprint', review.fingerprint)
    params.set('samplePayload', JSON.stringify(review.samplePayload))
    goto(`${resolve('/ingest/templates')}?${params}`)
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

  function truncate(s: string, len = 20): string {
    return s.length > len ? s.slice(0, len) + '...' : s
  }

  $effect(() => {
    const orgId = $activeWorkspaceId
    setPageTitle(m.ingestUnknownPayloadReviewsTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestUnknownPayloadReviewsTitle()}</h1>
    {#if $activeWorkspace}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeWorkspace.name} &mdash; {m.ingestUnknownPayloadReviewsSubtitle()}
      </small>
    {/if}
  </div>
  <!-- Status filter tabs -->
  <div class="btn-group btn-group-sm ms-3">
    {#each [
      { value: 'pending', label: m.ingestUnknownPayloadReviewStatusPending() },
      { value: 'rejected', label: m.ingestUnknownPayloadReviewStatusRejected() },
      { value: '', label: 'All' }
    ] as tab}
      <button class="btn" class:btn-theme={statusFilter === tab.value} class:btn-outline-secondary={statusFilter !== tab.value}
        onclick={() => { statusFilter = tab.value; load(1) }}>
        {tab.label}
      </button>
    {/each}
  </div>
  <button class="btn btn-sm btn-outline-secondary ms-2" onclick={() => load(pagination.page)} title={m.actionRefresh()}>
    <i class="bi bi-arrow-clockwise"></i>
  </button>
</div>

<!-- Secondary filter bar: sourceFamily + date range -->
<div class="d-flex align-items-center flex-wrap gap-2 mb-3">
  <i class="bi bi-funnel text-theme"></i>
  <select
    class="form-select form-select-sm"
    style="width:auto;font-size:0.75rem;"
    bind:value={filterSourceFamily}
    onchange={() => load(1)}
    aria-label="source family filter"
  >
    <option value="">{m.filterSourceFamilyAll()}</option>
    {#each sourceFamilyOptions as sf}
      <option value={sf}>{sf}</option>
    {/each}
  </select>
  <DateRangeFilter
    bind:startDate={filterStartDate}
    bind:endDate={filterEndDate}
    onApply={() => load(1)}
  />
</div>

{#if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()}
    <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
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

  <!-- 2-panel layout -->
  <div class="row g-3" style="min-height:500px">
    <!-- Left panel: list -->
    <div class="col-lg-5">
      <Card>
        <CardBody class="p-0">
          {#if loading}
            <div class="text-center py-5">
              <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
            </div>
          {:else if reviews.length === 0}
            <div class="text-center py-5 px-3">
              <i class="bi bi-inbox fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
              <p class="text-inverse text-opacity-50 mb-1">{m.ingestUnknownPayloadReviewsEmpty()}</p>
              <small class="text-inverse text-opacity-40">{m.ingestUnknownPayloadReviewsEmptyDesc()}</small>
            </div>
          {:else}
            <div class="list-group list-group-flush">
              {#each reviews as review (review.reviewId)}
                <button
                  type="button"
                  class="list-group-item list-group-item-action px-3 py-2 text-start"
                  class:active={selectedReview?.reviewId === review.reviewId}
                  onclick={() => selectReview(review)}
                >
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <span class="badge bg-theme-subtle text-theme">{review.sourceFamily}</span>
                    {#if review.status === 'pending'}
                      <span class="badge bg-warning text-dark">{m.ingestUnknownPayloadReviewStatusPending()}</span>
                    {:else}
                      <span class="badge bg-secondary">{m.ingestUnknownPayloadReviewStatusRejected()}</span>
                    {/if}
                    <span class="ms-auto small text-inverse text-opacity-50">
                      <i class="bi bi-eye me-1"></i>{review.seenCount}
                    </span>
                  </div>
                  <code class="small d-block text-truncate">{review.fingerprint}</code>
                  <small class="text-inverse text-opacity-50">{formatDate(review.lastSeenAt)}</small>
                </button>
              {/each}
            </div>

            {#if pagination.totalPages > 1}
              <div class="d-flex justify-content-center p-2 border-top">
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" class:disabled={pagination.page === 1}>
                    <button class="page-link" onclick={() => load(pagination.page - 1)}>&laquo;</button>
                  </li>
                  {#each Array(pagination.totalPages) as _, i}
                    <li class="page-item" class:active={i + 1 === pagination.page}>
                      <button class="page-link" onclick={() => load(i + 1)}>{i + 1}</button>
                    </li>
                  {/each}
                  <li class="page-item" class:disabled={pagination.page === pagination.totalPages}>
                    <button class="page-link" onclick={() => load(pagination.page + 1)}>&raquo;</button>
                  </li>
                </ul>
              </div>
            {/if}
          {/if}
        </CardBody>
      </Card>
    </div>

    <!-- Right panel: detail -->
    <div class="col-lg-7">
      {#if !selectedReview}
        <Card>
          <CardBody>
            <div class="text-center py-5">
              <i class="bi bi-arrow-left-circle fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
              <p class="text-inverse text-opacity-50">{m.ingestUnknownPayloadReviewsSelectItem()}</p>
            </div>
          </CardBody>
        </Card>
      {:else}
        <Card>
          <CardBody>
            <!-- Meta -->
            <div class="d-flex align-items-start gap-2 mb-3">
              <div class="flex-grow-1">
                <span class="badge bg-theme-subtle text-theme me-2">{selectedReview.sourceFamily}</span>
                {#if selectedReview.status === 'pending'}
                  <span class="badge bg-warning text-dark">{m.ingestUnknownPayloadReviewStatusPending()}</span>
                {:else}
                  <span class="badge bg-secondary">{m.ingestUnknownPayloadReviewStatusRejected()}</span>
                {/if}
              </div>
              <!-- Actions -->
              {#if selectedReview.status === 'pending'}
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-success" onclick={() => goCreateTemplate(selectedReview!)}>
                    <i class="bi bi-plus-circle me-1"></i>{m.ingestUnknownPayloadReviewCreateTemplate()}
                  </button>
                  <button class="btn btn-outline-danger" onclick={() => openReject(selectedReview!.reviewId)}>
                    <i class="bi bi-x-circle me-1"></i>{m.ingestUnknownPayloadReviewReject()}
                  </button>
                </div>
              {/if}
              <button class="btn btn-sm btn-outline-secondary" onclick={() => openDelete(selectedReview!.reviewId)} title={m.actionDelete()}>
                <i class="bi bi-trash"></i>
              </button>
            </div>

            <table class="table table-sm mb-3">
              <tbody>
                <tr>
                  <th class="text-inverse text-opacity-50" style="width:140px">{m.ingestUnknownPayloadReviewFingerprint()}</th>
                  <td><code class="small">{selectedReview.fingerprint}</code></td>
                </tr>
                <tr>
                  <th class="text-inverse text-opacity-50">{m.ingestUnknownPayloadReviewSeenCount()}</th>
                  <td>{selectedReview.seenCount}</td>
                </tr>
                <tr>
                  <th class="text-inverse text-opacity-50">{m.ingestUnknownPayloadReviewFirstSeen()}</th>
                  <td><small>{formatDate(selectedReview.firstSeenAt)}</small></td>
                </tr>
                <tr>
                  <th class="text-inverse text-opacity-50">{m.ingestUnknownPayloadReviewLastSeen()}</th>
                  <td><small>{formatDate(selectedReview.lastSeenAt)}</small></td>
                </tr>
              </tbody>
            </table>

            <!-- Candidate suggestions -->
            {#if selectedReview.candidateSuggestionIds?.length}
              <h6 class="mb-2">{m.ingestUnknownPayloadReviewCandidates()}</h6>
              <div class="mb-3">
                {#each selectedReview.candidateSuggestionIds as sid}
                  <span class="badge bg-info text-dark me-1">{sid}</span>
                {/each}
              </div>
            {/if}

            <!-- Sample payload -->
            <h6 class="mb-2">{m.ingestUnknownPayloadReviewSamplePayload()}</h6>
            <pre class="bg-dark text-light rounded p-3 small mb-0" style="max-height:400px;overflow:auto">{JSON.stringify(selectedReview.samplePayload, null, 2)}</pre>
          </CardBody>
        </Card>
      {/if}
    </div>
  </div>
{/if}

<!-- Reject Modal -->
{#if showRejectModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-x-circle me-2 text-danger"></i>{m.ingestUnknownPayloadReviewReject()}</h6>
        </div>
        <div class="modal-body">
          <p class="small text-inverse text-opacity-60">{m.ingestUnknownPayloadReviewRejectConfirm()}</p>
          <label class="form-label small" for="rejectReason">{m.ingestUnknownPayloadReviewRejectReason()}</label>
          <textarea id="rejectReason" class="form-control form-control-sm" rows="3" bind:value={rejectReason} disabled={rejectLoading}></textarea>
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showRejectModal = false; rejectId = null }} disabled={rejectLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleReject} disabled={rejectLoading}>
            {#if rejectLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.ingestUnknownPayloadReviewReject()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete Confirm Modal -->
{#if showDeleteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-trash me-2 text-danger"></i>{m.actionDelete()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestUnknownPayloadReviewDeleteConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; deleteId = null }} disabled={deleteLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleDelete} disabled={deleteLoading}>
            {#if deleteLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
