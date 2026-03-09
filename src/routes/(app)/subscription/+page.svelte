<!-- src/routes/(app)/subscription/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { currentLocaleStore } from '$lib/i18nClient/setLanguage'
  import {
    listPackages,
    getCurrentSubscription,
    bootstrapSubscription,
    changePlan,
    activateEnterprise
  } from '$lib/api/subscription'
  import type { PackagePlan, CurrentSubscriptionDetails, BillingCycle, LocalisedText, PlanId } from '$lib/api/subscription'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let packages = $state<PackagePlan[]>([])
  let subscription = $state<CurrentSubscriptionDetails | null>(null)

  // Upgrade modal state
  let showUpgradeModal = $state(false)
  let upgradeLoading = $state(false)
  let upgradeError = $state<string | null>(null)
  let upgradePlan = $state<PackagePlan | null>(null)
  let selectedBillingCycle = $state<BillingCycle>('monthly')

  // Enterprise modal state
  let showEnterpriseModal = $state(false)
  let enterpriseLoading = $state(false)
  let enterpriseError = $state<string | null>(null)
  let licenseKey = $state('')

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
      if (subRes.status === 'fulfilled') {
        subscription = subRes.value
      } else {
        // If no subscription exists, bootstrap one
        try {
          subscription = await bootstrapSubscription()
        } catch (e2: unknown) {
          subscription = null
        }
      }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openUpgradeModal(pkg: PackagePlan) {
    upgradePlan = pkg
    selectedBillingCycle = pkg.billing.supportedCycles.includes('monthly') ? 'monthly' : pkg.billing.supportedCycles[0] ?? 'monthly'
    upgradeError = null
    showUpgradeModal = true
  }

  async function handleUpgrade() {
    if (!upgradePlan) return
    upgradeLoading = true
    upgradeError = null
    try {
      subscription = await changePlan(upgradePlan.code as PlanId, selectedBillingCycle)
      showUpgradeModal = false
      await loadData()
    } catch (e: unknown) {
      upgradeError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      upgradeLoading = false
    }
  }

  function openEnterpriseModal() {
    licenseKey = ''
    enterpriseError = null
    showEnterpriseModal = true
  }

  async function handleEnterpriseActivate() {
    if (!licenseKey.trim()) return
    enterpriseLoading = true
    enterpriseError = null
    try {
      subscription = await activateEnterprise(licenseKey.trim())
      showEnterpriseModal = false
      await loadData()
    } catch (e: unknown) {
      enterpriseError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      enterpriseLoading = false
    }
  }

  function isCurrentPlan(pkg: PackagePlan): boolean {
    return subscription?.planId === pkg.code
  }

  onMount(() => {
    setPageTitle(m.subscriptionTitle())
    loadData()
  })
</script>

<div class="d-flex align-items-center mb-4">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.subscriptionTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.subscriptionSubtitle()}</small>
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
{:else if subscription}
  <!-- Current Plan Card -->
  {#if packages.length > 0}
    {@const currentPkg = packages.find(p => p.code === subscription?.planId)}
    <Card class="mb-4">
      <CardBody>
        <div class="d-flex align-items-center">
          <div class="flex-grow-1">
            <h5 class="mb-1">
              <i class="bi bi-gem text-theme me-2"></i>
              {m.subscriptionCurrentPlan()}: {currentPkg ? lt(currentPkg.name) : subscription.planId}
            </h5>
            {#if currentPkg}
              <p class="mb-0 text-inverse text-opacity-75">
                {lt(currentPkg.description)}
              </p>
            {/if}
          </div>
          <div class="text-end">
            <span class="badge rounded-pill bg-success">
              {m.subscriptionStatusActive()}
            </span>
          </div>
        </div>
      </CardBody>
    </Card>
  {/if}

  <!-- Plan Cards -->
  <div class="row g-4">
    {#each packages as pkg (pkg.id)}
      <div class="col-md-4">
        <Card class={isCurrentPlan(pkg) ? 'border-theme bg-theme bg-opacity-10' : ''}>
          <CardBody>
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="mb-1">{lt(pkg.name)}</h5>
                <p class="text-inverse text-opacity-75 small mb-0">
                  {lt(pkg.description)}
                </p>
              </div>
              {#if isCurrentPlan(pkg)}
                <span class="badge bg-theme">{m.subscriptionCurrentPlan()}</span>
              {:else if pkg.ui?.highlight && lt(pkg.ui.badge)}
                <span class="badge bg-theme">{lt(pkg.ui.badge)}</span>
              {/if}
            </div>

            <h3 class="mb-4">
              {#if pkg.billing.price.monthly === 0 && pkg.code === 'enterprise'}
                {m.subscriptionPackagesCustomPricing()}
              {:else if pkg.billing.price.monthly === 0}
                {m.subscriptionFree()}
              {:else}
                {lt(pkg.billing.price.display)}
              {/if}
            </h3>

            <ul class="list-unstyled mb-4">
              {#each pkg.ui?.featureList ?? [] as feature}
                <li class="mb-2">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>
                  {lt(feature.label)}
                </li>
              {/each}
            </ul>

            {#if isCurrentPlan(pkg)}
              <button class="btn btn-outline-theme w-100" disabled>
                {m.subscriptionCurrentPlan()}
              </button>
            {:else if pkg.code === 'enterprise'}
              <button class="btn btn-dark w-100" onclick={openEnterpriseModal}>
                {m.subscriptionActivateEnterprise()}
              </button>
            {:else}
              <button class="btn btn-theme w-100" onclick={() => openUpgradeModal(pkg)}>
                {m.subscriptionUpgrade()}
              </button>
            {/if}
          </CardBody>
        </Card>
      </div>
    {/each}
  </div>
{/if}

<!-- Upgrade Modal -->
{#if showUpgradeModal && upgradePlan}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {m.subscriptionUpgradeTitle()}: {lt(upgradePlan.name)}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showUpgradeModal = false)}></button>
        </div>

        <div class="modal-body">
          {#if upgradeError}
            <div class="alert alert-danger small py-2">{upgradeError}</div>
          {/if}
          <p class="mb-4">{m.subscriptionUpgradeDesc()}</p>

          {#if upgradePlan.billing.supportedCycles.length > 1}
            <div class="mb-3">
              <span class="form-label fw-semibold">{m.subscriptionBillingCycle()}</span>
              <div class="btn-group w-100">
                {#if upgradePlan.billing.supportedCycles.includes('monthly')}
                  <button
                    class="btn btn-sm"
                    class:btn-theme={selectedBillingCycle === 'monthly'}
                    class:btn-outline-theme={selectedBillingCycle !== 'monthly'}
                    onclick={() => (selectedBillingCycle = 'monthly')}
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
                    class:btn-theme={selectedBillingCycle === 'yearly'}
                    class:btn-outline-theme={selectedBillingCycle !== 'yearly'}
                    onclick={() => (selectedBillingCycle = 'yearly')}
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
          <button type="button" class="btn btn-secondary" onclick={() => (showUpgradeModal = false)} disabled={upgradeLoading}>
            {m.actionCancel()}
          </button>
          <button type="button" class="btn btn-theme" onclick={handleUpgrade} disabled={upgradeLoading}>
            {#if upgradeLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {m.actionSubmitting()}
            {:else}
              {m.subscriptionUpgrade()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Enterprise Activation Modal -->
{#if showEnterpriseModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {m.subscriptionEnterpriseTitle()}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showEnterpriseModal = false)}></button>
        </div>

        <div class="modal-body">
          {#if enterpriseError}
            <div class="alert alert-danger small py-2">{enterpriseError}</div>
          {/if}
          <p class="mb-4">{m.subscriptionEnterpriseDesc()}</p>

          <div class="mb-3">
            <label class="form-label fw-semibold" for="licenseKey">
              {m.subscriptionLicenseKey()} <span class="text-danger">*</span>
            </label>
            <input
              id="licenseKey"
              type="text"
              class="form-control font-monospace"
              placeholder="XXXX-YYYY-ZZZZ"
              bind:value={licenseKey}
              required
              disabled={enterpriseLoading}
            />
            <small class="form-text text-inverse text-opacity-50">
              {m.subscriptionLicenseKeyHint()}
            </small>
          </div>

          <div class="alert alert-info small">
            <i class="bi bi-info-circle me-2"></i>
            {m.subscriptionEnterpriseInfo()}
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => (showEnterpriseModal = false)} disabled={enterpriseLoading}>
            {m.actionCancel()}
          </button>
          <button type="button" class="btn btn-dark" onclick={handleEnterpriseActivate} disabled={enterpriseLoading || !licenseKey.trim()}>
            {#if enterpriseLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              {m.actionSubmitting()}
            {:else}
              {m.subscriptionActivateEnterprise()}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
