<!-- src/routes/(app)/orgs/units/+page.svelte -->
<!-- redirect to workspaces -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  onMount(() => goto(resolve('/workspaces'), { replaceState: true }))
</script>
