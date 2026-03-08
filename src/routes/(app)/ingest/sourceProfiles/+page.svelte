<!-- src/routes/(app)/ingest/sourceProfiles/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { listSourceProfiles } from '$lib/api/ingest'
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
  <select class="form-select form-select-sm ms-3" style="width:auto" bind:value={filterMode}>
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
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
