<!-- src/routes/auth/login/+page.svelte -->
<script>
  import { m } from '$lib/i18n/messages'
  export const data = null
</script>

<a href="/auth/session/start" class="btn btn-primary"> {m.authSignin()} </a>
