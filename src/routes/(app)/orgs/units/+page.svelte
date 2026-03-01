<!-- src/routes/(app)/orgs/units/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { SvelteSet } from 'svelte/reactivity'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    getUnitTree,
    createUnit,
    updateUnit,
    deleteUnit,
    listUnitMembers,
    removeMembers,
    assignMembers
  } from '$lib/api/orgunit'
  import { listUsers } from '$lib/api/user'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardHeader from '$lib/components/bootstrap/CardHeader.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import CardExpandToggler from '$lib/components/bootstrap/CardExpandToggler.svelte'
  import PerfectScrollbar from '$lib/components/plugins/PerfectScrollbar.svelte'
  import type { OrgUnit, OrgUnitMember } from '$lib/types/org'
  import type { User } from '$lib/types/user'
  import { resolve } from '$app/paths'

  // ── Tree state ──────────────────────────────────────────────────────────────
  let loading = $state(true)
  let error = $state<string | null>(null)
  let tree = $state<OrgUnit[]>([])

  // Track expanded nodes — ใช้ children จาก tree data โดยตรง ไม่ยิง API เพิ่ม
  let expandedIds = new SvelteSet<string>()

  function toggleExpanded(unit: OrgUnit) {
    if (expandedIds.has(unit.id)) {
      expandedIds.delete(unit.id)
    } else {
      expandedIds.add(unit.id)
    }
  }

  function isExpanded(id: string): boolean {
    return expandedIds.has(id)
  }

  function hasChildren(unit: OrgUnit): boolean {
    return Array.isArray(unit.children) && unit.children.length > 0
  }

  // ── Selected unit (drives right panel) ─────────────────────────────────────
  let selectedUnit = $state<OrgUnit | null>(null)

  // ── Members state ───────────────────────────────────────────────────────────
  let membersLoading = $state(false)
  let membersError = $state<string | null>(null)
  let members = $state<OrgUnitMember[]>([])
  let memberSearch = $state('')
  let selectedUserIds = $state<string[]>([])

  // ── Remove modal ────────────────────────────────────────────────────────────
  let showRemoveModal = $state(false)
  let removeLoading = $state(false)
  let removeError = $state<string | null>(null)

  // ── Assign modal ────────────────────────────────────────────────────────────
  let showAssignModal = $state(false)
  let assignLoading = $state(false)
  let assignError = $state<string | null>(null)
  let availableUsers = $state<User[]>([])
  let assignSearch = $state('')
  let selectedAssignUserIds = $state<string[]>([])
  let assignLoadingUsers = $state(false)

  // ── Unit create/edit modal ──────────────────────────────────────────────────
  let showModal = $state(false)
  let editUnit = $state<OrgUnit | null>(null)
  let parentForNew = $state<OrgUnit | null>(null)
  let modalLoading = $state(false)
  let modalError = $state<string | null>(null)
  let fName = $state('')

  // ── Delete modal ────────────────────────────────────────────────────────────
  let showDeleteModal = $state(false)
  let deleteUnitItem = $state<OrgUnit | null>(null)
  let deleteLoading = $state(false)
  let deleteError = $state<string | null>(null)

  // ── Load tree ───────────────────────────────────────────────────────────────
  async function loadTree() {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }
    loading = true
    error = null
    expandedIds.clear()
    try {
      tree = await getUnitTree(orgId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  // ── Select unit → load members ──────────────────────────────────────────────
  async function selectUnit(unit: OrgUnit) {
    selectedUnit = unit
    selectedUserIds = []
    memberSearch = ''
    await loadMembers()
  }

  // ── Members helpers ─────────────────────────────────────────────────────────
  async function loadMembers() {
    const orgId = $activeOrg?.id
    if (!orgId || !selectedUnit) return
    membersLoading = true
    membersError = null
    try {
      const result = await listUnitMembers(orgId, selectedUnit.id)
      members = result ?? []
    } catch (e: unknown) {
      membersError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      membersLoading = false
    }
  }

  function filteredMembers(): OrgUnitMember[] {
    if (!memberSearch.trim()) return members
    const q = memberSearch.toLowerCase()
    return members.filter(
      (mb) =>
        `${mb.firstName} ${mb.lastName}`.toLowerCase().includes(q) ||
        mb.role?.toLowerCase().includes(q)
    )
  }

  function toggleSelectUser(userId: string) {
    selectedUserIds = selectedUserIds.includes(userId)
      ? selectedUserIds.filter((id) => id !== userId)
      : [...selectedUserIds, userId]
  }

  function toggleSelectAll() {
    const visible = filteredMembers()
    selectedUserIds =
      selectedUserIds.length === visible.length
        ? []
        : visible.map((mb) => mb.userId)
  }

  // ── Remove members ──────────────────────────────────────────────────────────
  function openRemoveModal() {
    if (selectedUserIds.length === 0) return
    removeError = null
    showRemoveModal = true
  }

  async function handleRemove() {
    if (!$activeOrg || !selectedUnit || selectedUserIds.length === 0) return
    removeLoading = true
    removeError = null
    try {
      await removeMembers($activeOrg.id, selectedUnit.id, selectedUserIds)
      showRemoveModal = false
      selectedUserIds = []
      await loadMembers()
    } catch (e: unknown) {
      removeError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      removeLoading = false
    }
  }

  // ── Assign members ──────────────────────────────────────────────────────────
  async function loadAvailableUsers() {
    assignLoadingUsers = true
    try {
      const result = await listUsers({
        search: assignSearch,
        page: 1,
        perPages: 100
      })
      const memberIds = new Set(members.map((mb) => mb.userId))
      availableUsers = result.items.filter((u) => !memberIds.has(u.id))
    } catch (e: unknown) {
      assignError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      assignLoadingUsers = false
    }
  }

  function openAssignModal() {
    selectedAssignUserIds = []
    assignError = null
    assignSearch = ''
    showAssignModal = true
    loadAvailableUsers()
  }

  function closeAssignModal() {
    showAssignModal = false
    selectedAssignUserIds = []
    availableUsers = []
  }

  async function handleAssign() {
    if (!$activeOrg || !selectedUnit || selectedAssignUserIds.length === 0)
      return
    assignLoading = true
    assignError = null
    try {
      await assignMembers(
        $activeOrg.id,
        selectedUnit.id,
        selectedAssignUserIds.map((userId) => ({ userId, role: 'member' }))
      )
      closeAssignModal()
      await loadMembers()
    } catch (e: unknown) {
      assignError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      assignLoading = false
    }
  }

  function toggleSelectAssignUser(userId: string) {
    selectedAssignUserIds = selectedAssignUserIds.includes(userId)
      ? selectedAssignUserIds.filter((id) => id !== userId)
      : [...selectedAssignUserIds, userId]
  }

  function toggleSelectAllAssign() {
    selectedAssignUserIds =
      selectedAssignUserIds.length === availableUsers.length
        ? []
        : availableUsers.map((u) => u.id)
  }

  // ── Unit CRUD ───────────────────────────────────────────────────────────────
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
    deleteError = null
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteUnitItem) return
    deleteLoading = true
    deleteError = null
    try {
      await deleteUnit(orgId, deleteUnitItem.id)
      if (selectedUnit?.id === deleteUnitItem.id) {
        selectedUnit = null
        members = []
      }
      showDeleteModal = false
      await loadTree()
      deleteUnitItem = null
    } catch (e: unknown) {
      deleteError = (e as { message?: string })?.message ?? m.commonError()
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

<!-- ── Page header ──────────────────────────────────────────────────────────── -->
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
    <i class="bi bi-plus-lg me-1"></i>{m.unitCreateBtn()}
  </button>
</div>

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()}
    <a href={resolve('/orgs')} class="alert-link">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>
{:else}
  <Card class="flex-1 m-0 d-flex flex-column overflow-hidden rounded-0">
    <CardHeader class="fw-bold small d-flex">
      <span class="flex-grow-1">{m.unitTitle()}</span>
      <CardExpandToggler />
    </CardHeader>
    <CardBody class="p-0 flex-1 overflow-hidden">
      <div class="file-manager h-100">
        <div class="file-manager-container h-100">
          <!-- ╔══════════════════════════════════════╗ -->
          <!-- ║  LEFT — unit tree sidebar            ║ -->
          <!-- ╚══════════════════════════════════════╝ -->
          <div class="file-manager-sidebar">
            <div class="file-manager-sidebar-content">
              <PerfectScrollbar class="h-100 p-3">
                <input
                  type="text"
                  class="form-control form-control-sm mb-3"
                  placeholder={m.unitNamePlaceholder()}
                  readonly
                />

                {#if loading}
                  <div class="text-center py-4">
                    <div
                      class="spinner-border spinner-border-sm text-theme"
                      role="status"
                    ></div>
                  </div>
                {:else if error}
                  <div class="alert alert-danger small py-2">
                    {error}
                    <button
                      class="btn btn-sm btn-danger ms-2"
                      onclick={loadTree}
                    >
                      {m.actionRefresh()}
                    </button>
                  </div>
                {:else if tree.length === 0}
                  <div
                    class="text-center py-4 text-inverse text-opacity-50 small"
                  >
                    <i class="bi bi-diagram-3 fs-2 d-block mb-2"></i>
                    {m.unitNoRecords()}
                  </div>
                {:else}
                  <div class="file-tree mb-3">
                    {@render UnitTreeNode({ nodes: tree })}
                  </div>
                {/if}
              </PerfectScrollbar>
            </div>
            <!-- no sidebar footer -->
          </div>

          <!-- ╔══════════════════════════════════════╗ -->
          <!-- ║  RIGHT — members panel               ║ -->
          <!-- ╚══════════════════════════════════════╝ -->
          <div class="file-manager-content d-flex flex-column">
            <!-- Breadcrumb header (replaces old sidebar footer) -->
            <div
              class="d-flex flex-wrap align-items-center text-nowrap px-10px pt-10px pb-0 border-bottom"
            >
              <!-- Org info breadcrumb -->
              <div class="d-flex align-items-center gap-2 small me-3 mb-10px">
                <i class="fa fa-building fa-lg text-theme"></i>
                <span class="fw-semibold text-inverse">{$activeOrg.name}</span>
                <i class="bi bi-chevron-right text-inverse text-opacity-25"></i>
                <i class="fa fa-folder fa-lg text-warning"></i>
                <span class="fw-semibold text-inverse">{m.unitTitle()}</span>
                {#if selectedUnit}
                  <i class="bi bi-chevron-right text-inverse text-opacity-25"
                  ></i>
                  <i class="bi bi-people text-theme"></i>
                  <span class="fw-semibold text-theme">{selectedUnit.name}</span
                  >
                {/if}
              </div>

              <!-- Toolbar -->
              <button
                class="btn border-0 btn-sm mb-10px"
                onclick={openAssignModal}
                disabled={!selectedUnit}
              >
                <i class="bi bi-person-plus me-1"></i>{m.unitMembersAssign()}
              </button>
              <button
                class="btn border-0 btn-sm mb-10px"
                disabled={!selectedUnit || selectedUserIds.length === 0}
                onclick={openRemoveModal}
              >
                <i class="bi bi-person-dash me-1"></i>{m.unitMembersRemoveBtn()}
                {#if selectedUserIds.length > 0}
                  <span class="badge bg-danger ms-1"
                    >{selectedUserIds.length}</span
                  >
                {/if}
              </button>
            </div>

            <!-- Members content -->
            <div class="flex-1 overflow-hidden">
              <PerfectScrollbar class="h-100 p-0">
                {#if !selectedUnit}
                  <div class="text-center py-5 text-inverse text-opacity-25">
                    <i class="fa fa-folder-open fa-3x text-warning d-block mb-3"
                    ></i>
                    <p class="small">{m.unitTitle()}</p>
                  </div>
                {:else if membersLoading}
                  <div class="text-center py-5">
                    <div class="spinner-border text-theme" role="status">
                      <span class="visually-hidden">{m.actionLoading()}</span>
                    </div>
                  </div>
                {:else if membersError}
                  <div class="alert alert-danger m-3 small">
                    <i class="bi bi-exclamation-triangle me-1"
                    ></i>{membersError}
                    <button
                      class="btn btn-sm btn-danger ms-2"
                      onclick={loadMembers}
                    >
                      {m.actionRefresh()}
                    </button>
                  </div>
                {:else}
                  <!-- Search -->
                  <div class="px-3 py-2 border-bottom">
                    <input
                      type="text"
                      class="form-control form-control-sm"
                      placeholder={m.unitMembersSearchPlaceholder()}
                      bind:value={memberSearch}
                    />
                  </div>

                  {#if filteredMembers().length === 0}
                    <div class="text-center py-5 text-inverse text-opacity-50">
                      <i class="bi bi-people fs-1 d-block mb-3"></i>
                      <p class="small">{m.unitMembersNoRecords()}</p>
                    </div>
                  {:else}
                    <table
                      class="table table-striped table-borderless table-sm table-hover m-0 text-nowrap small"
                    >
                      <thead>
                        <tr class="border-bottom">
                          <th class="w-10px ps-10px">
                            <input
                              type="checkbox"
                              class="form-check-input"
                              checked={selectedUserIds.length ===
                                filteredMembers().length &&
                                filteredMembers().length > 0}
                              onchange={toggleSelectAll}
                            />
                          </th>
                          <th class="px-10px">{m.unitMembersTableName()}</th>
                          <th class="px-10px">{m.unitMembersTableRoles()}</th>
                          <th class="px-10px">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {#each filteredMembers() as member (member.userId)}
                          <tr>
                            <td class="ps-10px border-0">
                              <input
                                type="checkbox"
                                class="form-check-input"
                                checked={selectedUserIds.includes(
                                  member.userId
                                )}
                                onchange={() => toggleSelectUser(member.userId)}
                              />
                            </td>
                            <td class="px-10px border-0 fw-semibold">
                              {member.firstName}
                              {member.lastName}
                            </td>
                            <td class="px-10px border-0">
                              <span class="badge bg-secondary"
                                >{member.role}</span
                              >
                            </td>
                            <td class="px-10px border-0">
                              {#if member.enabled}
                                <span class="badge bg-success"
                                  >{m.commonStatusActive()}</span
                                >
                              {:else}
                                <span class="badge bg-secondary"
                                  >{m.commonStatusInactive()}</span
                                >
                              {/if}
                            </td>
                          </tr>
                        {/each}
                      </tbody>
                    </table>
                  {/if}
                {/if}
              </PerfectScrollbar>
            </div>
          </div>
          <!-- /file-manager-content -->
        </div>
        <!-- /file-manager-container -->
      </div>
      <!-- /file-manager -->
    </CardBody>
  </Card>
{/if}

<!-- ╔══════════════════════════════════════════════════════════════╗ -->
<!-- ║  Tree node snippet                                           ║ -->
<!-- ║  - ใช้ file-node / file-link / file-arrow / file-info       ║ -->
<!-- ║  - กด file-arrow → toggle expand (ใช้ unit.children โดยตรง) ║ -->
<!-- ║  - กด file-info  → selectUnit (load members)                ║ -->
<!-- ╚══════════════════════════════════════════════════════════════╝ -->
{#snippet UnitTreeNode(props: { nodes: OrgUnit[] })}
  {#each props.nodes as node (node.id)}
    <div
      class="file-node"
      class:has-sub={hasChildren(node)}
      class:expand={isExpanded(node.id)}
      class:selected={selectedUnit?.id === node.id}
    >
      <a
        href="#/"
        aria-label="link"
        class="file-link"
        onclick={(e) => e.preventDefault()}
      >
        <!-- Arrow: กดเพื่อ expand/collapse (ไม่ยิง API) -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span
          class="file-arrow"
          onclick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (hasChildren(node)) toggleExpanded(node)
          }}
        ></span>

        <!-- Folder icon + name: กดเพื่อ select unit (load members) -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span
          class="file-info"
          onclick={(e) => {
            e.preventDefault()
            selectUnit(node)
          }}
        >
          <span class="file-icon">
            <i class="fa fa-folder fa-lg text-warning"></i>
          </span>
          <span class="file-text">{node.name}</span>
          {#if node.memberCount !== undefined}
            <span
              class="badge bg-inverse bg-opacity-15 text-inverse ms-1"
              style="font-size:0.7em"
            >
              {node.memberCount}
            </span>
          {/if}
        </span>

        <!-- Inline action buttons -->
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span
          class="ms-auto d-flex gap-1 pe-1"
          onclick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            class="btn btn-xs btn-link text-theme p-0 px-1"
            onclick={() => openCreate(node)}
            title={m.unitAddChild()}><i class="bi bi-plus-lg"></i></button
          >
          <button
            type="button"
            class="btn btn-xs btn-link text-inverse text-opacity-50 p-0 px-1"
            onclick={() => openEdit(node)}
            title={m.actionEdit()}><i class="bi bi-pencil"></i></button
          >
          <button
            type="button"
            class="btn btn-xs btn-link text-danger p-0 px-1"
            onclick={() => confirmDelete(node)}
            title={m.actionDelete()}><i class="bi bi-trash"></i></button
          >
        </span>
      </a>

      <!-- Recursive children (from tree data, no API) -->
      {#if hasChildren(node) && isExpanded(node.id)}
        <div class="file-tree">
          {@render UnitTreeNode({ nodes: node.children! })}
        </div>
      {/if}
    </div>
  {/each}
{/snippet}

<!-- ── Unit create/edit modal ────────────────────────────────────────────────── -->
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

<!-- ── Delete confirm modal ───────────────────────────────────────────────────── -->
{#if showDeleteModal && deleteUnitItem}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-exclamation-triangle me-2"
            ></i>{m.unitDeleteConfirm()}
          </h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">
          <strong>"{deleteUnitItem.name}"</strong><br />{m.unitDeleteWarning()}
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

<!-- ── Remove members modal ───────────────────────────────────────────────────── -->
{#if showRemoveModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal'))
        showRemoveModal = false
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
            onclick={() => (showRemoveModal = false)}
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
            onclick={() => (showRemoveModal = false)}
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

<!-- ── Assign members modal ───────────────────────────────────────────────────── -->
{#if showAssignModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    onclick={(e) => {
      if ((e.target as HTMLElement).classList.contains('modal'))
        closeAssignModal()
    }}
  >
    <div class="modal-dialog modal-dialog-centered modal-lg">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {m.unitMembersAssign()}
            {#if selectedUnit}
              <small class="text-inverse text-opacity-50 fw-normal ms-2"
                >— {selectedUnit.name}</small
              >
            {/if}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={closeAssignModal}
          ></button>
        </div>
        <div class="modal-body">
          {#if assignError}
            <div class="alert alert-danger small py-2">{assignError}</div>
          {/if}
          <div class="mb-3">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-search"></i></span>
              <input
                type="text"
                class="form-control"
                placeholder={m.unitMembersSearchPlaceholder()}
                bind:value={assignSearch}
                onkeydown={(e) => {
                  if (e.key === 'Enter') loadAvailableUsers()
                }}
              />
              <button
                class="btn btn-outline-secondary"
                onclick={loadAvailableUsers}
              >
                {m.actionSearch()}
              </button>
            </div>
          </div>

          {#if assignLoadingUsers}
            <div class="text-center py-3">
              <div
                class="spinner-border spinner-border-sm text-theme"
                role="status"
              ></div>
            </div>
          {:else if availableUsers.length === 0}
            <div class="text-center py-3 text-muted">
              <i class="bi bi-people fs-3 d-block mb-2"></i>
              <small>{m.unitMembersNoRecords()}</small>
            </div>
          {:else}
            <div class="table-responsive" style="max-height: 300px">
              <table
                class="table table-hover table-striped table-striped-theme mb-0"
              >
                <thead>
                  <tr>
                    <th style="width: 40px">
                      <input
                        type="checkbox"
                        class="form-check-input"
                        checked={selectedAssignUserIds.length ===
                          availableUsers.length && availableUsers.length > 0}
                        onchange={toggleSelectAllAssign}
                      />
                    </th>
                    <th>{m.unitMembersTableName()}</th>
                    <th>{m.unitMembersTableEmail()}</th>
                  </tr>
                </thead>
                <tbody>
                  {#each availableUsers as user (user.id)}
                    <tr>
                      <td>
                        <input
                          type="checkbox"
                          class="form-check-input"
                          checked={selectedAssignUserIds.includes(user.id)}
                          onchange={() => toggleSelectAssignUser(user.id)}
                        />
                      </td>
                      <td class="fw-semibold"
                        >{user.firstName} {user.lastName || '-'}</td
                      >
                      <td>
                        {#if user.email}
                          <a href="mailto:{user.email}" class="text-theme"
                            >{user.email}</a
                          >
                        {:else}
                          <span class="text-muted">-</span>
                        {/if}
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
            <div class="mt-2 text-muted small">
              {m.usersSelected()}: {selectedAssignUserIds.length}
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={closeAssignModal}
            disabled={assignLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-theme"
            onclick={handleAssign}
            disabled={assignLoading || selectedAssignUserIds.length === 0}
          >
            {#if assignLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              {m.actionSubmitting()}
            {:else}
              {m.actionAdd()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
