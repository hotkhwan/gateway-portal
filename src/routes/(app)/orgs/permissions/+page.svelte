<!-- src/routes/(app)/orgs/permissions/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    listPermissionProfiles,
    createPermissionProfile,
    updatePermissionProfile,
    deletePermissionProfile
  } from '$lib/api/permission'
  import { listTargets } from '$lib/api/target'
  import { getUnitTree } from '$lib/api/orgunit'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type {
    TargetPermissionProfile,
    DeliveryTarget,
    OrgUnit,
    OrgUnitRelation
  } from '$lib/types/org'

  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let profiles = $state<TargetPermissionProfile[]>([])
  let targets = $state<DeliveryTarget[]>([])
  let unitFlat = $state<OrgUnit[]>([])

  // Modal
  let showModal = $state(false)
  let editProfile = $state<TargetPermissionProfile | null>(null)
  let modalLoading = $state(false)
  let modalError = $state<string | null>(null)

  // Form
  let fName = $state('')
  let fDescription = $state('')
  let fStatus = $state<'active' | 'inactive'>('active')
  let fOrgUnitIds = $state<string[]>([])
  let fTargetIds = $state<string[]>([])
  let fRelations = $state<OrgUnitRelation[]>(['viewer'])

  // Delete
  let showDeleteModal = $state(false)
  let deleteProfileId = $state<string | null>(null)
  let deleteLoading = $state(false)

  const relationOptions: OrgUnitRelation[] = ['viewer', 'editor', 'deleter']

  function flattenUnits(
    nodes: OrgUnit[],
    depth = 0,
    result: OrgUnit[] = []
  ): OrgUnit[] {
    for (const n of nodes) {
      result.push({ ...n, name: '  '.repeat(depth) + n.name })
      if (n.children?.length) flattenUnits(n.children, depth + 1, result)
    }
    return result
  }

  async function loadData() {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }
    loading = true
    error = null
    try {
      const [p, t, tree] = await Promise.all([
        listPermissionProfiles(orgId),
        listTargets(orgId),
        getUnitTree(orgId)
      ])
      profiles = p
      targets = t
      unitFlat = flattenUnits(tree)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openCreate() {
    editProfile = null
    fName = ''
    fDescription = ''
    fStatus = 'active'
    fOrgUnitIds = []
    fTargetIds = []
    fRelations = ['viewer']
    modalError = null
    showModal = true
  }

  function openEdit(p: TargetPermissionProfile) {
    editProfile = p
    fName = p.name
    fDescription = p.description ?? ''
    fStatus = p.status
    fOrgUnitIds = [...p.orgUnitIds]
    fTargetIds = [...p.targetIds]
    fRelations = [...p.relations]
    modalError = null
    showModal = true
  }

  function toggleArrayItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
  }

  async function handleSave() {
    const orgId = $activeOrg?.id
    if (!orgId || !fName.trim()) return
    modalLoading = true
    modalError = null
    const payload = {
      name: fName.trim(),
      description: fDescription.trim() || undefined,
      status: fStatus,
      orgUnitIds: fOrgUnitIds,
      targetIds: fTargetIds,
      relations: fRelations
    }
    try {
      if (editProfile) {
        const updated = await updatePermissionProfile(
          orgId,
          editProfile.id,
          payload
        )
        profiles = profiles.map((p) => (p.id === updated.id ? updated : p))
      } else {
        const created = await createPermissionProfile(orgId, payload)
        profiles = [...profiles, created]
      }
      showModal = false
    } catch (e: unknown) {
      modalError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      modalLoading = false
    }
  }

  function confirmDelete(id: string) {
    deleteProfileId = id
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteProfileId) return
    deleteLoading = true
    try {
      await deletePermissionProfile(orgId, deleteProfileId)
      profiles = profiles.filter((p) => p.id !== deleteProfileId)
      showDeleteModal = false
      deleteProfileId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function relLabel(rel: OrgUnitRelation): string {
    const map: Record<OrgUnitRelation, string> = {
      viewer: m.unitRelationViewer(),
      editor: m.unitRelationEditor(),
      deleter: m.unitRelationDeleter()
    }
    return map[rel]
  }

  onMount(() => {
    setPageTitle(m.permTitle())
    loadData()
  })

  $effect(() => {
    if ($activeOrg?.id) loadData()
  })
</script>

<!-- Header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.permTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  <button
    class="btn btn-outline-theme btn-sm"
    onclick={openCreate}
    disabled={!$activeOrg}
  >
    <i class="bi bi-plus-lg me-1"></i>{m.permCreateBtn()}
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadData}
      >{m.actionRefresh()}</button
    >
  </div>
{:else if profiles.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i
          class="bi bi-shield-check fs-1 text-inverse text-opacity-25 d-block mb-3"
        ></i>
        <p class="text-inverse text-opacity-50">{m.permNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={openCreate}>
          <i class="bi bi-plus-lg me-1"></i>{m.permCreateBtn()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.permName()}</th>
          <th>{m.permOrgUnits()}</th>
          <th>{m.permTargets()}</th>
          <th>{m.permRelations()}</th>
          <th>{m.permStatus()}</th>
          <th class="text-end"></th>
        </tr>
      </thead>
      <tbody>
        {#each profiles as p (p.id)}
          <tr>
            <td>
              <div class="fw-semibold">{p.name}</div>
              {#if p.description}
                <small class="text-inverse text-opacity-50"
                  >{p.description}</small
                >
              {/if}
            </td>
            <td>
              <span class="badge bg-inverse bg-opacity-15 text-inverse">
                {m.permUnitCount({ count: p.orgUnitIds.length })}
              </span>
            </td>
            <td>
              <span class="badge bg-inverse bg-opacity-15 text-inverse">
                {m.permTargetCount({ count: p.targetIds.length })}
              </span>
            </td>
            <td>
              {#each p.relations as rel}
                <span class="badge bg-theme bg-opacity-25 text-theme me-1">
                  {relLabel(rel)}
                </span>
              {/each}
            </td>
            <td>
              <span
                class="badge rounded-pill"
                class:bg-theme={p.status === 'active'}
                class:bg-secondary={p.status !== 'active'}
              >
                {p.status === 'active'
                  ? m.permStatusActive()
                  : m.permStatusInactive()}
              </span>
            </td>
            <td class="text-end">
              <button
                class="btn btn-sm btn-outline-theme me-1"
                onclick={() => openEdit(p)}
                title={m.actionEdit()}
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => confirmDelete(p.id)}
                title={m.actionDelete()}
              >
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
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
    <div
      class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
    >
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {editProfile ? m.permEditTitle() : m.permCreateTitle()}
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

            <!-- Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold" for="pName">
                {m.permName()} <span class="text-danger">*</span>
              </label>
              <input
                id="pName"
                type="text"
                class="form-control"
                placeholder={m.permNamePlaceholder()}
                bind:value={fName}
                required
                disabled={modalLoading}
              />
            </div>

            <!-- Description -->
            <div class="mb-3">
              <label class="form-label fw-semibold" for="pDesc">
                {m.permDescription()}
              </label>
              <input
                id="pDesc"
                type="text"
                class="form-control"
                placeholder={m.permDescriptionPlaceholder()}
                bind:value={fDescription}
                disabled={modalLoading}
              />
            </div>

            <!-- Status -->
            <div class="mb-3 form-check form-switch">
              <input
                id="pStatus"
                type="checkbox"
                class="form-check-input"
                checked={fStatus === 'active'}
                onchange={(e) => {
                  fStatus = (e.target as HTMLInputElement).checked
                    ? 'active'
                    : 'inactive'
                }}
                disabled={modalLoading}
              />
              <label class="form-check-label" for="pStatus">
                {fStatus === 'active'
                  ? m.permStatusActive()
                  : m.permStatusInactive()}
              </label>
            </div>

            <hr />

            <!-- Relations -->
            <div class="mb-3">
              <div class="form-label fw-semibold">{m.permRelations()}</div>
              <div class="d-flex gap-3">
                {#each relationOptions as rel}
                  <div class="form-check">
                    <input
                      id="rel_{rel}"
                      type="checkbox"
                      class="form-check-input"
                      checked={fRelations.includes(rel)}
                      onchange={() => {
                        fRelations = toggleArrayItem(fRelations, rel)
                      }}
                      disabled={modalLoading}
                    />
                    <label class="form-check-label" for="rel_{rel}">
                      {relLabel(rel)}
                    </label>
                  </div>
                {/each}
              </div>
            </div>

            <!-- Org Units multi-select -->
            <div class="mb-3">
              <div class="form-label fw-semibold">{m.permOrgUnits()}</div>
              {#if unitFlat.length === 0}
                <p class="small text-inverse text-opacity-50">
                  {m.permNoUnitsHint()}
                  <a href={resolve('/orgs/units')}>{m.permCreateUnitsFirst()}</a
                  >
                </p>
              {:else}
                <div
                  class="border rounded overflow-auto"
                  style="max-height: 160px"
                >
                  {#each unitFlat as unit}
                    <label
                      class="d-flex align-items-center gap-2 px-3 py-1 small cursor-pointer hover-bg"
                      class:bg-theme={fOrgUnitIds.includes(unit.id)}
                      class:bg-opacity-10={fOrgUnitIds.includes(unit.id)}
                    >
                      <input
                        type="checkbox"
                        class="form-check-input mb-0"
                        checked={fOrgUnitIds.includes(unit.id)}
                        onchange={() => {
                          fOrgUnitIds = toggleArrayItem(fOrgUnitIds, unit.id)
                        }}
                        disabled={modalLoading}
                      />
                      {unit.name}
                    </label>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Targets multi-select -->
            <div class="mb-3">
              <div class="form-label fw-semibold">{m.permTargets()}</div>
              {#if targets.length === 0}
                <p class="small text-inverse text-opacity-50">
                  {m.permNoTargetsHint()}
                  <a href={resolve('/orgs/targets')}
                    >{m.permCreateTargetsFirst()}</a
                  >
                </p>
              {:else}
                <div
                  class="border rounded overflow-auto"
                  style="max-height: 160px"
                >
                  {#each targets as target}
                    <label
                      class="d-flex align-items-center gap-2 px-3 py-1 small cursor-pointer"
                      class:bg-theme={fTargetIds.includes(target.id)}
                      class:bg-opacity-10={fTargetIds.includes(target.id)}
                    >
                      <input
                        type="checkbox"
                        class="form-check-input mb-0"
                        checked={fTargetIds.includes(target.id)}
                        onchange={() => {
                          fTargetIds = toggleArrayItem(fTargetIds, target.id)
                        }}
                        disabled={modalLoading}
                      />
                      <span class="flex-grow-1">{target.name}</span>
                      <span class="badge bg-inverse bg-opacity-15 text-inverse">
                        {target.type}
                      </span>
                    </label>
                  {/each}
                </div>
              {/if}
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
              disabled={modalLoading ||
                !fName.trim() ||
                fRelations.length === 0}
            >
              {#if modalLoading}
                <span
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                {m.actionSubmitting()}
              {:else}
                {editProfile ? m.actionSave() : m.actionCreate()}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete confirm -->
{#if showDeleteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {m.permDeleteConfirm()}
          </h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">
          {m.permDeleteWarning()}
        </div>
        <div class="modal-footer border-0 pt-0">
          <button
            class="btn btn-sm btn-secondary"
            onclick={() => {
              showDeleteModal = false
              deleteProfileId = null
            }}
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
