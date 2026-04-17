<!-- src/routes/(app)/orgs/units/[unitId]/members/+page.svelte -->
<!-- redirect to workspaces/members -->
<script lang="ts">
  import { goto } from '$app/navigation'
  import { resolve } from '$app/paths'
  import { onMount } from 'svelte'
  onMount(() => goto(resolve('/workspaces/members'), { replaceState: true }))
</script>
