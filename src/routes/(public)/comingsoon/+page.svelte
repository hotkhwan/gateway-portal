<script lang="ts">
  import { goto } from '$app/navigation'
  import { setPageTitle } from '$lib/utils'
  import { onMount, onDestroy } from 'svelte'
  import { appOptions } from '$lib/stores/appOptions.js'
  import { m } from '$lib/i18n/messages'

  let currentDate = new Date()
  let currentYear = currentDate.getFullYear()
  let targetDate = new Date(`March 1, ${currentYear} 23:59:59`)
  let remainingTime = calculateRemainingTime()
  let countdownInterval: ReturnType<typeof setInterval>

  function goBack() {
    history.go(-1)
  }

  function calculateRemainingTime() {
    const now = new Date()
    const difference = targetDate.getTime() - now.getTime()

    if (difference <= 0) {
      stopCountdown()
      return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60)
    }
  }

  function startCountdown() {
    countdownInterval = setInterval(() => {
      remainingTime = calculateRemainingTime()
    }, 1000)
  }

  function stopCountdown() {
    if (countdownInterval) clearInterval(countdownInterval)
  }

  function submitForm(event: Event) {
    event.preventDefault()
    goto('/')
  }

  onMount(() => {
    setPageTitle(m.comingsoonPageTitle())
    $appOptions.appContentClass = 'p-0'
    $appOptions.appSidebarHide = true
    $appOptions.appHeaderHide = true
    startCountdown()
  })

  onDestroy(() => {
    $appOptions.appContentClass = ''
    $appOptions.appSidebarHide = false
    $appOptions.appHeaderHide = false
    stopCountdown()
  })
</script>

<!-- BEGIN coming-soon -->
<div class="coming-soon">
  <div class="flex-1">
    <div class="coming-soon-timer">
      <div class="is-countdown text-center">
        <div class="countdown-row countdown-show4">
          <span class="countdown-section">
            <span class="countdown-amount d-block">{remainingTime.days}</span>
            <span class="countdown-period d-block">{m.timeDays()}</span>
          </span>
          <span class="countdown-section">
            <span class="countdown-amount d-block">{remainingTime.hours}</span>
            <span class="countdown-period d-block">{m.timeHours()}</span>
          </span>
          <span class="countdown-section">
            <span class="countdown-amount d-block">{remainingTime.minutes}</span
            >
            <span class="countdown-period d-block">{m.timeMinutes()}</span>
          </span>
          <span class="countdown-section">
            <span class="countdown-amount d-block">{remainingTime.seconds}</span
            >
            <span class="countdown-period d-block">{m.timeSeconds()}</span>
          </span>
        </div>
      </div>
    </div>

    <div class="coming-soon-content d-flex flex-column">
      <div class="flex-1 mb-3">
        <h2 class="mb-3">{m.comingsoonTitle()}</h2>

        <p class="mb-4">
          {m.comingsoonDescriptionLine1()}<br />
          {m.comingsoonDescriptionLine2()}
        </p>

        <form onsubmit={submitForm}>
          <div class="input-group mb-2">
            <input
              type="email"
              class="form-control"
              name="email"
              placeholder={m.formEmailPlaceholder()}
            />
            <button type="submit" class="btn btn-outline-theme">
              {m.actionSubscribe()}
            </button>
          </div>
        </form>

        <div class="mb-1 small text-inverse text-opacity-50">
          {m.subscribeHint()}
        </div>
        <div>
          <a
            href="#/"
            onclick={goBack}
            class="btn btn-outline-theme px-3 rounded-pill"
          >
            <i class="fa fa-arrow-left me-1 ms-n1"></i>
            {m.actionGoBack()}
          </a>
        </div>
      </div>

      <div class="text-center small text-inverse text-opacity-50">
        {m.footerCopyright()}
      </div>
    </div>
  </div>
</div>
<!-- END coming-soon -->
