<!-- src/routes/(app)/orgs/units/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    getUnitTree,
    createUnit,
    updateUnit,
    deleteUnit
  } from '$lib/api/orgunit'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type { OrgUnit } from '$lib/types/org'

  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let tree = $state<OrgUnit[]>([])

  // Modal state
  let showModal = $state(false)
  let editUnit = $state<OrgUnit | null>(null)
  let parentForNew = $state<OrgUnit | null>(null)
  let modalLoading = $state(false)
  let modalError = $state<string | null>(null)
  let fName = $state('')

  // Delete state
  let showDeleteModal = $state(false)
  let deleteUnitItem = $state<OrgUnit | null>(null)
  let deleteLoading = $state(false)

  // Flatten tree for parent selector
  function flattenTree(nodes: OrgUnit[], depth = 0): Array<{ unit: OrgUnit; depth: number }> {
    const result: Array<{ unit: OrgUnit; depth: number }> = []
    for (const node of nodes) {
      result.push({ unit: node, depth })
      if (node.children?.length) {
        result.push(...flattenTree(node.children, depth + 1))
      }
    }
    return result
  }

  async function loadTree() {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      tree = await getUnitTree(orgId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openCreate(parent: OrgUnit | null = null) {
    editUnit = null
    parentForNew = parent
    fName = ''
    modalError = null
    showModal = true
  }

  function openEdit(unit: OrgUnit) {
    editUnit = unit
    parentForNew = null
    fName = unit.name
    modalError = null
    showModal = true
  }

  async function handleSave() {
    const orgId = $activeOrg?.id
    if (!orgId || !fName.trim()) return
    modalLoading = true
    modalError = null
    try {
      if (editUnit) {
        await updateUnit(orgId, editUnit.id, { name: fName.trim() })
      } else {
        await createUnit(orgId, {
          name: fName.trim(),
          parentId: parentForNew?.id ?? null
        })
      }
      await loadTree()
      showModal = false
    } catch (e: unknown) {
      modalError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      modalLoading = false
    }
  }

  function confirmDelete(unit: OrgUnit) {
    deleteUnitItem = unit
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteUnitItem) return
    deleteLoading = true
    try {
      await deleteUnit(orgId, deleteUnitItem.id)
      await loadTree()
      showDeleteModal = false
      deleteUnitItem = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  onMount(() => {
    setPageTitle(m.unitTitle())
    loadTree()
  })

  $effect(() => {
    if ($activeOrg?.id) loadTree()
  })
</script>

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.unitTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  <button
    class="btn btn-outline-theme btn-sm"
    onclick={() => openCreate(null)}
    disabled={!$activeOrg}
  >
    <i class="bi bi-plus-lg me-1"></i>
    {m.unitCreateBtn()}
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadTree}>{m.actionRefresh()}</button>
  </div>
{:else if tree.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-diagram-3 fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50">{m.unitNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={() => openCreate(null)}>
          <i class="bi bi-plus-lg me-1"></i>{m.unitCreateBtn()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <Card>
    <CardBody class="p-0">
      {@render UnitTreeNode({ nodes: tree, openCreate, openEdit, confirmDelete })}
    </CardBody>
  </Card>
{/if}

<!-- Create/Edit Modal -->
{#if showModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal')) showModal = false
    }}
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {editUnit ? m.unitEditTitle() : m.unitCreateTitle()}
            {#if parentForNew}
              <small class="text-inverse text-opacity-50 fw-normal ms-2">
                {m.unitCreateUnder({ name: parentForNew.name })}
              </small>
            {/if}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={() => (showModal = false)}
          ></button>
        </div>
        <form onsubmit={(e) => { e.preventDefault(); handleSave() }}>
          <div class="modal-body">
            {#if modalError}
              <div class="alert alert-danger small py-2">{modalError}</div>
            {/if}
            <div class="mb-3">
              <label class="form-label fw-semibold" for="uName">
                {m.unitName()} <span class="text-danger">*</span>
              </label>
              <input
                id="uName"
                type="text"
                class="form-control"
                placeholder={m.unitNamePlaceholder()}
                bind:value={fName}
                required
                disabled={modalLoading}
              />
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              onclick={() => (showModal = false)}
              disabled={modalLoading}
            >
              {m.actionCancel()}
            </button>
            <button
              type="submit"
              class="btn btn-theme"
              disabled={modalLoading || !fName.trim()}
            >
              {#if modalLoading}
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                {m.actionSubmitting()}
              {:else}
                {editUnit ? m.actionSave() : m.actionCreate()}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete confirm modal -->
{#if showDeleteModal && deleteUnitItem}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {m.unitDeleteConfirm()}
          </h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">
          <strong>"{deleteUnitItem.name}"</strong><br />
          {m.unitDeleteWarning()}
        </div>
        <div class="modal-footer border-0 pt-0">
          <button
            class="btn btn-sm btn-secondary"
            onclick={() => { showDeleteModal = false; deleteUnitItem = null }}
            disabled={deleteLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            class="btn btn-sm btn-danger"
            onclick={handleDelete}
            disabled={deleteLoading}
          >
            {#if deleteLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Tree node component (inline snippet) -->
{#snippet UnitTreeNode(props: {
  nodes: OrgUnit[],
  openCreate: (parent: OrgUnit | null) => void,
  openEdit: (unit: OrgUnit) => void,
  confirmDelete: (unit: OrgUnit) => void
})}
  <ul class="list-unstyled mb-0">
    {#each props.nodes as node (node.id)}
      <li class="border-bottom border-inverse border-opacity-10 last:border-0">
        <div class="d-flex align-items-center px-3 py-2 gap-2">
          <i class="bi bi-folder2 text-theme opacity-75"></i>
          <span class="flex-grow-1 fw-semibold">{node.name}</span>
          {#if node.memberCount !== undefined}
            <span class="badge bg-inverse bg-opacity-15 text-inverse small">
              <i class="bi bi-people me-1"></i>{node.memberCount}
            </span>
          {/if}
          <button
            class="btn btn-xs btn-outline-theme btn-sm py-0 px-2"
            onclick={() => props.openCreate(node)}
            title={m.unitAddChild()}
          >
            <i class="bi bi-plus"></i>
          </button>
          <button
            class="btn btn-xs btn-outline-secondary btn-sm py-0 px-2"
            onclick={() => props.openEdit(node)}
            title={m.actionEdit()}
          >
            <i class="bi bi-pencil"></i>
          </button>
          <button
            class="btn btn-xs btn-outline-danger btn-sm py-0 px-2"
            onclick={() => props.confirmDelete(node)}
            title={m.actionDelete()}
          >
            <i class="bi bi-trash"></i>
          </button>
          <a
            href={resolve('/orgs/units/[unitId]/members', { unitId: node.id })}
            class="btn btn-xs btn-outline-secondary btn-sm py-0 px-2"
            title={m.unitMembers()}
          >
            <i class="bi bi-people"></i>
          </a>
        </div>
        {#if node.children?.length}
          <div class="ps-4 border-start border-inverse border-opacity-10 ms-4">
            {@render UnitTreeNode({ ...props, nodes: node.children })}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}
