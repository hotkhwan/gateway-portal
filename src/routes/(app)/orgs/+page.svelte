<!-- src/routes/(app)/orgs/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { resolve } from '$app/paths'
  import {
    orgList,
    activeOrgId,
    setOrgList,
    setActiveOrg
  } from '$lib/stores/activeOrg'
  import { listOrgs, createOrg } from '$lib/api/org'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type { Org } from '$lib/types/org'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let showCreateModal = $state(false)

  // Create form state
  let createName = $state('')
  let createDescription = $state('')
  let createLoading = $state(false)
  let createError = $state<string | null>(null)

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
              <a
                href={resolve('/orgs/[orgId]/ingest', {
                  orgId: org.id
                })}
                class="btn btn-sm btn-outline-secondary"
                title={m.orgIngestTitle()}
              >
                <i class="bi bi-cloud-upload"></i>
              </a>
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
