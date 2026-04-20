<!-- src/routes/(app)/workspaces/access/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspace, activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import { resolve } from '$app/paths'
  import type { WorkspaceMemberRole } from '$lib/types/workspace'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import CardHeader from '$lib/components/bootstrap/CardHeader.svelte'

  type Role = WorkspaceMemberRole

  const allRoles: Role[] = ['owner', 'admin', 'operator', 'viewer']

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

  onMount(() => setPageTitle(m.navWorkspaceAccess()))
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.navWorkspaceAccess()}</h1>
    {#if $activeWorkspace}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-grid me-1"></i>{$activeWorkspace.name}
      </small>
    {/if}
  </div>
</div>

{#if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()}
    <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
  </div>
{:else}
  <div class="row g-3">
    <!-- Current Role Card -->
    <div class="col-md-4">
      <Card class="h-100">
        <CardHeader>
          <div class="fw-bold small">
            <i class="bi bi-person-badge me-2"></i>
            {m.workspaceMembersTableRole()}
          </div>
        </CardHeader>
        <CardBody>
          <div class="text-center py-3">
            <p class="text-inverse text-opacity-50 small mb-2">{m.workspaceTitle()}</p>
            <h4 class="mb-1 fw-bold">{$activeWorkspace?.name ?? '-'}</h4>
            <p class="text-inverse text-opacity-50 small mb-3">{m.workspaceMembersTableRole()}</p>
            <span class="badge fs-6 px-3 py-2 rounded-pill bg-secondary">
              {m.roleViewer()}
            </span>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Permissions Matrix Card -->
    <div class="col-md-8">
      <Card class="h-100">
        <CardHeader>
          <div class="fw-bold small">
            <i class="bi bi-shield-check me-2"></i>
            {m.workspaceRolesTitle()}
          </div>
        </CardHeader>
        <CardBody class="p-0">
          <div class="table-responsive">
            <table class="table table-sm table-bordered mb-0 align-middle">
              <thead>
                <tr>
                  <th class="small">{m.workspaceRolesTitle()}</th>
                  {#each allRoles as role}
                    <th class="text-center small">
                      <span class="badge {getRoleBadgeClass(role)}">{getRoleLabel(role)}</span>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each permissions as perm}
                  <tr>
                    <td class="small">{perm.label()}</td>
                    {#each allRoles as role}
                      <td class="text-center">
                        {#if perm.roles.includes(role)}
                          <i class="bi bi-check-circle-fill text-theme"></i>
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
        </CardBody>
      </Card>
    </div>
  </div>
{/if}
