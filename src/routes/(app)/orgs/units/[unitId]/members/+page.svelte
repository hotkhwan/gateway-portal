<!-- src/routes/(app)/orgs/units/[unitId]/members/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listUnitMembers, removeMembers } from '$lib/api/orgunit'
  import type { OrgUnitMember } from '$lib/types/org'
  import { page } from '$app/state'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let members = $state<OrgUnitMember[]>([])
  let total = $state(0)
  let currentPage = $state(1)
  let limit = $state(10)
  let search = $state('')

  // Remove modal state
  let showRemoveModal = $state(false)
  let removeLoading = $state(false)
  let removeError = $state<string | null>(null)
  let selectedUserIds = $state<string[]>([])
  let currentUnit = $state<{ id: string; name: string } | null>(null)

  async function loadMembers() {
    loading = true
    error = null
    try {
      const orgId = $activeOrg?.id
      if (!orgId) {
        error = m.unitErrorNoOrg()
        return
      }
      const unitId = page.url.searchParams.get('unitId')
      if (!unitId) {
        error = m.unitErrorInvalidId()
        return
      }
      const result = await listUnitMembers(orgId, unitId)
      members = result ?? []
      total = result.length
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function handleSearch() {
    currentPage = 1
    loadMembers()
  }

  function handlePageChange(newPage: number) {
    currentPage = newPage
    loadMembers()
  }

  function toggleSelectUser(userId: string) {
    if (selectedUserIds.includes(userId)) {
      selectedUserIds = selectedUserIds.filter((id) => id !== userId)
    } else {
      selectedUserIds = [...selectedUserIds, userId]
    }
  }

  function toggleSelectAll() {
    if (selectedUserIds.length === members.length) {
      selectedUserIds = []
    } else {
      selectedUserIds = members.map((m) => m.userId)
    }
  }

  function openRemoveModal() {
    if (selectedUserIds.length === 0) return
    removeError = null
    showRemoveModal = true
  }

  function closeRemoveModal() {
    showRemoveModal = false
  }

  async function handleRemove() {
    if (!$activeOrg || !currentUnit || selectedUserIds.length === 0) return

    removeLoading = true
    removeError = null
    try {
      await removeMembers($activeOrg.id, currentUnit.id, selectedUserIds)
      closeRemoveModal()
      selectedUserIds = []
      await loadMembers()
    } catch (e: unknown) {
      removeError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      removeLoading = false
    }
  }

  onMount(() => {
    setPageTitle(m.unitMembers())
    const unitId = page.url.searchParams.get('unitId')
    if (unitId) {
      currentUnit = { id: unitId, name: m.unitMembers() }
    }
    loadMembers()
  })

  $effect(() => {
    if ($activeOrg?.id) loadMembers()
  })
</script>

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.unitMembers()}</h1>
    {#if currentUnit}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-folder2 me-1"></i>{currentUnit.name}
      </small>
    {/if}
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50 ms-2">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  <div class="d-flex gap-2">
    <button
      class="btn btn-outline-danger btn-sm"
      class:disabled={selectedUserIds.length === 0}
      disabled={selectedUserIds.length === 0}
      onclick={openRemoveModal}
    >
      <i class="bi bi-person-dash me-1"></i>
      {m.unitMembersRemoveBtn()} ({selectedUserIds.length})
    </button>
    <a href="/orgs/units" class="btn btn-outline-secondary btn-sm">
      <i class="bi bi-arrow-left me-1"></i>
      {m.unitMembersBackBtn()}
    </a>
  </div>
</div>

<!-- Loading state -->
{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>

  <!-- Error state -->
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>
    {error}
    <button class="btn btn-sm btn-danger ms-2" onclick={loadMembers}>
      {m.actionRefresh()}
    </button>
  </div>

  <!-- No active org -->
{:else if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()} <a href="/orgs">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>

  <!-- Empty state -->
{:else if members.length === 0}
  <div class="text-center py-5">
    <i class="bi bi-people fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
    <p class="text-inverse text-opacity-50">{m.unitMembersNoRecords()}</p>
  </div>

  <!-- Members table -->
{:else}
  <div class="card">
    <!-- Search -->
    <div class="card-header p-3">
      <div class="input-group">
        <span class="input-group-text">
          <i class="bi bi-search"></i>
        </span>
        <input
          type="text"
          class="form-control"
          placeholder={m.unitMembersSearchPlaceholder()}
          bind:value={search}
          onkeydown={(e) => {
            if (e.key === 'Enter') handleSearch()
          }}
        />
        <button class="btn btn-outline-secondary" onclick={handleSearch}>
          {m.actionSearch()}
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-responsive">
      <table class="table table-hover table-striped table-striped-theme mb-0">
        <thead>
          <tr>
            <th class="w-10" style="width: 40px">
              <input
                type="checkbox"
                class="form-check-input"
                checked={selectedUserIds.length === members.length && members.length > 0}
                onchange={toggleSelectAll}
              />
            </th>
            <th>Name</th>
            <th>Email</th>
            <th>Roles</th>
          </tr>
        </thead>
        <tbody>
          {#each members as member (member.userId)}
            <tr>
              <td>
                <input
                  type="checkbox"
                  class="form-check-input"
                  checked={selectedUserIds.includes(member.userId)}
                  onchange={() => toggleSelectUser(member.userId)}
                />
              </td>
              <td>
                <span class="fw-semibold">{member.name}</span>
              </td>
              <td>
                {#if member.email}
                  <a href="mailto:{member.email}" class="text-theme">
                    {member.email}
                  </a>
                {:else}
                  <span class="text-muted">-</span>
                {/if}
              </td>
              <td>
                {#if member.roles?.length}
                  {#each member.roles as role, i}
                    <span class="badge bg-secondary me-1">{role}</span>
                  {/each}
                {:else}
                  <span class="text-muted">-</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if total > limit}
      <div class="card-footer">
        <div class="d-flex align-items-center justify-content-between">
          <small class="text-muted">
            {m.showing()}{(currentPage - 1) * limit + 1}-{Math.min(
              currentPage * limit,
              total
            )}
            {m.of()}{total}
          </small>
          <nav aria-label="Page navigation">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" class:disabled={currentPage === 1}>
                <button
                  class="page-link"
                  onclick={() => handlePageChange(currentPage - 1)}
                  aria-label={m.actionPrevPage() || 'Previous page'}
                >
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>
              {#each Array(Math.ceil(total / limit)) as _, i}
                {@const pageNum = i + 1}
                {@const isActive = currentPage === pageNum}
                {#if pageNum === 1 || pageNum === Math.ceil(total / limit) || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)}
                  <li class="page-item" class:active={isActive}>
                    <button
                      class="page-link"
                      class:bg-theme={isActive}
                      onclick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                {:else if pageNum === currentPage - 2 || pageNum === currentPage + 2}
                  <li class="page-item disabled">
                    <span class="page-link">...</span>
                  </li>
                {/if}
              {/each}
              <li
                class="page-item"
                class:disabled={currentPage >= Math.ceil(total / limit)}
              >
                <button
                  class="page-link"
                  onclick={() => handlePageChange(currentPage + 1)}
                  aria-label={m.actionNextPage() || 'Next page'}
                >
                  <i class="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- Remove Modal -->
{#if showRemoveModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal'))
        closeRemoveModal()
    }}
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.unitMembersRemoveConfirm()}</h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={closeRemoveModal}
          ></button>
        </div>

        <div class="modal-body">
          {#if removeError}
            <div class="alert alert-danger small py-2">{removeError}</div>
          {/if}

          <p class="mb-0">{m.unitMembersRemoveConfirmDesc()}</p>
          <p class="text-danger mt-2 mb-0">
            <strong>{selectedUserIds.length}</strong>
            {m.usersSelected()}
          </p>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={closeRemoveModal}
            disabled={removeLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-danger"
            onclick={handleRemove}
            disabled={removeLoading}
          >
            {#if removeLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              {m.actionSubmitting()}
            {:else}
              {m.actionRemove()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
