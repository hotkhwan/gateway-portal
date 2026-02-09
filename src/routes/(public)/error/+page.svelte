<!-- src/routes/(public)/error/+page.svelte -->
<script lang="ts">
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { setPageTitle } from '$lib/utils'
  import { onMount, onDestroy } from 'svelte'
  import { appOptions } from '$lib/stores/appOptions.js'
  import { m } from '$lib/i18n/messages'

  function goBack() {
    history.go(-1)
  }

  onMount(async () => {
    setPageTitle(m.error404Title())
    $appOptions.appContentClass = 'p-0'
    $appOptions.appSidebarHide = true
    $appOptions.appHeaderHide = true
  })

  onDestroy(() => {
    $appOptions.appContentClass = ''
    $appOptions.appSidebarHide = false
    $appOptions.appHeaderHide = false
  })
</script>

<!-- BEGIN error -->
<div class="error-page">
  <div class="error-page-content">
    <Card class="mb-5 mx-auto" style="max-width: 320px;">
      <CardBody>
        <Card>
          <div class="error-code">404</div>
        </Card>
      </CardBody>
    </Card>

    <h1>{m.errorOops()}</h1>
    <h3>{m.errorNotFoundDesc()}</h3>

    <hr />

    <p class="mb-1">{m.errorHelpfulLinks()}</p>

    <p class="mb-5">
      <a href="/" class="text-decoration-none text-inverse text-opacity-50">
        {m.navHome()}
      </a>
      <span class="link-divider"></span>

      <!-- <a
        href="/page/search-results"
        class="text-decoration-none text-inverse text-opacity-50"
      >
        {m.navSearch()}
      </a>
      <span class="link-divider"></span>

      <a
        href="/email/inbox"
        class="text-decoration-none text-inverse text-opacity-50"
      >
        {m.navEmail()}
      </a>
      <span class="link-divider"></span>

      <a
        href="/calendar"
        class="text-decoration-none text-inverse text-opacity-50"
      >
        {m.navCalendar()}
      </a>
      <span class="link-divider"></span>

      <a
        href="/settings"
        class="text-decoration-none text-inverse text-opacity-50"
      >
        {m.navSettings()}
      </a>
      <span class="link-divider"></span>

      <a
        href="/helper"
        class="text-decoration-none text-inverse text-opacity-50"
      >
        {m.navHelper()}
      </a> -->
    </p>

    <a
      href="#/"
      onclick={goBack}
      class="btn btn-outline-theme px-3 rounded-pill"
    >
      <i class="fa fa-arrow-left me-1 ms-n1"></i>
      {m.actionGoBack()}
    </a>
  </div>
</div>
<!-- END error -->
