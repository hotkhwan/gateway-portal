<!-- src/routes/(app)/ingest/sourceProfiles/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listSourceProfiles, createSourceProfile, updateSourceProfile } from '$lib/api/ingest'
  import type { SourceProfile } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let profiles = $state<SourceProfile[]>([])
  let filterMode = $state('')

  let filtered = $derived(
    filterMode ? profiles.filter(p => p.mode === filterMode) : profiles
  )

  // Form modal
  let showFormModal = $state(false)
  let formMode = $state<'create' | 'edit'>('create')
  let formLoading = $state(false)
  let formError = $state<string | null>(null)
  let formSourceFamily = $state('')
  let formDisplayName = $state('')
  let formProfileMode = $state<string>('active')
  let actionSuccess = $state<string | null>(null)

  async function load() {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      profiles = await listSourceProfiles(orgId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function modeBadgeClass(mode?: string): string {
    const map: Record<string, string> = {
      active: 'bg-success',
      comingSoon: 'bg-warning text-dark',
      mock: 'bg-info text-dark',
      disabled: 'bg-secondary'
    }
    return map[mode ?? ''] ?? 'bg-secondary'
  }

  function modeLabel(mode?: string): string {
    switch (mode) {
      case 'active': return m.ingestSourceProfileModeActive()
      case 'comingSoon': return m.ingestSourceProfileModeComingSoon()
      case 'mock': return m.ingestSourceProfileModeMock()
      case 'disabled': return m.ingestSourceProfileModeDisabled()
      default: return mode ?? '—'
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

  function openCreate() {
    formMode = 'create'
    formSourceFamily = ''
    formDisplayName = ''
    formProfileMode = 'active'
    formError = null
    showFormModal = true
  }

  function openEdit(profile: SourceProfile) {
    formMode = 'edit'
    formSourceFamily = profile.sourceFamily
    formDisplayName = profile.displayName
    formProfileMode = profile.mode ?? 'active'
    formError = null
    showFormModal = true
  }

  async function handleFormSubmit() {
    const orgId = $activeOrg?.id
    if (!orgId) return
    if (!formSourceFamily.trim()) { formError = m.ingestSourceProfileSourceFamilyRequired(); return }
    if (!formDisplayName.trim()) { formError = m.ingestSourceProfileDisplayNameRequired(); return }

    formLoading = true
    formError = null
    try {
      if (formMode === 'create') {
        await createSourceProfile(orgId, {
          sourceFamily: formSourceFamily.trim(),
          displayName: formDisplayName.trim(),
          mode: formProfileMode
        })
      } else {
        await updateSourceProfile(orgId, formSourceFamily, {
          displayName: formDisplayName.trim(),
          mode: formProfileMode
        })
      }
      actionSuccess = m.ingestSourceProfileSaved()
      showFormModal = false
      load()
    } catch (e: unknown) {
      formError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      formLoading = false
    }
  }

  $effect(() => {
    const orgId = $activeOrg?.id
    setPageTitle(m.ingestSourceProfilesTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestSourceProfilesTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.ingestSourceProfilesSubtitle()}</small>
  </div>
  <button class="btn btn-sm btn-theme ms-3" onclick={openCreate}>
    <i class="bi bi-plus-lg me-1"></i>{m.ingestSourceProfileCreate()}
  </button>
  <select class="form-select form-select-sm ms-2" style="width:auto" bind:value={filterMode}>
    <option value="">— {m.ingestSourceProfileMode()} —</option>
    <option value="active">{m.ingestSourceProfileModeActive()}</option>
    <option value="comingSoon">{m.ingestSourceProfileModeComingSoon()}</option>
    <option value="mock">{m.ingestSourceProfileModeMock()}</option>
    <option value="disabled">{m.ingestSourceProfileModeDisabled()}</option>
  </select>
  <button class="btn btn-sm btn-outline-secondary ms-2" onclick={load} title={m.actionRefresh()}>
    <i class="bi bi-arrow-clockwise"></i>
  </button>
</div>

{#if actionSuccess}
  <div class="alert alert-success alert-dismissible mb-3">
    <i class="bi bi-check-circle me-2"></i>{actionSuccess}
    <button type="button" class="btn-close" onclick={() => (actionSuccess = null)} aria-label={m.actionClose()}></button>
  </div>
{/if}

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={load}>{m.actionRefresh()}</button>
  </div>
{:else if filtered.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-collection fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50 mb-0">{m.ingestSourceProfileNoRecords()}</p>
      </div>
    </CardBody>
  </Card>
{:else}
  {#if filtered.some(p => p.mode === 'comingSoon')}
    <div class="alert alert-warning small mb-3">
      <i class="bi bi-clock me-2"></i>
      <strong>{m.ingestSourceProfileModeComingSoon()}:</strong>
      {m.ingestSourceProfileComingSoonNote()}
    </div>
  {/if}

  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.ingestSourceProfileFamily()}</th>
          <th>{m.ingestSourceProfileDisplayName()}</th>
          <th>{m.ingestSourceProfileMode()}</th>
          <th>{m.ingestSourceProfileSuggestedMatchFields()}</th>
          <th>{m.eventsUpdatedAt()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each filtered as profile (profile.sourceFamily)}
          <tr class:opacity-50={profile.mode === 'disabled'}>
            <td class="fw-semibold font-monospace">{profile.sourceFamily}</td>
            <td>{profile.displayName}</td>
            <td>
              <span class="badge {modeBadgeClass(profile.mode)}">{modeLabel(profile.mode)}</span>
              {#if profile.mode === 'comingSoon'}
                <i class="bi bi-info-circle ms-1 text-warning" title={m.ingestSourceProfileComingSoonNote()}></i>
              {/if}
            </td>
            <td>
              {#if profile.suggestedMatchFields?.length}
                {#each profile.suggestedMatchFields as field}
                  <span class="badge bg-theme-subtle text-theme me-1">{field}</span>
                {/each}
              {:else}
                <span class="text-inverse text-opacity-50 small">—</span>
              {/if}
            </td>
            <td class="small">{formatDate(profile.updatedAt)}</td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-secondary" onclick={() => openEdit(profile)} title={m.actionEdit()}>
                <i class="bi bi-pencil"></i>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- Create / Edit Modal -->
{#if showFormModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {formMode === 'create' ? m.ingestSourceProfileCreate() : m.ingestSourceProfileEdit()}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showFormModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if formError}
            <div class="alert alert-danger small py-2">{formError}</div>
          {/if}
          <div class="mb-3">
            <label class="form-label fw-semibold" for="spFamily">{m.ingestSourceProfileFamily()} <span class="text-danger">*</span></label>
            <input id="spFamily" type="text" class="form-control font-monospace" bind:value={formSourceFamily} disabled={formLoading || formMode === 'edit'} placeholder="e.g. ata" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold" for="spDisplayName">{m.ingestSourceProfileDisplayName()} <span class="text-danger">*</span></label>
            <input id="spDisplayName" type="text" class="form-control" bind:value={formDisplayName} disabled={formLoading} placeholder="e.g. ATA Camera" />
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold" for="spMode">{m.ingestSourceProfileMode()}</label>
            <select id="spMode" class="form-select" bind:value={formProfileMode} disabled={formLoading}>
              <option value="active">{m.ingestSourceProfileModeActive()}</option>
              <option value="comingSoon">{m.ingestSourceProfileModeComingSoon()}</option>
              <option value="mock">{m.ingestSourceProfileModeMock()}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => (showFormModal = false)} disabled={formLoading}>{m.actionCancel()}</button>
          <button type="button" class="btn btn-theme" onclick={handleFormSubmit} disabled={formLoading}>
            {#if formLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {formMode === 'create' ? m.actionCreate() : m.actionSave()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
