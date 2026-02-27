<script lang="ts">
  import { page } from '$app/state'
  import { goto } from '$app/navigation'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import { setPageTitle } from '$lib/utils'
  import { onMount, onDestroy } from 'svelte'
  import { appOptions } from '$lib/stores/appOptions.js'
  import { m } from '$lib/i18n/messages'

  function goBack() {
    history.go(-1)
  }

  function goHome() {
    goto('/')
  }

  onMount(async () => {
    setPageTitle(
      page.status === 404 ? m.error404Title() : `Error ${page.status}`
    )
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
          <div class="error-code">{page.status || 500}</div>
        </Card>
      </CardBody>
    </Card>

    <h1>{m.errorOops()}</h1>
    <h3>
      {page.error?.message ||
        (page.status === 404 ? m.errorNotFoundDesc() : 'An error occurred')}
    </h3>

    <hr />

    <div class="d-flex gap-2 mt-4">
      <button onclick={goBack} class="btn btn-outline-theme px-3 rounded-pill">
        <i class="fa fa-arrow-left me-1 ms-n1"></i>
        {m.actionGoBack()}
      </button>
      <button onclick={goHome} class="btn btn-theme px-3 rounded-pill">
        <i class="fa fa-home me-1"></i>
        {m.navHome()}
      </button>
    </div>
  </div>
</div>

<style>
  .error-page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .error-page-content {
    text-align: center;
    max-width: 90%;
  }

  .error-code {
    font-size: 4rem;
    font-weight: 700;
    color: var(--bs-body-color);
    text-align: center;
    padding: 1rem;
  }
</style>
