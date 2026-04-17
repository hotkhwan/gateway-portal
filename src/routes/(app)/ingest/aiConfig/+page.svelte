<!-- src/routes/(app)/ingest/aiConfig/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { activeWorkspaceId } from '$lib/stores/activeWorkspace'
  import {
    getAIConfig,
    upsertAIConfig,
    clearAIApiKey,
    validateAIConfig
  } from '$lib/api/aiMapping'
  import type { WorkspaceAIConfig } from '$lib/types/aiMapping'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  let loading = $state(true)
  let error = $state<string | null>(null)
  let saveLoading = $state(false)
  let saveError = $state<string | null>(null)
  let saveSuccess = $state<string | null>(null)
  let validateLoading = $state(false)
  let validateResult = $state<{ ok: boolean; latencyMs?: number; error?: string } | null>(null)
  let clearLoading = $state(false)
  let showClearConfirm = $state(false)

  let config = $state<WorkspaceAIConfig | null>(null)

  // Form fields
  let formEnabled = $state(true)
  let formProvider = $state('gemini')
  let formModel = $state('gemini-2.5-flash')
  let formApiKey = $state('')

  const MODELS: Record<string, string[]> = {
    gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3-flash-preview'],
    openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    claude: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6']
  }

  function onProviderChange() {
    const models = MODELS[formProvider] ?? []
    formModel = models[0] ?? ''
  }

  async function load() {
    const orgId = $activeWorkspaceId
    if (!orgId) { loading = false; return }
    loading = true
    error = null
    try {
      config = await getAIConfig(orgId)
      if (config) {
        formEnabled = config.enabled
        formProvider = config.provider || 'gemini'
        formModel = config.model || (MODELS[formProvider]?.[0] ?? '')
      }
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function handleSave() {
    const orgId = $activeWorkspaceId
    if (!orgId) return
    saveLoading = true
    saveError = null
    saveSuccess = null
    validateResult = null
    try {
      const body: { provider: string; model: string; enabled: boolean; apiKey?: string } = {
        provider: formProvider,
        model: formModel,
        enabled: formEnabled
      }
      if (formApiKey.trim()) body.apiKey = formApiKey.trim()
      config = await upsertAIConfig(orgId, body)
      formApiKey = ''
      saveSuccess = m.aiConfigSaved()
      setTimeout(() => { saveSuccess = null }, 4000)
    } catch (e: unknown) {
      saveError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      saveLoading = false
    }
  }

  async function handleValidate() {
    const orgId = $activeWorkspaceId
    if (!orgId) return
    validateLoading = true
    validateResult = null
    saveError = null
    try {
      // Save current form first so validate uses the latest config
      const body: { provider: string; model: string; enabled: boolean; apiKey?: string } = {
        provider: formProvider,
        model: formModel,
        enabled: formEnabled
      }
      if (formApiKey.trim()) body.apiKey = formApiKey.trim()
      config = await upsertAIConfig(orgId, body)
      formApiKey = ''
      // Then validate
      validateResult = await validateAIConfig(orgId)
    } catch (e: unknown) {
      validateResult = { ok: false, error: (e as { message?: string })?.message ?? m.commonError() }
    } finally {
      validateLoading = false
    }
  }

  async function handleClearKey() {
    const orgId = $activeWorkspaceId
    if (!orgId) return
    clearLoading = true
    try {
      await clearAIApiKey(orgId)
      showClearConfirm = false
      config = await getAIConfig(orgId)
      saveSuccess = m.aiConfigSaved()
      setTimeout(() => { saveSuccess = null }, 4000)
    } catch (e: unknown) {
      saveError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      clearLoading = false
    }
  }

  function modeBadge(mode: string): string {
    return mode === 'userKey' ? 'bg-success' : 'bg-secondary'
  }

  $effect(() => {
    setPageTitle(m.aiConfigTitle())
    untrack(() => load())
  })
</script>

<div class="d-flex align-items-center mb-3">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.aiConfigTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.aiConfigSubtitle()}</small>
  </div>
</div>

{#if saveSuccess}
  <div class="alert alert-success alert-dismissible mb-3">
    <i class="bi bi-check-circle me-2"></i>{saveSuccess}
    <button type="button" class="btn-close" onclick={() => (saveSuccess = null)}></button>
  </div>
{/if}

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>
{:else if error}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{error}
    <button class="btn btn-sm btn-danger ms-2" onclick={load}>{m.actionRefresh()}</button>
  </div>
{:else}
  <div class="row g-4">
    <div class="col-lg-7">
      <Card>
        <CardBody>
          <!-- Enable toggle -->
          <div class="d-flex align-items-center mb-4">
            <div class="flex-grow-1">
              <div class="fw-semibold">{m.aiConfigEnabled()}</div>
            </div>
            <div class="form-check form-switch mb-0">
              <input
                class="form-check-input"
                type="checkbox"
                role="switch"
                id="aiEnabled"
                bind:checked={formEnabled}
              />
            </div>
          </div>

          <!-- Provider -->
          <div class="mb-3">
            <label class="form-label fw-semibold" for="aiProvider">{m.aiConfigProvider()}</label>
            <select
              id="aiProvider"
              class="form-select"
              bind:value={formProvider}
              onchange={onProviderChange}
              disabled={saveLoading}
            >
              <option value="gemini">Gemini (Google)</option>
              <option value="openai">OpenAI</option>
              <option value="claude">Claude (Anthropic)</option>
            </select>
          </div>

          <!-- Model -->
          <div class="mb-3">
            <label class="form-label fw-semibold" for="aiModel">{m.aiConfigModel()}</label>
            <select
              id="aiModel"
              class="form-select"
              bind:value={formModel}
              disabled={saveLoading}
            >
              {#each MODELS[formProvider] ?? [] as model}
                <option value={model}>{model}</option>
              {/each}
            </select>
          </div>

          <!-- API Key -->
          <div class="mb-3">
            <label class="form-label fw-semibold" for="aiApiKey">
              {m.aiConfigApiKey()}
              {#if config?.hasKey}
                <span class="badge bg-success ms-2 fw-normal">{m.aiConfigApiKeySet()}</span>
              {:else}
                <span class="badge bg-secondary ms-2 fw-normal">{m.aiConfigApiKeyNotSet()}</span>
              {/if}
            </label>
            <input
              id="aiApiKey"
              type="password"
              class="form-control font-monospace"
              placeholder={config?.hasKey ? '••••••••••••••••' : m.aiConfigApiKey()}
              bind:value={formApiKey}
              disabled={saveLoading}
              autocomplete="off"
            />
            <div class="form-text text-inverse text-opacity-50">All providers require an API key. Key is encrypted at rest.</div>
          </div>

          <!-- Current mode badge -->
          {#if config}
            <div class="mb-4">
              <span class="badge {modeBadge(config.providerMode)}">
                {config.hasKey ? m.aiConfigModeUserKey() : m.aiConfigApiKeyNotSet()}
              </span>
            </div>
          {/if}

          {#if saveError}
            <div class="alert alert-danger small py-2 mb-3">{saveError}</div>
          {/if}

          <!-- Validate result -->
          {#if validateResult}
            <div class="alert {validateResult.ok ? 'alert-success' : 'alert-danger'} small py-2 mb-3">
              <i class="bi {validateResult.ok ? 'bi-check-circle' : 'bi-x-circle'} me-2"></i>
              {#if validateResult.ok}
                {m.aiConfigValidateOk()}
                {#if validateResult.latencyMs}
                  <span class="ms-2 text-muted">({validateResult.latencyMs}ms)</span>
                {/if}
              {:else}
                {m.aiConfigValidateFail()}
                {#if validateResult.error}
                  <span class="ms-2">— {validateResult.error}</span>
                {/if}
              {/if}
            </div>
          {/if}

          <!-- Actions -->
          <div class="d-flex gap-2 flex-wrap">
            {#if config?.hasKey}
              <button
                class="btn btn-outline-danger btn-sm"
                onclick={() => (showClearConfirm = true)}
                disabled={saveLoading || clearLoading}
              >
                <i class="bi bi-key me-1"></i>{m.aiConfigClearKey()}
              </button>
            {/if}
            <button
              class="btn btn-outline-secondary btn-sm"
              onclick={handleValidate}
              disabled={validateLoading || saveLoading}
            >
              {#if validateLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>
              {:else}
                <i class="bi bi-lightning me-1"></i>
              {/if}
              {validateLoading ? m.aiConfigValidating() : m.aiConfigValidate()}
            </button>
            <button
              class="btn btn-theme ms-auto"
              onclick={handleSave}
              disabled={saveLoading}
            >
              {#if saveLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>
              {/if}
              {m.actionSave()}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- Info panel -->
    <div class="col-lg-5">
      <Card>
        <CardBody>
          <h6 class="fw-semibold mb-3"><i class="bi bi-info-circle me-2 text-theme"></i>Provider Info</h6>
          {#if formProvider === 'gemini'}
            <p class="small text-inverse text-opacity-75 mb-2">
              รับ API key ได้ที่:
            </p>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm btn-outline-secondary w-100 mb-3 text-start"
            >
              <i class="bi bi-box-arrow-up-right me-2"></i>aistudio.google.com/apikey
            </a>
            <p class="small text-inverse text-opacity-75 mb-0">
              แนะนำ <code>gemini-2.5-flash</code> — รุ่นใหม่ล่าสุด รองรับ billing ทุก account
            </p>
          {:else if formProvider === 'openai'}
            <p class="small text-inverse text-opacity-75 mb-2">
              รับ API key ได้ที่:
            </p>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm btn-outline-secondary w-100 mb-3 text-start"
            >
              <i class="bi bi-box-arrow-up-right me-2"></i>platform.openai.com/api-keys
            </a>
            <p class="small text-inverse text-opacity-75 mb-0">
              แนะนำ <code>gpt-4o-mini</code> — ประหยัดและแม่นยำสำหรับ mapping suggestion
            </p>
          {:else if formProvider === 'claude'}
            <p class="small text-inverse text-opacity-75 mb-2">
              รับ API key ได้ที่:
            </p>
            <a
              href="https://platform.claude.com/settings/workspaces/default/keys"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-sm btn-outline-secondary w-100 mb-3 text-start"
            >
              <i class="bi bi-box-arrow-up-right me-2"></i>platform.claude.com → API Keys
            </a>
            <p class="small text-inverse text-opacity-75 mb-0">
              ใช้ Tool Use สำหรับ structured output — แม่นยำสูงสุด
            </p>
          {/if}
        </CardBody>
      </Card>
    </div>
  </div>
{/if}

<!-- Clear key confirm modal -->
{#if showClearConfirm}
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
            <i class="bi bi-exclamation-triangle text-warning me-2"></i>{m.aiConfigClearKey()}
          </h5>
          <button type="button" class="btn-close" onclick={() => (showClearConfirm = false)}></button>
        </div>
        <div class="modal-body">
          <p class="mb-0">API key จะถูกลบออก ระบบจะกลับไปใช้ Gemini free tier</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick={() => (showClearConfirm = false)} disabled={clearLoading}>
            {m.actionCancel()}
          </button>
          <button class="btn btn-danger" onclick={handleClearKey} disabled={clearLoading}>
            {#if clearLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.aiConfigClearKey()}
          </button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
{/if}
