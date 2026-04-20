<!-- src/routes/(app)/workspaces/roles/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspace } from '$lib/stores/activeWorkspace'

  const roles = ['owner', 'admin', 'operator', 'viewer'] as const

  type Role = typeof roles[number]

  const permissions: { key: string; label: () => string; roles: Role[] }[] = [
    { key: 'manageWorkspace', label: () => 'Manage Workspace', roles: ['owner'] },
    { key: 'manageMembers', label: () => 'Manage Members', roles: ['owner', 'admin'] },
    { key: 'manageAssets', label: () => 'Manage Assets', roles: ['owner', 'admin'] },
    { key: 'manageSources', label: () => 'Manage Sources', roles: ['owner', 'admin'] },
    { key: 'managePipelines', label: () => 'Manage Pipelines', roles: ['owner', 'admin', 'operator'] },
    { key: 'manageDeliveryTargets', label: () => 'Manage Delivery Targets', roles: ['owner', 'admin'] },
    { key: 'viewEvents', label: () => 'View Events', roles: ['owner', 'admin', 'operator', 'viewer'] }
  ]

  function getRoleLabel(role: Role): string {
    switch (role) {
      case 'owner': return m.roleOwner()
      case 'admin': return m.roleAdmin()
      case 'operator': return m.roleOperator()
      case 'viewer': return m.roleViewer()
      default: return role
    }
  }

  function getRoleBadgeClass(role: Role): string {
    switch (role) {
      case 'owner': return 'bg-danger'
      case 'admin': return 'bg-theme'
      case 'operator': return 'bg-warning text-dark'
      case 'viewer': return 'bg-secondary'
      default: return 'bg-secondary'
    }
  }

  onMount(() => setPageTitle(m.workspaceRolesTitle()))
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <div class="d-flex align-items-center gap-2 mb-1">
      {#if $activeWorkspace}
        <span class="badge bg-theme bg-opacity-15 border border-theme text-theme fw-normal px-2 py-1">
          {$activeWorkspace.name}
        </span>
        <i class="bi bi-chevron-right text-inverse text-opacity-25 small"></i>
      {/if}
      <h1 class="page-header mb-0">{m.workspaceRolesTitle()}</h1>
    </div>
    <p class="text-inverse text-opacity-50 small mt-1 mb-0">{m.workspaceRolesDesc()}</p>
  </div>
</div>

<div class="card">
  <div class="table-responsive">
    <table class="table table-bordered mb-0 align-middle">
      <thead>
        <tr class="table-dark">
          <th style="min-width: 200px">{m.workspaceRolesTitle()}</th>
          {#each roles as role}
            <th class="text-center">
              <span class="badge rounded-pill {getRoleBadgeClass(role)}">
                {getRoleLabel(role)}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each permissions as perm}
          <tr>
            <td class="fw-semibold small">{perm.label()}</td>
            {#each roles as role}
              <td class="text-center">
                {#if perm.roles.includes(role)}
                  <i class="bi bi-check-circle-fill text-theme fs-5"></i>
                {:else}
                  <span class="text-inverse text-opacity-25">-</span>
                {/if}
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
