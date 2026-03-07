<!-- src/routes/(app)/subscriptions/current/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { getCurrentSubscription } from '$lib/api/subscription'
  import type { EffectiveSubscription } from '$lib/api/subscription'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let data = $state<EffectiveSubscription | null>(null)

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

  function statusBadge(s: string): string {
    const map: Record<string, string> = {
      active: 'bg-success',
      inactive: 'bg-secondary',
      pending: 'bg-warning text-dark',
      cancelled: 'bg-danger'
    }
    return map[s] ?? 'bg-secondary'
  }

  function statusLabel(s: string): string {
    const map: Record<string, () => string> = {
      active: () => m.subscriptionStatusActive(),
      inactive: () => m.subscriptionStatusInactive(),
      pending: () => m.subscriptionStatusPending(),
      cancelled: () => m.subscriptionStatusCancelled()
    }
    return (map[s] ?? (() => s))()
  }

  function formatLimit(v: number | undefined): string {
    if (v == null) return '-'
    if (v === -1 || v === Infinity) return m.subscriptionCurrentUnlimited()
    return v.toLocaleString()
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
  <!-- Plan info -->
  <div class="row g-4">
    <div class="col-md-5">
      <Card>
        <CardBody>
          <h5 class="mb-3"><i class="bi bi-gem me-2"></i>{m.subscriptionCurrentPlanName()}</h5>
          <table class="table table-sm mb-0">
            <tbody>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentPlanName()}</th>
                <td class="fw-semibold">{data.plan?.name ?? data.subscription.planId}</td>
              </tr>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentStatus()}</th>
                <td>
                  <span class="badge {statusBadge(data.subscription.status)}">
                    {statusLabel(data.subscription.status)}
                  </span>
                </td>
              </tr>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentBillingCycle()}</th>
                <td>
                  {#if data.subscription.billingCycle === 'monthly'}
                    {m.subscriptionMonthly()}
                  {:else if data.subscription.billingCycle === 'yearly'}
                    {m.subscriptionYearly()}
                  {:else}
                    -
                  {/if}
                </td>
              </tr>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentPeriodStart()}</th>
                <td><small>{data.subscription.currentPeriodStart ? new Date(data.subscription.currentPeriodStart).toLocaleDateString() : '-'}</small></td>
              </tr>
              <tr>
                <th class="text-inverse text-opacity-50">{m.subscriptionCurrentPeriodEnd()}</th>
                <td><small>{data.subscription.currentPeriodEnd ? new Date(data.subscription.currentPeriodEnd).toLocaleDateString() : '-'}</small></td>
              </tr>
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>

    <!-- Usage table -->
    <div class="col-md-7">
      <Card>
        <CardBody>
          <h5 class="mb-3"><i class="bi bi-bar-chart me-2"></i>{m.subscriptionCurrentUsage()}</h5>
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>{m.subscriptionCurrentResource()}</th>
                <th class="text-end">{m.subscriptionCurrentUsed()}</th>
                <th class="text-end">{m.subscriptionCurrentLimit()}</th>
                <th style="width:120px"></th>
              </tr>
            </thead>
            <tbody>
              {#each [
                { label: m.subscriptionLimitOrgs(), used: data.usage?.orgs ?? 0, limit: data.plan?.limits?.orgs },
                { label: m.subscriptionLimitMembers(), used: data.usage?.members ?? 0, limit: data.plan?.limits?.members },
                { label: m.subscriptionLimitEvents(), used: data.usage?.eventsThisMonth ?? 0, limit: data.plan?.limits?.eventsPerMonth },
                { label: m.subscriptionLimitWebhooks(), used: data.usage?.webhooks ?? 0, limit: data.plan?.limits?.webhooksPerOrg },
                { label: m.subscriptionLimitLine(), used: data.usage?.lineTargets ?? 0, limit: data.plan?.limits?.linePerOrg },
                { label: m.subscriptionLimitDiscord(), used: data.usage?.discordTargets ?? 0, limit: data.plan?.limits?.discordPerOrg },
                { label: m.subscriptionLimitTelegram(), used: data.usage?.telegramTargets ?? 0, limit: data.plan?.limits?.telegramPerOrg },
                { label: m.subscriptionLimitMsgChannels(), used: data.usage?.msgChannels ?? 0, limit: data.plan?.limits?.msgChannelsPerOrg }
              ] as row}
                {@const limit = row.limit ?? 0}
                {@const pct = limit > 0 && limit !== -1 ? Math.min(100, Math.round((row.used / limit) * 100)) : 0}
                <tr>
                  <td>{row.label}</td>
                  <td class="text-end fw-semibold" class:text-danger={limit > 0 && limit !== -1 && row.used >= limit}>{row.used.toLocaleString()}</td>
                  <td class="text-end text-inverse text-opacity-50">{formatLimit(limit)}</td>
                  <td>
                    {#if limit > 0 && limit !== -1}
                      <div class="progress" style="height:6px">
                        <div
                          class="progress-bar"
                          class:bg-danger={pct >= 90}
                          class:bg-warning={pct >= 70 && pct < 90}
                          class:bg-theme={pct < 70}
                          style="width:{pct}%"
                        ></div>
                      </div>
                    {:else}
                      <small class="text-inverse text-opacity-25">∞</small>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  </div>
{/if}
