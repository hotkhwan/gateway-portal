<!-- src/routes/(app)/subscriptions/packages/+page.svelte -->
<!-- redirect to subscriptions/current (entitlement page) -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  onMount(() => goto(resolve('/subscriptions/current'), { replaceState: true }))
</script>
