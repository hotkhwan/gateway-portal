<!-- src/routes/(app)/ingest/sourceProfiles/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import {
    listSourceProfiles,
    createSourceProfile,
    updateSourceProfile
  } from '$lib/api/ingest'
  import type { SourceProfile } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let profiles = $state<SourceProfile[]>([])

  // Form modal
  let showFormModal = $state(false)
  let formMode = $state<'create' | 'edit'>('create')
  let formLoading = $state(false)
  let formError = $state<string | null>(null)

  let formSourceFamily = $state('')
  let formDisplayName = $state('')
  let formMultiRef = $state(false)
  let formPrimaryRefFields = $state('')
  let formSecondaryRefFields = $state('')
  let formSiteFields = $state('')
  let formSuggestedMatchFields = $state('')

  async function load() {
    loading = true
    error = null
    try {
      profiles = await listSourceProfiles()
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openCreate() {
    formMode = 'create'
    formSourceFamily = ''
    formDisplayName = ''
    formMultiRef = false
    formPrimaryRefFields = ''
    formSecondaryRefFields = ''
    formSiteFields = ''
    formSuggestedMatchFields = ''
    formError = null
    showFormModal = true
  }

  function openEdit(profile: SourceProfile) {
    formMode = 'edit'
    formSourceFamily = profile.sourceFamily
    formDisplayName = profile.displayName
    formMultiRef = profile.multiRef
    formPrimaryRefFields = (profile.refRules?.primaryRefFields ?? []).join(', ')
    formSecondaryRefFields = (profile.refRules?.secondaryRefFields ?? []).join(', ')
    formSiteFields = (profile.refRules?.siteFields ?? []).join(', ')
    formSuggestedMatchFields = (profile.suggestedMatchFields ?? []).join(', ')
    formError = null
    showFormModal = true
  }

  function parseTagInput(value: string): string[] {
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }

  async function handleSubmit() {
    if (!formSourceFamily.trim() || !formDisplayName.trim()) {
      formError = m.ingestTemplateNameRequired()
      return
    }

    const refRules = {
      primaryRefFields: parseTagInput(formPrimaryRefFields),
      secondaryRefFields: parseTagInput(formSecondaryRefFields),
      siteFields: parseTagInput(formSiteFields)
    }
    const suggestedMatchFields = parseTagInput(formSuggestedMatchFields)

    formLoading = true
    formError = null
    try {
      if (formMode === 'create') {
        const created = await createSourceProfile({
          sourceFamily: formSourceFamily.trim(),
          displayName: formDisplayName.trim(),
          multiRef: formMultiRef,
          refRules,
          suggestedMatchFields
        })
        profiles = [created, ...profiles]
      } else {
        await updateSourceProfile(formSourceFamily, {
          displayName: formDisplayName.trim(),
          multiRef: formMultiRef,
          refRules,
          suggestedMatchFields
        })
        profiles = profiles.map(p =>
          p.sourceFamily === formSourceFamily
            ? { ...p, displayName: formDisplayName.trim(), multiRef: formMultiRef, refRules, suggestedMatchFields }
            : p
        )
      }
      showFormModal = false
    } catch (e: unknown) {
      formError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      formLoading = false
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

  $effect(() => {
    setPageTitle(m.ingestSourceProfilesTitle())
    untrack(() => load())
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestSourceProfilesTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.ingestSourceProfilesSubtitle()}</small>
  </div>
  <button class="btn btn-sm btn-theme" onclick={openCreate}>
    <i class="bi bi-plus-lg me-1"></i>{m.ingestSourceProfileCreate()}
  </button>
</div>

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
  </div>
{:else if profiles.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-collection fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50 mb-3">{m.ingestSourceProfileNoRecords()}</p>
        <button class="btn btn-theme btn-sm" onclick={openCreate}>
          <i class="bi bi-plus-lg me-1"></i>{m.ingestSourceProfileCreate()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.ingestSourceProfileFamily()}</th>
          <th>{m.ingestSourceProfileDisplayName()}</th>
          <th>{m.ingestSourceProfileMultiRef()}</th>
          <th>{m.ingestSourceProfileSuggestedMatchFields()}</th>
          <th>{m.eventsCreatedAt()}</th>
          <th class="text-end">{m.eventsActions()}</th>
        </tr>
      </thead>
      <tbody>
        {#each profiles as profile (profile.sourceFamily)}
          <tr>
            <td class="fw-semibold font-monospace">{profile.sourceFamily}</td>
            <td>{profile.displayName}</td>
            <td>
              {#if profile.multiRef}
                <span class="badge bg-success">Yes</span>
              {:else}
                <span class="badge bg-secondary">No</span>
              {/if}
            </td>
            <td>
              {#if profile.suggestedMatchFields?.length}
                {#each profile.suggestedMatchFields as field}
                  <span class="badge bg-theme-subtle text-theme me-1">{field}</span>
                {/each}
              {:else}
                <span class="text-inverse text-opacity-50 small">-</span>
              {/if}
            </td>
            <td class="small">{formatDate(profile.createdAt)}</td>
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
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
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
            <input id="spFamily" type="text" class="form-control font-monospace"
              bind:value={formSourceFamily}
              disabled={formLoading || formMode === 'edit'}
              placeholder={m.ingestSourceProfileFamilyPlaceholder()} />
          </div>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="spDisplayName">{m.ingestSourceProfileDisplayName()} <span class="text-danger">*</span></label>
            <input id="spDisplayName" type="text" class="form-control" bind:value={formDisplayName} disabled={formLoading} placeholder="e.g. AI Box Camera" />
          </div>

          <div class="form-check form-switch mb-3">
            <input id="spMultiRef" type="checkbox" class="form-check-input" bind:checked={formMultiRef} disabled={formLoading} />
            <label class="form-check-label" for="spMultiRef">{m.ingestSourceProfileMultiRef()}</label>
            <div class="form-text">{m.ingestSourceProfileMultiRefHint()}</div>
          </div>

          <fieldset class="border rounded p-3 mb-3">
            <legend class="float-none w-auto px-2 small fw-semibold">{m.ingestSourceProfileRefRules()}</legend>
            <div class="mb-2">
              <label class="form-label small mb-1" for="spPrimaryRef">{m.ingestSourceProfilePrimaryRefFields()}</label>
              <input id="spPrimaryRef" type="text" class="form-control form-control-sm font-monospace"
                bind:value={formPrimaryRefFields} disabled={formLoading} placeholder="e.g. channelId, deviceId" />
            </div>
            <div class="mb-2">
              <label class="form-label small mb-1" for="spSecondaryRef">{m.ingestSourceProfileSecondaryRefFields()}</label>
              <input id="spSecondaryRef" type="text" class="form-control form-control-sm font-monospace"
                bind:value={formSecondaryRefFields} disabled={formLoading} placeholder="e.g. sourceSerial" />
            </div>
            <div>
              <label class="form-label small mb-1" for="spSiteFields">{m.ingestSourceProfileSiteFields()}</label>
              <input id="spSiteFields" type="text" class="form-control form-control-sm font-monospace"
                bind:value={formSiteFields} disabled={formLoading} placeholder="e.g. siteName" />
            </div>
          </fieldset>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="spSuggestedMatch">{m.ingestSourceProfileSuggestedMatchFields()}</label>
            <input id="spSuggestedMatch" type="text" class="form-control form-control-sm font-monospace"
              bind:value={formSuggestedMatchFields} disabled={formLoading} placeholder="e.g. raw.type, raw.typeValue" />
            <div class="form-text">{m.ingestSourceProfileSuggestedMatchFieldsHint()}</div>
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
