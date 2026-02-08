<!-- src/routes/(app)/+layout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte'
  import { appOptions } from '$lib/stores/appOptions'

  import AppHeader from '$lib/components/app/AppHeader.svelte'
  import AppSidebar from '$lib/components/app/AppSidebar.svelte'
  import AppTopNav from '$lib/components/app/AppTopNav.svelte'
  import AppFooter from '$lib/components/app/AppFooter.svelte'

  let { children } = $props()

  onMount(() => {
    $appOptions.appHeaderHide = false
    $appOptions.appSidebarHide = false
    $appOptions.appTopNav = false
    $appOptions.appFooter = true
    $appOptions.appContentClass = ''
  })
</script>

{#if !$appOptions.appHeaderHide}<AppHeader />{/if}
{#if !$appOptions.appSidebarHide}<AppSidebar />{/if}
{#if $appOptions.appTopNav}<AppTopNav />{/if}

<div
  id="content"
  class="app-content{$appOptions.appContentClass
    ? ' ' + $appOptions.appContentClass
    : ''}"
>
  {@render children()}
</div>

{#if $appOptions.appFooter}<AppFooter />{/if}
