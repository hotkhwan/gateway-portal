<!-- src/routes/(app)/delivery/targets/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import {
    listTargets,
    createTarget,
    updateTarget,
    deleteTarget,
    isTargetInUseError,
    type TargetInUseTemplateRef
  } from '$lib/api/target'
  import { getCurrentSubscription } from '$lib/api/subscription'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import type { DeliveryTarget, TargetType } from '$lib/types/org'
  import type { CurrentSubscriptionDetails } from '$lib/api/subscription'
  import { resolve } from '$app/paths'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let targets = $state<DeliveryTarget[]>([])
  let effectiveSub = $state<CurrentSubscriptionDetails | null>(null)

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

  // In-use conflict modal (shown when backend returns 409 TARGET_IN_USE)
  let showInUseModal = $state(false)
  let inUseTemplates = $state<TargetInUseTemplateRef[]>([])

  // Quota helpers
  let quotaByType = $derived.by(() => {
    const counts: Record<TargetType, number> = { webhook: 0, line: 0, telegram: 0, discord: 0 }
    for (const t of targets) counts[t.type] = (counts[t.type] ?? 0) + 1
    return counts
  })

  let quotaLimits = $derived.by(() => {
    const lim = effectiveSub?.limits
    return {
      webhook: lim?.webhooksPerOrg ?? Infinity,
      line: lim?.lineTargetsPerOrg ?? Infinity,
      discord: lim?.discordTargetsPerOrg ?? Infinity,
      telegram: lim?.telegramTargetsPerOrg ?? Infinity,
      msgChannels: lim?.messageChannelsPerOrg ?? Infinity
    }
  })

  let msgChannelsUsed = $derived(quotaByType.line + quotaByType.discord + quotaByType.telegram)

  function isQuotaReached(type: TargetType): boolean {
    if (type === 'webhook') return quotaByType.webhook >= quotaLimits.webhook
    if (msgChannelsUsed >= quotaLimits.msgChannels) return true
    if (type === 'line') return quotaByType.line >= quotaLimits.line
    if (type === 'discord') return quotaByType.discord >= quotaLimits.discord
    if (type === 'telegram') return quotaByType.telegram >= quotaLimits.telegram
    return false
  }

  async function loadData() {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      const [t, sub] = await Promise.allSettled([
        listTargets(orgId),
        getCurrentSubscription()
      ])
      targets = t.status === 'fulfilled' ? t.value : []
      effectiveSub = sub.status === 'fulfilled' ? sub.value : null
      if (t.status === 'rejected') throw t.reason
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
    // Canonical BE field names (models/authzmod.TargetConfig):
    //   webhook + discord: url, signingSecret, timeoutMs
    //   line:              channelAccessToken | channelAccessTokenRef, to
    //   telegram:          botToken, chatId
    // Fallbacks to legacy keys (botTokenRef / webhookUrl) are kept ONLY for
    // reading existing rows that were persisted under the old FE field names.
    fWebhookUrl = (cfg.url as string) ?? ''
    fWebhookSigning = (cfg.signingEnabled as boolean) ?? false
    fWebhookSecret = (cfg.signingSecret as string) ?? ''
    fWebhookTimeout = (cfg.timeoutMs as number) ?? 5000
    fLineToken = (cfg.channelAccessToken as string) ?? (cfg.channelAccessTokenRef as string) ?? ''
    fLineTo = Array.isArray(cfg.to) ? (cfg.to as string[]).join(', ') : ((cfg.to as string) ?? '')
    fTelegramToken = (cfg.botToken as string) ?? (cfg.botTokenRef as string) ?? ''
    fTelegramChatId = (cfg.chatId as string) ?? ''
    fDiscordUrl = (cfg.url as string) ?? (cfg.webhookUrl as string) ?? ''
    modalError = null
    showModal = true
  }

  // Client-side validation that mirrors BE's validateConfigForType. The goal
  // is to show inline errors before a 400 round-trip — BE remains the source
  // of truth. On edit, the secret fields (botToken / channelAccessToken /
  // signingSecret) are OPTIONAL because BE's mergeConfigPreservingSecrets
  // keeps the existing value when the incoming field is blank.
  function validateConfig(): string | null {
    const isEdit = !!editTarget
    if (fType === 'telegram') {
      if (!fTelegramChatId.trim()) return m.deliveryConfigTelegramChatIdRequired()
      if (!isEdit && !fTelegramToken.trim()) return m.deliveryConfigTelegramTokenRequired()
    } else if (fType === 'line') {
      const toArr = fLineTo.split(',').map(s => s.trim()).filter(Boolean)
      if (toArr.length === 0) return m.deliveryConfigLineRecipientsRequired()
      if (!isEdit && !fLineToken.trim()) return m.deliveryConfigLineTokenRequired()
    } else if (fType === 'webhook') {
      if (!fWebhookUrl.trim()) return m.deliveryConfigWebhookUrlRequired()
    } else if (fType === 'discord') {
      if (!fDiscordUrl.trim()) return m.deliveryConfigDiscordUrlRequired()
    }
    return null
  }

  function buildConfig(): Record<string, unknown> {
    // Field names MUST match models/authzmod.TargetConfig JSON tags on the
    // backend (gateway-api). Mismatch here silently wipes secrets on save
    // because BE's merge-preserve only keys off canonical field names.
    if (fType === 'webhook') {
      return {
        url: fWebhookUrl,
        signingEnabled: fWebhookSigning,
        ...(fWebhookSigning && fWebhookSecret ? { signingSecret: fWebhookSecret } : {}),
        timeoutMs: fWebhookTimeout
      }
    }
    if (fType === 'line') {
      const toArr = fLineTo.split(',').map(s => s.trim()).filter(Boolean)
      return { channelAccessToken: fLineToken, to: toArr }
    }
    if (fType === 'telegram') return { botToken: fTelegramToken, chatId: fTelegramChatId }
    if (fType === 'discord') return { url: fDiscordUrl }
    return {}
  }

  async function handleSave() {
    const orgId = $activeWorkspaceId
    if (!orgId || !fName.trim()) return
    const validationError = validateConfig()
    if (validationError) { modalError = validationError; return }
    modalLoading = true
    modalError = null
    try {
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
      // BE returns plain CodeBadRequest for all MissingXxx errors — the only
      // discriminator is the message text. Pass it through; the BE message
      // is already user-actionable ("botToken is required for telegram…").
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
    const orgId = $activeWorkspaceId
    if (!orgId || !deleteTarget_id) return
    deleteLoading = true
    try {
      await deleteTarget(orgId, deleteTarget_id)
      targets = targets.filter((t) => t.id !== deleteTarget_id)
      showDeleteModal = false
      deleteTarget_id = null
    } catch (e: unknown) {
      if (isTargetInUseError(e)) {
        // Backend blocked the delete because the target is still assigned to
        // one or more mapping templates. Show conflict modal with the list.
        inUseTemplates = e.details?.templates ?? []
        showDeleteModal = false
        deleteTarget_id = null
        showInUseModal = true
      } else {
        error = (e as { message?: string })?.message ?? m.commonError()
      }
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
      webhook: m.deliveryChannelWebhook(),
      line: m.deliveryChannelLine(),
      telegram: m.deliveryChannelTelegram(),
      discord: m.deliveryChannelDiscord()
    }
    return labels[type] ?? type
  }

  function endpointPreview(t: DeliveryTarget): string {
    const cfg = t.config as unknown as Record<string, unknown>
    if (t.type === 'webhook') return (cfg.url as string) ?? ''
    if (t.type === 'line') return Array.isArray(cfg.to) && cfg.to.length === 0 ? m.deliveryConfigLineBroadcast() : `${(cfg.to as string[])?.length ?? 0} recipients`
    if (t.type === 'telegram') return `Chat: ${cfg.chatId ?? ''}`
    if (t.type === 'discord') return (cfg.url as string) ?? (cfg.webhookUrl as string) ?? ''
    return ''
  }

  onMount(() => {
    setPageTitle(m.deliveryTargetsTitle())
    loadData()
  })

  $effect(() => {
    if ($activeWorkspaceId) loadData()
  })
</script>

<!-- Quota bar -->
{#if effectiveSub && !loading}
  <div class="row g-2 mb-3">
    {#each [
      { label: m.deliveryQuotaWebhook(), used: quotaByType.webhook, limit: quotaLimits.webhook },
      { label: m.deliveryQuotaLine(), used: quotaByType.line, limit: quotaLimits.line },
      { label: m.deliveryQuotaDiscord(), used: quotaByType.discord, limit: quotaLimits.discord },
      { label: m.deliveryQuotaTelegram(), used: quotaByType.telegram, limit: quotaLimits.telegram },
      { label: m.deliveryQuotaMsgChannels(), used: msgChannelsUsed, limit: quotaLimits.msgChannels }
    ] as q}
      <div class="col">
        <div class="card bg-inverse bg-opacity-10 border-0">
          <div class="card-body py-2 px-3 text-center">
            <small class="text-inverse text-opacity-50 d-block">{q.label}</small>
            <span class="fw-semibold" class:text-danger={q.used >= q.limit}>
              {q.used}/{q.limit === Infinity ? '∞' : q.limit}
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Page header -->
<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.deliveryTargetsTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.deliveryTargetsSubtitle()}</small>
  </div>
  <button class="btn btn-outline-theme btn-sm" onclick={openCreate} disabled={!$activeWorkspaceId}>
    <i class="bi bi-plus-lg me-1"></i>
    {m.deliveryTargetsCreate()}
  </button>
</div>

{#if !$activeWorkspaceId}
  <div class="alert alert-warning">
    <i class="bi bi-exclamation-circle me-2"></i>
    {m.workspaceSelectPre()}
    <a href={resolve('/workspaces')} class="alert-link">{m.navWorkspaces()}</a>
    {m.workspaceSelectPost()}
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
{:else if targets.length === 0}
  <Card>
    <CardBody>
      <div class="text-center py-5">
        <i class="bi bi-send fs-1 text-inverse text-opacity-25 d-block mb-3"></i>
        <p class="text-inverse text-opacity-50">{m.deliveryTargetsNoRecords()}</p>
        <button class="btn btn-outline-theme" onclick={openCreate}>
          <i class="bi bi-plus-lg me-1"></i>{m.deliveryTargetsCreate()}
        </button>
      </div>
    </CardBody>
  </Card>
{:else}
  <div class="table-responsive">
    <table class="table table-hover align-middle mb-0">
      <thead>
        <tr>
          <th>{m.deliveryTargetsName()}</th>
          <th>{m.deliveryTargetsType()}</th>
          <th>{m.deliveryTargetsEndpoint()}</th>
          <th>{m.deliveryTargetsStatus()}</th>
          <th>{m.deliveryTargetsCreated()}</th>
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
              <small class="text-inverse text-opacity-50 text-truncate d-inline-block" style="max-width:250px">
                {endpointPreview(t)}
              </small>
            </td>
            <td>
              <span class="badge rounded-pill" class:bg-theme={t.enabled} class:bg-secondary={!t.enabled}>
                {t.enabled ? m.deliveryTargetsEnabled() : m.deliveryTargetsDisabled()}
              </span>
            </td>
            <td><small class="text-inverse text-opacity-50">{new Date(t.createdAt).toLocaleDateString()}</small></td>
            <td class="text-end">
              <button class="btn btn-sm btn-outline-theme me-1" onclick={() => openEdit(t)} title={m.actionEdit()}>
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-sm btn-outline-danger" onclick={() => confirmDelete(t.id)} title={m.actionDelete()}>
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
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title">
            {editTarget ? m.deliveryTargetsEdit() : m.deliveryTargetsCreate()}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showModal = false)}></button>
        </div>

        <form onsubmit={(e) => { e.preventDefault(); handleSave() }}>
          <div class="modal-body">
            {#if modalError}
              <div class="alert alert-danger small py-2">{modalError}</div>
            {/if}

            <!-- Name -->
            <div class="mb-3">
              <label class="form-label fw-semibold" for="tName">
                {m.deliveryTargetsName()} <span class="text-danger">*</span>
              </label>
              <input id="tName" type="text" class="form-control" bind:value={fName} required disabled={modalLoading} />
            </div>

            <!-- Type -->
            <div class="mb-3">
              <label class="form-label fw-semibold" for="tType">{m.deliveryTargetsType()}</label>
              <select id="tType" class="form-select" bind:value={fType} disabled={!!editTarget || modalLoading}>
                {#each (['webhook', 'line', 'telegram', 'discord'] as const) as typ}
                  <option value={typ} disabled={!editTarget && isQuotaReached(typ)}>
                    {typeLabel(typ)}
                    {#if !editTarget && isQuotaReached(typ)} — {m.deliveryQuotaReached()}{/if}
                  </option>
                {/each}
              </select>
            </div>

            <!-- Enabled toggle -->
            <div class="mb-3 form-check form-switch">
              <input id="tEnabled" type="checkbox" class="form-check-input" bind:checked={fEnabled} disabled={modalLoading} />
              <label class="form-check-label" for="tEnabled">
                {fEnabled ? m.deliveryTargetsEnabled() : m.deliveryTargetsDisabled()}
              </label>
            </div>

            <hr />

            <!-- Webhook config -->
            {#if fType === 'webhook'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="wUrl">{m.deliveryConfigWebhookUrl()} <span class="text-danger">*</span></label>
                <input id="wUrl" type="url" class="form-control" placeholder={m.deliveryConfigWebhookUrlPlaceholder()} bind:value={fWebhookUrl} required disabled={modalLoading} />
              </div>
              <div class="mb-3 form-check form-switch">
                <input id="wSigning" type="checkbox" class="form-check-input" bind:checked={fWebhookSigning} disabled={modalLoading} />
                <label class="form-check-label" for="wSigning">{m.deliveryConfigWebhookSigning()}</label>
              </div>
              {#if fWebhookSigning}
                <div class="mb-3">
                  <label class="form-label fw-semibold" for="wSecret">{m.deliveryConfigWebhookSigningSecret()}</label>
                  <input id="wSecret" type="password" class="form-control font-monospace" bind:value={fWebhookSecret} disabled={modalLoading} autocomplete="off"
                    placeholder={editTarget ? '••••••••' : ''} />
                  {#if editTarget}
                    <div class="form-text">{m.deliveryConfigSecretKeepExisting()}</div>
                  {/if}
                </div>
              {/if}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="wTimeout">{m.deliveryConfigWebhookTimeout()}</label>
                <input id="wTimeout" type="number" class="form-control" bind:value={fWebhookTimeout} min={1000} max={30000} step={500} disabled={modalLoading} />
              </div>
            {/if}

            <!-- LINE config -->
            {#if fType === 'line'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="lineToken">
                  {m.deliveryConfigLineToken()}
                  {#if !editTarget}<span class="text-danger">*</span>{/if}
                </label>
                <input id="lineToken" type="password" class="form-control" bind:value={fLineToken} required={!editTarget} disabled={modalLoading} autocomplete="off"
                  placeholder={editTarget ? '••••••••' : ''} />
                {#if editTarget}
                  <div class="form-text">{m.deliveryConfigSecretKeepExisting()}</div>
                {/if}
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold" for="lineTo">{m.deliveryConfigLineTo()}</label>
                <input id="lineTo" type="text" class="form-control" bind:value={fLineTo} disabled={modalLoading} placeholder="U1234, U5678" />
                <div class="form-text">{m.deliveryConfigLineToHint()}</div>
              </div>
            {/if}

            <!-- Telegram config -->
            {#if fType === 'telegram'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="tgToken">
                  {m.deliveryConfigTelegramToken()}
                  {#if !editTarget}<span class="text-danger">*</span>{/if}
                </label>
                <input id="tgToken" type="password" class="form-control" bind:value={fTelegramToken} required={!editTarget} disabled={modalLoading} autocomplete="off"
                  placeholder={editTarget ? '••••••••' : ''} />
                {#if editTarget}
                  <div class="form-text">{m.deliveryConfigSecretKeepExisting()}</div>
                {/if}
              </div>
              <div class="mb-3">
                <label class="form-label fw-semibold" for="tgChat">{m.deliveryConfigTelegramChatId()} <span class="text-danger">*</span></label>
                <input id="tgChat" type="text" class="form-control" bind:value={fTelegramChatId} required disabled={modalLoading} />
              </div>
            {/if}

            <!-- Discord config -->
            {#if fType === 'discord'}
              <div class="mb-3">
                <label class="form-label fw-semibold" for="dsUrl">{m.deliveryConfigDiscordWebhookUrl()} <span class="text-danger">*</span></label>
                <input id="dsUrl" type="url" class="form-control" placeholder={m.deliveryConfigWebhookUrlPlaceholder()} bind:value={fDiscordUrl} required disabled={modalLoading} />
              </div>
            {/if}
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick={() => (showModal = false)} disabled={modalLoading}>{m.actionCancel()}</button>
            <button type="submit" class="btn btn-theme" disabled={modalLoading || !fName.trim() || (!editTarget && isQuotaReached(fType))}>
              {#if modalLoading}
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
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

<!-- Target In-Use conflict modal (409 TARGET_IN_USE) -->
{#if showInUseModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header">
          <h5 class="modal-title text-warning">
            <i class="bi bi-shield-exclamation me-2"></i>
            {m.deliveryTargetsInUseTitle()}
          </h5>
          <button type="button" class="btn-close" aria-label={m.actionClose()} onclick={() => (showInUseModal = false)}></button>
        </div>
        <div class="modal-body">
          <p class="small text-inverse text-opacity-75">{m.deliveryTargetsInUseMessage()}</p>
          <ul class="list-group list-group-flush">
            {#each inUseTemplates as tmpl (tmpl.templateId)}
              <li class="list-group-item bg-transparent px-0 d-flex align-items-center">
                <i class="bi bi-diagram-3 me-2 text-inverse text-opacity-50"></i>
                <div class="flex-grow-1">
                  <div class="fw-semibold">{tmpl.name}</div>
                  <small class="font-monospace text-inverse text-opacity-50">{tmpl.templateId}</small>
                </div>
              </li>
            {/each}
          </ul>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick={() => (showInUseModal = false)}>{m.actionClose()}</button>
          <a class="btn btn-theme" href={resolve('/ingest/templates')}>
            <i class="bi bi-box-arrow-up-right me-1"></i>
            {m.deliveryTargetsInUseGoToTemplates()}
          </a>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}

<!-- Delete confirm modal -->
{#if showDeleteModal}
  <div class="modal d-block" tabindex="-1" role="dialog" aria-modal="true">
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content bg-inverse-subtle">
        <div class="modal-header border-0 pb-0">
          <h6 class="modal-title text-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            {m.deliveryTargetsDeleteConfirm()}
          </h6>
        </div>
        <div class="modal-body small text-inverse text-opacity-60">
          {m.deliveryTargetsDeleteWarning()}
        </div>
        <div class="modal-footer border-0 pt-0">
          <button class="btn btn-sm btn-secondary" onclick={() => { showDeleteModal = false; deleteTarget_id = null }} disabled={deleteLoading}>
            {m.actionCancel()}
          </button>
          <button class="btn btn-sm btn-danger" onclick={handleDelete} disabled={deleteLoading}>
            {#if deleteLoading}
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            {/if}
            {m.actionDelete()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
