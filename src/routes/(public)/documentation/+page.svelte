<script lang="ts">
  import { m } from '$lib/i18n/messages'
  import { goto } from '$app/navigation'
  import {
    currentLocaleStore,
    initLocale,
    changeLocale
  } from '$lib/i18nClient/setLanguage'

  initLocale()
  $: currentLocale = $currentLocaleStore
  const base = (import.meta.env.PUBLIC_APP_BASE_PATH ?? '').replace(/\/$/, '')
  function toggleLanguage() {
    const newLang = $currentLocaleStore === 'en' ? 'th' : 'en'
    changeLocale(newLang)
  }
  function goHome() {
    goto(base || '/')
  }
</script>

<div class="container p-5 text-center">
  <div class="d-flex justify-content-end mb-4">
    <button class="btn btn-outline-secondary btn-sm" onclick={toggleLanguage}>
      {$currentLocaleStore === 'en' ? 'EN' : 'TH'}
    </button>
  </div>

  <h1>{m.documentationTitle()}</h1>
  <p class="lead">{m.documentationOverview()}</p>

  <div>
    <button
      type="button"
      onclick={goHome}
      class="btn btn-outline-theme px-3 rounded-pill"
    >
      <i class="fa fa-arrow-left me-1 ms-n1"></i>
      {m.documentPageDesc()}
    </button>
  </div>
</div>
