<!-- src/routes/(app)/subscriptions/current/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { getEntitlement } from '$lib/api/entitlement'
  import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import type { RuntimeEntitlement } from '$lib/types/workspace'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let data = $state<RuntimeEntitlement | null>(null)

  async function loadData() {
    const wsId = $activeWorkspaceId
    if (!wsId) { loading = false; return }
    loading = true
    error = null
    try {
      data = await getEntitlement(wsId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  $effect(() => {
    if ($activeWorkspaceId) loadData()
  })

  onMount(() => {
    setPageTitle(m.entitlementTitle())
    loadData()
  })
</script>

<div class="d-flex align-items-center mb-4">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.entitlementTitle()}</h1>
  </div>
</div>

{#if loading}
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
{:else if !data}
  <div class="alert alert-warning">
    <i class="bi bi-info-circle me-2"></i>
    {m.commonError()}
  </div>
{:else}
  <Card>
    <CardBody>
      <h5 class="mb-3"><i class="bi bi-gem me-2"></i>{m.entitlementTitle()}</h5>
      <table class="table table-sm mb-0">
        <thead>
          <tr>
            <th>{m.subscriptionCurrentResource()}</th>
            <th class="text-end">{m.subscriptionCurrentLimit()}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementPlanCode()}</td>
            <td class="fw-semibold text-end">{data.planCode}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementMaxEventsPerSecond()}</td>
            <td class="fw-semibold text-end">{data.maxEventsPerSecond.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementMaxPayloadBytes()}</td>
            <td class="fw-semibold text-end">{data.maxPayloadBytes.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementMaxAssets()}</td>
            <td class="fw-semibold text-end">{data.maxAssets.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementMaxSources()}</td>
            <td class="fw-semibold text-end">{data.maxSources.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementMaxPipelines()}</td>
            <td class="fw-semibold text-end">{data.maxPipelines.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementMaxSites()}</td>
            <td class="fw-semibold text-end">{data.maxSites.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementRetentionDays()}</td>
            <td class="fw-semibold text-end">{data.retentionDays}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementWebhookTargetsLimit()}</td>
            <td class="fw-semibold text-end">{data.webhookTargetsLimit.toLocaleString()}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementAllowedSourceFamilies()}</td>
            <td class="fw-semibold text-end">{data.allowedSourceFamilies.join(', ') || '-'}</td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementEventExportEnabled()}</td>
            <td class="text-end">
              {#if data.eventExportEnabled}
                <i class="bi bi-check-circle-fill text-success"></i>
              {:else}
                <i class="bi bi-x-circle-fill text-secondary"></i>
              {/if}
            </td>
          </tr>
          <tr>
            <td class="text-inverse text-opacity-50">{m.entitlementAssetTrackingEnabled()}</td>
            <td class="text-end">
              {#if data.assetTrackingEnabled}
                <i class="bi bi-check-circle-fill text-success"></i>
              {:else}
                <i class="bi bi-x-circle-fill text-secondary"></i>
              {/if}
            </td>
          </tr>
        </tbody>
      </table>
    </CardBody>
  </Card>
{/if}
