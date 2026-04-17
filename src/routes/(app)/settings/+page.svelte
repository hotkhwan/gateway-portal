<!-- src/routes/(app)/settings/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import {
    getSystemSettings,
    updateSystemSettings,
    getBackupStatus,
    triggerBackup,
    triggerRestore,
    getUpdateInfo,
    applyUpdate
  } from '$lib/api/settings'
  import type { BackupStatus, UpdateInfo } from '$lib/types/settings'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  // ── Load state ────────────────────────────────
  let loading = $state(true)
  let loadError = $state<string | null>(null)

  // ── General settings ──────────────────────────
  let generalLoading = $state(false)
  let generalSuccess = $state(false)
  let generalError = $state<string | null>(null)
  let systemName = $state('')
  let systemDescription = $state('')
  let systemLogoUrl = $state('')

  // ── Retention ─────────────────────────────────
  let retentionLoading = $state(false)
  let retentionSuccess = $state(false)
  let retentionError = $state<string | null>(null)
  let auditRetentionDays = $state(90)

  // ── Backup ────────────────────────────────────
  let backupStatus = $state<BackupStatus | null>(null)
  let backupLoading = $state(false)
  let backupSuccess = $state(false)
  let backupError = $state<string | null>(null)

  // ── Restore ───────────────────────────────────
  let restoreFile = $state<File | null>(null)
  let restoreLoading = $state(false)
  let restoreSuccess = $state(false)
  let restoreError = $state<string | null>(null)
  let showRestoreConfirm = $state(false)
  let restoreFileInput = $state<HTMLInputElement | undefined>(undefined)

  // ── Version ──────────────────────────────────
  const portalVersion = __APP_VERSION__
  let backendVersion = $state<string | null>(null)

  // ── Update ────────────────────────────────────
  let updateInfo = $state<UpdateInfo | null>(null)
  let updateCheckLoading = $state(false)
  let updateCheckError = $state<string | null>(null)
  let updateApplyLoading = $state(false)
  let updateApplySuccess = $state(false)
  let updateApplyError = $state<string | null>(null)

  async function load() {
    loading = true
    loadError = null
    try {
      const [settings, backup] = await Promise.all([
        getSystemSettings(),
        getBackupStatus()
      ])
      systemName = settings.systemName ?? ''
      systemDescription = settings.systemDescription ?? ''
      systemLogoUrl = settings.systemLogoUrl ?? ''
      auditRetentionDays = settings.auditRetentionDays ?? 90
      backupStatus = backup
      backendVersion = settings.appVersion ?? null
    } catch (e: unknown) {
      loadError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function handleSaveGeneral() {
    generalLoading = true
    generalSuccess = false
    generalError = null
    try {
      await updateSystemSettings({ systemName, systemDescription, systemLogoUrl })
      generalSuccess = true
      setTimeout(() => { generalSuccess = false }, 3000)
    } catch (e: unknown) {
      generalError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      generalLoading = false
    }
  }

  async function handleSaveRetention() {
    retentionLoading = true
    retentionSuccess = false
    retentionError = null
    try {
      await updateSystemSettings({ auditRetentionDays })
      retentionSuccess = true
      setTimeout(() => { retentionSuccess = false }, 3000)
    } catch (e: unknown) {
      retentionError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      retentionLoading = false
    }
  }

  async function handleBackup() {
    backupLoading = true
    backupSuccess = false
    backupError = null
    try {
      const blob = await triggerBackup()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aisom-backup-${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
      backupSuccess = true
      backupStatus = { lastBackupAt: new Date().toISOString() }
      setTimeout(() => { backupSuccess = false }, 3000)
    } catch (e: unknown) {
      backupError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      backupLoading = false
    }
  }

  function handleRestoreFileChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    restoreFile = input.files?.[0] ?? null
    restoreError = null
  }

  function handleRestoreClick() {
    if (!restoreFile) {
      restoreError = m.settingsRestoreNoFile()
      return
    }
    showRestoreConfirm = true
  }

  async function confirmRestore() {
    if (!restoreFile) return
    showRestoreConfirm = false
    restoreLoading = true
    restoreSuccess = false
    restoreError = null
    try {
      await triggerRestore(restoreFile)
      restoreSuccess = true
      restoreFile = null
      if (restoreFileInput) restoreFileInput.value = ''
    } catch (e: unknown) {
      restoreError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      restoreLoading = false
    }
  }

  async function handleCheckUpdate() {
    updateCheckLoading = true
    updateCheckError = null
    updateInfo = null
    try {
      updateInfo = await getUpdateInfo()
    } catch (e: unknown) {
      updateCheckError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      updateCheckLoading = false
    }
  }

  async function handleApplyUpdate() {
    updateApplyLoading = true
    updateApplySuccess = false
    updateApplyError = null
    try {
      await applyUpdate()
      updateApplySuccess = true
    } catch (e: unknown) {
      updateApplyError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      updateApplyLoading = false
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return m.settingsBackupNever()
    return new Date(iso).toLocaleString()
  }

  $effect(() => {
    setPageTitle(m.settingsTitle())
    untrack(() => load())
  })
</script>

<!-- Page header -->
<div class="d-flex align-items-center mb-4">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.settingsTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.settingsSubtitle()}</small>
  </div>
</div>

{#if loading}
  <div class="text-center py-5">
    <div class="spinner-border text-theme" role="status">
      <span class="visually-hidden">{m.actionLoading()}</span>
    </div>
  </div>

{:else if loadError}
  <div class="alert alert-danger">
    <i class="bi bi-exclamation-triangle me-2"></i>{loadError}
    <button class="btn btn-sm btn-danger ms-2" onclick={load}>{m.actionRefresh()}</button>
  </div>

{:else}
  <div class="row g-4">

    <!-- ══ Version Info ══ -->
    <div class="col-12">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-info-circle text-theme me-2"></i>{m.settingsVersionTitle()}
          </h5>
          <p class="text-inverse text-opacity-50 small">{m.settingsVersionSubtitle()}</p>

          <div class="row g-3">
            <div class="col-sm-4">
              <div class="small fw-semibold text-inverse text-opacity-50 mb-1">
                {m.settingsVersionPortal()}
              </div>
              <span class="badge bg-theme font-monospace">{portalVersion}</span>
            </div>
            <div class="col-sm-4">
              <div class="small fw-semibold text-inverse text-opacity-50 mb-1">
                {m.settingsVersionBackend()}
              </div>
              <span class="badge bg-secondary font-monospace">
                {backendVersion ?? m.settingsUpdateUnknown()}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- ══ General ══ -->
    <div class="col-lg-6">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-sliders text-theme me-2"></i>{m.settingsGeneralTitle()}
          </h5>

          {#if generalError}
            <div class="alert alert-danger small py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{generalError}
            </div>
          {/if}
          {#if generalSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.commonSuccess()}
            </div>
          {/if}

          <!-- Logo preview -->
          {#if systemLogoUrl}
            <div class="d-flex align-items-center gap-3 mb-3 p-2 rounded"
              style="border:1px solid var(--bs-border-color)">
              <img
                src={systemLogoUrl}
                alt="logo"
                style="height:48px;max-width:120px;object-fit:contain"
                onerror={(e) => { (e.currentTarget as HTMLImageElement).src = '' }}
              />
              <span class="small text-inverse text-opacity-50">{m.settingsSystemLogoPreview()}</span>
            </div>
          {/if}

          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fw-semibold" for="systemName">{m.settingsSystemName()}</label>
              <input
                id="systemName"
                type="text"
                class="form-control"
                bind:value={systemName}
                disabled={generalLoading}
                placeholder={m.settingsSystemNamePlaceholder()}
              />
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold" for="systemDesc">{m.settingsSystemDescription()}</label>
              <textarea
                id="systemDesc"
                class="form-control"
                rows="2"
                bind:value={systemDescription}
                disabled={generalLoading}
                placeholder={m.settingsSystemDescriptionPlaceholder()}
              ></textarea>
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold" for="logoUrl">{m.settingsSystemLogoUrl()}</label>
              <input
                id="logoUrl"
                type="text"
                class="form-control font-monospace small"
                bind:value={systemLogoUrl}
                disabled={generalLoading}
                placeholder={m.settingsSystemLogoUrlPlaceholder()}
              />
              <small class="text-inverse text-opacity-50">{m.settingsSystemLogoHint()}</small>
            </div>
          </div>

          <div class="mt-3">
            <button class="btn btn-theme" onclick={handleSaveGeneral} disabled={generalLoading}>
              {#if generalLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
              {m.actionSave()}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- ══ Data Retention ══ -->
    <div class="col-lg-6">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-clock-history text-theme me-2"></i>{m.settingsRetentionTitle()}
          </h5>
          <p class="text-inverse text-opacity-50 small">{m.settingsRetentionSubtitle()}</p>

          {#if retentionError}
            <div class="alert alert-danger small py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{retentionError}
            </div>
          {/if}
          {#if retentionSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.commonSuccess()}
            </div>
          {/if}

          <div class="mb-3">
            <label class="form-label fw-semibold" for="retentionDays">
              {m.settingsAuditRetentionDays()}
            </label>
            <div class="input-group" style="max-width:220px">
              <input
                id="retentionDays"
                type="number"
                class="form-control"
                min="1"
                max="3650"
                bind:value={auditRetentionDays}
                disabled={retentionLoading}
              />
              <span class="input-group-text">{m.settingsRetentionDaysUnit()}</span>
            </div>
            <small class="text-inverse text-opacity-50">{m.settingsAuditRetentionHint()}</small>
          </div>

          <button class="btn btn-theme" onclick={handleSaveRetention} disabled={retentionLoading}>
            {#if retentionLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionSave()}
          </button>
        </CardBody>
      </Card>
    </div>

    <!-- ══ Backup ══ -->
    <div class="col-lg-6">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-cloud-arrow-down text-theme me-2"></i>{m.settingsBackupTitle()}
          </h5>
          <p class="text-inverse text-opacity-50 small">{m.settingsBackupSubtitle()}</p>

          <div class="mb-3 small">
            <span class="fw-semibold">{m.settingsBackupLastRun()}:</span>
            <span class="ms-1 text-inverse text-opacity-75">
              {formatDate(backupStatus?.lastBackupAt ?? null)}
            </span>
          </div>

          {#if backupError}
            <div class="alert alert-danger small py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{backupError}
            </div>
          {/if}
          {#if backupSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.settingsBackupSuccess()}
            </div>
          {/if}

          <button class="btn btn-theme" onclick={handleBackup} disabled={backupLoading}>
            {#if backupLoading}
              <span class="spinner-border spinner-border-sm me-1"></span>
              {m.settingsBackupDownloading()}
            {:else}
              <i class="bi bi-download me-1"></i>{m.settingsBackupNow()}
            {/if}
          </button>
        </CardBody>
      </Card>
    </div>

    <!-- ══ Restore ══ -->
    <div class="col-lg-6">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-cloud-arrow-up text-warning me-2"></i>{m.settingsRestoreTitle()}
          </h5>
          <p class="text-inverse text-opacity-50 small">{m.settingsRestoreSubtitle()}</p>

          <div class="alert alert-warning small py-2 mb-3">
            <i class="bi bi-exclamation-triangle me-1"></i>{m.settingsRestoreWarning()}
          </div>

          {#if restoreError}
            <div class="alert alert-danger small py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{restoreError}
            </div>
          {/if}
          {#if restoreSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.settingsRestoreSuccess()}
            </div>
          {/if}

          <div class="mb-3">
            <label class="form-label fw-semibold" for="restoreFile">{m.settingsRestoreFile()}</label>
            <input
              id="restoreFile"
              type="file"
              class="form-control"
              accept=".zip,.json"
              disabled={restoreLoading}
              bind:this={restoreFileInput}
              onchange={handleRestoreFileChange}
            />
            <small class="text-inverse text-opacity-50">{m.settingsRestoreFileHint()}</small>
          </div>

          <button
            class="btn btn-warning"
            onclick={handleRestoreClick}
            disabled={restoreLoading || !restoreFile}
          >
            {#if restoreLoading}
              <span class="spinner-border spinner-border-sm me-1"></span>
              {m.settingsRestoreRestoring()}
            {:else}
              <i class="bi bi-arrow-counterclockwise me-1"></i>{m.settingsRestoreNow()}
            {/if}
          </button>
        </CardBody>
      </Card>
    </div>

    <!-- ══ System Update ══ -->
    <div class="col-12">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-arrow-repeat text-theme me-2"></i>{m.settingsUpdateTitle()}
          </h5>
          <p class="text-inverse text-opacity-50 small">{m.settingsUpdateSubtitle()}</p>

          {#if updateCheckError}
            <div class="alert alert-danger small py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{updateCheckError}
            </div>
          {/if}
          {#if updateApplyError}
            <div class="alert alert-danger small py-2">
              <i class="bi bi-exclamation-triangle me-1"></i>{updateApplyError}
            </div>
          {/if}
          {#if updateApplySuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.settingsUpdateSuccess()}
            </div>
          {/if}

          {#if updateInfo}
            <div class="row g-3 mb-3">
              <div class="col-sm-4">
                <div class="small fw-semibold text-inverse text-opacity-50 mb-1">
                  {m.settingsUpdateCurrentVersion()}
                </div>
                <span class="badge bg-secondary font-monospace">{updateInfo.currentVersion}</span>
              </div>
              <div class="col-sm-4">
                <div class="small fw-semibold text-inverse text-opacity-50 mb-1">
                  {m.settingsUpdateLatestVersion()}
                </div>
                <span class="badge {updateInfo.updateAvailable ? 'bg-success' : 'bg-secondary'} font-monospace">
                  {updateInfo.latestVersion}
                </span>
              </div>
              <div class="col-sm-4 d-flex align-items-end">
                {#if updateInfo.updateAvailable}
                  <span class="badge bg-warning text-dark">
                    <i class="bi bi-arrow-up-circle me-1"></i>{m.settingsUpdateAvailable()}
                  </span>
                {:else}
                  <span class="badge bg-success">
                    <i class="bi bi-check-circle me-1"></i>{m.settingsUpdateUpToDate()}
                  </span>
                {/if}
              </div>
            </div>
          {/if}

          <div class="d-flex gap-2 flex-wrap">
            <button class="btn btn-theme" onclick={handleCheckUpdate} disabled={updateCheckLoading}>
              {#if updateCheckLoading}
                <span class="spinner-border spinner-border-sm me-1"></span>
                {m.settingsUpdateChecking()}
              {:else}
                <i class="bi bi-search me-1"></i>{m.settingsUpdateCheckNow()}
              {/if}
            </button>

            {#if updateInfo?.updateAvailable}
              <button
                class="btn btn-success"
                onclick={handleApplyUpdate}
                disabled={updateApplyLoading}
              >
                {#if updateApplyLoading}
                  <span class="spinner-border spinner-border-sm me-1"></span>
                  {m.settingsUpdateApplying()}
                {:else}
                  <i class="bi bi-cloud-download me-1"></i>{m.settingsUpdateApply()}
                {/if}
              </button>
            {/if}
          </div>
        </CardBody>
      </Card>
    </div>

  </div>
{/if}

<!-- ══ Restore Confirm Modal ══ -->
{#if showRestoreConfirm}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="modal d-block"
    style="background:rgba(0,0,0,0.5)"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-exclamation-triangle text-warning me-2"></i>{m.settingsRestoreConfirmTitle()}
          </h5>
          <button
            type="button"
            class="btn-close"
            aria-label={m.actionClose()}
            onclick={() => { showRestoreConfirm = false }}
          ></button>
        </div>
        <div class="modal-body">
          <p>{m.settingsRestoreConfirmBody()}</p>
          {#if restoreFile}
            <div class="alert alert-secondary small py-2 mb-0">
              <i class="bi bi-file-earmark-zip me-1"></i>{restoreFile.name}
            </div>
          {/if}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick={() => { showRestoreConfirm = false }}>
            {m.actionCancel()}
          </button>
          <button class="btn btn-warning" onclick={confirmRestore}>
            <i class="bi bi-arrow-counterclockwise me-1"></i>{m.settingsRestoreNow()}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
