<!-- src/routes/(app)/profile/+page.svelte -->
<script lang="ts">
  import { untrack } from 'svelte'
  import { page } from '$app/stores'
  import { setPageTitle } from '$lib/utils'
  import { m } from '$lib/i18n/messages'
  import { introspectUser, updateUser, updateUserPassword, uploadAvatar } from '$lib/api/user'
  import type { UserProfile } from '$lib/api/user'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import MapPicker from '$lib/components/leaflet/MapPicker.svelte'

  // ── User data ──────────────────────────────
  let loading = $state(true)
  let error = $state<string | null>(null)
  let profile = $state<UserProfile | null>(null)

  // ── Profile form ───────────────────────────
  let profileLoading = $state(false)
  let profileSuccess = $state(false)
  let profileError = $state<string | null>(null)
  let firstName = $state('')
  let lastName = $state('')
  let email = $state('')
  let avatar = $state('')
  let locale = $state('th')

  // ── Avatar upload ──────────────────────────
  let avatarFile = $state<File | null>(null)
  let avatarPreview = $state<string | null>(null)
  let avatarUploading = $state(false)
  let avatarInputEl = $state<HTMLInputElement | null>(null)

  function handleAvatarChange(e: Event) {
    const file = (e.currentTarget as HTMLInputElement).files?.[0] ?? null
    avatarFile = file
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => { avatarPreview = ev.target?.result as string }
      reader.readAsDataURL(file)
    }
  }

  // ── Map / Preferences form ─────────────────
  let prefLoading = $state(false)
  let prefSuccess = $state(false)
  let prefError = $state<string | null>(null)
  let mapLat = $state<number>(13.7563)
  let mapLng = $state<number>(100.5018)
  let zoomLevel = $state(13)
  let perPage = $state(10)
  let showMap = $state(false)

  // ── Password form ──────────────────────────
  let pwdLoading = $state(false)
  let pwdSuccess = $state(false)
  let pwdError = $state<string | null>(null)
  let newPassword = $state('')
  let confirmPassword = $state('')
  let temporary = $state(false)

  function getUserId(): string | null {
    return ($page.data as { user?: { sub?: string } })?.user?.sub ?? null
  }

  async function load() {
    loading = true
    error = null
    try {
      profile = await introspectUser()
      firstName = profile.firstName ?? ''
      lastName = profile.lastName ?? ''
      email = profile.email ?? ''
      avatar = profile.avatar ?? ''
      locale = profile.locale ?? 'th'
      const lat = parseFloat(String(profile.mapLocation?.lat ?? 13.7563))
      const lng = parseFloat(String(profile.mapLocation?.lng ?? 100.5018))
      mapLat = isNaN(lat) ? 13.7563 : lat
      mapLng = isNaN(lng) ? 100.5018 : lng
      zoomLevel = profile.zoomLevel ?? 13
      perPage = profile.perPage ?? 10
      setTimeout(() => { showMap = true }, 150)
    } catch (e: unknown) {
      error = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      loading = false
    }
  }

  async function handleSaveProfile() {
    const userId = getUserId()
    if (!userId) return
    profileLoading = true
    profileSuccess = false
    profileError = null
    try {
      if (avatarFile) {
        avatarUploading = true
        try {
          const uploaded = await uploadAvatar(userId, avatarFile)
          if (uploaded) avatar = uploaded
        } finally {
          avatarUploading = false
          avatarFile = null
          avatarPreview = null
          if (avatarInputEl) avatarInputEl.value = ''
        }
      }
      await updateUser(userId, {
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        email: email || undefined,
        avatar: avatar || undefined,
        locale: locale || undefined
      })
      profileSuccess = true
      setTimeout(() => { profileSuccess = false }, 3000)
    } catch (e: unknown) {
      profileError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      profileLoading = false
    }
  }

  async function handleSavePreferences() {
    const userId = getUserId()
    if (!userId) return
    prefLoading = true
    prefSuccess = false
    prefError = null
    try {
      await updateUser(userId, {
        mapLocation: { lat: String(mapLat), lng: String(mapLng) },
        zoomLevel,
        perPage
      })
      prefSuccess = true
      setTimeout(() => { prefSuccess = false }, 3000)
    } catch (e: unknown) {
      prefError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      prefLoading = false
    }
  }

  async function handleChangePassword() {
    const userId = getUserId()
    if (!userId) return
    if (newPassword !== confirmPassword) {
      pwdError = m.profilePasswordMismatch()
      return
    }
    if (newPassword.length < 6) {
      pwdError = m.profilePasswordTooShort()
      return
    }
    pwdLoading = true
    pwdSuccess = false
    pwdError = null
    try {
      await updateUserPassword(userId, { password: newPassword, temporary })
      pwdSuccess = true
      newPassword = ''
      confirmPassword = ''
      temporary = false
      setTimeout(() => { pwdSuccess = false }, 3000)
    } catch (e: unknown) {
      pwdError = (e as { message?: string })?.message ?? m.commonError()
    } finally {
      pwdLoading = false
    }
  }

  $effect(() => {
    setPageTitle(m.profileTitle())
    untrack(() => load())
  })
</script>

<div class="d-flex align-items-center mb-4">
  <div class="flex-grow-1">
    <h1 class="page-header mb-0">{m.profileTitle()}</h1>
    <small class="text-inverse text-opacity-50">{m.profileSubtitle()}</small>
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
    <button class="btn btn-sm btn-danger ms-2" onclick={load}>{m.actionRefresh()}</button>
  </div>
{:else}
  <div class="row g-4">
    <!-- ══ Profile Info ══ -->
    <div class="col-lg-6">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-person-circle text-theme me-2"></i>{m.profileInfoTitle()}
          </h5>

          {#if profileError}
            <div class="alert alert-danger small py-2">{profileError}</div>
          {/if}
          {#if profileSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.commonSuccess()}
            </div>
          {/if}

          <!-- Avatar upload -->
          <div class="mb-3">
            <label class="form-label fw-semibold d-block" for="avatarInput">{m.profileAvatar()}</label>
            <div class="d-flex align-items-center gap-3">
              <button
                type="button"
                class="p-0 border-0 bg-transparent position-relative"
                style="cursor:{profileLoading ? 'not-allowed' : 'pointer'}"
                disabled={profileLoading}
                onclick={() => !profileLoading && avatarInputEl?.click()}
                title={m.profileAvatarHint()}
              >
                {#if avatarPreview || avatar}
                  <img
                    src={avatarPreview ?? avatar}
                    alt="avatar"
                    class="rounded-circle"
                    style="width:80px;height:80px;object-fit:cover;border:2px solid var(--bs-border-color)"
                    onerror={(e) => { (e.currentTarget as HTMLImageElement).src = '' }}
                  />
                {:else}
                  <div
                    class="rounded-circle d-flex align-items-center justify-content-center bg-secondary"
                    style="width:80px;height:80px;border:2px solid var(--bs-border-color)"
                  >
                    <i class="bi bi-person-fill text-white fs-2"></i>
                  </div>
                {/if}
                <span
                  class="position-absolute bottom-0 end-0 rounded-circle bg-theme d-flex align-items-center justify-content-center"
                  style="width:24px;height:24px;pointer-events:none"
                >
                  {#if avatarUploading}
                    <span class="spinner-border spinner-border-sm text-white" style="width:12px;height:12px"></span>
                  {:else}
                    <i class="bi bi-camera-fill text-white" style="font-size:11px"></i>
                  {/if}
                </span>
              </button>
              <div>
                <div class="fw-semibold small">{firstName} {lastName}</div>
                <div class="text-inverse text-opacity-50 small">{profile?.role ?? ''}</div>
                {#if avatarFile}
                  <div class="text-theme small mt-1">
                    <i class="bi bi-image me-1"></i>{avatarFile.name}
                  </div>
                {/if}
              </div>
            </div>
            <input
              id="avatarInput"
              bind:this={avatarInputEl}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="d-none"
              onchange={handleAvatarChange}
            />
            <small class="text-inverse text-opacity-50 d-block mt-1">{m.profileAvatarHint()}</small>
          </div>

          <div class="row g-3">
            <div class="col-sm-6">
              <label class="form-label fw-semibold" for="firstName">{m.profileFirstName()}</label>
              <input
                id="firstName"
                type="text"
                class="form-control"
                bind:value={firstName}
                disabled={profileLoading}
                placeholder="John"
              />
            </div>
            <div class="col-sm-6">
              <label class="form-label fw-semibold" for="lastName">{m.profileLastName()}</label>
              <input
                id="lastName"
                type="text"
                class="form-control"
                bind:value={lastName}
                disabled={profileLoading}
                placeholder="Doe"
              />
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold" for="email">{m.profileEmail()}</label>
              <input
                id="email"
                type="email"
                class="form-control"
                bind:value={email}
                disabled={profileLoading}
                placeholder={m.profileEmailPlaceholder()}
              />
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold" for="locale">{m.profileLocale()}</label>
              <select id="locale" class="form-select" bind:value={locale} disabled={profileLoading}>
                <option value="th">ภาษาไทย (th)</option>
                <option value="en">English (en)</option>
              </select>
            </div>
          </div>

          <div class="mt-3">
            <button class="btn btn-theme" onclick={handleSaveProfile} disabled={profileLoading}>
              {#if profileLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
              {m.actionSave()}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- ══ Change Password ══ -->
    <div class="col-lg-6">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-lock text-theme me-2"></i>{m.profilePasswordTitle()}
          </h5>

          {#if pwdError}
            <div class="alert alert-danger small py-2">{pwdError}</div>
          {/if}
          {#if pwdSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.profilePasswordSuccess()}
            </div>
          {/if}

          <div class="row g-3">
            <div class="col-12">
              <label class="form-label fw-semibold" for="newPwd">{m.profileNewPassword()}</label>
              <input
                id="newPwd"
                type="password"
                class="form-control"
                bind:value={newPassword}
                disabled={pwdLoading}
                autocomplete="new-password"
              />
            </div>
            <div class="col-12">
              <label class="form-label fw-semibold" for="confirmPwd">{m.profileConfirmPassword()}</label>
              <input
                id="confirmPwd"
                type="password"
                class="form-control"
                bind:value={confirmPassword}
                disabled={pwdLoading}
                autocomplete="new-password"
              />
            </div>
            <div class="col-12">
              <div class="form-check">
                <input
                  id="temporary"
                  type="checkbox"
                  class="form-check-input"
                  bind:checked={temporary}
                  disabled={pwdLoading}
                />
                <label class="form-check-label small" for="temporary">
                  {m.profilePasswordTemporary()}
                </label>
              </div>
              <small class="text-inverse text-opacity-50">{m.profilePasswordTemporaryHint()}</small>
            </div>
          </div>

          <div class="mt-3">
            <button
              class="btn btn-warning"
              onclick={handleChangePassword}
              disabled={pwdLoading || !newPassword.trim()}
            >
              {#if pwdLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
              {m.profileChangePassword()}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>

    <!-- ══ Map & Preferences ══ -->
    <div class="col-12">
      <Card>
        <CardBody>
          <h5 class="mb-3">
            <i class="bi bi-geo-alt text-theme me-2"></i>{m.profilePreferencesTitle()}
          </h5>

          {#if prefError}
            <div class="alert alert-danger small py-2">{prefError}</div>
          {/if}
          {#if prefSuccess}
            <div class="alert alert-success small py-2">
              <i class="bi bi-check-circle me-1"></i>{m.commonSuccess()}
            </div>
          {/if}

          <div class="row g-3 mb-3">
            <div class="col-sm-6">
              <label class="form-label fw-semibold" for="zoomLevel">{m.profileZoom()}</label>
              <input
                id="zoomLevel"
                type="number"
                min="1"
                max="20"
                class="form-control"
                bind:value={zoomLevel}
                disabled={prefLoading}
              />
            </div>
            <div class="col-sm-6">
              <label class="form-label fw-semibold" for="perPage">{m.profilePerPage()}</label>
              <select id="perPage" class="form-select" bind:value={perPage} disabled={prefLoading}>
                {#each [10, 20, 50, 100] as n}
                  <option value={n}>{n}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="mb-3">
            <span class="form-label fw-semibold d-block">
              <i class="bi bi-map me-1"></i>{m.profileMapLocation()}
            </span>
            <small class="text-inverse text-opacity-50 d-block mb-2">{m.eventsLocationHint()}</small>
            {#if showMap}
              <MapPicker
                lat={mapLat}
                lng={mapLng}
                zoom={zoomLevel}
                height="350px"
                disabled={prefLoading}
                showLocationButton={true}
                onchange={(lat: number, lng: number) => { mapLat = lat; mapLng = lng }}
              />
            {:else}
              <div style="height:350px;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,0.08))"
                class="d-flex align-items-center justify-content-center">
                <div class="spinner-border spinner-border-sm" role="status"></div>
              </div>
            {/if}
            <div class="row g-2 mt-2">
              <div class="col-sm-6">
                <div class="input-group input-group-sm">
                  <span class="input-group-text">{m.profileLatitude()}</span>
                  <input
                    type="number"
                    step="any"
                    class="form-control font-monospace"
                    bind:value={mapLat}
                    disabled={prefLoading}
                  />
                </div>
              </div>
              <div class="col-sm-6">
                <div class="input-group input-group-sm">
                  <span class="input-group-text">{m.profileLongitude()}</span>
                  <input
                    type="number"
                    step="any"
                    class="form-control font-monospace"
                    bind:value={mapLng}
                    disabled={prefLoading}
                  />
                </div>
              </div>
            </div>
          </div>

          <button class="btn btn-theme" onclick={handleSavePreferences} disabled={prefLoading}>
            {#if prefLoading}<span class="spinner-border spinner-border-sm me-1"></span>{/if}
            {m.actionSave()}
          </button>
        </CardBody>
      </Card>
    </div>
  </div>
{/if}
