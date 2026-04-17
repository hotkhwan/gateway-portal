<!-- src/routes/(app)/workspaces/members/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import {
    listWorkspaceMembers,
    inviteWorkspaceUsers,
    removeWorkspaceMembers,
    inviteWorkspaceMemberByEmail,
    changeWorkspaceMemberRole
  } from '$lib/api/workspace'
  import { listUsers } from '$lib/api/user'
  import type { WorkspaceMember, WorkspaceMemberRole } from '$lib/types/workspace'
  import type { PaginatedResponse } from '$lib/types/org'
  import type {
    User,
    PaginatedResponse as UserPaginatedResponse
  } from '$lib/types/user'
  import { resolve } from '$app/paths'

  const roles: WorkspaceMemberRole[] = ['owner', 'admin', 'operator', 'viewer']

  let loading = $state(true)
  let error = $state<string | null>(null)
  let members = $state<WorkspaceMember[]>([])
  let total = $state(0)
  let page = $state(1)
  let limit = $state(10)
  let search = $state('')
  let sortField = $state('role')
  let sortOrder = $state<'asc' | 'desc'>('desc')

  // Invite modal state
  let showInviteModal = $state(false)
  let inviteLoading = $state(false)
  let inviteError = $state<string | null>(null)
  let inviteMode = $state<'existing' | 'email'>('email')
  let inviteUsers = $state<{ userId: string; role: WorkspaceMemberRole }[]>([
    { userId: '', role: 'viewer' }
  ])
  let emailInvites = $state<{ email: string; role: WorkspaceMemberRole }[]>([
    { email: '', role: 'viewer' }
  ])

  // User picker state
  let showUserPickerModal = $state(false)
  let usersLoading = $state(false)
  let usersError = $state<string | null>(null)
  let allUsers = $state<User[]>([])
  let userSearch = $state('')
  let selectedInviteIndex = $state(0)

  // Remove modal state
  let showRemoveModal = $state(false)
  let removeLoading = $state(false)
  let removeError = $state<string | null>(null)
  let selectedUserIds = $state<string[]>([])

  // Change role state
  let changingRoleUserId = $state<string | null>(null)

  async function loadMembers() {
    loading = true
    error = null
    try {
      if (!$activeWorkspaceId) {
        error = m.workspaceSelectPre() + ' ' + m.navWorkspaces() + ' ' + m.workspaceSelectPost()
        return
      }
      const result = await listWorkspaceMembers($activeWorkspaceId, {
        page,
        perPage: limit,
        search: search || undefined,
        sortField,
        sortOrder
      })
      members = result.items ?? []
      total = result.total ?? 0
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function handleSearch() {
    page = 1
    loadMembers()
  }

  function handleSort(field: string) {
    if (sortField === field) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
    } else {
      sortField = field
      sortOrder = 'asc'
    }
    loadMembers()
  }

  function handlePageChange(newPage: number) {
    page = newPage
    loadMembers()
  }

  // Invite users
  function openInviteModal() {
    inviteUsers = [{ userId: '', role: 'viewer' }]
    emailInvites = [{ email: '', role: 'viewer' }]
    inviteError = null
    inviteMode = 'email'
    showInviteModal = true
  }

  function closeInviteModal() {
    showInviteModal = false
  }

  function addInviteRow() {
    if (inviteMode === 'existing') {
      inviteUsers = [...inviteUsers, { userId: '', role: 'viewer' }]
    } else {
      emailInvites = [...emailInvites, { email: '', role: 'viewer' }]
    }
  }

  function removeInviteRow(index: number) {
    if (inviteMode === 'existing') {
      inviteUsers = inviteUsers.filter((_, i) => i !== index)
    } else {
      emailInvites = emailInvites.filter((_, i) => i !== index)
    }
  }

  async function handleInvite() {
    if (!$activeWorkspaceId) return

    inviteLoading = true
    inviteError = null
    try {
      if (inviteMode === 'existing') {
        const invalidRow = inviteUsers.find((u) => !u.userId.trim())
        if (invalidRow) {
          inviteError = m.workspaceMembersInviteUserIdsRequired()
          return
        }
        await inviteWorkspaceUsers($activeWorkspaceId, inviteUsers)
      } else {
        const invalidRow = emailInvites.find((u) => !u.email.trim())
        if (invalidRow) {
          inviteError = m.workspaceMembersInviteEmailsRequired()
          return
        }
        for (const invite of emailInvites) {
          await inviteWorkspaceMemberByEmail($activeWorkspaceId, invite.email, invite.role)
        }
      }
      closeInviteModal()
      await loadMembers()
    } catch (e: unknown) {
      inviteError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      inviteLoading = false
    }
  }

  // User picker functions
  function openUserPicker(index: number) {
    selectedInviteIndex = index
    userSearch = ''
    showUserPickerModal = true
    loadUsers()
  }

  function closeUserPickerModal() {
    showUserPickerModal = false
    userSearch = ''
  }

  async function loadUsers() {
    usersLoading = true
    usersError = null
    try {
      const result: UserPaginatedResponse<User> = await listUsers({
        page: 1,
        perPage: 100,
        sortOrder: 'desc',
        search: userSearch || undefined
      })
      allUsers = result.items ?? []
    } catch (e: unknown) {
      usersError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      usersLoading = false
    }
  }

  function handleUserSearch() {
    loadUsers()
  }

  function selectUser(userId: string) {
    inviteUsers = inviteUsers.map((u, i) =>
      i === selectedInviteIndex ? { ...u, userId } : u
    )
    closeUserPickerModal()
  }

  function getUserDisplayNameFromUser(user: User) {
    if (user.fullName) return user.fullName
    if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`
    if (user.firstName) return user.firstName
    if (user.email) return user.email
    return user.id
  }

  // Remove users
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
      selectedUserIds = members.map((mbr) => mbr.userId)
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
    if (!$activeWorkspaceId || selectedUserIds.length === 0) return

    removeLoading = true
    removeError = null
    try {
      await removeWorkspaceMembers($activeWorkspaceId, selectedUserIds)
      closeRemoveModal()
      selectedUserIds = []
      await loadMembers()
    } catch (e: unknown) {
      removeError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      removeLoading = false
    }
  }

  async function handleChangeRole(userId: string, newRole: WorkspaceMemberRole) {
    if (!$activeWorkspaceId) return
    changingRoleUserId = userId
    try {
      await changeWorkspaceMemberRole($activeWorkspaceId, userId, newRole)
      await loadMembers()
    } catch (e: unknown) {
      console.error('Failed to change role:', e)
    } finally {
      changingRoleUserId = null
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  function getUserDisplayName(member: WorkspaceMember) {
    if (member.fullName) return member.fullName
    if (member.firstName && member.lastName) return `${member.firstName} ${member.lastName}`
    if (member.firstName) return member.firstName
    if (member.email) return member.email
    return member.userId
  }

  function getSortIcon(field: string) {
    if (sortField !== field) return 'bi-dash-lg text-opacity-25'
    return sortOrder === 'asc' ? 'bi-sort-up-alt' : 'bi-sort-down'
  }

  function getRoleBadgeClass(role: WorkspaceMemberRole) {
    switch (role) {
      case 'owner': return 'bg-danger'
      case 'admin': return 'bg-theme'
      case 'operator': return 'bg-warning text-dark'
      case 'viewer': return 'bg-secondary'
      default: return 'bg-secondary'
    }
  }

  function getRoleLabel(role: WorkspaceMemberRole) {
    switch (role) {
      case 'owner': return m.roleOwner()
      case 'admin': return m.roleAdmin()
      case 'operator': return m.roleOperator()
      case 'viewer': return m.roleViewer()
      default: return role
    }
  }

  // Reload members when active workspace changes
  $effect(() => {
    if ($activeWorkspaceId) {
      page = 1
      sortField = 'role'
      sortOrder = 'desc'
      loadMembers()
    }
  })

  onMount(() => {
    setPageTitle(m.workspaceMembersTitle())
  })
</script>

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.workspaceMembersTitle()}</h1>
  </div>
  <div class="d-flex gap-2">
    <button
      class="btn btn-outline-danger btn-sm"
      class:disabled={selectedUserIds.length === 0}
      disabled={selectedUserIds.length === 0}
      onclick={openRemoveModal}
    >
      <i class="bi bi-person-dash me-1"></i>
      {m.workspaceMembersRemoveBtn()} ({selectedUserIds.length})
    </button>
    <button class="btn btn-outline-theme btn-sm" onclick={openInviteModal}>
      <i class="bi bi-person-plus me-1"></i>
      {m.workspaceMembersInviteBtn()}
    </button>
  </div>
</div>

<!-- Loading state -->
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadMembers}>
      {m.actionRefresh()}
    </button>
  </div>

{:else if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()} <a href={resolve('/workspaces')}>{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
  </div>

{:else if members.length === 0}
  <div class="text-center py-5">
    <i class="bi bi-people fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
    <p class="text-inverse text-opacity-50">{m.workspaceMembersNoRecords()}</p>
    <button class="btn btn-outline-theme" onclick={openInviteModal}>
      <i class="bi bi-person-plus me-1"></i>
      {m.workspaceMembersInviteBtn()}
    </button>
  </div>

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
          placeholder={m.workspaceMembersSearchPlaceholder()}
          bind:value={search}
          onkeydown={(e) => { if (e.key === 'Enter') handleSearch() }}
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
            <th style="width: 40px">
              <input
                type="checkbox"
                class="form-check-input"
                checked={selectedUserIds.length === members.length && members.length > 0}
                onchange={toggleSelectAll}
              />
            </th>
            <th class="cursor-pointer" onclick={() => handleSort('name')}>
              {m.workspaceMembersTableName()} <i class="bi {getSortIcon('name')}"></i>
            </th>
            <th class="cursor-pointer" onclick={() => handleSort('email')}>
              {m.workspaceMembersTableEmail()} <i class="bi {getSortIcon('email')}"></i>
            </th>
            <th class="cursor-pointer" onclick={() => handleSort('role')}>
              {m.workspaceMembersTableRole()} <i class="bi {getSortIcon('role')}"></i>
            </th>
            <th class="cursor-pointer" onclick={() => handleSort('enabled')}>
              {m.workspaceMembersTableStatus()} <i class="bi {getSortIcon('enabled')}"></i>
            </th>
            <th class="cursor-pointer" onclick={() => handleSort('joinedAt')}>
              {m.workspaceMembersTableJoined()} <i class="bi {getSortIcon('joinedAt')}"></i>
            </th>
            <th></th>
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
                <span class="fw-semibold">{getUserDisplayName(member)}</span>
              </td>
              <td>
                {#if member.email}
                  <a href="mailto:{member.email}" class="text-theme">{member.email}</a>
                {:else}
                  <span class="text-muted">-</span>
                {/if}
              </td>
              <td>
                <span class="badge rounded-pill {getRoleBadgeClass(member.role)}">
                  {getRoleLabel(member.role)}
                </span>
              </td>
              <td>
                <span
                  class="badge rounded-pill"
                  class:bg-success={member.enabled}
                  class:bg-secondary={!member.enabled}
                >
                  {member.enabled
                    ? m.workspaceMembersStatusEnabled()
                    : m.workspaceMembersStatusDisabled()}
                </span>
              </td>
              <td>
                {#if member.joinedAt}
                  <small class="text-muted">{formatDate(member.joinedAt)}</small>
                {:else}
                  <span class="text-muted">-</span>
                {/if}
              </td>
              <td>
                <!-- Change role dropdown -->
                <div class="dropdown">
                  <button
                    class="btn btn-sm btn-outline-secondary dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    disabled={changingRoleUserId === member.userId}
                    title={m.workspaceMembersChangeRole()}
                  >
                    {#if changingRoleUserId === member.userId}
                      <span class="spinner-border spinner-border-sm" role="status"></span>
                    {:else}
                      <i class="bi bi-person-gear"></i>
                    {/if}
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    {#each roles as role}
                      <li>
                        <button
                          class="dropdown-item d-flex align-items-center gap-2"
                          class:fw-bold={member.role === role}
                          onclick={() => handleChangeRole(member.userId, role)}
                        >
                          {#if member.role === role}
                            <i class="bi bi-check-circle-fill text-theme"></i>
                          {:else}
                            <i class="bi bi-circle text-inverse text-opacity-25"></i>
                          {/if}
                          <span class="badge {getRoleBadgeClass(role)}">{getRoleLabel(role)}</span>
                        </button>
                      </li>
                    {/each}
                  </ul>
                </div>
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
            {m.showing()}{(page - 1) * limit + 1}-{Math.min(page * limit, total)}
            {m.of()}{total}
          </small>
          <nav aria-label="Page navigation">
            <ul class="pagination pagination-sm mb-0">
              <li class="page-item" class:disabled={page === 1}>
                <button
                  class="page-link"
                  onclick={() => handlePageChange(page - 1)}
                  aria-label={m.actionPrevPage() || 'Previous page'}
                >
                  <i class="bi bi-chevron-left"></i>
                </button>
              </li>
              {#each Array(Math.ceil(total / limit)) as _, i}
                {@const pageNum = i + 1}
                {@const isActive = page === pageNum}
                {#if pageNum === 1 || pageNum === Math.ceil(total / limit) || (pageNum >= page - 1 && pageNum <= page + 1)}
                  <li class="page-item" class:active={isActive}>
                    <button
                      class="page-link"
                      class:bg-theme={isActive}
                      onclick={() => handlePageChange(pageNum)}
                    >
                      {pageNum}
                    </button>
                  </li>
                {:else if pageNum === page - 2 || pageNum === page + 2}
                  <li class="page-item disabled">
                    <span class="page-link">...</span>
                  </li>
                {/if}
              {/each}
              <li class="page-item" class:disabled={page >= Math.ceil(total / limit)}>
                <button
                  class="page-link"
                  onclick={() => handlePageChange(page + 1)}
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

<!-- Invite Modal -->
{#if showInviteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.workspaceMembersInviteModalTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={closeInviteModal}></button>
        </div>

        <div class="modal-body">
          {#if inviteError}
            <div class="alert alert-danger small py-2">{inviteError}</div>
          {/if}

          <p class="text-muted small mb-3">{m.workspaceMembersInviteModalDesc()}</p>

          <!-- Tabs -->
          <ul class="nav nav-tabs mb-3" role="tablist">
            <li class="nav-item" role="presentation">
              <button
                class="nav-link"
                class:active={inviteMode === 'email'}
                onclick={() => (inviteMode = 'email')}
                type="button"
                role="tab"
                aria-selected={inviteMode === 'email'}
              >
                <i class="bi bi-envelope me-1"></i>
                {m.workspaceMembersInviteTabEmail()}
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button
                class="nav-link"
                class:active={inviteMode === 'existing'}
                onclick={() => (inviteMode = 'existing')}
                type="button"
                role="tab"
                aria-selected={inviteMode === 'existing'}
              >
                <i class="bi bi-person-video2 me-1"></i>
                {m.workspaceMembersInviteTabExisting()}
              </button>
            </li>
          </ul>

          <!-- Email Invite Tab -->
          {#if inviteMode === 'email'}
            <h6 class="mb-3 fw-semibold">{m.workspaceMembersInviteByEmail()}</h6>
            <div class="vstack gap-2" role="group" aria-label="Email invites">
              {#each emailInvites as invite, index}
                <div class="input-group">
                  <input
                    type="email"
                    class="form-control"
                    placeholder={m.workspaceMembersInviteEmailPlaceholder()}
                    bind:value={invite.email}
                    disabled={inviteLoading}
                  />
                  <select class="form-select" style="width: 130px" bind:value={invite.role} disabled={inviteLoading}>
                    {#each roles as role}
                      <option value={role}>{getRoleLabel(role)}</option>
                    {/each}
                  </select>
                  {#if emailInvites.length > 1}
                    <button
                      class="btn btn-outline-danger"
                      onclick={() => removeInviteRow(index)}
                      disabled={inviteLoading}
                      aria-label={m.actionRemove() || 'Remove email'}
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  {/if}
                </div>
              {/each}

              <button
                class="btn btn-sm btn-outline-secondary align-self-start"
                onclick={addInviteRow}
                disabled={inviteLoading}
              >
                <i class="bi bi-plus-lg me-1"></i>
                {m.workspaceMembersInviteAddEmail()}
              </button>
            </div>
          {:else}
            <!-- Existing Users Tab -->
            <h6 class="mb-3 fw-semibold">{m.workspaceMembersInviteSelectExisting()}</h6>
            <div class="vstack gap-2" role="group" aria-label={m.workspaceMembersInviteRoleLabel()}>
              {#each inviteUsers as user, index}
                <div class="input-group">
                  <input
                    type="text"
                    class="form-control"
                    placeholder={m.workspaceMembersInviteUserIdPlaceholder()}
                    bind:value={user.userId}
                    disabled={inviteLoading}
                    readonly
                  />
                  <button
                    class="btn btn-outline-secondary"
                    type="button"
                    onclick={() => openUserPicker(index)}
                    disabled={inviteLoading}
                    title={m.workspaceMembersInviteSelectUser()}
                  >
                    <i class="bi bi-person-video2"></i>
                  </button>
                  <select class="form-select" style="width: 130px" bind:value={user.role} disabled={inviteLoading}>
                    {#each roles as role}
                      <option value={role}>{getRoleLabel(role)}</option>
                    {/each}
                  </select>
                  {#if inviteUsers.length > 1}
                    <button
                      class="btn btn-outline-danger"
                      onclick={() => removeInviteRow(index)}
                      disabled={inviteLoading}
                      aria-label={m.actionRemove() || 'Remove user'}
                    >
                      <i class="bi bi-trash"></i>
                    </button>
                  {/if}
                </div>
              {/each}

              <button
                class="btn btn-sm btn-outline-secondary align-self-start"
                onclick={addInviteRow}
                disabled={inviteLoading}
              >
                <i class="bi bi-plus-lg me-1"></i>
                {m.workspaceMembersInviteAddRow()}
              </button>
            </div>
          {/if}
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeInviteModal} disabled={inviteLoading}>
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-theme"
            onclick={handleInvite}
            disabled={inviteLoading ||
              (inviteMode === 'email'
                ? emailInvites.every((e) => !e.email.trim())
                : inviteUsers.every((u) => !u.userId.trim()))}
          >
            {#if inviteLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {m.actionSubmitting()}
            {:else}
              {m.workspaceMembersInviteBtn()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Remove Modal -->
{#if showRemoveModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.workspaceMembersRemoveConfirmTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={closeRemoveModal}></button>
        </div>

        <div class="modal-body">
          {#if removeError}
            <div class="alert alert-danger small py-2">{removeError}</div>
          {/if}
          <p class="mb-0">{m.workspaceMembersRemoveConfirmDesc()}</p>
          <p class="text-danger mt-2 mb-0">
            <strong>{selectedUserIds.length}</strong>
            {m.usersSelected()}
          </p>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeRemoveModal} disabled={removeLoading}>
            {m.actionCancel()}
          </button>
          <button type="button" class="btn btn-danger" onclick={handleRemove} disabled={removeLoading}>
            {#if removeLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {m.actionSubmitting()}
            {:else}
              {m.workspaceMembersRemoveBtn()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- User Picker Modal -->
{#if showUserPickerModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.workspaceMembersPickerTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={closeUserPickerModal}></button>
        </div>

        <div class="modal-body">
          {#if usersError}
            <div class="alert alert-danger small py-2">{usersError}</div>
          {/if}

          <div class="mb-3">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder={m.workspaceMembersPickerSearchPlaceholder()}
                bind:value={userSearch}
                onkeydown={(e) => { if (e.key === 'Enter') handleUserSearch() }}
              />
              <button class="btn btn-outline-secondary" onclick={handleUserSearch}>
                {m.actionSearch()}
              </button>
            </div>
          </div>

          <div class="list-group list-group-flush" style="max-height: 300px; overflow-y: auto;">
            {#if usersLoading}
              <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-theme" role="status">
                  <span class="visually-hidden">{m.actionLoading()}</span>
                </div>
              </div>
            {:else if allUsers.length === 0}
              <div class="text-center py-3 text-muted">{m.workspaceMembersPickerNoResults()}</div>
            {:else}
              {#each allUsers as user (user.id)}
                <button
                  class="list-group-item list-group-item-action d-flex align-items-center"
                  onclick={() => selectUser(user.id)}
                >
                  <div class="flex-grow-1 text-start">
                    <div class="fw-semibold">{getUserDisplayNameFromUser(user)}</div>
                    {#if user.email}
                      <div class="small text-muted">{user.email}</div>
                    {/if}
                  </div>
                  <i class="bi bi-chevron-right text-muted"></i>
                </button>
              {/each}
            {/if}
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={closeUserPickerModal}>
            {m.actionCancel()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
