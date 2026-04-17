<!-- src/routes/(app)/orgs/permissions/+page.svelte -->
<!-- redirect to workspaces/roles -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  onMount(() => goto(resolve('/workspaces/roles'), { replaceState: true }))
</script>
