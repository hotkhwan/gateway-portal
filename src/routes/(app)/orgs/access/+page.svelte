<!-- src/routes/(app)/orgs/access/+page.svelte -->
<!-- redirect to /workspaces/access -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  onMount(() => goto(resolve('/workspaces/access'), { replaceState: true }))
</script>
