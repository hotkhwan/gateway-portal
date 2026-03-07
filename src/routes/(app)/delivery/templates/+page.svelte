<!-- src/routes/(app)/delivery/templates/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import { listTemplates } from '$lib/api/ingest'
  import type { MappingTemplate, MessageTemplate } from '$lib/api/ingest'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let allMsgTemplates = $state<Array<MessageTemplate & { parentName: string; parentId: string }>>([])

  async function loadData() {
    const orgId = $activeOrg?.id
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const res = await listTemplates(orgId, 1, 100)
      const collected: Array<MessageTemplate & { parentName: string; parentId: string }> = []
      for (const tpl of res.details) {
        for (const mt of tpl.messageTemplates ?? []) {
          collected.push({ ...mt, parentName: tpl.name, parentId: tpl.templateId })
        }
      }
      allMsgTemplates = collected
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  onMount(() => {
    setPageTitle(m.deliveryTemplatesTitle())
    loadData()
  })

  $effect(() => {
    if ($activeOrg?.id) loadData()
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.deliveryTemplatesTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.deliveryTemplatesSubtitle()}</small>
  </div>
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadData}>{m.actionRefresh()}</button>
  </div>
{:else if allMsgTemplates.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-file-earmark-text fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50">{m.deliveryTemplatesNoRecords()}</p>
        <a href={resolve('/ingest/mappingTemplates')} class="btn btn-outline-theme btn-sm">
          <i class="bi bi-arrow-right me-1"></i>{m.ingestMappingTemplatesTitle()}
        </a>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.deliveryTemplatesKey()}</th>
          <th>{m.deliveryTemplatesChannel()}</th>
          <th>{m.deliveryTemplatesLocale()}</th>
          <th>{m.deliveryTemplatesTitleField()}</th>
          <th>{m.deliveryTemplatesParentTemplate()}</th>
          <th class="text-end"></th>
        </tr>
      </thead>
      <tbody>
        {#each allMsgTemplates as mt}
          <tr>
            <td><code class="small">{mt.key ?? '-'}</code></td>
            <td><span class="badge bg-inverse bg-opacity-25 text-inverse">{mt.channelType}</span></td>
            <td><small>{mt.locale}</small></td>
            <td><small class="text-truncate d-inline-block" style="max-width:200px">{mt.title}</small></td>
            <td><small class="text-inverse text-opacity-50">{mt.parentName}</small></td>
            <td class="text-end">
              <a href={resolve('/ingest/mappingTemplates')} class="btn btn-sm btn-outline-theme" title={m.deliveryTemplatesEditInTemplate()}>
                <i class="bi bi-pencil-square"></i>
              </a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
