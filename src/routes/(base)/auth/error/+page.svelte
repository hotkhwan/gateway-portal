<!-- src/routes/auth/error/+page.svelte -->
<script>
  import { page } from '$app/stores'

  $: error = $page.url.searchParams.get('error') ?? 'Authentication failed'
</script>

<div class="auth-error">
  <h1>Sign in error</h1>
  <p>{error}</p>

  <a href="/auth/login" class="btn btn-primary">
    Try again
  </a>
</div>
