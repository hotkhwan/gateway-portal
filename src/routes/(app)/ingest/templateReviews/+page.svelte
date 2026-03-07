<!-- src/routes/(app)/ingest/templateReviews/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    listTemplateReviews,
    archiveTemplateReview
  } from '$lib/api/ingest'
  import type { TemplateReview } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let reviews = $state<TemplateReview[]>([])
  let pagination = $state({ page: 1, perPage: 10, total: 0, totalPages: 0 })
  let statusFilter = $state<string>('pending')

  // Detail modal
  let showDetailModal = $state(false)
  let detailReview = $state<TemplateReview | null>(null)

  // Archive confirm
  let showArchiveModal = $state(false)
  let archiveReviewId = $state<string | null>(null)
  let archiveLoading = $state(false)

  async function load(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listTemplateReviews(orgId, page, perPage, { status: statusFilter || undefined })
      reviews = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openDetail(review: TemplateReview) {
    detailReview = review
    showDetailModal = true
  }

  function openArchive(reviewId: string) {
    archiveReviewId = reviewId
    showArchiveModal = true
  }

  async function handleArchive() {
    const orgId = $activeOrg?.id
    if (!orgId || !archiveReviewId) return
    archiveLoading = true
    try {
      await archiveTemplateReview(orgId, archiveReviewId)
      reviews = reviews.map(r =>
        r.reviewId === archiveReviewId ? { ...r, status: 'archived' as const } : r
      )
      showArchiveModal = false
      archiveReviewId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      archiveLoading = false
    }
  }

  function createTemplateFromReview(review: TemplateReview) {
    const params = new URLSearchParams()
    params.set('fromReview', review.reviewId)
    params.set('sourceFamily', review.sourceFamily)
    if (review.suggestedMatchFields?.length) {
      params.set('suggestedFields', review.suggestedMatchFields.join(','))
    }
    params.set('samplePayload', JSON.stringify(review.samplePayload))
    goto(`/ingest/mappingTemplates?${params}`)
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

  function truncate(s: string, len = 16): string {
    return s.length > len ? s.slice(0, len) + '...' : s
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.ingestTemplateReviewsTitle())
    if (orgId) {
      untrack(() => load())
    } else {
      loading = false
    }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestTemplateReviewsTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name} &mdash; {m.ingestTemplateReviewsSubtitle()}
      </small>
    {/if}
  </div>
  <div>
    <select class="form-select form-select-sm" style="width:auto" bind:value={statusFilter} onchange={() => load(1)}>
      <option value="">All</option>
      <option value="pending">{m.ingestTemplateReviewStatusPending()}</option>
      <option value="archived">{m.ingestTemplateReviewStatusArchived()}</option>
    </select>
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
    <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
  </div>
{:else if reviews.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-inbox fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50 mb-0">{m.ingestTemplateReviewNoRecords()}</p>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.ingestTemplateReviewSourceFamily()}</th>
          <th>{m.ingestTemplateReviewFingerprint()}</th>
          <th>{m.ingestTemplateReviewStatus()}</th>
          <th>{m.ingestTemplateReviewSuggestedFields()}</th>
          <th>{m.eventsCreatedAt()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each reviews as review (review.reviewId)}
          <tr>
            <td><span class="badge bg-theme-subtle text-theme">{review.sourceFamily}</span></td>
            <td>
              <button class="btn btn-link btn-sm p-0 font-monospace" onclick={() => openDetail(review)} title={review.fingerprint}>
                {truncate(review.fingerprint)}
              </button>
            </td>
            <td>
              {#if review.status === 'pending'}
                <span class="badge bg-warning text-dark">{m.ingestTemplateReviewStatusPending()}</span>
              {:else}
                <span class="badge bg-secondary">{m.ingestTemplateReviewStatusArchived()}</span>
              {/if}
            </td>
            <td>
              {#if review.suggestedMatchFields?.length}
                {#each review.suggestedMatchFields as field}
                  <span class="badge bg-theme-subtle text-theme me-1">{field}</span>
                {/each}
              {:else}
                <span class="text-inverse text-opacity-50 small">-</span>
              {/if}
            </td>
            <td class="small">{formatDate(review.createdAt)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-theme me-1" onclick={() => openDetail(review)} title={m.actionView()}>
                <i class="bi bi-eye"></i>
              </button>
              {#if review.status === 'pending'}
                <button class="btn btn-sm btn-outline-success me-1" onclick={() => createTemplateFromReview(review)} title={m.ingestTemplateReviewCreateTemplate()}>
                  <i class="bi bi-plus-circle"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick={() => openArchive(review.reviewId)} title={m.ingestTemplateReviewArchive()}>
                  <i class="bi bi-archive"></i>
                </button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if pagination.totalPages > 1}
    <div class="d-flex justify-content-between align-items-center mt-3">
      <small class="text-inverse text-opacity-50">
        {m.showing()}
        {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)}
        {m.of()} {pagination.total}
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

<!-- Detail Modal -->
{#if showDetailModal && detailReview}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.ingestTemplateReviewsTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showDetailModal = false)}></button>
        </div>
        <div class="modal-body">
          <dl class="row mb-3">
            <dt class="col-sm-4">{m.ingestTemplateReviewSourceFamily()}</dt>
            <dd class="col-sm-8"><span class="badge bg-theme-subtle text-theme">{detailReview.sourceFamily}</span></dd>
            <dt class="col-sm-4">{m.ingestTemplateReviewFingerprint()}</dt>
            <dd class="col-sm-8"><code class="small">{detailReview.fingerprint}</code></dd>
            <dt class="col-sm-4">{m.ingestTemplateReviewStatus()}</dt>
            <dd class="col-sm-8">
              {#if detailReview.status === 'pending'}
                <span class="badge bg-warning text-dark">{m.ingestTemplateReviewStatusPending()}</span>
              {:else}
                <span class="badge bg-secondary">{m.ingestTemplateReviewStatusArchived()}</span>
              {/if}
            </dd>
            <dt class="col-sm-4">{m.eventsCreatedAt()}</dt>
            <dd class="col-sm-8">{formatDate(detailReview.createdAt)}</dd>
          </dl>

          {#if detailReview.suggestedMatchFields?.length}
            <h6 class="mb-2">{m.ingestTemplateReviewSuggestedFields()}</h6>
            <div class="mb-3">
              {#each detailReview.suggestedMatchFields as field}
                <span class="badge bg-theme-subtle text-theme me-1">{field}</span>
              {/each}
            </div>
          {/if}

          <h6 class="mb-2">{m.ingestTemplateReviewSamplePayload()}</h6>
          <pre class="bg-dark text-light rounded p-3 small" style="max-height:400px;overflow:auto">{JSON.stringify(detailReview.samplePayload, null, 2)}</pre>
        </div>
        <div class="modal-footer">
          {#if detailReview.status === 'pending'}
            <button class="btn btn-sm btn-success me-auto" onclick={() => createTemplateFromReview(detailReview!)}>
              <i class="bi bi-plus-circle me-1"></i>{m.ingestTemplateReviewCreateTemplate()}
            </button>
            <button class="btn btn-sm btn-outline-secondary" onclick={() => { showDetailModal = false; openArchive(detailReview!.reviewId) }}>
              <i class="bi bi-archive me-1"></i>{m.ingestTemplateReviewArchive()}
            </button>
          {/if}
          <button type="button" class="btn btn-secondary btn-sm" onclick={() => (showDetailModal = false)}>{m.actionClose()}</button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Archive Confirm Modal -->
{#if showArchiveModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-archive me-2"></i>{m.ingestTemplateReviewArchive()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestTemplateReviewArchiveConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showArchiveModal = false; archiveReviewId = null }} disabled={archiveLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-theme" onclick={handleArchive} disabled={archiveLoading}>
            {#if archiveLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.ingestTemplateReviewArchive()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
