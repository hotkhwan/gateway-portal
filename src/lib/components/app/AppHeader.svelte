<!-- src/lib/components/app/AppHeader.svelte -->
<script lang="ts">
  import { appOptions } from '$lib/stores/appOptions'
  import { resolve } from '$app/paths'
  import { asset } from '$lib/utils/asset'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import { m } from '$lib/i18n/messages'
  import { listWorkspaces } from '$lib/api/workspace'
  import { onMount } from 'svelte'

  // Prefer user from server load (layout/+layout.server.ts) -> page.data.user
  const userEmail = $derived(
    page?.data?.user?.email ?? page?.data?.user?.name ?? page?.data?.user?.sub ?? 'user@local'
  )
  const userImg = $derived(
    page?.data?.user?.img ?? asset('/img/user/profile.jpg')
  )

  let isLoggingOut = $state(false)
  let logoutError = $state('')

  onMount(async () => {
    try {
      const { setWorkspaceList } = await import('$lib/stores/activeWorkspace')
      const workspaces = await Promise.race([
        listWorkspaces(),
        new Promise<[]>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 10000)
        )
      ])
      setWorkspaceList(workspaces)
    } catch (e) {
      console.error('Failed to load workspaces:', e)
    }
  })

  let notificationData = [
    {
      icon: 'bi bi-bag text-theme',
      titleKey: 'headerNotificationNewOrder',
      timeKey: 'headerNotificationJustNow'
    },
    {
      icon: 'bi bi-person-circle text-theme',
      titleKey: 'headerNotificationNewAccounts',
      timeKey: 'headerNotificationMinutesAgo'
    },
    {
      icon: 'bi bi-gear text-theme',
      titleKey: 'headerNotificationSetupCompleted',
      timeKey: 'headerNotificationMinutesAgo'
    },
    {
      icon: 'bi bi-grid text-theme',
      titleKey: 'headerNotificationWidgetInstall',
      timeKey: 'headerNotificationMinutesAgo'
    },
    {
      icon: 'bi bi-credit-card text-theme',
      titleKey: 'headerNotificationPaymentEnabled',
      timeKey: 'headerNotificationMinutesAgo'
    }
  ]

  function desktopToggler() {
    $appOptions.appSidebarToggled =
      $appOptions.appSidebarCollapsed == false ? false : true
    $appOptions.appSidebarCollapsed =
      $appOptions.appSidebarCollapsed == false ? true : false
  }

  function mobileToggler() {
    $appOptions.appSidebarMobileToggled = !$appOptions.appSidebarMobileToggled
  }

  function searchHeaderSearchToggler() {
    $appOptions.appHeaderSearchToggled = !$appOptions.appHeaderSearchToggled
  }

  async function handleLogout(event?: Event) {
    event?.preventDefault?.()
    if (isLoggingOut) return

    isLoggingOut = true
    logoutError = ''

    try {
      // BFF endpoint should clear HttpOnly cookies (session_token/session_refresh)
      const res = await fetch(resolve('/api/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason: 'user' })
      })

      // If server returns non-2xx, still hard-navigate away after best effort
      if (!res.ok) {
        logoutError = `${m.headerLogoutFailed()} (${res.status})`
      }

      // Redirect to public landing/login
      await goto(resolve('/'), { replaceState: true })
    } catch (err) {
      logoutError = m.headerLogoutFailed()
      await goto(resolve('/'), { replaceState: true })
    } finally {
      isLoggingOut = false
    }
  }
</script>

<!-- BEGIN #header -->
<div id="header" class="app-header">
  <!-- BEGIN desktop-toggler -->
  <div class="desktop-toggler">
    <button
      type="button"
      class="menu-toggler"
      aria-label={m.headerAriaDesktopToggler()}
      onclick={desktopToggler}
    >
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </button>
  </div>
  <!-- BEGIN desktop-toggler -->

  <!-- BEGIN mobile-toggler -->
  <div class="mobile-toggler">
    <button
      type="button"
      class="menu-toggler"
      aria-label={m.headerAriaMobileToggler()}
      onclick={mobileToggler}
    >
      <span class="bar"></span>
      <span class="bar"></span>
      <span class="bar"></span>
    </button>
  </div>
  <!-- END mobile-toggler -->

  <!-- BEGIN brand -->
  <div class="brand">
    <a
      href={resolve('/')}
      aria-label={m.headerAriaBrandLink()}
      class="brand-logo"
    >
      <span class="brand-img">
        <span class="brand-img-text text-theme">{m.headerBrand()}</span>
      </span>
      <span class="brand-text">{m.headerBrandText()}</span>
    </a>
  </div>
  <!-- END brand -->

  <!-- BEGIN menu -->
  <div class="menu">
    <div class="menu-item dropdown">
      <a
        href="#/"
        aria-label={m.headerAriaSearch()}
        class="menu-link"
        onclick={searchHeaderSearchToggler}
      >
        <div class="menu-icon"><i class="bi bi-search nav-icon"></i></div>
      </a>
    </div>

    <div class="menu-item dropdown dropdown-mobile-full">
      <a
        href="#/"
        aria-label={m.headerAriaAppLauncher()}
        data-bs-toggle="dropdown"
        data-bs-display="static"
        class="menu-link"
      >
        <div class="menu-icon"><i class="bi bi-grid-3x3-gap nav-icon"></i></div>
      </a>
      <div
        class="dropdown-menu fade dropdown-menu-end w-300px text-center p-0 mt-1"
      >
        <div class="row row-grid gx-0">
          <div class="col-4">
            <a
              href="/comingsoon"
              aria-label={m.headerAriaPosSystem()}
              class="dropdown-item text-decoration-none p-3 bg-none"
            >
              <div>
                <i class="bi bi-hdd-network h2 opacity-5 d-block my-1"></i>
              </div>
              <div class="fw-500 fs-10px text-inverse">
                {m.headerPosSystem()}
              </div>
            </a>
          </div>
          <div class="col-4">
            <a
              href={resolve('/subscription')}
              aria-label={m.headerAriaHelper()}
              class="dropdown-item text-decoration-none p-3 bg-none"
            >
              <div>
                <i class="bi bi-gem h2 opacity-5 d-block my-1"></i>
              </div>
              <div class="fw-500 fs-10px text-inverse">{m.navSubscription()}</div>
            </a>
          </div>
          <div class="col-4">
            <a
              href="/comingsoon"
              aria-label={m.headerAriaSettings()}
              class="dropdown-item text-decoration-none p-3 bg-none"
            >
              <div class="position-relative">
                <i
                  class="bi bi-circle-fill position-absolute text-theme top-0 mt-n2 me-n2 fs-6px d-block text-center w-100"
                ></i>
                <i class="bi bi-sliders h2 opacity-5 d-block my-1"></i>
              </div>
              <div class="fw-500 fs-10px text-inverse">
                {m.headerSettings()}
              </div>
            </a>
          </div>
        </div>

        <div class="row row-grid gx-0">
          <div class="col-4">
            <a
              href="/comingsoon"
              aria-label={m.headerAriaWidgets()}
              class="dropdown-item text-decoration-none p-3 bg-none"
            >
              <div>
                <i class="bi bi-collection-play h2 opacity-5 d-block my-1"></i>
              </div>
              <div class="fw-500 fs-10px text-inverse">{m.headerWidgets()}</div>
            </a>
          </div>
        </div>
      </div>
    </div>

    <div class="menu-item dropdown dropdown-mobile-full">
      <a
        href="#/"
        aria-label={m.headerAriaNotifications()}
        data-bs-toggle="dropdown"
        data-bs-display="static"
        class="menu-link"
      >
        <div class="menu-icon"><i class="bi bi-bell nav-icon"></i></div>
        <div class="menu-badge bg-theme"></div>
      </a>

      <div class="dropdown-menu dropdown-menu-end mt-1 w-300px fs-11px pt-1">
        <h6 class="dropdown-header fs-10px mb-1">
          {m.headerNotificationsTitle()}
        </h6>
        <div class="dropdown-divider mt-1"></div>

        {#if notificationData && notificationData.length > 0}
          {#each notificationData as n}
            <a
              href="#/"
              aria-label={m.headerAriaNotificationItem()}
              class="d-flex align-items-center py-10px dropdown-item text-wrap fw-semibold"
            >
              <div class="fs-20px">
                <i class={n.icon}></i>
              </div>
              <div class="flex-1 flex-wrap ps-3">
                <div class="mb-1 text-inverse">{(m as any)[n.titleKey]()}</div>
                <div class="small text-inverse text-opacity-50">
                  {(m as any)[n.timeKey]()}
                </div>
              </div>
              <div class="ps-2 fs-16px">
                <i class="bi bi-chevron-right"></i>
              </div>
            </a>
          {/each}
        {:else}
          <div class="px-3 pb-3 pt-2">{m.headerNoRecordFound()}</div>
        {/if}

        <hr class="my-0" />
        <div class="py-10px mb-n2 text-center">
          <a
            href="#/"
            aria-label={m.headerAriaSeeAll()}
            class="text-decoration-none fw-bold"
          >
            {m.headerSeeAll()}
          </a>
        </div>
      </div>
    </div>

    <div class="menu-item dropdown dropdown-mobile-full">
      <a
        href="#/"
        aria-label={m.headerAriaUserMenu()}
        data-bs-toggle="dropdown"
        data-bs-display="static"
        class="menu-link"
      >
        <div class="menu-img online">
          {#if userImg}
            <img src={userImg} alt={m.headerProfileImageAlt()} height="60" />
          {:else}
            <div
              class="d-flex align-items-center justify-content-center w-100 h-100 bg-inverse bg-opacity-25 text-inverse text-opacity-50 rounded-circle overflow-hidden"
            >
              <i class="bi bi-person-fill fs-32px mb-n3"></i>
            </div>
          {/if}
        </div>
        <div class="menu-text d-sm-block d-none w-170px">{userEmail}</div>
      </a>

      <div class="dropdown-menu dropdown-menu-end me-lg-3 fs-11px mt-1">
        <a
          aria-label={m.headerAriaProfile()}
          class="dropdown-item d-flex align-items-center"
          href="/comingsoon"
        >
          {m.headerProfile()}
          <i class="bi bi-person-circle ms-auto text-theme fs-16px my-n1"></i>
        </a>

        <a
          aria-label={m.headerAriaSettings()}
          class="dropdown-item d-flex align-items-center"
          href="/comingsoon"
        >
          {m.headerSettings()}
          <i class="bi bi-gear ms-auto text-theme fs-16px my-n1"></i>
        </a>

        <div class="dropdown-divider"></div>

        <a
          aria-label={m.headerAriaLogout()}
          class="dropdown-item d-flex align-items-center"
          href={resolve('/')}
          onclick={handleLogout}
        >
          {#if isLoggingOut}
            {m.headerLoggingOut()}
          {:else}
            {m.headerLogout()}
          {/if}
          <i class="bi bi-toggle-off ms-auto text-theme fs-16px my-n1"></i>
        </a>

        {#if logoutError}
          <div class="px-3 pt-2 pb-1 text-danger small">{logoutError}</div>
        {/if}
      </div>
    </div>
  </div>
  <!-- END menu -->

  <!-- BEGIN menu-search -->
  <form class="menu-search" method="POST" name="header_search_form">
    <div class="menu-search-container">
      <div class="menu-search-icon"><i class="bi bi-search"></i></div>
      <div class="menu-search-input">
        <input
          type="text"
          class="form-control form-control-lg"
          placeholder={m.headerSearchPlaceholder()}
        />
      </div>
      <div class="menu-search-icon">
        <a
          href="#/"
          aria-label={m.headerAriaCloseSearch()}
          onclick={searchHeaderSearchToggler}
        >
          <i class="bi bi-x-lg"></i>
        </a>
      </div>
    </div>
  </form>
  <!-- END menu-search -->
</div>
<!-- END #header -->
