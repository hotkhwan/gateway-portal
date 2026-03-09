<!-- src/routes/(app)/ingest/deviceManagement/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    listDeviceManagement,
    createDeviceManagement,
    updateDeviceManagement,
    deleteDeviceManagement,
    listSourceProfiles
  } from '$lib/api/ingest'
  import type { DeviceManagement, SourceProfile } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let records = $state<DeviceManagement[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })

  // Source profiles for dropdown
  let sourceProfiles = $state<SourceProfile[]>([])

  // Form modal
  let showFormModal = $state(false)
  let formMode = $state<'create' | 'edit'>('create')
  let formLoading = $state(false)
  let formError = $state<string | null>(null)
  let formRecord = $state<DeviceManagement | null>(null)

  let formSourceFamily = $state('')
  let formEntityType = $state<'channel' | 'device' | 'sourceSerial'>('channel')
  let formEntityId = $state('')
  let formDeviceId = $state('')
  let formLat = $state<number | undefined>(undefined)
  let formLng = $state<number | undefined>(undefined)
  let formSite = $state('')
  let formZone = $state('')

  // Delete confirm
  let showDeleteModal = $state(false)
  let deleteId = $state<string | null>(null)
  let deleteLoading = $state(false)
  let actionSuccess = $state<string | null>(null)

  async function load(page = 1) {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listDeviceManagement(orgId, page, perPage)
      records = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function openCreate() {
    formMode = 'create'
    formRecord = null
    formSourceFamily = ''
    formEntityType = 'channel'
    formEntityId = ''
    formDeviceId = ''
    formLat = undefined
    formLng = undefined
    formSite = ''
    formZone = ''
    formError = null
    showFormModal = true
    const orgId = $activeOrg?.id
    try { if (orgId) sourceProfiles = await listSourceProfiles(orgId) } catch { sourceProfiles = [] }
  }

  async function openEdit(record: DeviceManagement) {
    formMode = 'edit'
    formRecord = record
    formSourceFamily = record.sourceFamily
    formEntityType = record.entityType
    formEntityId = record.entityId
    formDeviceId = record.deviceId ?? ''
    formLat = record.lat
    formLng = record.lng
    formSite = record.site ?? ''
    formZone = record.zone ?? ''
    formError = null
    showFormModal = true
    const orgId = $activeOrg?.id
    try { if (orgId) sourceProfiles = await listSourceProfiles(orgId) } catch { sourceProfiles = [] }
  }

  async function handleSubmit() {
    const orgId = $activeOrg?.id
    if (!orgId) return

    if (!formSourceFamily || !formEntityId.trim()) {
      formError = m.ingestTemplateNameRequired()
      return
    }

    formLoading = true
    formError = null
    try {
      if (formMode === 'create') {
        const created = await createDeviceManagement(orgId, {
          sourceFamily: formSourceFamily,
          entityType: formEntityType,
          entityId: formEntityId.trim(),
          deviceId: formDeviceId.trim() || undefined,
          lat: formLat,
          lng: formLng,
          site: formSite.trim() || undefined,
          zone: formZone.trim() || undefined
        })
        records = [created, ...records]
      } else if (formRecord) {
        await updateDeviceManagement(orgId, formRecord.deviceMgmtId, {
          deviceId: formDeviceId.trim() || undefined,
          lat: formLat,
          lng: formLng,
          site: formSite.trim() || undefined,
          zone: formZone.trim() || undefined
        })
        records = records.map(r =>
          r.deviceMgmtId === formRecord!.deviceMgmtId
            ? { ...r, deviceId: formDeviceId.trim() || undefined, lat: formLat, lng: formLng, site: formSite.trim() || undefined, zone: formZone.trim() || undefined }
            : r
        )
      }
      showFormModal = false
    } catch (e: unknown) {
      formError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      formLoading = false
    }
  }

  function openDelete(id: string) {
    deleteId = id
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteId) return
    deleteLoading = true
    try {
      await deleteDeviceManagement(orgId, deleteId)
      records = records.filter(r => r.deviceMgmtId !== deleteId)
      actionSuccess = m.ingestDeviceManagementDeleted()
      showDeleteModal = false
      deleteId = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function formatDate(d: string): string {
    if (!d) return '-'
    try {
      return new Date(d).toLocaleString('th-TH', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      })
    } catch { return d }
  }

  function entityTypeLabel(type: string): string {
    switch (type) {
      case 'channel': return m.ingestDeviceManagementEntityTypeChannel()
      case 'device': return m.ingestDeviceManagementEntityTypeDevice()
      case 'sourceSerial': return m.ingestDeviceManagementEntityTypeSerial()
      default: return type
    }
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.ingestDeviceManagementTitle())
    if (orgId) {
      untrack(() => load())
    } else {
      loading = false
    }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestDeviceManagementTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name} &mdash; {m.ingestDeviceManagementSubtitle()}
      </small>
    {/if}
  </div>
  {#if $activeOrg}
    <button class="btn btn-sm btn-theme" onclick={openCreate}>
      <i class="bi bi-plus-lg me-1"></i>{m.ingestDeviceManagementCreate()}
    </button>
  {/if}
</div>

{#if actionSuccess}
  <div class="alert alert-success alert-dismissible mb-3">
    <i class="bi bi-check-circle me-2"></i>{actionSuccess}
    <button type="button" class="btn-close" onclick={() => (actionSuccess = null)} aria-label={m.actionClose()}></button>
  </div>
{/if}

{#if !$activeOrg}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.orgSelectOrgPre()}
    <a href="/orgs" class="alert-link">{m.navOrgs()}</a>
    {m.orgSelectOrgPost()}
  </div>
{:else if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
  </div>
{:else if records.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-hdd-rack fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50 mb-3">{m.ingestDeviceManagementNoRecords()}</p>
        <button class="btn btn-theme btn-sm" onclick={openCreate}>
          <i class="bi bi-plus-lg me-1"></i>{m.ingestDeviceManagementCreate()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.ingestDeviceManagementSourceFamily()}</th>
          <th>{m.ingestDeviceManagementEntityType()}</th>
          <th>{m.ingestDeviceManagementEntityId()}</th>
          <th>{m.ingestDeviceManagementDeviceId()}</th>
          <th>{m.ingestDeviceManagementSite()}</th>
          <th>{m.ingestDeviceManagementZone()}</th>
          <th>{m.ingestDeviceManagementLat()} / {m.ingestDeviceManagementLng()}</th>
          <th>{m.eventsCreatedAt()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each records as rec (rec.deviceMgmtId)}
          <tr>
            <td><span class="badge bg-theme-subtle text-theme">{rec.sourceFamily}</span></td>
            <td><span class="badge bg-secondary">{entityTypeLabel(rec.entityType)}</span></td>
            <td class="font-monospace small">{rec.entityId}</td>
            <td class="small">{rec.deviceId ?? '-'}</td>
            <td class="small">{rec.site ?? '-'}</td>
            <td class="small">{rec.zone ?? '-'}</td>
            <td class="small">
              {#if rec.lat != null && rec.lng != null}
                {rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}
              {:else}
                -
              {/if}
            </td>
            <td class="small">{formatDate(rec.createdAt)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary me-1" onclick={() => openEdit(rec)} title={m.actionEdit()}>
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick={() => openDelete(rec.deviceMgmtId)} title={m.actionDelete()}>
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if pagination.totalPages > 1}
    <div class="d-flex justify-content-between align-items-center mt-3">
      <small class="text-inverse text-opacity-50">
        {m.showing()}
        {(pagination.page - 1) * pagination.perPage + 1}–{Math.min(pagination.page * pagination.perPage, pagination.total)}
        {m.of()} {pagination.total}
      </small>
      <nav>
        <ul class="pagination pagination-sm mb-0">
          <li class="page-item" class:disabled={pagination.page === 1}>
            <button class="page-link" onclick={() => load(pagination.page - 1)}>{m.actionPrevPage()}</button>
          </li>
          {#each Array(pagination.totalPages) as _, i}
            <li class="page-item" class:active={i + 1 === pagination.page}>
              <button class="page-link" onclick={() => load(i + 1)}>{i + 1}</button>
            </li>
          {/each}
          <li class="page-item" class:disabled={pagination.page === pagination.totalPages}>
            <button class="page-link" onclick={() => load(pagination.page + 1)}>{m.actionNextPage()}</button>
          </li>
        </ul>
      </nav>
    </div>
  {/if}
{/if}

<!-- Create / Edit Modal -->
{#if showFormModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {formMode === 'create' ? m.ingestDeviceManagementCreate() : m.ingestDeviceManagementEdit()}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showFormModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if formError}
            <div class="alert alert-danger small py-2">{formError}</div>
          {/if}

          <div class="mb-3">
            <label class="form-label fw-semibold" for="dmSourceFamily">{m.ingestDeviceManagementSourceFamily()} <span class="text-danger">*</span></label>
            <select id="dmSourceFamily" class="form-select" bind:value={formSourceFamily} disabled={formLoading || formMode === 'edit'}>
              <option value="">— {m.actionSelect()} —</option>
              {#each sourceProfiles as sp}
                <option value={sp.sourceFamily}>{sp.displayName} ({sp.sourceFamily})</option>
              {/each}
            </select>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="dmEntityType">{m.ingestDeviceManagementEntityType()} <span class="text-danger">*</span></label>
              <select id="dmEntityType" class="form-select" bind:value={formEntityType} disabled={formLoading || formMode === 'edit'}>
                <option value="channel">{m.ingestDeviceManagementEntityTypeChannel()}</option>
                <option value="device">{m.ingestDeviceManagementEntityTypeDevice()}</option>
                <option value="sourceSerial">{m.ingestDeviceManagementEntityTypeSerial()}</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="dmEntityId">{m.ingestDeviceManagementEntityId()} <span class="text-danger">*</span></label>
              <input id="dmEntityId" type="text" class="form-control font-monospace" bind:value={formEntityId} disabled={formLoading || formMode === 'edit'} placeholder="e.g. 31" />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="dmDeviceId">{m.ingestDeviceManagementDeviceId()}</label>
            <input id="dmDeviceId" type="text" class="form-control" bind:value={formDeviceId} disabled={formLoading} placeholder="e.g. CAM-EAST-31" />
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="dmLat">{m.ingestDeviceManagementLat()}</label>
              <input id="dmLat" type="number" step="any" class="form-control" bind:value={formLat} disabled={formLoading} placeholder="e.g. 13.7563" />
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="dmLng">{m.ingestDeviceManagementLng()}</label>
              <input id="dmLng" type="number" step="any" class="form-control" bind:value={formLng} disabled={formLoading} placeholder="e.g. 100.5018" />
            </div>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="dmSite">{m.ingestDeviceManagementSite()}</label>
              <input id="dmSite" type="text" class="form-control" bind:value={formSite} disabled={formLoading} placeholder="e.g. HQ-East" />
            </div>
            <div class="col-md-6">
              <label class="form-label fw-semibold" for="dmZone">{m.ingestDeviceManagementZone()}</label>
              <input id="dmZone" type="text" class="form-control" bind:value={formZone} disabled={formLoading} placeholder="e.g. Parking-A" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => (showFormModal = false)} disabled={formLoading}>{m.actionCancel()}</button>
          <button type="button" class="btn btn-theme" onclick={handleSubmit} disabled={formLoading}>
            {#if formLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {formMode === 'create' ? m.actionCreate() : m.actionSave()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete Confirm Modal -->
{#if showDeleteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title"><i class="bi bi-trash me-2 text-danger"></i>{m.actionDelete()}</h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">{m.ingestDeviceManagementDeleteConfirm()}</div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; deleteId = null }} disabled={deleteLoading}>{m.actionCancel()}</button>
          <button class="btn btn-sm btn-danger" onclick={handleDelete} disabled={deleteLoading}>
            {#if deleteLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
