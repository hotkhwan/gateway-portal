<!-- src/lib/components/app/AppSidebar.svelte -->
<script lang="ts">
  import PerfectScrollbar from '$lib/components/plugins/PerfectScrollbar.svelte'
  import { m } from '$lib/i18n/messages'
  import { appOptions } from '$lib/stores/appOptions'
  import { appSidebarMenus } from '$lib/stores/appSidebarMenus'
  import { workspaceList, activeWorkspace, activeWorkspaceId, setActiveWorkspace } from '$lib/stores/activeWorkspace'

  import { page } from '$app/state'
  import { afterNavigate } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount, tick } from 'svelte'

  import type {
    SidebarChild,
    SidebarMenu,
    SidebarMenuLink
  } from '$lib/types/navigation'

  /* -------------------------
   * App init (enable animation)
   * ------------------------- */
  onMount(() => {
    document.body.classList.add('app-init')
  })

  /* -------------------------
   * Type guard
   * ------------------------- */
  function isLinkMenu(menu: SidebarMenu): menu is SidebarMenuLink {
    return menu.kind === 'link'
  }

  /* -------------------------
   * Mobile behavior
   * ------------------------- */
  function mobileToggler() {
    $appOptions.appSidebarMobileToggled = !$appOptions.appSidebarMobileToggled
  }

  function hideMobileSidebar() {
    $appOptions.appSidebarMobileToggled = false
  }

  // close sidebar after navigation (mobile)
  afterNavigate(() => {
    hideMobileSidebar()
  })

  /* -------------------------
   * Helpers
   * ------------------------- */
  function hasActiveChild(children?: SidebarChild[]) {
    const pathname = page.url.pathname
    return children?.some((c) => c.url ? withBase(c.url) === pathname : false) ?? false
  }

  const _resolve = resolve as (path: string) => string
  function withBase(url?: string) {
    if (!url) return '#'
    return _resolve(`/${url}`)
  }

  function t(key: string | number | symbol): string {
    if (typeof key !== 'string') return String(key)
    const fn = (m as Record<string, unknown>)[key]
    return typeof fn === 'function' ? (fn as () => string)() : key
  }

  /* -------------------------
   * Expand / collapse logic
   * ------------------------- */
  let openedMenuId: string | null = null

  async function toggleMenu(menu: SidebarMenu) {
    if (!isLinkMenu(menu) || !menu.children?.length) return

    openedMenuId = openedMenuId === menu.id ? null : menu.id

    // PerfectScrollbar reflow
    await tick()
    window.dispatchEvent(new Event('resize'))
  }

  function onParentClick(e: MouseEvent, menu: SidebarMenu) {
    if (isLinkMenu(menu) && menu.children?.length) {
      e.preventDefault()
      toggleMenu(menu)
      return
    }
    hideMobileSidebar()
  }

  // auto-open parent when route is active
  $: {
    const activeParent = $appSidebarMenus.find(
      (x): x is SidebarMenuLink =>
        x.kind === 'link' && !!x.children?.length && hasActiveChild(x.children)
    )

    if (activeParent?.id) {
      openedMenuId = activeParent.id
    }
  }
</script>

<div id="sidebar" class="app-sidebar">
  <PerfectScrollbar class="app-sidebar-content">
    <div class="menu">
      <!-- Workspace Switcher -->
      {#if $workspaceList.length > 0}
        <div class="menu-item dropdown">
          <a
            href="#/"
            aria-label={m.workspaceSwitchLabel()}
            data-bs-toggle="dropdown"
            data-bs-display="static"
            class="menu-link d-flex align-items-center gap-2"
          >
            <i class="bi bi-grid menu-icon"></i>
            <span class="menu-text text-truncate">
              {$activeWorkspace?.name ?? m.workspaceSwitchPlaceholder()}
            </span>
            <i class="bi bi-chevron-down menu-caret"></i>
          </a>
          <div class="dropdown-menu dropdown-menu-end ms-1 fs-11px" style="min-width:200px">
            <h6 class="dropdown-header fs-10px mb-1">{m.workspaceSwitchLabel()}</h6>
            <div class="dropdown-divider mt-1"></div>
            {#each $workspaceList as workspace}
              <button
                type="button"
                class="dropdown-item d-flex align-items-center gap-2"
                class:fw-bold={$activeWorkspaceId === workspace.id}
                onclick={() => setActiveWorkspace(workspace.id)}
              >
                {#if $activeWorkspaceId === workspace.id}
                  <i class="bi bi-check-circle-fill text-theme"></i>
                {:else}
                  <i class="bi bi-circle text-inverse text-opacity-25"></i>
                {/if}
                <span class="flex-grow-1 text-truncate">{workspace.name}</span>
              </button>
            {/each}
            <div class="dropdown-divider"></div>
            <a href={withBase('/workspaces')} class="dropdown-item small">
              <i class="bi bi-sliders me-2"></i>
              {m.workspaceTitle()}
            </a>
          </div>
        </div>
      {/if}
      {#each $appSidebarMenus as menu (menu.id)}
        {#if menu.kind === 'header'}
          <div class="menu-header">
            {t(menu.textKey)}
          </div>
        {:else if menu.kind === 'divider'}
          <div class="menu-divider"></div>
        {:else if isLinkMenu(menu)}
          <div
            class="menu-item"
            class:has-sub={!!menu.children?.length}
            class:expand={openedMenuId === menu.id}
            class:active={(menu.url ? withBase(menu.url) === page.url.pathname : false) ||
              hasActiveChild(menu.children)}
          >
            <a
              class="menu-link"
              href={menu.url ? withBase(menu.url) : '#'}
              onclick={(e) => onParentClick(e, menu)}
            >
              {#if menu.icon}
                <span class="menu-icon">
                  <i class={menu.icon}></i>
                  {#if menu.highlight}
                    <span class="menu-dot"></span>
                  {/if}
                </span>
              {/if}

              <span class="menu-text">
                {t(menu.textKey)}
              </span>

              {#if menu.children?.length}
                <span class="menu-caret">
                  <b class="caret"></b>
                </span>
              {/if}
            </a>

            {#if menu.children?.length}
              <div class="menu-submenu">
                {#each menu.children as child (child.id)}
                  <div
                    class="menu-item"
                    class:active={child.url ? withBase(child.url) === page.url.pathname : false}
                  >
                    <a
                      class="menu-link"
                      href={withBase(child.url)}
                      onclick={hideMobileSidebar}
                    >
                      <span class="menu-text">
                        {t(child.textKey)}
                      </span>
                    </a>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    </div>

    <div class="p-3 px-4 mt-auto">
      <!-- href="https://seantheme.com/hud-svelte/documentation/" -->
      <a
        href="documentation"
        target="_blank"
        class="btn d-block btn-outline-theme"
      >
        <i class="fa fa-book me-2"></i>
        {m.navDocumentation()}
      </a>
    </div>
  </PerfectScrollbar>
</div>

<button
  class="app-sidebar-mobile-backdrop"
  aria-label="button"
  onclick={mobileToggler}
></button>
