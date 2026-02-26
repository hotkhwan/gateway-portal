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
  import type { Org } from '$lib/types/org'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let showCreateModal = $state(false)

  // Create form state
  let createName = $state('')
  let createDescription = $state('')
  let createLoading = $state(false)
  let createError = $state<string | null>(null)

  // Edit form state
  let showEditModal = $state(false)
  let editOrg = $state<Org | null>(null)
  let editName = $state('')
  let editDescription = $state('')
  let editLoading = $state(false)
  let editError = $state<string | null>(null)

  // Delete confirmation state
  let showDeleteConfirm = $state(false)
  let deleteOrgId = $state<string | null>(null)
  let deleteLoading = $state(false)

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
      orgList.update((list) => [...list, org])
      // auto-switch to newly created org
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
      const updated = await updateOrg(editOrg.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined
      })
      orgList.update((list) =>
        list.map((o) => (o.id === updated.id ? updated : o))
      )
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
      orgList.update((list) => list.filter((o) => o.id !== deleteOrgId))
      // If deleted org was active, clear active org
      if ($activeOrgId === deleteOrgId) {
        setActiveOrg('')
      }
      closeDeleteConfirm()
    } catch (e: unknown) {
      alert((e as { message?: string })?.message ?? m.commonError())
    } finally {
      deleteLoading = false
    }
  }

  function openDeleteConfirm(orgId: string) {
    deleteOrgId = orgId
    deleteLoading = false
    showDeleteConfirm = true
  }

  function closeDeleteConfirm() {
    showDeleteConfirm = false
    deleteOrgId = null
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

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.orgTitle()}</h1>
  </div>
  <button class="btn btn-outline-theme btn-sm" onclick={openCreateModal}>
    <i class="bi bi-plus-lg me-1"></i>
    {m.orgCreateBtn()}
  </button>
</div>

<!-- Loading state -->
{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
    <p class="mt-2 text-inverse text-opacity-50 small">{m.actionLoading()}</p>
  </div>

  <!-- Error state -->
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>
    {error}
    <button class="btn btn-sm btn-danger ms-2" onclick={loadOrgs}>
      {m.actionRefresh()}
    </button>
  </div>

  <!-- Empty state -->
{:else if $orgList.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-building fs-1 text-inverse text-opacity-25 d-block mb-3"
        ></i>
        <p class="text-inverse text-opacity-50">{m.orgNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={openCreateModal}>
          <i class="bi bi-plus-lg me-1"></i>
          {m.orgCreateBtn()}
        </button>
      </div>
    </CardBody>
  </Card>

  <!-- Org list -->
{:else}
  <div class="row">
    {#each $orgList as org (org.id)}
      <div class="col-md-6 col-xl-4 mb-3">
        <Card>
          <CardBody>
            <div class="d-flex align-items-start mb-2">
              <div class="flex-grow-1">
                <h5 class="mb-1 fw-bold">{org.name}</h5>
                {#if org.description}
                  <p class="small text-inverse text-opacity-60 mb-0">
                    {org.description}
                  </p>
                {/if}
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

            <div class="d-flex gap-2">
              <button
                class="btn btn-sm flex-grow-1"
                class:btn-theme={$activeOrgId === org.id}
                class:btn-outline-theme={$activeOrgId !== org.id}
                onclick={() => setActiveOrg(org.id)}
              >
                {#if $activeOrgId === org.id}
                  <i class="bi bi-check-circle-fill me-1"></i>
                  {m.orgSwitchActive()}
                {:else}
                  <i class="bi bi-circle me-1"></i>
                  {m.orgSwitchTo()}
                {/if}
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                onclick={() => {
                  setActiveOrg(org.id)
                  goto('orgs/users')
                }}
                title={m.orgUsersTitle()}
              >
                <i class="bi bi-people"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-secondary"
                onclick={() => openEditModal(org)}
                title="Edit"
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => openDeleteConfirm(org.id)}
                title="Delete"
              >
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </CardBody>
        </Card>
      </div>
    {/each}
  </div>
{/if}

<!-- Create Org Modal -->
{#if showCreateModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal'))
        closeCreateModal()
    }}
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.orgCreateTitle()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
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
              <label class="form-label fw-semibold" for="orgDesc">
                {m.orgDescription()}
              </label>
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

<!-- Edit Org Modal -->
{#if showEditModal && editOrg}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal'))
        closeEditModal()
    }}
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">Edit Organization</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
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
              <label class="form-label fw-semibold" for="editOrgDesc">
                {m.orgDescription()}
              </label>
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

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirm && deleteOrgId}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal'))
        closeDeleteConfirm()
    }}
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">Delete Organization</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={closeDeleteConfirm}
          ></button>
        </div>

        <div class="modal-body">
          <p>Are you sure you want to delete this organization?</p>
          <p class="small text-inverse text-opacity-50">
            This action cannot be undone. All data associated with this
            organization will be permanently deleted.
          </p>
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
              Deleting...
            {:else}
              Delete
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
