<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { goto } from '$app/navigation'
  import {
    getUnitTree,
    getUnitDetails,
    createUnit,
    updateUnit,
    deleteUnit
  } from '$lib/api/orgunit'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type { OrgUnit } from '$lib/types/org'
  import { resolve } from '$app/paths'

  // $state ยังใช้ปกติสำหรับ primitive และ array/object ที่ต้องการ deep reactivity
  let loading = $state(true)
  let error = $state<string | null>(null)
  let tree = $state<OrgUnit[]>([])

  // SvelteMap/SvelteSet แทน Map/Set ธรรมดา เพื่อให้ reactive
  let expandedUnits = new SvelteMap<string, boolean>()
  let loadingChildren = new SvelteSet<string>()
  // เก็บ children ที่โหลดแล้วแยกต่างหาก ไม่ mutate tree โดยตรง
  let childrenCache = new SvelteMap<string, OrgUnit[]>()

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
  let deleteError = $state<string | null>(null)

  async function loadTree() {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }
    loading = true
    error = null
    // Reset state เมื่อ reload tree
    expandedUnits.clear()
    loadingChildren.clear()
    childrenCache.clear()
    try {
      const result = await getUnitTree(orgId)
      tree = result
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  // Toggle ทุก node ได้เสมอ - ไม่ block ถ้าไม่มี child
  async function toggleExpanded(unit: OrgUnit) {
    const isOpen = expandedUnits.get(unit.id) ?? false

    if (isOpen) {
      expandedUnits.set(unit.id, false)
      return
    }

    // ถ้า cache แล้ว แค่ expand เลย ไม่ต้องเรียก API ใหม่
    if (childrenCache.has(unit.id)) {
      expandedUnits.set(unit.id, true)
      return
    }

    // เรียก API
    const orgId = $activeOrg?.id
    if (!orgId) return

    loadingChildren.add(unit.id)
    try {
      const details = await getUnitDetails(orgId, unit.id)
      childrenCache.set(unit.id, details.children ?? [])
      expandedUnits.set(unit.id, true)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loadingChildren.delete(unit.id)
    }
  }

  function getChildren(unit: OrgUnit): OrgUnit[] {
    return childrenCache.get(unit.id) ?? []
  }

  function isExpanded(unit: OrgUnit): boolean {
    return expandedUnits.get(unit.id) ?? false
  }

  function isLoadingChildren(unit: OrgUnit): boolean {
    return loadingChildren.has(unit.id)
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
    deleteError = null // ← reset error ทุกครั้งที่เปิด modal
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteUnitItem) return
    deleteLoading = true
    deleteError = null
    try {
      await deleteUnit(orgId, deleteUnitItem.id)
      showDeleteModal = false // ← ปิดเฉพาะตอน success
      await loadTree()
      deleteUnitItem = null
    } catch (e: unknown) {
      // 409 หรือ error อื่น → แสดงใน modal ไม่ปิด
      const err = e as { message?: string; code?: string }
      deleteError = err?.message ?? m.commonError()
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
    <a href={resolve('/orgs')} class="alert-link">{m.navOrgs()}</a>
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadTree}
      >{m.actionRefresh()}</button
    >
  </div>
{:else if tree.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i
          class="bi bi-diagram-3 fs-1 text-inverse text-opacity-25 d-block mb-3"
        ></i>
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
      {@render UnitTreeNode({ nodes: tree })}
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
      if ((e.target as HTMLElement).classList.contains('modal'))
        showModal = false
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
        <form
          onsubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
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
              disabled={modalLoading}>{m.actionCancel()}</button
            >
            <button
              type="submit"
              class="btn btn-theme"
              disabled={modalLoading || !fName.trim()}
            >
              {#if modalLoading}
                <span
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
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

          <!-- ← แสดง error ใน modal แทนหน้า -->
          {#if deleteError}
            <div class="alert alert-danger py-2 mt-2 mb-0 small">
              <i class="bi bi-x-circle me-1"></i>{deleteError}
            </div>
          {/if}
        </div>
        <div class="modal-footer border-0 pt-0">
          <button
            class="btn btn-sm btn-secondary"
            onclick={() => {
              showDeleteModal = false
              deleteUnitItem = null
              deleteError = null
            }}
            disabled={deleteLoading}>{m.actionCancel()}</button
          >
          <button
            class="btn btn-sm btn-danger"
            onclick={handleDelete}
            disabled={deleteLoading}
          >
            {#if deleteLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
            {/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Tree node snippet - อ่านจาก SvelteMap/SvelteSet โดยตรง ไม่ส่ง function เป็น props -->
<!-- Tree node snippet - เอาลูกศรออก กด folder/ชื่อเพื่อ expand -->
{#snippet UnitTreeNode(props: { nodes: OrgUnit[] })}
  <ul class="list-unstyled mb-0">
    {#each props.nodes as node (node.id)}
      <li class="border-bottom border-inverse border-opacity-10">
        <div class="d-flex align-items-center px-2 py-1 gap-2">
          <!-- Folder icon คลิกได้ + spinner ตอน loading -->
          <button
            type="button"
            class="btn btn-link p-0 border-0 text-theme d-flex align-items-center"
            onclick={() => toggleExpanded(node)}
            disabled={isLoadingChildren(node)}
            style="min-width: 20px;"
          >
            {#if isLoadingChildren(node)}
              <span
                class="spinner-border spinner-border-sm text-theme"
                role="status"
              ></span>
            {:else if isExpanded(node)}
              <i class="bi bi-folder2-open fs-6 opacity-75"></i>
            {:else}
              <i class="bi bi-folder fs-6 opacity-75"></i>
            {/if}
          </button>

          <!-- ชื่อ กดได้เพื่อ expand เช่นกัน -->
          <button
            type="button"
            class="btn btn-link p-0 border-0 text-start flex-grow-1 fw-semibold text-inverse"
            onclick={() => toggleExpanded(node)}
          >
            {node.name}
          </button>

          {#if node.memberCount !== undefined}
            <span class="badge bg-inverse bg-opacity-15 text-inverse small">
              <i class="bi bi-people me-1"></i>{node.memberCount}
            </span>
          {/if}

          <button
            class="btn btn-xs btn-outline-theme btn-sm py-0 px-2"
            onclick={() => openCreate(node)}
            title={m.unitAddChild()}
          >
            <i class="bi bi-plus"></i>
          </button>
          <button
            class="btn btn-xs btn-outline-secondary btn-sm py-0 px-2"
            onclick={() => openEdit(node)}
            title={m.actionEdit()}
          >
            <i class="bi bi-pencil"></i>
          </button>
          <button
            class="btn btn-xs btn-outline-danger btn-sm py-0 px-2"
            onclick={() => confirmDelete(node)}
            title={m.actionDelete()}
          >
            <i class="bi bi-trash"></i>
          </button>
          <button
            class="btn btn-xs btn-outline-secondary btn-sm py-0 px-2"
            onclick={() => goto(`units/${node.id}/members`)}
            title={m.unitMembers()}
          >
            <i class="bi bi-people"></i>
          </button>
        </div>

        {#if isExpanded(node) && getChildren(node).length > 0}
          <div
            class="border-start border-inverse border-opacity-10"
            style="margin-left: 1.25rem; padding-left: 0.4rem;"
          >
            {@render UnitTreeNode({ nodes: getChildren(node) })}
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/snippet}
