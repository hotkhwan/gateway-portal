<!-- src/routes/(app)/subscription/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { PLANS, type PlanId, type BillingCycle } from '$lib/api/subscription'
  import {
    bootstrapSubscription,
    getSubscription,
    changePlan,
    activateEnterprise
  } from '$lib/api/subscription'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type { Subscription } from '$lib/api/subscription'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let subscription = $state<Subscription | null>(null)

  // Upgrade modal state
  let showUpgradeModal = $state(false)
  let upgradeLoading = $state(false)
  let upgradeError = $state<string | null>(null)
  let selectedPlan = $state<PlanId>('pro')
  let selectedBillingCycle = $state<BillingCycle>('monthly')

  // Enterprise modal state
  let showEnterpriseModal = $state(false)
  let enterpriseLoading = $state(false)
  let enterpriseError = $state<string | null>(null)
  let licenseKey = $state('')

  async function loadSubscription() {
    loading = true
    error = null
    try {
      subscription = await getSubscription()
    } catch (e: unknown) {
      // If no subscription exists, bootstrap one
      try {
        subscription = await bootstrapSubscription()
      } catch (e2: unknown) {
        error = (e2 as { message?: string })?.message ?? m.commonError()
      }
    } finally {
      loading = false
    }
  }

  function openUpgradeModal(planId: PlanId) {
    selectedPlan = planId
    selectedBillingCycle = 'monthly'
    upgradeError = null
    showUpgradeModal = true
  }

  async function handleUpgrade() {
    upgradeLoading = true
    upgradeError = null
    try {
      subscription = await changePlan(selectedPlan, selectedBillingCycle)
      showUpgradeModal = false
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
    } catch (e: unknown) {
      enterpriseError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      enterpriseLoading = false
    }
  }

  function getPlanStatusClass(planId: PlanId): string {
    if (!subscription) return ''
    if (subscription.planId === planId) return 'border-theme bg-theme bg-opacity-10'
    return ''
  }

  function getPlanBadge(planId: PlanId): string {
    if (!subscription) return ''
    if (subscription.planId === planId) return m.subscriptionCurrentPlan()
    return ''
  }

  function formatPrice(price: number, cycle: BillingCycle): string {
    if (price === 0) return m.subscriptionFree()
    return `$${price}${cycle === 'monthly' ? m.subscriptionPerMonth() : m.subscriptionPerYear()}`
  }

  onMount(() => {
    setPageTitle(m.subscriptionTitle())
    loadSubscription()
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadSubscription}
      >{m.actionRefresh()}</button
    >
  </div>
{:else if subscription}
  <!-- Current Plan Card -->
  <Card class="mb-4">
    <CardBody>
      <div class="d-flex align-items-center">
        <div class="flex-grow-1">
          <h5 class="mb-1">
            <i class="bi bi-gem text-theme me-2"></i>
            {m.subscriptionCurrentPlan()}: {PLANS[subscription.planId].name}
          </h5>
          <p class="mb-0 text-inverse text-opacity-75">
            {PLANS[subscription.planId].description}
          </p>
        </div>
        <div class="text-end">
          <span
            class="badge rounded-pill"
            class:bg-success={subscription.status === 'active'}
            class:bg-warning={subscription.status === 'pending'}
            class:bg-danger={subscription.status === 'cancelled'}
            class:bg-secondary={subscription.status === 'inactive'}
          >
            {subscription.status.toUpperCase()}
          </span>
        </div>
      </div>
    </CardBody>
  </Card>

  <!-- Plan Cards -->
  <div class="row g-4">
    {#each Object.values(PLANS) as plan (plan.id)}
      <div class="col-md-4">
        <Card class={getPlanStatusClass(plan.id)}>
          <CardBody>
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h5 class="mb-1">{plan.name}</h5>
                <p class="text-inverse text-opacity-75 small mb-0">
                  {plan.description}
                </p>
              </div>
              {#if getPlanBadge(plan.id)}
                <span class="badge bg-theme">{getPlanBadge(plan.id)}</span>
              {/if}
            </div>

            <h3 class="mb-4">
              {formatPrice(plan.price, plan.billingCycle)}
            </h3>

            <ul class="list-unstyled mb-4">
              {#each plan.features as feature}
                <li class="mb-2">
                  <i class="bi bi-check-circle-fill text-success me-2"></i>
                  {feature}
                </li>
              {/each}
            </ul>

            {#if subscription.planId !== plan.id}
              <button
                class="btn w-100"
                class:btn-outline-theme={plan.id === 'freemium'}
                class:btn-theme={plan.id === 'pro'}
                class:btn-dark={plan.id === 'enterprise'}
                disabled={subscription.planId === 'enterprise'}
                onclick={() => {
                  if (plan.id === 'enterprise') openEnterpriseModal()
                  else openUpgradeModal(plan.id)
                }}
              >
                {#if plan.id === 'enterprise'}
                  {m.subscriptionActivateEnterprise()}
                {:else}
                  {m.subscriptionUpgrade()}
                {/if}
              </button>
            {:else}
              <button class="btn btn-outline-theme w-100" disabled>
                {m.subscriptionCurrentPlan()}
              </button>
            {/if}
          </CardBody>
        </Card>
      </div>
    {/each}
  </div>
{/if}

<!-- Upgrade Modal -->
{#if showUpgradeModal}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {m.subscriptionUpgradeTitle()}: {PLANS[selectedPlan].name}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={() => (showUpgradeModal = false)}
          ></button>
        </div>

        {#if upgradeError}
          <div class="modal-body">
            <div class="alert alert-danger small py-2">{upgradeError}</div>
          </div>
        {/if}

        <div class="modal-body">
          <p class="mb-4">{m.subscriptionUpgradeDesc()}</p>

          <fieldset class="mb-4">
            <legend class="form-label fw-semibold mb-2">{m.subscriptionBillingCycle()}</legend>
            <div class="btn-group w-100" role="group">
              <input
                type="radio"
                class="btn-check"
                name="billingCycle"
                id="cycleMonthly"
                value="monthly"
                bind:group={selectedBillingCycle}
              />
              <label class="btn btn-outline-theme" for="cycleMonthly">
                {m.subscriptionMonthly()}
              </label>

              <input
                type="radio"
                class="btn-check"
                name="billingCycle"
                id="cycleYearly"
                value="yearly"
                bind:group={selectedBillingCycle}
              />
              <label class="btn btn-outline-theme" for="cycleYearly">
                {m.subscriptionYearly()} <span class="badge bg-success ms-1">-20%</span>
              </label>
            </div>
          </fieldset>
        </div>

        <div class="alert alert-info small">
          <i class="bi bi-info-circle me-2"></i>
          {m.subscriptionUpgradeInfo()} {formatPrice(
            PLANS[selectedPlan].price,
            selectedBillingCycle
          )}
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => (showUpgradeModal = false)}
            disabled={upgradeLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-theme"
            onclick={handleUpgrade}
            disabled={upgradeLoading}
          >
            {#if upgradeLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
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
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {m.subscriptionEnterpriseTitle()}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label="Close"
            onclick={() => (showEnterpriseModal = false)}
          ></button>
        </div>

        {#if enterpriseError}
          <div class="modal-body">
            <div class="alert alert-danger small py-2">{enterpriseError}</div>
          </div>
        {/if}

        <div class="modal-body">
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
          <button
            type="button"
            class="btn btn-secondary"
            onclick={() => (showEnterpriseModal = false)}
            disabled={enterpriseLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            type="button"
            class="btn btn-dark"
            onclick={handleEnterpriseActivate}
            disabled={enterpriseLoading || !licenseKey.trim()}
          >
            {#if enterpriseLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
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
