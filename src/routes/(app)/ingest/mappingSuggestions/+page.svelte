<!-- src/routes/(app)/ingest/mappingSuggestions/+page.svelte -->
<script lang="ts">
  import { resolve } from '$app/paths'
  import { untrack } from 'svelte'
  import { goto } from '$app/navigation'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId, activeWorkspace } from '$lib/stores/activeWorkspace'
  import { listMappingSuggestions } from '$lib/api/ingest'
  import type { MappingSuggestion } from '$lib/types/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let suggestions = $state<MappingSuggestion[]>([])
  let pagination = $state({ page: 1, perPage: 20, total: 0, totalPages: 0 })
  let selectedSuggestion = $state<MappingSuggestion | null>(null)

  async function load(page = 1) {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const perPage = untrack(() => pagination.perPage)
      const r = await listMappingSuggestions(orgId, page, perPage)
      suggestions = r.details
      pagination = { page: r.page, perPage: r.perPage, total: r.total, totalPages: r.totalPages }
      if (selectedSuggestion && !r.details.find(s => s.id === selectedSuggestion!.id)) {
        selectedSuggestion = null
      }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
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
    const orgId = $activeWorkspaceId
    setPageTitle(m.ingestMappingSuggestionsTitle())
    if (orgId) { untrack(() => load()) } else { loading = false }
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.ingestMappingSuggestionsTitle()}</h1>
    {#if $activeWorkspace}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeWorkspace.name} &mdash; {m.ingestMappingSuggestionsSubtitle()}
      </small>
    {/if}
  </div>
  <div class="badge bg-inverse bg-opacity-15 text-inverse ms-2">
    <i class="bi bi-lock me-1"></i>Read-only
  </div>
  <button class="btn btn-sm btn-outline-secondary ms-2" onclick={() => load(pagination.page)} title={m.actionRefresh()}>
    <i class="bi bi-arrow-clockwise"></i>
  </button>
</div>

{#if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()}
    <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
  </div>
{:else}
  {#if error}
    <div class="alert alert-danger mb-3">
      <i class="bi bi-exclamation-triangle me-2"></i>{error}
      <button class="btn btn-sm btn-danger ms-2" onclick={() => load()}>{m.actionRefresh()}</button>
    </div>
  {/if}

  <div class="row g-3">
    <!-- Left panel: list -->
    <div class="col-lg-4">
      <Card>
        <CardBody class="p-0">
          {#if loading}
            <div class="text-center py-5">
              <div class="spinner-border text-theme" role="status"><span class="visually-hidden">{m.actionLoading()}</span></div>
            </div>
          {:else if suggestions.length === 0}
            <div class="text-center py-5 px-3">
              <i class="bi bi-lightbulb fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
              <p class="text-inverse text-opacity-50 mb-0">{m.ingestMappingSuggestionNoRecords()}</p>
            </div>
          {:else}
            <div class="list-group list-group-flush">
              {#each suggestions as sg (sg.id)}
                <button
                  type="button"
                  class="list-group-item list-group-item-action px-3 py-2 text-start"
                  class:active={selectedSuggestion?.id === sg.id}
                  onclick={() => (selectedSuggestion = sg)}
                >
                  <div class="fw-semibold small">{sg.displayName}</div>
                  <span class="badge bg-theme-subtle text-theme mt-1">{sg.sourceFamily}</span>
                </button>
              {/each}
            </div>

            {#if pagination.totalPages > 1}
              <div class="d-flex justify-content-center p-2 border-top">
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" class:disabled={pagination.page === 1}>
                    <button class="page-link" onclick={() => load(pagination.page - 1)}>&laquo;</button>
                  </li>
                  {#each Array(pagination.totalPages) as _, i}
                    <li class="page-item" class:active={i + 1 === pagination.page}>
                      <button class="page-link" onclick={() => load(i + 1)}>{i + 1}</button>
                    </li>
                  {/each}
                  <li class="page-item" class:disabled={pagination.page === pagination.totalPages}>
                    <button class="page-link" onclick={() => load(pagination.page + 1)}>&raquo;</button>
                  </li>
                </ul>
              </div>
            {/if}
          {/if}
        </CardBody>
      </Card>
    </div>

    <!-- Right panel: detail (read-only) -->
    <div class="col-lg-8">
      {#if !selectedSuggestion}
        <Card>
          <CardBody>
            <div class="text-center py-5">
              <i class="bi bi-arrow-left-circle fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
              <p class="text-inverse text-opacity-50">{m.ingestMappingSuggestionSelectItem()}</p>
            </div>
          </CardBody>
        </Card>
      {:else}
        <Card>
          <CardBody>
            <div class="d-flex align-items-start mb-3">
              <div class="flex-grow-1">
                <h5 class="mb-1">{selectedSuggestion.displayName}</h5>
                <span class="badge bg-theme-subtle text-theme">{selectedSuggestion.sourceFamily}</span>
              </div>
              <button type="button" class="btn btn-sm btn-outline-theme"
                onclick={() => goto(`/ingest/templates?fromSuggestion=${selectedSuggestion!.id}`)}>
                <i class="bi bi-box-arrow-up-right me-1"></i>{m.ingestMappingSuggestionUseAsBase()}
              </button>
            </div>

            <!-- Match rules -->
            {#if selectedSuggestion.matchAll?.length || selectedSuggestion.matchAny?.length}
              <h6 class="mb-2">{m.ingestMappingSuggestionMatchRule()}</h6>
              <div class="mb-3">
                {#if selectedSuggestion.matchAll?.length}
                  <small class="text-inverse text-opacity-50 d-block mb-1">{m.ingestTemplateMatchAll()}</small>
                  {#each selectedSuggestion.matchAll as cond}
                    <div class="d-flex gap-2 mb-1">
                      <code class="small">{cond.field}</code>
                      <span class="badge bg-secondary">{cond.operator}</span>
                      <small>{cond.values.join(', ')}</small>
                    </div>
                  {/each}
                {/if}
                {#if selectedSuggestion.matchAny?.length}
                  <small class="text-inverse text-opacity-50 d-block mb-1 mt-2">{m.ingestTemplateMatchAny()}</small>
                  {#each selectedSuggestion.matchAny as cond}
                    <div class="d-flex gap-2 mb-1">
                      <code class="small">{cond.field}</code>
                      <span class="badge bg-secondary">{cond.operator}</span>
                      <small>{cond.values.join(', ')}</small>
                    </div>
                  {/each}
                {/if}
              </div>
            {/if}

            <!-- Field mappings -->
            {#if selectedSuggestion.fieldMappings?.length}
              <h6 class="mb-2">{m.ingestMappingSuggestionFieldMappings()}</h6>
              <div class="table-responsive mb-3">
                <table class="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>{m.ingestMappingSourcePath()}</th>
                      <th>{m.ingestMappingTargetPath()}</th>
                      <th>{m.ingestMappingRequired()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each selectedSuggestion.fieldMappings as fm}
                      <tr>
                        <td><code class="small">{fm.sourcePath}</code></td>
                        <td><code class="small">{fm.targetPath}</code></td>
                        <td>{fm.required ? '✓' : '—'}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            {/if}

            <!-- Sample payload -->
            {#if selectedSuggestion.samplePayload}
              <h6 class="mb-2">{m.ingestMappingSuggestionSamplePayload()}</h6>
              <pre class="bg-dark text-light rounded p-3 small mb-0" style="max-height:400px;overflow:auto">{JSON.stringify(selectedSuggestion.samplePayload, null, 2)}</pre>
            {/if}
          </CardBody>
        </Card>
      {/if}
    </div>
  </div>
{/if}
