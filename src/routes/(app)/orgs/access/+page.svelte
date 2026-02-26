<!-- src/routes/(app)/orgs/access/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { getMyTargetAccess, getMyMenuAccess } from '$lib/api/permission'
  import type { AccessEntry } from '$lib/api/permission'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import CardHeader from '$lib/components/bootstrap/CardHeader.svelte'

  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let targetAccess = $state<AccessEntry[]>([])
  let menuAccess = $state<AccessEntry[]>([])

  async function loadAccess() {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const [ta, ma] = await Promise.all([
        getMyTargetAccess(orgId),
        getMyMenuAccess(orgId)
      ])
      targetAccess = ta
      menuAccess = ma
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  onMount(() => {
    setPageTitle(m.accessTitle())
    loadAccess()
  })

  $effect(() => {
    if ($activeOrg?.id) loadAccess()
  })
</script>

<!-- Header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.accessTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  <button
    class="btn btn-outline-secondary btn-sm"
    onclick={loadAccess}
    disabled={!$activeOrg || loading}
    title={m.actionRefresh()}
  >
    <i class="bi bi-arrow-clockwise" class:spinning={loading}></i>
  </button>
</div>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()}
    <a href={resolve('/orgs', {})} class="alert-link">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>
{:else if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={loadAccess}>{m.actionRefresh()}</button>
  </div>
{:else}
  <div class="row g-3">
    <!-- Delivery Targets Access -->
    <div class="col-md-6">
      <Card class="h-100">
        <CardHeader>
          <div class="fw-bold small">
            <i class="bi bi-send me-2"></i>
            {m.accessTargets()}
            <span class="badge bg-theme ms-2">{targetAccess.length}</span>
          </div>
        </CardHeader>
        <CardBody class="p-0">
          {#if targetAccess.length === 0}
            <div class="text-center py-4">
              <p class="text-inverse text-opacity-50 small mb-0">
                {m.accessNoTargets()}
              </p>
            </div>
          {:else}
            <ul class="list-group list-group-flush">
              {#each targetAccess as entry}
                <li class="list-group-item bg-transparent d-flex align-items-center gap-2">
                  <i class="bi bi-send text-theme"></i>
                  <span class="flex-grow-1">{entry.name}</span>
                  {#if entry.type}
                    <span class="badge bg-inverse bg-opacity-15 text-inverse">
                      {entry.type}
                    </span>
                  {/if}
                  {#if entry.relation}
                    <span class="badge bg-theme bg-opacity-25 text-theme">
                      {entry.relation}
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </CardBody>
      </Card>
    </div>

    <!-- Menu Access -->
    <div class="col-md-6">
      <Card class="h-100">
        <CardHeader>
          <div class="fw-bold small">
            <i class="bi bi-grid me-2"></i>
            {m.accessMenus()}
            <span class="badge bg-theme ms-2">{menuAccess.length}</span>
          </div>
        </CardHeader>
        <CardBody class="p-0">
          {#if menuAccess.length === 0}
            <div class="text-center py-4">
              <p class="text-inverse text-opacity-50 small mb-0">
                {m.accessNoMenus()}
              </p>
            </div>
          {:else}
            <ul class="list-group list-group-flush">
              {#each menuAccess as entry}
                <li class="list-group-item bg-transparent d-flex align-items-center gap-2">
                  <i class="bi bi-menu-button text-theme"></i>
                  <span class="flex-grow-1">{entry.name}</span>
                  {#if entry.relation}
                    <span class="badge bg-theme bg-opacity-25 text-theme">
                      {entry.relation}
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </CardBody>
      </Card>
    </div>
  </div>
{/if}

<style>
  @keyframes spin {
    from { transform: rotate(0deg) }
    to   { transform: rotate(360deg) }
  }
  .spinning {
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
</style>
