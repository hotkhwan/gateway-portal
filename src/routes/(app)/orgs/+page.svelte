<!-- src/routes/(app)/orgs/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { goto } from '$app/navigation'
  import {
    orgList,
    activeOrgId,
    setOrgList,
    setActiveOrg
  } from '$lib/stores/activeOrg'
  import { listOrgs, createOrg, updateOrg, deleteOrg } from '$lib/api/org'
  import { getIngestConfig } from '$lib/api/ingest' // ← เพิ่ม import
  import type { Org, IngestConfig } from '$lib/types/org'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let ingestConfigs = $state<Record<string, IngestConfig | null>>({})
  let ingestLoading = $state<Record<string, boolean>>({})
  let ingestExpanded = $state<Record<string, boolean>>({})

  async function toggleIngest(orgId: string) {
    // collapse
    if (ingestExpanded[orgId]) {
      ingestExpanded = { ...ingestExpanded, [orgId]: false }
      return
    }
    // expand
    ingestExpanded = { ...ingestExpanded, [orgId]: true }
    // load only once
    if (ingestConfigs[orgId] !== undefined) return

    ingestLoading = { ...ingestLoading, [orgId]: true }
    try {
      const res = await getIngestConfig(orgId)
      ingestConfigs = { ...ingestConfigs, [orgId]: res }
    } catch {
      ingestConfigs = { ...ingestConfigs, [orgId]: null }
    } finally {
      ingestLoading = { ...ingestLoading, [orgId]: false }
    }
  }

  let copiedKey = $state<string | null>(null)

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    copiedKey = key
    setTimeout(() => (copiedKey = null), 1500)
  }

  // ── Org state ───────────────────────────────────────────────────────────────
  let loading = $state(true)
  let error = $state<string | null>(null)
  let showCreateModal = $state(false)

  let createName = $state('')
  let createDescription = $state('')
  let createLoading = $state(false)
  let createError = $state<string | null>(null)

  let showEditModal = $state(false)
  let editOrg = $state<Org | null>(null)
  let editName = $state('')
  let editDescription = $state('')
  let editLoading = $state(false)
  let editError = $state<string | null>(null)

  let showDeleteConfirm = $state(false)
  let deleteOrgId = $state<string | null>(null)
  let deleteLoading = $state(false)
  let deleteError = $state<string | null>(null)

  // ── Org CRUD ────────────────────────────────────────────────────────────────
  async function loadOrgs() {
    loading = true
    error = null
    try {
      const orgs = await listOrgs()
      setOrgList(orgs)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function handleCreate() {
    if (!createName.trim()) return
    createLoading = true
    createError = null
    try {
      const org = await createOrg({
        name: createName.trim(),
        description: createDescription.trim() || undefined
      })
      await loadOrgs()
      setActiveOrg(org.id)
      closeCreateModal()
    } catch (e: unknown) {
      createError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      createLoading = false
    }
  }

  function openCreateModal() {
    createName = ''
    createDescription = ''
    createError = null
    showCreateModal = true
  }

  function closeCreateModal() {
    showCreateModal = false
  }

  async function handleEdit() {
    if (!editOrg || !editName.trim()) return
    editLoading = true
    editError = null
    try {
      await updateOrg(editOrg.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined
      })
      await loadOrgs()
      closeEditModal()
    } catch (e: unknown) {
      editError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      editLoading = false
    }
  }

  function openEditModal(org: Org) {
    editOrg = org
    editName = org.name
    editDescription = org.description || ''
    editError = null
    showEditModal = true
  }

  function closeEditModal() {
    showEditModal = false
    editOrg = null
    editName = ''
    editDescription = ''
    editError = null
  }

  async function handleDelete() {
    if (!deleteOrgId) return
    deleteLoading = true
    try {
      await deleteOrg(deleteOrgId)
      const wasActive = $activeOrgId === deleteOrgId
      await loadOrgs()
      if (wasActive) setActiveOrg('')
      closeDeleteConfirm()
    } catch (e: unknown) {
      deleteError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function openDeleteConfirm(orgId: string) {
    deleteOrgId = orgId
    deleteLoading = false
    deleteError = null
    showDeleteConfirm = true
  }

  function closeDeleteConfirm() {
    showDeleteConfirm = false
    deleteOrgId = null
    deleteError = null
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  onMount(() => {
    setPageTitle(m.orgTitle())
    loadOrgs()
  })
</script>

<!-- ── Page header ──────────────────────────────────────────────────────────── -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.orgTitle()}</h1>
  </div>
  <button class="btn btn-outline-theme btn-sm" onclick={openCreateModal}>
    <i class="bi bi-plus-lg me-1"></i>
    {m.orgCreateBtn()}
  </button>
</div>

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
    <p class="mt-2 text-inverse text-opacity-50 small">{m.actionLoading()}</p>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>
    {error}
    <button class="btn btn-sm btn-danger ms-2" onclick={loadOrgs}>
      {m.actionRefresh()}
    </button>
  </div>
{:else if $orgList.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-building fs-1 text-inverse text-opacity-25 d-block mb-3"
        ></i>
        <p class="text-inverse text-opacity-50">{m.orgNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={openCreateModal}>
          <i class="bi bi-plus-lg me-1"></i>{m.orgCreateBtn()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="row">
    {#each $orgList as org (org.id)}
      <div class="col-md-6 col-xl-4 mb-3">
        <Card>
          <CardBody>
            <!-- ── Org header ─────────────────────────────────────────────── -->
            <div class="d-flex align-items-start mb-2">
              <div class="flex-grow-1">
                <h5 class="mb-1 fw-bold">{org.name}</h5>
                <p class="small text-inverse text-opacity-60 mb-0">
                  {org.description || m.orgDescriptionNoDesc()}
                </p>
              </div>
              <span
                class="badge rounded-pill ms-2"
                class:bg-theme={org.status === 'active'}
                class:bg-secondary={org.status !== 'active'}
              >
                {org.status === 'active'
                  ? m.orgStatusActive()
                  : m.orgStatusInactive()}
              </span>
            </div>

            <div class="small text-inverse text-opacity-50 mb-3">
              <i class="bi bi-calendar3 me-1"></i>
              {m.orgCreatedAt()}: {formatDate(org.createdAt)}
            </div>

            <!-- ── Action buttons ─────────────────────────────────────────── -->
            <div class="d-flex gap-2 mb-3">
              <button
                class="btn btn-sm flex-grow-1"
                class:btn-theme={$activeOrgId === org.id}
                class:btn-outline-theme={$activeOrgId !== org.id}
                onclick={() => setActiveOrg(org.id)}
              >
                {#if $activeOrgId === org.id}
                  <i class="bi bi-check-circle-fill me-1"
                  ></i>{m.orgSwitchActive()}
                {:else}
                  <i class="bi bi-circle me-1"></i>{m.orgSwitchTo()}
                {/if}
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                onclick={() => {
                  setActiveOrg(org.id)
                  goto('orgs/users')
                }}
                title={m.orgUsersTitle()}><i class="bi bi-people"></i></button
              >
              <button
                class="btn btn-sm btn-outline-secondary"
                onclick={() => openEditModal(org)}
                title={m.actionEdit()}><i class="bi bi-pencil"></i></button
              >
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => openDeleteConfirm(org.id)}
                title={m.actionDelete()}><i class="bi bi-trash"></i></button
              >
            </div>

            <!-- ── Ingest endpoint section ────────────────────────────────── -->
            <div class="border-top pt-2">
              <button
                type="button"
                class="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1 w-100 text-start"
                onclick={() => toggleIngest(org.id)}
              >
                <i class="bi bi-broadcast text-theme"></i>
                <span class="small fw-semibold text-inverse"
                  >{m.orgIngestSection()}</span
                >
                <i
                  class="bi ms-auto text-inverse text-opacity-50 small"
                  class:bi-chevron-down={!ingestExpanded[org.id]}
                  class:bi-chevron-up={ingestExpanded[org.id]}
                ></i>
              </button>

              {#if ingestExpanded[org.id]}
                <div class="mt-2">
                  {#if ingestLoading[org.id]}
                    <div class="text-center py-2">
                      <div
                        class="spinner-border spinner-border-sm text-theme"
                        role="status"
                      ></div>
                    </div>
                  {:else if ingestConfigs[org.id] === null}
                    <div class="alert alert-warning py-2 small mb-0">
                      <i class="bi bi-exclamation-triangle me-1"></i>
                      {m.orgIngestFailed()}
                    </div>
                  {:else if ingestConfigs[org.id]}
                    {@const cfg = ingestConfigs[org.id]!}
                    <div
                      class="rounded border p-2 small"
                      style="background: var(--bs-body-bg)"
                    >
                      <!-- Endpoint URL -->
                      <div class="mb-2">
                        <div class="text-inverse text-opacity-50 mb-1">
                          <i class="bi bi-link-45deg me-1"></i>{m.orgIngestEndpointLabel()}
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <code
                            class="flex-grow-1 text-theme small"
                            style="word-break:break-all"
                          >
                            {cfg.ingestEndpoint}
                          </code>
                          <button
                            type="button"
                            class="btn btn-xs btn-outline-secondary px-1 py-0 flex-shrink-0"
                            onclick={() =>
                              copyText(cfg.ingestEndpoint, `ep-${org.id}`)}
                            title={m.actionCopy()}
                          >
                            {#if copiedKey === `ep-${org.id}`}
                              <i class="bi bi-check text-success"></i>
                            {:else}
                              <i class="bi bi-copy"></i>
                            {/if}
                          </button>
                        </div>
                      </div>

                      <!-- Secret -->
                      <div class="mb-2">
                        <div class="text-inverse text-opacity-50 mb-1">
                          <i class="bi bi-key me-1"></i>{m.orgIngestSecretLabel()}
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <code
                            class="flex-grow-1 text-inverse text-opacity-75 small"
                          >
                            {cfg.ingestSecretMasked}
                          </code>
                          <button
                            type="button"
                            class="btn btn-xs btn-outline-secondary px-1 py-0 flex-shrink-0"
                            onclick={() =>
                              copyText(
                                cfg.ingestSecretMasked ?? '',
                                `sk-${org.id}`
                              )}
                            title={m.actionCopy()}
                          >
                            {#if copiedKey === `sk-${org.id}`}
                              <i class="bi bi-check text-success"></i>
                            {:else}
                              <i class="bi bi-copy"></i>
                            {/if}
                          </button>
                        </div>
                      </div>

                      <!-- Meta row -->
                      <div class="d-flex gap-3 flex-wrap">
                        <div>
                          <span class="text-inverse text-opacity-50"
                            >{m.orgIngestSignatureLabel()}</span
                          >
                          <span class="ms-1">
                            {#if cfg.signatureRequired}
                              <span class="badge bg-warning text-dark"
                                >{m.orgIngestRequired()}</span
                              >
                            {:else}
                              <span class="badge bg-secondary">{m.orgIngestOptional()}</span>
                            {/if}
                          </span>
                        </div>
                        <div>
                          <span class="text-inverse text-opacity-50"
                            >{m.orgIngestRateLimitLabel()}</span
                          >
                          <span class="ms-1 text-inverse">
                            <i class="bi bi-lightning-charge text-theme"></i>
                            {cfg.rateLimit.perSecond}/s
                            <span class="text-opacity-50"
                              >({m.orgIngestBurst()} {cfg.rateLimit.burst})</span
                            >
                          </span>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
            <!-- /ingest section -->
          </CardBody>
        </Card>
      </div>
    {/each}
  </div>
{/if}

<!-- ── Create Org Modal ──────────────────────────────────────────────────────── -->
{#if showCreateModal}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.orgCreateTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={closeCreateModal}
          ></button>
        </div>
        <form
          onsubmit={(e) => {
            e.preventDefault()
            handleCreate()
          }}
        >
          <div class="modal-body">
            {#if createError}
              <div class="alert alert-danger small py-2">{createError}</div>
            {/if}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="orgName">
                {m.orgName()} <span class="text-danger">*</span>
              </label>
              <input
                id="orgName"
                type="text"
                class="form-control"
                placeholder={m.orgNamePlaceholder()}
                bind:value={createName}
                required
                disabled={createLoading}
              />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold" for="orgDesc"
                >{m.orgDescription()}</label
              >
              <textarea
                id="orgDesc"
                class="form-control"
                rows={3}
                placeholder={m.orgDescriptionPlaceholder()}
                bind:value={createDescription}
                disabled={createLoading}
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              onclick={closeCreateModal}
              disabled={createLoading}
            >
              {m.actionCancel()}
            </button>
            <button
              type="submit"
              class="btn btn-theme"
              disabled={createLoading || !createName.trim()}
            >
              {#if createLoading}
                <span
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                {m.actionSubmitting()}
              {:else}
                {m.actionCreate()}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ── Edit Org Modal ────────────────────────────────────────────────────────── -->
{#if showEditModal && editOrg}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.orgEditTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={closeEditModal}
          ></button>
        </div>
        <form
          onsubmit={(e) => {
            e.preventDefault()
            handleEdit()
          }}
        >
          <div class="modal-body">
            {#if editError}
              <div class="alert alert-danger small py-2">{editError}</div>
            {/if}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="editOrgName">
                {m.orgName()} <span class="text-danger">*</span>
              </label>
              <input
                id="editOrgName"
                type="text"
                class="form-control"
                placeholder={m.orgNamePlaceholder()}
                bind:value={editName}
                required
                disabled={editLoading}
              />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold" for="editOrgDesc"
                >{m.orgDescription()}</label
              >
              <textarea
                id="editOrgDesc"
                class="form-control"
                rows={3}
                placeholder={m.orgDescriptionPlaceholder()}
                bind:value={editDescription}
                disabled={editLoading}
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              onclick={closeEditModal}
              disabled={editLoading}
            >
              {m.actionCancel()}
            </button>
            <button
              type="submit"
              class="btn btn-theme"
              disabled={editLoading || !editName.trim()}
            >
              {#if editLoading}
                <span
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                {m.actionSubmitting()}
              {:else}
                {m.actionUpdate()}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- ── Delete Confirmation Modal ─────────────────────────────────────────────── -->
{#if showDeleteConfirm && deleteOrgId}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.orgDeleteTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={closeDeleteConfirm}
          ></button>
        </div>
        <div class="modal-body">
          <p>{m.orgDeleteConfirm()}</p>
          <p class="small text-inverse text-opacity-50">
            {m.orgDeleteWarning()}
          </p>
          {#if deleteError}
            <div class="alert alert-danger py-2 small mb-0">
              <i class="bi bi-x-circle me-1"></i>{deleteError}
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={closeDeleteConfirm}
            disabled={deleteLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            onclick={handleDelete}
            disabled={deleteLoading}
          >
            {#if deleteLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              {m.orgDeleteDeleting()}
            {:else}
              {m.actionDelete()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
