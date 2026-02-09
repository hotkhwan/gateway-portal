<script>
  import { m } from '$lib/i18n/messages'
  import {
    currentLocaleStore,
    initLocale,
    changeLocale
  } from '$lib/i18nClient/setLanguage'

  initLocale()
  $: currentLocale = $currentLocaleStore

  function toggleLanguage() {
    const newLang = $currentLocaleStore === 'en' ? 'th' : 'en'
    changeLocale(newLang)
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

  <div class="mt-4">
    <a href="/" class="btn btn-primary btn-lg">
      {m.documentationPageDesc()}
    </a>
  </div>
</div>
