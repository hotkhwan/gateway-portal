<!-- src/routes/auth/error/+page.svelte -->
<script>
  import { m } from '$lib/i18n/messages'
  import { page } from '$app/state'

  $: error = page.url.searchParams.get('error') ?? 'Authentication failed'
</script>

<div class="auth-error">
  <h1>{m.authErrorTitle()}</h1>
  <p>{error}</p>

  <a href="/auth/login" class="btn btn-primary"> {m.authTryAgain()} </a>
</div>
