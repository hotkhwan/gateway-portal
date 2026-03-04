<!-- src/routes/auth/error/+page.svelte -->
<script>
  import { m } from '$lib/i18n/messages'
  import { page } from '$app/state'

  $: error = page.url.searchParams.get('error') ?? 'Authentication failed'
  $: errorType = page.url.searchParams.get('type') ?? 'auth_failed'

  $: isApiConnectionError = errorType === 'api_connection'
</script>

<div class="auth-error">
  <div class="text-center mb-4">
    {#if isApiConnectionError}
      <i class="bi bi-exclamation-octagon-fill text-danger fs-1"></i>
    {:else}
      <i class="bi bi-shield-exclamation text-warning fs-1"></i>
    {/if}
  </div>

  <h1>
    {#if isApiConnectionError}{m.authApiErrorTitle()}{:else}{m.authErrorTitle()}{/if}
  </h1>

  <p class="text-muted mb-3">
    {#if isApiConnectionError}{m.authApiErrorDesc()}{:else}{m.authErrorDesc()}{/if}
  </p>

  {#if isApiConnectionError}
    <!-- API Connection Error Details -->
    <div class="alert alert-warning small mb-3">
      <div class="d-flex align-items-start">
        <i class="bi bi-info-circle me-2 mt-1"></i>
        <div>
          <strong>{m.authApiErrorDetails({ details: error })}</strong>
        </div>
      </div>
    </div>

    <!-- Possible Solutions -->
    <div class="card mb-4 bg-body-tertiary border-0">
      <div class="card-body">
        <h6 class="card-title mb-3">{m.authApiErrorSolution()}</h6>
        <ul class="list-unstyled mb-0 small">
          <li class="mb-2">
            <i class="bi bi-check-circle text-success me-2"></i>
            {m.authApiErrorSolution1()}
          </li>
          <li class="mb-2">
            <i class="bi bi-check-circle text-success me-2"></i>
            {m.authApiErrorSolution2()}
          </li>
          <li>
            <i class="bi bi-check-circle text-success me-2"></i>
            {m.authApiErrorSolution3()}
          </li>
        </ul>
      </div>
    </div>
  {:else}
    <!-- Generic Auth Error -->
    <div class="alert alert-danger small mb-3">
      {error}
    </div>
  {/if}

  <a href="/" aria-label="link" class="btn btn-primary">
    {m.authTryAgaiLater()}
  </a>
</div>

<style>
  .auth-error {
    max-width: 500px;
    margin: 3rem auto;
    padding: 2rem;
    text-align: center;
  }
</style>
