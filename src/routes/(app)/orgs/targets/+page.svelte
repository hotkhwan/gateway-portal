<!-- src/routes/(app)/orgs/targets/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeOrg } from '$lib/stores/activeOrg'
  import {
    listTargets,
    createTarget,
    updateTarget,
    deleteTarget
  } from '$lib/api/target'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type { DeliveryTarget, TargetType } from '$lib/types/org'

  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let targets = $state<DeliveryTarget[]>([])

  // Modal state
  let showModal = $state(false)
  let editTarget = $state<DeliveryTarget | null>(null)
  let modalLoading = $state(false)
  let modalError = $state<string | null>(null)

  // Form state
  let fName = $state('')
  let fType = $state<TargetType>('webhook')
  let fEnabled = $state(true)
  // webhook
  let fWebhookUrl = $state('')
  let fWebhookSigning = $state(false)
  let fWebhookSecret = $state('')
  let fWebhookTimeout = $state(5000)
  // line
  let fLineToken = $state('')
  let fLineTo = $state('')
  // telegram
  let fTelegramToken = $state('')
  let fTelegramChatId = $state('')
  // discord
  let fDiscordUrl = $state('')

  // Delete modal
  let showDeleteModal = $state(false)
  let deleteTarget_id = $state<string | null>(null)
  let deleteLoading = $state(false)

  async function loadTargets() {
    const orgId = $activeOrg?.id
    if (!orgId) {
      loading = false
      return
    }
    loading = true
    error = null
    try {
      targets = await listTargets(orgId)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  function openCreate() {
    editTarget = null
    fName = ''
    fType = 'webhook'
    fEnabled = true
    fWebhookUrl = ''
    fWebhookSigning = false
    fWebhookSecret = ''
    fWebhookTimeout = 5000
    fLineToken = ''
    fLineTo = ''
    fTelegramToken = ''
    fTelegramChatId = ''
    fDiscordUrl = ''
    modalError = null
    showModal = true
  }

  function openEdit(t: DeliveryTarget) {
    editTarget = t
    fName = t.name
    fType = t.type
    fEnabled = t.enabled
    const cfg = t.config as unknown as Record<string, unknown>
    fWebhookUrl = (cfg.url as string) ?? ''
    fWebhookSigning = (cfg.signingEnabled as boolean) ?? false
    fWebhookSecret = (cfg.signingSecret as string) ?? ''
    fWebhookTimeout = (cfg.timeoutMs as number) ?? 5000
    fLineToken = (cfg.channelAccessTokenRef as string) ?? ''
    fLineTo = (cfg.to as string) ?? ''
    fTelegramToken = (cfg.botTokenRef as string) ?? ''
    fTelegramChatId = (cfg.chatId as string) ?? ''
    fDiscordUrl = (cfg.webhookUrl as string) ?? ''
    modalError = null
    showModal = true
  }

  function buildConfig(): Record<string, unknown> {
    if (fType === 'webhook') {
      return {
        url: fWebhookUrl,
        signingEnabled: fWebhookSigning,
        ...(fWebhookSigning && fWebhookSecret
          ? { signingSecret: fWebhookSecret }
          : {}),
        timeoutMs: fWebhookTimeout
      }
    }
    if (fType === 'line')
      return { channelAccessTokenRef: fLineToken, to: fLineTo }
    if (fType === 'telegram')
      return { botTokenRef: fTelegramToken, chatId: fTelegramChatId }
    if (fType === 'discord') return { webhookUrl: fDiscordUrl }
    return {}
  }

  async function handleSave() {
    const orgId = $activeOrg?.id
    if (!orgId || !fName.trim()) return
    modalLoading = true
    modalError = null
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload = {
        name: fName.trim(),
        type: fType,
        enabled: fEnabled,
        config: buildConfig() as any
      }
      if (editTarget) {
        const updated = await updateTarget(orgId, editTarget.id, payload)
        targets = targets.map((t) => (t.id === updated.id ? updated : t))
      } else {
        const created = await createTarget(orgId, payload)
        targets = [...targets, created]
      }
      showModal = false
    } catch (e: unknown) {
      modalError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      modalLoading = false
    }
  }

  function confirmDelete(id: string) {
    deleteTarget_id = id
    showDeleteModal = true
  }

  async function handleDelete() {
    const orgId = $activeOrg?.id
    if (!orgId || !deleteTarget_id) return
    deleteLoading = true
    try {
      await deleteTarget(orgId, deleteTarget_id)
      targets = targets.filter((t) => t.id !== deleteTarget_id)
      showDeleteModal = false
      deleteTarget_id = null
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      deleteLoading = false
    }
  }

  function typeIcon(type: TargetType): string {
    const icons: Record<TargetType, string> = {
      webhook: 'bi-braces',
      line: 'bi-chat-dots',
      telegram: 'bi-telegram',
      discord: 'bi-discord'
    }
    return icons[type] ?? 'bi-send'
  }

  function typeLabel(type: TargetType): string {
    const labels: Record<TargetType, string> = {
      webhook: m.targetTypeWebhook(),
      line: m.targetTypeLine(),
      telegram: m.targetTypeTelegram(),
      discord: m.targetTypeDiscord()
    }
    return labels[type] ?? type
  }

  onMount(() => {
    setPageTitle(m.targetTitle())
    loadTargets()
  })

  // Reload when active org changes
  $effect(() => {
    if ($activeOrg?.id) loadTargets()
  })
</script>

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.targetTitle()}</h1>
    {#if $activeOrg}
      <small class="text-inverse text-opacity-50">
        <i class="bi bi-building me-1"></i>{$activeOrg.name}
      </small>
    {/if}
  </div>
  <button
    class="btn btn-outline-theme btn-sm"
    onclick={openCreate}
    disabled={!$activeOrg}
  >
    <i class="bi bi-plus-lg me-1"></i>
    {m.targetCreateBtn()}
  </button>
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
    <button class="btn btn-sm btn-danger ms-2" onclick={loadTargets}
      >{m.actionRefresh()}</button
    >
  </div>
{:else if targets.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-send fs-1 text-inverse text-opacity-25 d-block mb-3"
        ></i>
        <p class="text-inverse text-opacity-50">{m.targetNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={openCreate}>
          <i class="bi bi-plus-lg me-1"></i>{m.targetCreateBtn()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.targetName()}</th>
          <th>{m.targetType()}</th>
          <th>{m.targetStatus()}</th>
          <th class="text-end"></th>
        </tr>
      </thead>
      <tbody>
        {#each targets as t (t.id)}
          <tr>
            <td class="fw-semibold">{t.name}</td>
            <td>
              <span class="badge bg-inverse bg-opacity-25 text-inverse">
                <i class="bi {typeIcon(t.type)} me-1"></i>
                {typeLabel(t.type)}
              </span>
            </td>
            <td>
              <span
                class="badge rounded-pill"
                class:bg-theme={t.enabled}
                class:bg-secondary={!t.enabled}
              >
                {t.enabled ? m.targetEnabled() : m.targetDisabled()}
              </span>
            </td>
            <td class="text-end">
              <button
                class="btn btn-sm btn-outline-theme me-1"
                onclick={() => openEdit(t)}
                title={m.actionEdit()}
              >
                <i class="bi bi-pencil"></i>
              </button>
              <button
                class="btn btn-sm btn-outline-danger"
                onclick={() => confirmDelete(t.id)}
                title={m.actionDelete()}
              >
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

<!-- Create/Edit Modal -->
{#if showModal}
  <div
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"
    >
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {editTarget ? m.targetEditTitle() : m.targetCreateTitle()}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={() => (showModal = false)}
          ></button>
        </div>

        <form
          onsubmit={(e) => {
            e.preventDefault()
            handleSave()
          }}
        >
          <div class="modal-body">
            {#if modalError}
              <div class="alert alert-danger small py-2">{modalError}</div>
            {/if}

            <!-- Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold" for="tName">
                {m.targetName()} <span class="text-danger">*</span>
              </label>
              <input
                id="tName"
                type="text"
                class="form-control"
                placeholder={m.targetNamePlaceholder()}
                bind:value={fName}
                required
                disabled={modalLoading}
              />
            </div>

            <!-- Type -->
            <div class="mb-3">
              <label class="form-label fw-semibold" for="tType">
                {m.targetType()}
              </label>
              <select
                id="tType"
                class="form-select"
                bind:value={fType}
                disabled={!!editTarget || modalLoading}
              >
                <option value="webhook">{m.targetTypeWebhook()}</option>
                <option value="line">{m.targetTypeLine()}</option>
                <option value="telegram">{m.targetTypeTelegram()}</option>
                <option value="discord">{m.targetTypeDiscord()}</option>
              </select>
            </div>

            <!-- Enabled toggle -->
            <div class="mb-3 form-check form-switch">
              <input
                id="tEnabled"
                type="checkbox"
                class="form-check-input"
                bind:checked={fEnabled}
                disabled={modalLoading}
              />
              <label class="form-check-label" for="tEnabled">
                {fEnabled ? m.targetEnabled() : m.targetDisabled()}
              </label>
            </div>

            <hr />

            <!-- Webhook config -->
            {#if fType === 'webhook'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="wUrl">
                  {m.targetWebhookUrl()} <span class="text-danger">*</span>
                </label>
                <input
                  id="wUrl"
                  type="url"
                  class="form-control"
                  placeholder={m.targetWebhookUrlPlaceholder()}
                  bind:value={fWebhookUrl}
                  required
                  disabled={modalLoading}
                />
              </div>
              <div class="mb-3 d-flex gap-3">
                <div class="form-check form-switch">
                  <input
                    id="wSigning"
                    type="checkbox"
                    class="form-check-input"
                    bind:checked={fWebhookSigning}
                    disabled={modalLoading}
                  />
                  <label class="form-check-label" for="wSigning">
                    {m.targetWebhookSigning()}
                  </label>
                </div>
              </div>
              {#if fWebhookSigning}
                <div class="mb-3">
                  <label class="form-label fw-semibold" for="wSecret">
                    {m.targetWebhookSigningSecret()}
                  </label>
                  <input
                    id="wSecret"
                    type="password"
                    class="form-control font-monospace"
                    bind:value={fWebhookSecret}
                    disabled={modalLoading}
                    autocomplete="off"
                  />
                </div>
              {/if}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="wTimeout">
                  {m.targetWebhookTimeout()}
                </label>
                <input
                  id="wTimeout"
                  type="number"
                  class="form-control"
                  bind:value={fWebhookTimeout}
                  min={1000}
                  max={30000}
                  step={500}
                  disabled={modalLoading}
                />
              </div>
            {/if}

            <!-- LINE config -->
            {#if fType === 'line'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="lineToken">
                  {m.targetLineToken()} <span class="text-danger">*</span>
                </label>
                <input
                  id="lineToken"
                  type="password"
                  class="form-control"
                  bind:value={fLineToken}
                  required
                  disabled={modalLoading}
                  autocomplete="off"
                />
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold" for="lineTo">
                  {m.targetLineTo()} <span class="text-danger">*</span>
                </label>
                <input
                  id="lineTo"
                  type="text"
                  class="form-control"
                  bind:value={fLineTo}
                  required
                  disabled={modalLoading}
                />
              </div>
            {/if}

            <!-- Telegram config -->
            {#if fType === 'telegram'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="tgToken">
                  {m.targetTelegramToken()} <span class="text-danger">*</span>
                </label>
                <input
                  id="tgToken"
                  type="password"
                  class="form-control"
                  bind:value={fTelegramToken}
                  required
                  disabled={modalLoading}
                  autocomplete="off"
                />
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold" for="tgChat">
                  {m.targetTelegramChatId()} <span class="text-danger">*</span>
                </label>
                <input
                  id="tgChat"
                  type="text"
                  class="form-control"
                  bind:value={fTelegramChatId}
                  required
                  disabled={modalLoading}
                />
              </div>
            {/if}

            <!-- Discord config -->
            {#if fType === 'discord'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="dsUrl">
                  {m.targetDiscordWebhookUrl()}
                  <span class="text-danger">*</span>
                </label>
                <input
                  id="dsUrl"
                  type="url"
                  class="form-control"
                  placeholder={m.targetWebhookUrlPlaceholder()}
                  bind:value={fDiscordUrl}
                  required
                  disabled={modalLoading}
                />
              </div>
            {/if}
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              onclick={() => (showModal = false)}
              disabled={modalLoading}
            >
              {m.actionCancel()}
            </button>
            <button
              type="submit"
              class="btn btn-theme"
              disabled={modalLoading || !fName.trim()}
            >
              {#if modalLoading}
                <span
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
                {m.actionSubmitting()}
              {:else}
                {editTarget ? m.actionSave() : m.actionCreate()}
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete confirm modal -->
{#if showDeleteModal}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {m.targetDeleteConfirm()}
          </h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">
          {m.targetDeleteWarning()}
        </div>
        <div class="modal-footer border-0 pt-0">
          <button
            class="btn btn-sm btn-secondary"
            onclick={() => {
              showDeleteModal = false
              deleteTarget_id = null
            }}
            disabled={deleteLoading}
          >
            {m.actionCancel()}
          </button>
          <button
            class="btn btn-sm btn-danger"
            onclick={handleDelete}
            disabled={deleteLoading}
          >
            {#if deleteLoading}
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
            {/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
