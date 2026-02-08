<script lang="ts">
  import PerfectScrollbar from '$lib/components/plugins/PerfectScrollbar.svelte'
  import { m } from '$lib/i18n/messages'
  import { appOptions } from '$lib/stores/appOptions'
  import { appSidebarMenus } from '$lib/stores/appSidebarMenus'
  import { page, navigating } from '$app/stores'
  import type { SidebarChild } from '$lib/types/navigation'

  function mobileToggler() {
    $appOptions.appSidebarMobileToggled = !$appOptions.appSidebarMobileToggled
  }

  function hideMobileSidebar() {
    $appOptions.appSidebarMobileToggled = false
  }

  $: if ($navigating) hideMobileSidebar()

  function renderText(text: string | (() => string)) {
    return typeof text === 'function' ? text() : text
  }

  function hasActiveChild(children?: SidebarChild[]) {
    return children?.some((c) => c.url === $page.url.pathname) ?? false
  }

  let openedMenuId: string | null = null
  function toggleMenu(id: string) {
    openedMenuId = openedMenuId === id ? null : id
  }

  function withBase(url?: string) {
    const base = import.meta.env.PUBLIC_APP_BASE_PATH ?? ''
    if (!url) return '#'
    return `${base}${url}`.replace(/\/+/g, '/')
  }
</script>

<div id="sidebar" class="app-sidebar">
  <!-- ✅ HUD expects this exact structure -->
  <PerfectScrollbar class="app-sidebar-content">
    <div class="menu">
      {#each $appSidebarMenus as menu (menu.id)}
        {#if menu.kind === 'header'}
          <div class="menu-header">
            {renderText(menu.text)}
          </div>
        {:else if menu.kind === 'divider'}
          <div class="menu-divider"></div>
        {:else}
          <div
            class="menu-item"
            class:has-sub={!!menu.children}
            class:expand={openedMenuId === menu.id}
            class:active={menu.url === $page.url.pathname ||
              hasActiveChild(menu.children)}
          >
            <a
              class="menu-link"
              href={menu.children ? 'javascript:void(0)' : withBase(menu.url)}
              on:click|preventDefault={() => {
                if (menu.children) toggleMenu(menu.id)
              }}
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
                {renderText(menu.text)}
              </span>

              {#if menu.children}
                <span class="menu-caret"><b class="caret"></b></span>
              {/if}
            </a>

            {#if menu.children}
              <div class="menu-submenu">
                {#each menu.children as child (child.id)}
                  <div
                    class="menu-item"
                    class:active={$page.url.pathname === child.url}
                  >
                    <a
                      class="menu-link"
                      href={withBase(child.url)}
                      on:click={hideMobileSidebar}
                    >
                      <span class="menu-text">
                        {renderText(child.text)}
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
      <a
        href="https://seantheme.com/hud-svelte/documentation/"
        target="_blank"
        class="btn d-block btn-outline-theme"
      >
        <i class="fa fa-code-branch me-2"></i>
        {m.navDocumentation()}
      </a>
    </div>
  </PerfectScrollbar>
</div>

<button
  class="app-sidebar-mobile-backdrop"
  aria-label="button"
  on:click={mobileToggler}
></button>
