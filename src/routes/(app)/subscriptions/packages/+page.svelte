<!-- src/routes/(app)/subscriptions/packages/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { listPackages, getSubscription, changePlan } from '$lib/api/subscription'
  import type { PackagePlan, Subscription, BillingCycle } from '$lib/api/subscription'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let packages = $state<PackagePlan[]>([])
  let currentSub = $state<Subscription | null>(null)

  // Upgrade modal
  let showUpgradeModal = $state(false)
  let upgradePlan = $state<PackagePlan | null>(null)
  let upgradeCycle = $state<BillingCycle>('monthly')
  let upgradeLoading = $state(false)
  let upgradeError = $state<string | null>(null)

  async function loadData() {
    loading = true
    error = null
    try {
      const [pkgRes, subRes] = await Promise.allSettled([
        listPackages(),
        getSubscription()
      ])
      packages = pkgRes.status === 'fulfilled' ? pkgRes.value : []
      currentSub = subRes.status === 'fulfilled' ? subRes.value : null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openUpgrade(pkg: PackagePlan) {
    upgradePlan = pkg
    upgradeCycle = pkg.billing.cycle !== 'none' ? pkg.billing.cycle : 'monthly'
    upgradeError = null
    showUpgradeModal = true
  }

  async function handleUpgrade() {
    if (!upgradePlan) return
    upgradeLoading = true
    upgradeError = null
    try {
      const sub = await changePlan(upgradePlan.planId, upgradeCycle)
      currentSub = sub
      showUpgradeModal = false
      await loadData()
    } catch (e: unknown) {
      upgradeError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      upgradeLoading = false
    }
  }

  function isCurrentPlan(pkg: PackagePlan): boolean {
    return currentSub?.planId === pkg.planId
  }

  onMount(() => {
    setPageTitle(m.subscriptionPackagesTitle())
    loadData()
  })
</script>

<div class="d-flex align-items-center mb-4">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.subscriptionPackagesTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.subscriptionPackagesSubtitle()}</small>
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
{:else if packages.length === 0}
  <div class="text-center py-5 text-inverse text-opacity-50">
    <i class="bi bi-box fs-1 d-block mb-2"></i>
    {m.subscriptionPackagesNoRecords()}
  </div>
{:else}
  <div class="row g-4 justify-content-center">
    {#each packages as pkg (pkg.id)}
      <div class="col-md-4">
        <div
          class="card h-100 border-2"
          class:border-theme={pkg.ui?.highlight}
          class:border-0={!pkg.ui?.highlight}
        >
          {#if pkg.ui?.highlight}
            <div class="card-header bg-theme text-white text-center py-1">
              <small class="fw-semibold">{m.subscriptionPackagesHighlighted()}</small>
            </div>
          {/if}
          <div class="card-body text-center d-flex flex-column">
            <h4 class="fw-bold mb-1">{pkg.name}</h4>
            <p class="text-inverse text-opacity-50 small mb-3">{pkg.description}</p>

            <!-- Price -->
            <div class="mb-3">
              {#if pkg.billing.price.amount === 0 && pkg.planId === 'enterprise'}
                <span class="fs-5 fw-bold">{m.subscriptionPackagesCustomPricing()}</span>
              {:else if pkg.billing.price.amount === 0}
                <span class="fs-2 fw-bold">{m.subscriptionFree()}</span>
              {:else}
                <span class="fs-2 fw-bold">${pkg.billing.price.amount}</span>
                <span class="text-inverse text-opacity-50">
                  {pkg.billing.cycle === 'monthly' ? m.subscriptionPerMonth() : m.subscriptionPerYear()}
                </span>
              {/if}
            </div>

            <!-- Features -->
            <ul class="list-unstyled text-start flex-grow-1 mb-3">
              {#each pkg.ui?.featureList ?? [] as feature}
                <li class="mb-1">
                  <i class="bi bi-check-circle-fill text-theme me-2"></i>
                  <small>{feature}</small>
                </li>
              {/each}
            </ul>

            <!-- Limits -->
            <div class="small text-inverse text-opacity-50 mb-3 text-start">
              <div>{m.subscriptionLimitOrgs()}: {pkg.limits.orgs === -1 ? '∞' : pkg.limits.orgs}</div>
              <div>{m.subscriptionLimitMembers()}: {pkg.limits.members === -1 ? '∞' : pkg.limits.members}</div>
              <div>{m.subscriptionLimitEvents()}: {pkg.limits.eventsPerMonth === -1 ? '∞' : pkg.limits.eventsPerMonth.toLocaleString()}</div>
              <div>{m.subscriptionLimitWebhooks()}: {pkg.limits.webhooksPerOrg === -1 ? '∞' : pkg.limits.webhooksPerOrg}</div>
              <div>{m.subscriptionLimitMsgChannels()}: {pkg.limits.msgChannelsPerOrg === -1 ? '∞' : pkg.limits.msgChannelsPerOrg}</div>
            </div>

            <!-- Action -->
            {#if isCurrentPlan(pkg)}
              <button class="btn btn-outline-theme" disabled>
                <i class="bi bi-check-lg me-1"></i>{m.subscriptionPackagesCurrent()}
              </button>
            {:else if pkg.planId === 'enterprise'}
              <button class="btn btn-outline-theme" onclick={() => openUpgrade(pkg)}>
                {m.subscriptionPackagesContactSales()}
              </button>
            {:else}
              <button class="btn btn-theme" onclick={() => openUpgrade(pkg)}>
                {m.subscriptionPackagesUpgrade()}
              </button>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Upgrade modal -->
{#if showUpgradeModal && upgradePlan}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">{m.subscriptionUpgradeTitle()}</h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showUpgradeModal = false)}></button>
        </div>
        <div class="modal-body">
          {#if upgradeError}
            <div class="alert alert-danger small py-2">{upgradeError}</div>
          {/if}
          <p>{m.subscriptionUpgradeDesc()}</p>
          <p class="fw-semibold">{upgradePlan.name} — {upgradePlan.billing.price.display}</p>

          {#if upgradePlan.billing.price.amount > 0}
            <div class="mb-3">
              <span class="form-label">{m.subscriptionBillingCycle()}</span>
              <div class="btn-group w-100">
                <button
                  class="btn btn-sm"
                  class:btn-theme={upgradeCycle === 'monthly'}
                  class:btn-outline-theme={upgradeCycle !== 'monthly'}
                  onclick={() => (upgradeCycle = 'monthly')}
                >{m.subscriptionMonthly()}</button>
                <button
                  class="btn btn-sm"
                  class:btn-theme={upgradeCycle === 'yearly'}
                  class:btn-outline-theme={upgradeCycle !== 'yearly'}
                  onclick={() => (upgradeCycle = 'yearly')}
                >{m.subscriptionYearly()}</button>
              </div>
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick={() => (showUpgradeModal = false)} disabled={upgradeLoading}>{m.actionCancel()}</button>
          <button class="btn btn-theme" onclick={handleUpgrade} disabled={upgradeLoading}>
            {#if upgradeLoading}
              <span class="spinner-border spinner-border-sm me-1"></span>
            {/if}
            {m.subscriptionUpgrade()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
