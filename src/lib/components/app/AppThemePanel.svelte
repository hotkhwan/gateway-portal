<!-- src/lib/components/app/AppThemePanel.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'

  import { appVariables, generateVariables } from '$lib/stores/appVariables'
  import { appOptions } from '$lib/stores/appOptions'
  import { asset } from '$lib/utils/asset'

  type ThemeMode = 'dark' | 'light'
  type DirectionMode = 'ltr' | 'rtl'

  type ModeItem = {
    name: string
    img: string
    value: ThemeMode
  }

  type DirectionItem = {
    name: string
    icon: `bi bi-${string}`
    value: DirectionMode
  }

  type ThemeItem = {
    name: string
    bgClass: string
    themeClass: string
  }

  type CoverItem = {
    name: string
    coverThumbImage: string
    coverClass: string
  }

  let activeMode: ThemeMode = 'dark'
  let activeDirection: DirectionMode | '' = ''
  let activeTheme = 'theme-teal'
  let activeCover = 'bg-cover-1'

  const modeList: ModeItem[] = [
    { name: 'Dark', img: asset('/img/mode/dark.jpg'), value: 'dark' },
    { name: 'Light', img: asset('/img/mode/light.jpg'), value: 'light' }
  ]

  const directionList: DirectionItem[] = [
    { name: 'LTR', icon: 'bi bi-text-left', value: 'ltr' },
    { name: 'RTL', icon: 'bi bi-text-right', value: 'rtl' }
  ]

  const themeList: ThemeItem[] = [
    { name: 'Pink', bgClass: 'bg-pink', themeClass: 'theme-pink' },
    { name: 'Red', bgClass: 'bg-red', themeClass: 'theme-red' },
    { name: 'Orange', bgClass: 'bg-warning', themeClass: 'theme-warning' },
    { name: 'Yellow', bgClass: 'bg-yellow', themeClass: 'theme-yellow' },
    { name: 'Lime', bgClass: 'bg-lime', themeClass: 'theme-lime' },
    { name: 'Green', bgClass: 'bg-green', themeClass: 'theme-green' },
    { name: 'Default', bgClass: 'bg-teal', themeClass: 'theme-teal' },
    { name: 'Cyan', bgClass: 'bg-info', themeClass: 'theme-info' },
    { name: 'Blue', bgClass: 'bg-primary', themeClass: 'theme-primary' },
    { name: 'Purple', bgClass: 'bg-purple', themeClass: 'theme-purple' },
    { name: 'Indigo', bgClass: 'bg-indigo', themeClass: 'theme-indigo' },
    { name: 'Gray', bgClass: 'bg-gray-200', themeClass: 'theme-gray-200' }
  ]

  const coverList: CoverItem[] = [
    {
      name: 'Default',
      coverThumbImage: asset('/img/cover/cover-thumb-1.jpg'),
      coverClass: 'bg-cover-1'
    },
    {
      name: 'Cover 2',
      coverThumbImage: asset('/img/cover/cover-thumb-2.jpg'),
      coverClass: 'bg-cover-2'
    },
    {
      name: 'Cover 3',
      coverThumbImage: asset('/img/cover/cover-thumb-3.jpg'),
      coverClass: 'bg-cover-3'
    },
    {
      name: 'Cover 4',
      coverThumbImage: asset('/img/cover/cover-thumb-4.jpg'),
      coverClass: 'bg-cover-4'
    },
    {
      name: 'Cover 5',
      coverThumbImage: asset('/img/cover/cover-thumb-5.jpg'),
      coverClass: 'bg-cover-5'
    },
    {
      name: 'Cover 6',
      coverThumbImage: asset('/img/cover/cover-thumb-6.jpg'),
      coverClass: 'bg-cover-6'
    },
    {
      name: 'Cover 7',
      coverThumbImage: asset('/img/cover/cover-thumb-7.jpg'),
      coverClass: 'bg-cover-7'
    },
    {
      name: 'Cover 8',
      coverThumbImage: asset('/img/cover/cover-thumb-8.jpg'),
      coverClass: 'bg-cover-8'
    },
    {
      name: 'Cover 9',
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

<!-- BEGIN theme-panel -->
<div class="app-theme-panel" class:active={$appOptions.appThemePanelToggled}>
  <div class="app-theme-panel-container">
    <a
      href="#/"
      aria-label="Theme panel toggle"
      class="app-theme-toggle-btn"
      on:click|preventDefault={togglePanel}
    >
      <i class="bi bi-sliders"></i>
    </a>

    <div class="app-theme-panel-content">
      <div class="small fw-bold text-inverse mb-1">Display Mode</div>
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
                      alt={mode.name}
                    />
                  </div>
                  <div class="text">{mode.name}</div>
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>

      <div class="small fw-bold text-inverse mb-1">Direction Mode</div>
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
                  {direction.name}
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>
      <!-- Theme Color -->
      <div class="small fw-bold text-inverse mb-1">Theme Color</div>
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
                  aria-label="Theme Color"
                  class="app-theme-list-link {theme.bgClass}"
                  on:click|preventDefault={() =>
                    themeColorToggler(theme.themeClass)}
                  data-bs-toggle="tooltip"
                  data-bs-trigger="hover"
                  data-bs-container="body"
                  data-bs-title={theme.name}
                >
                  &nbsp;
                </a>
              </div>
            {/each}
          </div>
        </CardBody>
      </Card>

      <!-- Theme Cover -->
      <div class="small fw-bold text-inverse mb-1">Theme Cover</div>
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
                  aria-label="Theme Cover"
                  class="app-theme-cover-link"
                  style="background-image: url({cover.coverThumbImage});"
                  on:click|preventDefault={() =>
                    themeCoverToggler(cover.coverClass)}
                  data-bs-toggle="tooltip"
                  data-bs-trigger="hover"
                  data-bs-container="body"
                  data-bs-title={cover.name}
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
