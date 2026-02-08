<!-- src/lib/components/app/AppThemePanel.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { m } from '$lib/i18n/messages'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  import { appVariables, generateVariables } from '$lib/stores/appVariables'
  import { appOptions } from '$lib/stores/appOptions'
  import { asset } from '$lib/utils/asset'

  type ThemeMode = 'dark' | 'light'
  type DirectionMode = 'ltr' | 'rtl'

  type ModeItem = {
    label: () => string
    img: string
    value: ThemeMode
  }

  type DirectionItem = {
    label: () => string
    icon: `bi bi-${string}`
    value: DirectionMode
  }

  type ThemeItem = {
    label: () => string
    bgClass: string
    themeClass: string
  }

  type CoverItem = {
    label: () => string
    coverThumbImage: string
    coverClass: string
  }

  let activeMode: ThemeMode = 'dark'
  let activeDirection: DirectionMode | '' = ''
  let activeTheme = 'theme-teal'
  let activeCover = 'bg-cover-1'

  const modeList: ModeItem[] = [
    {
      label: () => m.themePanelModeDark(),
      img: asset('/img/mode/dark.jpg'),
      value: 'dark'
    },
    {
      label: () => m.themePanelModeLight(),
      img: asset('/img/mode/light.jpg'),
      value: 'light'
    }
  ]

  const directionList: DirectionItem[] = [
    {
      label: () => m.themePanelDirectionLtr(),
      icon: 'bi bi-text-left',
      value: 'ltr'
    },
    {
      label: () => m.themePanelDirectionRtl(),
      icon: 'bi bi-text-right',
      value: 'rtl'
    }
  ]

  const themeList: ThemeItem[] = [
    {
      label: () => m.themeColorPink(),
      bgClass: 'bg-pink',
      themeClass: 'theme-pink'
    },
    {
      label: () => m.themeColorRed(),
      bgClass: 'bg-red',
      themeClass: 'theme-red'
    },
    {
      label: () => m.themeColorOrange(),
      bgClass: 'bg-warning',
      themeClass: 'theme-warning'
    },
    {
      label: () => m.themeColorYellow(),
      bgClass: 'bg-yellow',
      themeClass: 'theme-yellow'
    },
    {
      label: () => m.themeColorLime(),
      bgClass: 'bg-lime',
      themeClass: 'theme-lime'
    },
    {
      label: () => m.themeColorGreen(),
      bgClass: 'bg-green',
      themeClass: 'theme-green'
    },
    {
      label: () => m.themeColorDefault(),
      bgClass: 'bg-teal',
      themeClass: 'theme-teal'
    },
    {
      label: () => m.themeColorCyan(),
      bgClass: 'bg-info',
      themeClass: 'theme-info'
    },
    {
      label: () => m.themeColorBlue(),
      bgClass: 'bg-primary',
      themeClass: 'theme-primary'
    },
    {
      label: () => m.themeColorPurple(),
      bgClass: 'bg-purple',
      themeClass: 'theme-purple'
    },
    {
      label: () => m.themeColorIndigo(),
      bgClass: 'bg-indigo',
      themeClass: 'theme-indigo'
    },
    {
      label: () => m.themeColorGray(),
      bgClass: 'bg-gray-200',
      themeClass: 'theme-gray-200'
    }
  ]

  const coverList: CoverItem[] = [
    {
      label: () => m.themeCoverDefault(),
      coverThumbImage: asset('/img/cover/cover-thumb-1.jpg'),
      coverClass: 'bg-cover-1'
    },
    {
      label: () => m.themeCover2(),
      coverThumbImage: asset('/img/cover/cover-thumb-2.jpg'),
      coverClass: 'bg-cover-2'
    },
    {
      label: () => m.themeCover3(),
      coverThumbImage: asset('/img/cover/cover-thumb-3.jpg'),
      coverClass: 'bg-cover-3'
    },
    {
      label: () => m.themeCover4(),
      coverThumbImage: asset('/img/cover/cover-thumb-4.jpg'),
      coverClass: 'bg-cover-4'
    },
    {
      label: () => m.themeCover5(),
      coverThumbImage: asset('/img/cover/cover-thumb-5.jpg'),
      coverClass: 'bg-cover-5'
    },
    {
      label: () => m.themeCover6(),
      coverThumbImage: asset('/img/cover/cover-thumb-6.jpg'),
      coverClass: 'bg-cover-6'
    },
    {
      label: () => m.themeCover7(),
      coverThumbImage: asset('/img/cover/cover-thumb-7.jpg'),
      coverClass: 'bg-cover-7'
    },
    {
      label: () => m.themeCover8(),
      coverThumbImage: asset('/img/cover/cover-thumb-8.jpg'),
      coverClass: 'bg-cover-8'
    },
    {
      label: () => m.themeCover9(),
      coverThumbImage: asset('/img/cover/cover-thumb-9.jpg'),
      coverClass: 'bg-cover-9'
    }
  ]

  function togglePanel() {
    appOptions.update((o) => ({
      ...o,
      appThemePanelToggled: !o.appThemePanelToggled
    }))
  }

  function themeModeToggler(mode: ThemeMode) {
    activeMode = mode
    localStorage.setItem('theme-mode', mode)
    document.documentElement.setAttribute('data-bs-theme', mode)
    $appVariables = generateVariables()
  }

  function themeColorToggler(themeClass: string) {
    activeTheme = themeClass
    localStorage.setItem('theme-color', themeClass)

    document.body.classList.forEach((cls) => {
      if (cls.startsWith('theme-')) document.body.classList.remove(cls)
    })

    document.body.classList.add(themeClass)
    $appVariables = generateVariables()
  }

  function themeCoverToggler(coverClass: string) {
    activeCover = coverClass
    localStorage.setItem('theme-cover', coverClass)

    document.documentElement.classList.forEach((cls) => {
      if (cls.startsWith('bg-cover-'))
        document.documentElement.classList.remove(cls)
    })

    document.documentElement.classList.add(coverClass)
  }

  function themeDirectionToggler(direction: DirectionMode | '') {
    activeDirection = direction
    localStorage.setItem('theme-direction', direction)
    document.documentElement.setAttribute('dir', direction || 'ltr')
    $appVariables = generateVariables()
  }

  onMount(async () => {
    const bootstrap = await import('bootstrap')

    document
      .querySelectorAll<HTMLElement>('[data-bs-toggle="tooltip"]')
      .forEach((el) => new bootstrap.Tooltip(el))

    activeMode = (localStorage.getItem('theme-mode') as ThemeMode) ?? activeMode
    activeDirection =
      (localStorage.getItem('theme-direction') as DirectionMode) ??
      activeDirection
    activeTheme = localStorage.getItem('theme-color') ?? activeTheme
    activeCover = localStorage.getItem('theme-cover') ?? activeCover

    themeModeToggler(activeMode)
    themeDirectionToggler(activeDirection)
    themeColorToggler(activeTheme)
    themeCoverToggler(activeCover)
  })
</script>

<div class="app-theme-panel" class:active={$appOptions.appThemePanelToggled}>
  <div class="app-theme-panel-container">
    <a
      href="#/"
      aria-label={m.themePanelToggleAriaLabel()}
      class="app-theme-toggle-btn"
      on:click|preventDefault={togglePanel}
    >
      <i class="bi bi-sliders"></i>
    </a>

    <div class="app-theme-panel-content">
      <div class="small fw-bold text-inverse mb-1">
        {m.themePanelDisplayMode()}
      </div>
      <Card class="mb-3">
        <CardBody class="p-2">
          <div class="row gx-2">
            {#each modeList as mode}
              <div class="col-6">
                <a
                  href="#/"
                  class="app-theme-mode-link"
                  class:active={mode.value === activeMode}
                  on:click|preventDefault={() => themeModeToggler(mode.value)}
                >
                  <div class="img">
                    <img
                      src={mode.img}
                      height="76"
                      width="76"
                      alt={mode.label()}
                    />
                  </div>
                  <div class="text">{mode.label()}</div>
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>

      <div class="small fw-bold text-inverse mb-1">
        {m.themePanelDirectionMode()}
      </div>
      <Card class="mb-3">
        <CardBody class="p-2">
          <div class="row gx-2">
            {#each directionList as direction}
              <div class="col-6">
                <a
                  href="#/"
                  class="btn btn-sm btn-outline-light w-100"
                  class:active={direction.value === activeDirection}
                  on:click|preventDefault={() =>
                    themeDirectionToggler(direction.value)}
                >
                  <i class={direction.icon}></i>
                  {direction.label()}
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>

      <div class="small fw-bold text-inverse mb-1">
        {m.themePanelThemeColor()}
      </div>
      <Card class="mb-3">
        <CardBody class="p-2">
          <div class="app-theme-list">
            {#each themeList as theme}
              <div
                class="app-theme-list-item"
                class:active={theme.themeClass === activeTheme}
              >
                <a
                  href="#/"
                  aria-label={m.themePanelThemeColor()}
                  class="app-theme-list-link {theme.bgClass}"
                  on:click|preventDefault={() =>
                    themeColorToggler(theme.themeClass)}
                  data-bs-toggle="tooltip"
                  data-bs-trigger="hover"
                  data-bs-container="body"
                  data-bs-title={theme.label()}
                >
                  &nbsp;
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>

      <div class="small fw-bold text-inverse mb-1">
        {m.themePanelThemeCover()}
      </div>
      <Card class="mb-3">
        <CardBody class="p-2">
          <div class="app-theme-cover">
            {#each coverList as cover}
              <div
                class="app-theme-cover-item"
                class:active={cover.coverClass === activeCover}
              >
                <a
                  href="#/"
                  aria-label={m.themePanelThemeCover()}
                  class="app-theme-cover-link"
                  style="background-image: url({cover.coverThumbImage});"
                  on:click|preventDefault={() =>
                    themeCoverToggler(cover.coverClass)}
                  data-bs-toggle="tooltip"
                  data-bs-trigger="hover"
                  data-bs-container="body"
                  data-bs-title={cover.label()}
                >
                  &nbsp;
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>
    </div>
  </div>
</div>
<!-- END theme-panel -->
