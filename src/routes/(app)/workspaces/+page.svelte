<!-- src/routes/(app)/workspaces/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import {
    workspaceList,
    activeWorkspaceId,
    setWorkspaceList,
    setActiveWorkspace
  } from '$lib/stores/activeWorkspace'
  import { listWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } from '$lib/api/workspace'
  import { getIngestConfig } from '$lib/api/org'
  import type { Workspace, WorkspaceStatus } from '$lib/types/workspace'
  import type { IngestConfig } from '$lib/types/org'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  const platformRole = $derived($page.data.user?.platformRole ?? 'user')
  const isAdminPlatform = $derived(platformRole === 'administrator')

  let ingestConfigs = $state<Record<string, IngestConfig | null>>({})
  let ingestLoading = $state<Record<string, boolean>>({})
  let ingestExpanded = $state<Record<string, boolean>>({})

  async function toggleIngest(workspaceId: string) {
    if (ingestExpanded[workspaceId]) {
      ingestExpanded = { ...ingestExpanded, [workspaceId]: false }
      return
    }
    ingestExpanded = { ...ingestExpanded, [workspaceId]: true }
    if (ingestConfigs[workspaceId] !== undefined) return

    ingestLoading = { ...ingestLoading, [workspaceId]: true }
    try {
      const res = await getIngestConfig(workspaceId)
      ingestConfigs = { ...ingestConfigs, [workspaceId]: res }
    } catch {
      ingestConfigs = { ...ingestConfigs, [workspaceId]: null }
    } finally {
      ingestLoading = { ...ingestLoading, [workspaceId]: false }
    }
  }

  let copiedKey = $state<string | null>(null)

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    copiedKey = key
    setTimeout(() => (copiedKey = null), 1500)
  }

  // ── Workspace state ─────────────────────────────────────────────────────────
  let loading = $state(true)
  let error = $state<string | null>(null)
  let showCreateModal = $state(false)

  let createName = $state('')
  let createDescription = $state('')
  let createLoading = $state(false)
  let createError = $state<string | null>(null)

  let showEditModal = $state(false)
  let editWorkspace = $state<Workspace | null>(null)
  let editName = $state('')
  let editDescription = $state('')
  let editLoading = $state(false)
  let editError = $state<string | null>(null)

  let showDeleteConfirm = $state(false)
  let deleteWorkspaceId = $state<string | null>(null)
  let deleteLoading = $state(false)
  let deleteError = $state<string | null>(null)

  // ── Workspace CRUD ──────────────────────────────────────────────────────────
  async function loadWorkspaces() {
    loading = true
    error = null
    try {
      const workspaces = await listWorkspaces()
      setWorkspaceList(workspaces)
      // platformRole=user ที่ยังไม่มี workspace → บังคับเปิด modal สร้าง
      if (!isAdminPlatform && workspaces.length === 0) {
        forceCreate = true
        openCreateModal()
      }
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
      const workspace = await createWorkspace({
        name: createName.trim(),
        description: createDescription.trim() || undefined
      })
      forceCreate = false
      await loadWorkspaces()
      setActiveWorkspace(workspace.id)
      closeCreateModal()
    } catch (e: unknown) {
      createError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      createLoading = false
    }
  }

  // true เมื่อ modal นี้ถูกเปิดเพราะ user ยังไม่มี workspace เลย (บังคับสร้าง)
  let forceCreate = $state(false)

  function openCreateModal() {
    createName = ''
    createDescription = ''
    createError = null
    showCreateModal = true
  }

  function closeCreateModal() {
    // ถ้าอยู่ในโหมดบังคับสร้าง ไม่อนุญาตให้ปิด
    if (forceCreate) return
    showCreateModal = false
  }

  async function handleEdit() {
    if (!editWorkspace || !editName.trim()) return
    editLoading = true
    editError = null
    try {
      await updateWorkspace(editWorkspace.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined
      })
      await loadWorkspaces()
      closeEditModal()
    } catch (e: unknown) {
      editError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      editLoading = false
    }
  }

  function openEditModal(workspace: Workspace) {
    editWorkspace = workspace
    editName = workspace.name
    editDescription = workspace.description || ''
    editError = null
    showEditModal = true
  }

  function closeEditModal() {
    showEditModal = false
    editWorkspace = null
    editName = ''
    editDescription = ''
    editError = null
  }

  async function handleDelete() {
    if (!deleteWorkspaceId) return
    deleteLoading = true
    try {
      await deleteWorkspace(deleteWorkspaceId)
      const wasActive = $activeWorkspaceId === deleteWorkspaceId
      await loadWorkspaces()
      if (wasActive) setActiveWorkspace(null)
      closeDeleteConfirm()
    } catch (e: unknown) {
      deleteError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function openDeleteConfirm(workspaceId: string) {
    deleteWorkspaceId = workspaceId
    deleteLoading = false
    deleteError = null
    showDeleteConfirm = true
  }

  function closeDeleteConfirm() {
    showDeleteConfirm = false
    deleteWorkspaceId = null
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
    setPageTitle(m.workspaceTitle())
    loadWorkspaces()
  })
</script>

<!-- ── Page header ──────────────────────────────────────────────────────────── -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.workspaceTitle()}</h1>
  </div>
  <button class="btn btn-outline-theme btn-sm" onclick={openCreateModal}>
    <i class="bi bi-plus-lg me-1"></i>
    {m.workspaceCreateBtn()}
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadWorkspaces}>
      {m.actionRefresh()}
    </button>
  </div>
{:else if $workspaceList.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-grid fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50">{m.workspaceNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={openCreateModal}>
          <i class="bi bi-plus-lg me-1"></i>{m.workspaceCreateBtn()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="row">
    {#each $workspaceList as workspace (workspace.id)}
      <div class="col-md-6 col-xl-4 mb-3">
        <Card>
          <CardBody>
            <!-- ── Workspace header ──────────────────────────────────────────── -->
            <div class="d-flex align-items-start mb-2">
              <div class="flex-grow-1">
                <h5 class="mb-1 fw-bold">{workspace.name}</h5>
                <p class="small text-inverse text-opacity-60 mb-0">
                  {workspace.description || m.workspaceDescriptionNoDesc()}
                </p>
              </div>
              <span
                class="badge rounded-pill ms-2"
                class:bg-theme={workspace.status === 'active'}
                class:bg-secondary={workspace.status !== 'active'}
              >
                {workspace.status === 'active'
                  ? m.workspaceStatusActive()
                  : m.workspaceStatusInactive()}
              </span>
            </div>

            <div class="small text-inverse text-opacity-50 mb-3">
              <i class="bi bi-calendar3 me-1"></i>
              {m.workspaceCreatedAt()}: {formatDate(workspace.createdAt)}
            </div>

            <!-- ── Action buttons ─────────────────────────────────────────── -->
            <div class="d-flex gap-2 mb-3">
              <button
                class="btn btn-sm flex-grow-1"
                class:btn-theme={$activeWorkspaceId === workspace.id}
                class:btn-outline-theme={$activeWorkspaceId !== workspace.id}
                onclick={() => setActiveWorkspace(workspace.id)}
              >
                {#if $activeWorkspaceId === workspace.id}
                  <i class="bi bi-check-circle-fill me-1"></i>{m.workspaceSwitchActive()}
                {:else}
                  <i class="bi bi-circle me-1"></i>{m.workspaceSwitchTo()}
                {/if}
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                onclick={() => {
                  setActiveWorkspace(workspace.id)
                  goto('workspaces/members')
                }}
                title={m.workspaceMembersTitle()}><i class="bi bi-people"></i></button
              >
              <button
                class="btn btn-sm btn-outline-secondary"
                onclick={() => openEditModal(workspace)}
                title={m.actionEdit()}><i class="bi bi-pencil"></i></button
              >
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => openDeleteConfirm(workspace.id)}
                title={m.actionDelete()}><i class="bi bi-trash"></i></button
              >
            </div>

            <!-- ── Ingest endpoint section ────────────────────────────────── -->
            <div class="border-top pt-2">
              <button
                type="button"
                class="btn btn-link btn-sm p-0 text-decoration-none d-flex align-items-center gap-1 w-100 text-start"
                onclick={() => toggleIngest(workspace.id)}
              >
                <i class="bi bi-broadcast text-theme"></i>
                <span class="small fw-semibold text-inverse">{m.workspaceIngestSection()}</span>
                <i
                  class="bi ms-auto text-inverse text-opacity-50 small"
                  class:bi-chevron-down={!ingestExpanded[workspace.id]}
                  class:bi-chevron-up={ingestExpanded[workspace.id]}
                ></i>
              </button>

              {#if ingestExpanded[workspace.id]}
                <div class="mt-2">
                  {#if ingestLoading[workspace.id]}
                    <div class="text-center py-2">
                      <div
                        class="spinner-border spinner-border-sm text-theme"
                        role="status"
                      ></div>
                    </div>
                  {:else if ingestConfigs[workspace.id] === null}
                    <div class="alert alert-warning py-2 small mb-0">
                      <i class="bi bi-exclamation-triangle me-1"></i>
                      {m.workspaceIngestFailed()}
                    </div>
                  {:else if ingestConfigs[workspace.id]}
                    {@const cfg = ingestConfigs[workspace.id]!}
                    <div
                      class="rounded border p-2 small"
                      style="background: var(--bs-body-bg)"
                    >
                      <!-- Endpoint URL -->
                      <div class="mb-2">
                        <div class="text-inverse text-opacity-50 mb-1">
                          <i class="bi bi-link-45deg me-1"></i>{m.workspaceIngestEndpointLabel()}
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
                            onclick={() => copyText(cfg.ingestEndpoint, `ep-${workspace.id}`)}
                            title={m.actionCopy()}
                          >
                            {#if copiedKey === `ep-${workspace.id}`}
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
                          <i class="bi bi-key me-1"></i>{m.workspaceIngestSecretLabel()}
                        </div>
                        <div class="d-flex align-items-center gap-1">
                          <code class="flex-grow-1 text-inverse text-opacity-75 small">
                            {cfg.ingestSecretMasked}
                          </code>
                          <button
                            type="button"
                            class="btn btn-xs btn-outline-secondary px-1 py-0 flex-shrink-0"
                            onclick={() => copyText(cfg.ingestSecretMasked ?? '', `sk-${workspace.id}`)}
                            title={m.actionCopy()}
                          >
                            {#if copiedKey === `sk-${workspace.id}`}
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
                          <span class="text-inverse text-opacity-50">{m.workspaceIngestSignatureLabel()}</span>
                          <span class="ms-1">
                            {#if cfg.signatureRequired}
                              <span class="badge bg-warning text-dark">{m.workspaceIngestRequired()}</span>
                            {:else}
                              <span class="badge bg-secondary">{m.workspaceIngestOptional()}</span>
                            {/if}
                          </span>
                        </div>
                        <div>
                          <span class="text-inverse text-opacity-50">{m.workspaceIngestRateLimitLabel()}</span>
                          <span class="ms-1 text-inverse">
                            <i class="bi bi-lightning-charge text-theme"></i>
                            {cfg.rateLimit.perSecond}/s
                            <span class="text-opacity-50">({m.workspaceIngestBurst()} {cfg.rateLimit.burst})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
              {/if}
            </div>
          </CardBody>
        </Card>
      </div>
    {/each}
  </div>
{/if}

<!-- ── Create Workspace Modal ─────────────────────────────────────────────────── -->
{#if showCreateModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.workspaceCreateTitle()}</h5>
          {#if !forceCreate}
            <button
              type="button"
              class="btn-close"
              aria-label={m.actionClose()}
              onclick={closeCreateModal}
            ></button>
          {/if}
        </div>
        <form onsubmit={(e) => { e.preventDefault(); handleCreate() }}>
          <div class="modal-body">
            {#if forceCreate}
              <div class="alert alert-info small py-2">
                <i class="bi bi-info-circle me-1"></i>
                {m.workspaceForceCreateHint()}
              </div>
            {/if}
            {#if createError}
              <div class="alert alert-danger small py-2">{createError}</div>
            {/if}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="workspaceName">
                {m.workspaceName()} <span class="text-danger">*</span>
              </label>
              <input
                id="workspaceName"
                type="text"
                class="form-control"
                placeholder={m.workspaceNamePlaceholder()}
                bind:value={createName}
                required
                disabled={createLoading}
              />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold" for="workspaceDesc">{m.workspaceDescription()}</label>
              <textarea
                id="workspaceDesc"
                class="form-control"
                rows={3}
                placeholder={m.workspaceDescriptionPlaceholder()}
                bind:value={createDescription}
                disabled={createLoading}
              ></textarea>
            </div>
          </div>
          <div class="modal-footer">
            {#if !forceCreate}
              <button
                type="button"
                class="btn btn-secondary"
                onclick={closeCreateModal}
                disabled={createLoading}
              >
                {m.actionCancel()}
              </button>
            {/if}
            <button
              type="submit"
              class="btn btn-theme"
              disabled={createLoading || !createName.trim()}
            >
              {#if createLoading}
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
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

<!-- ── Edit Workspace Modal ───────────────────────────────────────────────────── -->
{#if showEditModal && editWorkspace}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.workspaceEditTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={closeEditModal}
          ></button>
        </div>
        <form onsubmit={(e) => { e.preventDefault(); handleEdit() }}>
          <div class="modal-body">
            {#if editError}
              <div class="alert alert-danger small py-2">{editError}</div>
            {/if}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="editWorkspaceName">
                {m.workspaceName()} <span class="text-danger">*</span>
              </label>
              <input
                id="editWorkspaceName"
                type="text"
                class="form-control"
                placeholder={m.workspaceNamePlaceholder()}
                bind:value={editName}
                required
                disabled={editLoading}
              />
            </div>
            <div class="mb-3">
              <label class="form-label fw-semibold" for="editWorkspaceDesc">{m.workspaceDescription()}</label>
              <textarea
                id="editWorkspaceDesc"
                class="form-control"
                rows={3}
                placeholder={m.workspaceDescriptionPlaceholder()}
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
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
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

<!-- ── Delete Confirmation Modal ──────────────────────────────────────────────── -->
{#if showDeleteConfirm && deleteWorkspaceId}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.workspaceDeleteTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={closeDeleteConfirm}
          ></button>
        </div>
        <div class="modal-body">
          <p>{m.workspaceDeleteConfirm()}</p>
          <p class="small text-inverse text-opacity-50">{m.workspaceDeleteWarning()}</p>
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
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {m.workspaceDeleteDeleting()}
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
