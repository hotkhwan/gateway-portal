<!-- src/routes/(app)/subscriptions/current/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { getCurrentSubscription } from '$lib/api/subscription'
  import type { CurrentSubscriptionDetails } from '$lib/api/subscription'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let data = $state<CurrentSubscriptionDetails | null>(null)

  async function loadData() {
    loading = true
    error = null
    try {
      data = await getCurrentSubscription()
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function formatLimit(v: number | undefined): string {
    if (v == null) return '-'
    if (v === -1 || v === Infinity) return m.subscriptionCurrentUnlimited()
    return v.toLocaleString()
  }

  function statusBadgeClass(status: string): string {
    if (status === 'active') return 'bg-success'
    if (status === 'pending') return 'bg-warning'
    if (status === 'cancelled') return 'bg-danger'
    return 'bg-secondary'
  }

  onMount(() => {
    setPageTitle(m.subscriptionCurrentTitle())
    loadData()
  })
</script>

<div class="d-flex align-items-center mb-4">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.subscriptionCurrentTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.subscriptionCurrentSubtitle()}</small>
  </div>
  <a href={resolve('/subscriptions/packages')} class="btn btn-outline-theme btn-sm">
    <i class="bi bi-arrow-up-circle me-1"></i>{m.subscriptionCurrentUpgradeLink()}
  </a>
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
{:else if data}
  <div class="row g-4">
    <!-- Plan info -->
    <div class="col-md-5">
      <Card>
        <CardBody>
          <h5 class="mb-3"><i class="bi bi-gem me-2"></i>{m.subscriptionCurrentPlanName()}</h5>
          <table class="table table-sm mb-0">
            <tbody>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentPlanName()}</th>
                <td class="fw-semibold text-capitalize">{data.planId}</td>
              </tr>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentStatus()}</th>
                <td>
                  <span class="badge {statusBadgeClass(data.status)}">{data.status}</span>
                </td>
              </tr>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionBillingCycle()}</th>
                <td class="text-capitalize">{data.billingCycle}</td>
              </tr>
              {#if data.features && Object.keys(data.features).length > 0}
                <tr>
                  <th class="text-inverse text-opacity-50">{m.subscriptionPackagesFeatures()}</th>
                  <td>
                    <ul class="list-unstyled mb-0 small">
                      {#each Object.entries(data.features).filter(([, v]) => v) as [key]}
                        <li><i class="bi bi-check text-theme me-1"></i>{key}</li>
                      {/each}
                    </ul>
                  </td>
                </tr>
              {/if}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>

    <!-- Limits table -->
    <div class="col-md-7">
      <Card>
        <CardBody>
          <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>{m.subscriptionPackagesLimits()}</h5>
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>{m.subscriptionCurrentResource()}</th>
                <th class="text-end">{m.subscriptionCurrentLimit()}</th>
              </tr>
            </thead>
            <tbody>
              {#each [
                { label: m.subscriptionLimitOrgs(), value: data.limits.maxOrganizationsPerTenant },
                { label: m.subscriptionLimitMembers(), value: data.limits.teamMembers },
                { label: m.subscriptionLimitEvents(), value: data.limits.eventsPerMonth },
                { label: m.subscriptionLimitWebhooks(), value: data.limits.webhooksPerOrg },
                { label: m.subscriptionLimitLine(), value: data.limits.lineTargetsPerOrg },
                { label: m.subscriptionLimitDiscord(), value: data.limits.discordTargetsPerOrg },
                { label: m.subscriptionLimitTelegram(), value: data.limits.telegramTargetsPerOrg },
                { label: m.subscriptionLimitMsgChannels(), value: data.limits.messageChannelsPerOrg }
              ] as row}
                {#if row.value != null}
                  <tr>
                    <td>{row.label}</td>
                    <td class="text-end fw-semibold">{formatLimit(row.value)}</td>
                  </tr>
                {/if}
              {/each}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  </div>
{/if}
