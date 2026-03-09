<!-- src/routes/(app)/subscriptions/packages/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { currentLocaleStore } from '$lib/i18nClient/setLanguage'
  import { listPackages, getCurrentSubscription, changePlan } from '$lib/api/subscription'
  import type { PackagePlan, CurrentSubscriptionDetails, BillingCycle, LocalisedText } from '$lib/api/subscription'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let packages = $state<PackagePlan[]>([])
  let currentSub = $state<CurrentSubscriptionDetails | null>(null)

  // Upgrade modal
  let showUpgradeModal = $state(false)
  let upgradePlan = $state<PackagePlan | null>(null)
  let upgradeCycle = $state<BillingCycle>('monthly')
  let upgradeLoading = $state(false)
  let upgradeError = $state<string | null>(null)

  let locale = $derived($currentLocaleStore ?? 'en')

  function lt(text: LocalisedText | undefined): string {
    if (!text) return ''
    return (locale === 'th' ? text.th : text.en) || text.en || ''
  }

  async function loadData() {
    loading = true
    error = null
    try {
      const [pkgRes, subRes] = await Promise.allSettled([
        listPackages(),
        getCurrentSubscription()
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
    upgradeCycle = pkg.billing.supportedCycles.includes('monthly') ? 'monthly' : pkg.billing.supportedCycles[0] ?? 'monthly'
    upgradeError = null
    showUpgradeModal = true
  }

  async function handleUpgrade() {
    if (!upgradePlan) return
    upgradeLoading = true
    upgradeError = null
    try {
      currentSub = await changePlan(upgradePlan.code as 'freemium' | 'pro' | 'enterprise', upgradeCycle)
      showUpgradeModal = false
      await loadData()
    } catch (e: unknown) {
      upgradeError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      upgradeLoading = false
    }
  }

  function isCurrentPlan(pkg: PackagePlan): boolean {
    return currentSub?.planId === pkg.code
  }

  function priceForCycle(pkg: PackagePlan, cycle: BillingCycle): number {
    return cycle === 'yearly' ? pkg.billing.price.yearly : pkg.billing.price.monthly
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
          {#if pkg.ui?.highlight && lt(pkg.ui.badge)}
            <div class="card-header bg-theme text-white text-center py-1">
              <small class="fw-semibold">{lt(pkg.ui.badge)}</small>
            </div>
          {:else if pkg.ui?.highlight}
            <div class="card-header bg-theme text-white text-center py-1">
              <small class="fw-semibold">{m.subscriptionPackagesHighlighted()}</small>
            </div>
          {/if}
          <div class="card-body text-center d-flex flex-column">
            <h4 class="fw-bold mb-1">{lt(pkg.name)}</h4>
            <p class="text-inverse text-opacity-50 small mb-3">{lt(pkg.description)}</p>

            <!-- Price -->
            <div class="mb-3">
              {#if pkg.billing.price.monthly === 0 && pkg.code === 'enterprise'}
                <span class="fs-5 fw-bold">{m.subscriptionPackagesCustomPricing()}</span>
              {:else if pkg.billing.price.monthly === 0}
                <span class="fs-2 fw-bold">{m.subscriptionFree()}</span>
              {:else}
                <span class="fs-2 fw-bold">{lt(pkg.billing.price.display)}</span>
              {/if}
            </div>

            <!-- Feature list from UI -->
            <ul class="list-unstyled text-start flex-grow-1 mb-3">
              {#each pkg.ui?.featureList ?? [] as feature}
                <li class="mb-1">
                  <i class="bi bi-check-circle-fill text-theme me-2"></i>
                  <small>{lt(feature.label)}</small>
                </li>
              {/each}
            </ul>

            <!-- Limits summary -->
            <div class="small text-inverse text-opacity-50 mb-3 text-start">
              <div>{m.subscriptionLimitOrgs()}: {pkg.limits.maxOrganizationsPerTenant === -1 ? '∞' : pkg.limits.maxOrganizationsPerTenant}</div>
              <div>{m.subscriptionLimitMembers()}: {pkg.limits.teamMembers === -1 ? '∞' : pkg.limits.teamMembers}</div>
              <div>{m.subscriptionLimitEvents()}: {pkg.limits.eventsPerMonth === -1 ? '∞' : pkg.limits.eventsPerMonth.toLocaleString()}</div>
              <div>{m.subscriptionLimitWebhooks()}: {pkg.limits.webhooksPerOrg === -1 ? '∞' : pkg.limits.webhooksPerOrg}</div>
              <div>{m.subscriptionLimitMsgChannels()}: {pkg.limits.messageChannelsPerOrg === -1 ? '∞' : pkg.limits.messageChannelsPerOrg}</div>
            </div>

            <!-- Action -->
            {#if isCurrentPlan(pkg)}
              <button class="btn btn-outline-theme" disabled>
                <i class="bi bi-check-lg me-1"></i>{m.subscriptionPackagesCurrent()}
              </button>
            {:else if currentSub?.planId === 'enterprise'}
              <button class="btn btn-outline-secondary" disabled>
                {m.subscriptionPackagesUpgrade()}
              </button>
            {:else if pkg.code === 'enterprise'}
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
          <p class="fw-semibold">{lt(upgradePlan.name)} — {lt(upgradePlan.billing.price.display)}</p>

          {#if upgradePlan.billing.supportedCycles.length > 1}
            <div class="mb-3">
              <span class="form-label">{m.subscriptionBillingCycle()}</span>
              <div class="btn-group w-100">
                {#if upgradePlan.billing.supportedCycles.includes('monthly')}
                  <button
                    class="btn btn-sm"
                    class:btn-theme={upgradeCycle === 'monthly'}
                    class:btn-outline-theme={upgradeCycle !== 'monthly'}
                    onclick={() => (upgradeCycle = 'monthly')}
                  >
                    {m.subscriptionMonthly()}
                    {#if upgradePlan.billing.price.monthly > 0}
                      (${upgradePlan.billing.price.monthly}{m.subscriptionPerMonth()})
                    {/if}
                  </button>
                {/if}
                {#if upgradePlan.billing.supportedCycles.includes('yearly')}
                  <button
                    class="btn btn-sm"
                    class:btn-theme={upgradeCycle === 'yearly'}
                    class:btn-outline-theme={upgradeCycle !== 'yearly'}
                    onclick={() => (upgradeCycle = 'yearly')}
                  >
                    {m.subscriptionYearly()}
                    {#if upgradePlan.billing.price.yearly > 0}
                      (${upgradePlan.billing.price.yearly}{m.subscriptionPerYear()})
                    {/if}
                  </button>
                {/if}
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
