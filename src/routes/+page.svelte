<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { m } from '$lib/i18n/messages'
  import { onMount } from 'svelte'
  import Icon from '@iconify/svelte'
  import { asset } from '$lib/utils/asset'

  import { setPageTitle } from '$lib/utils/title'
  import { appOptions } from '$lib/stores/appOptions'

  import {
    currentLocaleStore,
    initLocale,
    changeLocale,
    type AppLocale
  } from '$lib/i18nClient/setLanguage'

  // ✅ สำคัญ: init ตั้งแต่ก่อน render
  initLocale()

  // ✅ ทำให้ข้อความใน template re-render เมื่อเปลี่ยนภาษา
  $: currentLocale = $currentLocaleStore

  function onChangeLanguage(locale: AppLocale) {
    changeLocale(locale)
  }

  onMount(async () => {
    await import('lity')
    await import('lity/dist/lity.min.css')

    setPageTitle(m.landingPageTitle())
    $appOptions.appContentClass = 'p-0 pt-5 mt-4px'
    $appOptions.appSidebarHide = true
    $appOptions.appHeaderHide = true
  })

  // onDestroy(() => {
  //   $appOptions.appContentClass = ''
  //   $appOptions.appSidebarHide = true
  //   $appOptions.appHeaderHide = true
  // })
</script>

<!-- BEGIN #header -->
<div id="header" class="app-header navbar navbar-expand-lg p-0">
  <div class="container-xxl px-3 px-lg-5">
    <button
      class="navbar-toggler border-0 p-0 me-3 fs-24px shadow-none"
      aria-label="button"
      type="button"
      data-bs-toggle="collapse"
      data-bs-target="#navbarContent"
    >
      <span class="h-2px w-25px bg-gray-500 d-block mb-1"></span>
      <span class="h-2px w-25px bg-gray-500 d-block"></span>
    </button>

    <a
      class="navbar-brand d-flex align-items-center position-relative me-auto brand px-0 w-auto"
      aria-label="link"
      href="/"
    >
      <span class="brand-logo d-flex">
        <span class="brand-img">
          <span class="brand-img-text text-theme">{m.headerBrand()}</span>
        </span>
        <span class="brand-text">{m.landingHome()}</span>
      </span>
    </a>

    <div class="collapse navbar-collapse" id="navbarContent">
      <div
        class="navbar-nav ms-auto mb-2 mb-lg-0 text-uppercase small fw-semibold"
      >
        <div class="nav-item me-2">
          <a href="#home" aria-label="link" class="nav-link link-body-emphasis">
            {m.navHome()}
          </a>
        </div>
        <div class="nav-item me-2">
          <a
            href="#about"
            aria-label="link"
            class="nav-link link-body-emphasis"
          >
            {m.navAbout()}
          </a>
        </div>
        <div class="nav-item me-2">
          <a
            href="#features"
            aria-label="link"
            class="nav-link link-body-emphasis"
          >
            {m.navFeatures()}
          </a>
        </div>
        <div class="nav-item me-2">
          <a
            href="#contact"
            aria-label="link"
            class="nav-link link-body-emphasis"
          >
            {m.navContact()}
          </a>
        </div>
      </div>
    </div>
    <a
      href="dashboard"
      class="btn btn-outline-theme btn-sm fw-semibold text-uppercase px-2 py-1 fs-10px"
    >
      {m.landingGetStarted()}
      <i class="fa fa-arrow-right ms-1"></i>
    </a>
  </div>
</div>
<!-- END #header -->

<!-- BEGIN #home -->
<div
  id="home"
  class="py-5 position-relative bg-body bg-opacity-50"
  data-bs-theme="dark"
>
  <!-- BEGIN container -->
  <div class="container-xxl p-3 p-lg-5 mb-0">
    <!-- BEGIN div-hero-content -->
    <div class="div-hero-content z-3 position-relative">
      <!-- BEGIN row -->
      <div class="row">
        <!-- BEGIN col-8 -->
        <div class="col-lg-6">
          <!-- BEGIN hero-title-desc -->
          <h1 class="display-6 fw-600 mb-2 mt-4">{m.heroTitle()}</h1>

          <div class="fs-18px text-body text-opacity-75 mb-4">
            {m.heroDescriptionLine1()}
            <span class="d-xl-inline d-none"><br /></span>
            {m.heroDescriptionLine2()}
            <span class="d-xl-inline d-none"><br /></span>
            {m.heroDescriptionLine3()}
          </div>
          <!-- END hero-title-desc -->

          <div class="text-body text-opacity-35 text-center2 mb-4">
            <i class="fab fa-bootstrap fa-2x fa-fw" aria-hidden="true"></i>
            <i class="fab fa-node-js fa-2x fa-fw" aria-hidden="true"></i>
            <i class="fab fa-vuejs fa-2x fa-fw" aria-hidden="true"></i>
            <i class="fab fa-angular fa-2x fa-fw" aria-hidden="true"></i>
            <i class="fab fa-react fa-2x fa-fw" aria-hidden="true"></i>
            <i class="fab fa-laravel fa-2x fa-fw" aria-hidden="true"></i>
            <i class="fab fa-npm fa-2x fa-fw" aria-hidden="true"></i>
          </div>

          <div class="mb-2">
            <a href="documentation" class="btn btn-lg btn-outline-white px-3">
              {m.heroPrimaryCta()}
              <i class="fa fa-arrow-right ms-2 opacity-5"></i>
            </a>
          </div>

          <hr class="my-4" />

          <!-- BEGIN row -->
          <div class="row text-body mt-4 mb-4">
            <div class="col-6 mb-3 mb-lg-0">
              <div class="d-flex align-items-center">
                <div class="h1 text-body text-opacity-25 me-3">
                  <Icon icon="bi:download" />
                </div>
                <div>
                  <div class="fw-500 mb-0 h3">
                    {m.heroStatDownloadValue()}
                  </div>
                  <div class="fw-500 text-body text-opacity-75">
                    {m.heroStatDownloadLabel()}
                  </div>
                </div>
              </div>
            </div>

            <div class="col-6">
              <div class="d-flex align-items-center">
                <div class="h1 text-body text-opacity-25 me-3">
                  <Icon icon="bi:bootstrap" />
                </div>
                <div>
                  <div class="fw-500 mb-0 h3">
                    {m.heroStatVersionValue()}
                  </div>
                  <div class="fw-500 text-body text-opacity-75">
                    {m.heroStatVersionLabel()}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- END row -->
        </div>
        <!-- END col-8 -->
      </div>
      <!-- END row -->
    </div>
    <!-- END div-hero-content -->

    <div
      class="position-absolute top-0 bottom-0 end-0 w-50 p-5 z-2 overflow-hidden d-lg-flex align-items-center d-none"
    >
      <img
        class="w-100 d-block shadow-lg"
        alt={m.heroMockImageAlt()}
        src={asset('/img/landing/mockup-1.jpg')}
      />
    </div>
  </div>
  <!-- END container -->

  <div
    class="position-absolute bg-size-cover bg-position-center d-none2 bg-no-repeat top-0 start-0 w-100 h-100"
    style="background-image: url({asset('/img/landing/cover.jpg')});"
  ></div>
  <div
    class="position-absolute top-0 start-0 d-none2 w-100 h-100 opacity-95"
    style="background: var(--bs-body-bg-gradient);"
  ></div>
  <div
    class="position-absolute top-0 start-0 d-none2 w-100 h-100 opacity-95"
    style="background-image: url({asset(
      '/img/pattern/pattern-dark.png'
    )}); background-size: var(--bs-body-bg-image-size);"
  ></div>
</div>
<!-- END #home -->

<!-- BEGIN #about -->
<div id="about" class="py-5 bg-component">
  <div class="container-xxl p-3 p-lg-5 text-center">
    <h1 class="mb-3">{m.aboutTitle()}</h1>
    <p class="fs-16px text-body text-opacity-50 mb-5">
      {m.aboutDescriptionLine1()} <br />
      {m.aboutDescriptionLine2()}
    </p>

    <div class="row text-start g-3 gx-lg-5 gy-lg-4">
      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:monitor-smartphone-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem1Title()}</h4>
          <p class="mb-0">{m.aboutItem1Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:settings-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem2Title()}</h4>
          <p class="mb-0">{m.aboutItem2Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:bolt-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem3Title()}</h4>
          <p class="mb-0">{m.aboutItem3Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:lock-keyhole-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem4Title()}</h4>
          <p class="mb-0">{m.aboutItem4Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:dialog-2-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem5Title()}</h4>
          <p class="mb-0">{m.aboutItem5Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:help-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem6Title()}</h4>
          <p class="mb-0">{m.aboutItem6Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:tuning-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem7Title()}</h4>
          <p class="mb-0">{m.aboutItem7Desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:widget-5-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.aboutItem8Title()}</h4>
          <p class="mb-0">{m.aboutItem8Desc()}</p>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- END #about -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #features -->
<div id="features" class="py-5 position-relative">
  <div class="container-xxl p-3 p-lg-5 z-2 position-relative">
    <div class="text-center mb-5">
      <h1 class="mb-3">{m.featuresTitle()}</h1>
      <p class="fs-16px text-body text-opacity-50 mb-5">
        {m.featuresDescriptionLine1()} <br />
        {m.featuresDescriptionLine2()} <br />
        {m.featuresDescriptionLine3()}
      </p>
    </div>

    <div class="row g-3 g-lg-5">
      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-1.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-1-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem1Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-2.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-2-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem2Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-3.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-3-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem3Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-4.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-4-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem4Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-5.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-5-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem5Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-6.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-6-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem6Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-7.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-7-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem7Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-8.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-8-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem8Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href="/img/landing/mockup-9.jpg"
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-9-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem9Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-10.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-10-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem10Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-11.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-11-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem11Label()}
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <a
          href={asset('/img/landing/mockup-12.jpg')}
          aria-label="link"
          data-lity
          data-sveltekit-reload
          class="shadow d-block"
        >
          <img
            src={asset('/img/landing/mockup-12-thumb.jpg')}
            alt=""
            class="mw-100"
          />
        </a>
        <div class="text-center my-3 text-body fw-bold">
          {m.featuresItem12Label()}
        </div>
      </div>
    </div>
  </div>
</div>
<!-- END #features -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #pricing -->
<div id="pricing" class="py-5 text-body text-opacity-75">
  <div class="container-xxl p-3 p-lg-5">
    <h1 class="mb-3 text-center">{m.pricingTitle()}</h1>
    <p class="fs-16px text-body text-opacity-50 text-center mb-0">
      {m.pricingDescriptionLine1()} <br />
      {m.pricingDescriptionLine2()} <br />
      {m.pricingDescriptionLine3()}
    </p>

    <div class="row g-3 py-3 gx-lg-5 pt-lg-5">
      <div class="col-xl-3 col-md-4 col-sm-6 py-xl-5">
        <div class="card h-100">
          <div class="card-body p-4 d-flex flex-column">
            <div class="d-flex align-items-center">
              <div class="flex-1">
                <div class="h6 font-monospace">{m.pricingPlan1Name()}</div>
                <div class="h1 fw-semibold mb-0">
                  {m.pricingPlan1Price()}
                  <small class="h6 fw-semibold text-body text-opacity-50">
                    {m.pricingPerMonthSuffix()}
                  </small>
                </div>
              </div>
              <div>
                <Icon
                  icon="solar:usb-bold-duotone"
                  class="display-6 text-body text-opacity-50"
                />
              </div>
            </div>

            <hr class="my-20px" />

            <div class="mb-5 text-body text-opacity-75 flex-1">
              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingStorageLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingBandwidthLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingGatewayLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small">{m.pricingSslLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingSupportLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-times fa-lg text-body text-opacity-25"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small">{m.pricingSsoLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Sso()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-times fa-lg text-body text-opacity-25"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingAuditLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan1Audit()}</b>
                </div>
              </div>
            </div>

            <div class="mx-n2">
              <a
                href="#/"
                aria-label="link"
                class="btn btn-outline-default btn-lg w-100 font-monospace"
              >
                {m.pricingCtaGetStarted()} <i class="fa fa-arrow-right"></i>
              </a>
            </div>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-md-6 py-3 py-xl-5">
        <div class="card h-100">
          <div class="card-body p-4 d-flex flex-column">
            <div class="d-flex align-items-center">
              <div class="flex-1">
                <div class="h6 font-monospace">{m.pricingPlan2Name()}</div>
                <div class="h1 fw-semibold mb-0">
                  {m.pricingPlan2Price()}
                  <small class="h6 fw-semibold text-body text-opacity-50">
                    {m.pricingPerMonthSuffix()}
                  </small>
                </div>
              </div>
              <div>
                <Icon
                  icon="solar:map-arrow-up-bold-duotone"
                  class="display-6 text-body text-opacity-50"
                />
              </div>
            </div>

            <hr class="my-20px" />

            <div class="mb-5 text-body text-opacity-75 flex-1">
              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingStorageLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan2Storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingBandwidthLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan2Bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingGatewayLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan2Gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small">{m.pricingSslLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan2Ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingSupportLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan2Support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-times fa-lg text-body text-opacity-25"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingAuditLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan2Audit()}</b>
                </div>
              </div>
            </div>

            <a href="/dashboard" class="btn btn-lg btn-outline-white px-3">
              {m.pricingCtaGetStarted()}
              <i class="fa fa-arrow-right ms-2 opacity-5"></i>
            </a>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-md-6 py-3 py-xl-0">
        <div class="card border-theme h-100">
          <div class="card-body p-30px h-100 d-flex flex-column">
            <div class="d-flex align-items-center">
              <div class="flex-1">
                <div class="h6 font-monospace text-theme">
                  {m.pricingPlan3Name()}
                </div>
                <div class="display-6 fw-bold mb-0 text-theme">
                  {m.pricingPlan3Price()}
                  <small class="h6 text-body text-opacity-50"
                    >{m.pricingPerMonthSuffix()}</small
                  >
                </div>
              </div>
              <div>
                <Icon
                  icon="solar:cup-first-bold-duotone"
                  class="display-5 text-theme"
                />
              </div>
            </div>

            <hr class="my-20px" />

            <div class="mb-5 text-body flex-1">
              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingStorageLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingBandwidthLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingGatewayLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingSslLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingSupportLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingSsoLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Sso()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricingAuditLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan3Audit()}</b>
                </div>
              </div>
            </div>

            <a
              href="/dashboard"
              aria-label="link"
              class="btn btn-theme btn-lg w-100 text-black font-monospace"
            >
              {m.pricingCtaGetStarted()} <i class="fa fa-arrow-right"></i>
            </a>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-md-6 py-3 py-xl-5">
        <div class="card h-100">
          <div class="card-body p-30px d-flex flex-column">
            <div class="d-flex align-items-center">
              <div class="flex-1">
                <div class="h6 font-monospace">{m.pricingPlan4Name()}</div>
                <div class="display-6 fw-bold mb-0">
                  {m.pricingPlan4Price()}
                  <small class="h6 text-body text-opacity-50"
                    >{m.pricingPerMonthSuffix()}</small
                  >
                </div>
              </div>
              <div>
                <Icon
                  icon="solar:buildings-bold-duotone"
                  class="display-6 text-white text-opacity-50"
                />
              </div>
            </div>

            <hr class="my-20px" />

            <div class="mb-5 text-body text-opacity-75 flex-1">
              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingStorageLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan4Storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingBandwidthLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan4Bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingGatewayLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan4Gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small">{m.pricingSslLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan4Ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingSupportLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan4Support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricingAuditLabel()}</span
                  >
                  <b class="text-body">{m.pricingPlan4Audit()}</b>
                </div>
              </div>
            </div>

            <div class="mx-n2">
              <a
                href="/dashboard"
                aria-label="link"
                class="btn btn-outline-default btn-lg w-100 font-monospace"
              >
                {m.pricingCtaGetStarted()} <i class="fa fa-arrow-right"></i>
              </a>
            </div>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- END #pricing -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #testimonials -->
<div id="testimonials" class="py-5 text-body text-opacity-75">
  <div class="container-xxl p-3 p-lg-5">
    <div class="text-center mb-5">
      <h1 class="mb-3 text-center">{m.testimonialsTitle()}</h1>
      <p class="fs-16px text-body text-opacity-50 text-center mb-0">
        {m.testimonialsDescriptionLine1()} <br />
        {m.testimonialsDescriptionLine2()} <br />
        {m.testimonialsDescriptionLine3()}
      </p>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-xl-4 col-md-6">
        <div class="card p-4 h-100">
          <div class="d-flex align-items-center mb-3">
            <img
              src={asset('/img/user/user.jpg')}
              class="rounded-circle me-3 w-50px"
              alt={m.testimonialsClient1Alt()}
            />
            <div>
              <h5 class="mb-0">{m.testimonialsClient1Name()}</h5>
              <small class="text-muted">{m.testimonialsClient1Role()}</small>
            </div>
          </div>

          <div class="d-flex">
            <i class="fa fa-quote-left fa-2x text-body text-opacity-15"></i>
            <div class="p-3">
              <div
                class="text-warning d-flex mb-2"
                aria-label={m.testimonialsStarRatingLabel()}
              >
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
              </div>
              {m.testimonialsClient1Quote()}
            </div>
            <div class="d-flex align-items-end">
              <i class="fa fa-quote-right fa-2x text-body text-opacity-15"></i>
            </div>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>

      <div class="col-xl-4 col-md-6">
        <div class="card p-4 h-100">
          <div class="d-flex align-items-center mb-3">
            <img
              src={asset('/img/user/user-7.jpg')}
              class="rounded-circle me-3 w-50px"
              alt={m.testimonialsClient2Alt()}
            />
            <div>
              <h5 class="mb-0">{m.testimonialsClient2Name()}</h5>
              <small class="text-muted">{m.testimonialsClient2Role()}</small>
            </div>
          </div>

          <div class="d-flex">
            <i class="fa fa-quote-left fa-2x text-body text-opacity-15"></i>
            <div class="p-3">
              <div
                class="text-warning d-flex mb-2"
                aria-label={m.testimonialsStarRatingLabel()}
              >
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
              </div>
              {m.testimonialsClient2Quote()}
            </div>
            <div class="d-flex align-items-end">
              <i class="fa fa-quote-right fa-2x text-body text-opacity-15"></i>
            </div>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>

      <div class="col-xl-4 col-md-6">
        <div class="card p-4 h-100">
          <div class="d-flex align-items-center mb-3">
            <img
              src={asset('/img/user/user-10.jpg')}
              class="rounded-circle me-3 w-50px"
              alt={m.testimonialsClient3Alt()}
            />
            <div>
              <h5 class="mb-0">{m.testimonialsClient3Name()}</h5>
              <small class="text-muted">{m.testimonialsClient3Role()}</small>
            </div>
          </div>

          <div class="d-flex">
            <i class="fa fa-quote-left fa-2x text-body text-opacity-15"></i>
            <div class="p-3">
              <div
                class="text-warning d-flex mb-2"
                aria-label={m.testimonialsStarRatingLabel()}
              >
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
              </div>
              {m.testimonialsClient3Quote()}
            </div>
            <div class="d-flex align-items-end">
              <i class="fa fa-quote-right fa-2x text-body text-opacity-15"></i>
            </div>
          </div>

          <div class="card-arrow">
            <div class="card-arrow-top-left"></div>
            <div class="card-arrow-top-right"></div>
            <div class="card-arrow-bottom-left"></div>
            <div class="card-arrow-bottom-right"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<!-- END #testimonials -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #blog -->
<div id="blog" class="py-5 bg-component">
  <div class="container-xxl p-3 p-lg-5">
    <div class="text-center mb-5">
      <h1 class="mb-3 text-center">{m.blogTitle()}</h1>
      <p class="fs-16px text-body text-opacity-50 text-center mb-0">
        {m.blogDescriptionLine1()} <br />
        {m.blogDescriptionLine2()} <br />
        {m.blogDescriptionLine3()}
      </p>
    </div>

    <div class="row g-3 g-xl-4 mb-5">
      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-1.jpg')}
              alt={m.blogCard1Alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 px-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blogCard1Tag()}
              </span>
            </div>
            <h5>{m.blogCard1Title()}</h5>
            <p>{m.blogCard1Desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blogCard1Date()}
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-2.jpg')}
              alt={m.blogCard2Alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 p-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blogCard2Tag()}
              </span>
            </div>
            <h5>{m.blogCard2Title()}</h5>
            <p>{m.blogCard2Desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blogCard2Date()}
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-3.jpg')}
              alt={m.blogCard3Alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 p-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blogCard3Tag()}
              </span>
            </div>
            <h5>{m.blogCard3Title()}</h5>
            <p>{m.blogCard3Desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blogCard3Date()}
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-4.jpg')}
              alt={m.blogCard4Alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 p-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blogCard4Tag()}
              </span>
            </div>
            <h5>{m.blogCard4Title()}</h5>
            <p>{m.blogCard4Desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blogCard4Date()}
          </div>
        </div>
      </div>
    </div>

    <div class="text-center">
      <a
        href="#/"
        aria-label="link"
        class="text-decoration-none text-body text-opacity-50 h6"
      >
        {m.blogSeeMore()} <i class="fa fa-arrow-right ms-3"></i>
      </a>
    </div>
  </div>
</div>
<!-- END #blog -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #contact -->
<div id="contact" class="py-5 text-body text-opacity-75">
  <div class="container-xl p-3 p-lg-5">
    <div class="text-center mb-5">
      <h1 class="mb-3 text-center">{m.contactTitle()}</h1>
      <p class="fs-16px text-body text-opacity-50 text-center mb-0">
        {m.contactDescriptionLine1()} <br />
        {m.contactDescriptionLine2()} <br />
        {m.contactDescriptionLine3()}
      </p>
    </div>

    <div class="row gx-3 gx-lg-5">
      <div class="col-lg-6">
        <h4>{m.contactLeftTitle()}</h4>
        <p>{m.contactLeftParagraph1()}</p>
        <p>
          <span class="fw-bolder">{m.contactCompanyName()}</span><br />
          {m.contactAddressLine1()}<br />
          {m.contactAddressLine2()}<br /><br />

          {m.contactHoursLine1()}<br />
          {m.contactHoursLine2()}<br /><br />

          {m.contactPhoneLabel()}
          <a href="#/" aria-label="link" class="text-theme"
            >{m.contactPhoneValue()}</a
          ><br />
          {m.contactInternationalLabel()}
          <a href="#/" aria-label="link" class="text-theme"
            >{m.contactInternationalValue()}</a
          ><br />
          {m.contactEmailLabel()}
          <a href="#/" aria-label="link" class="text-theme"
            >{m.contactEmailValue()}</a
          >
        </p>
      </div>

      <div class="col-lg-6">
        <form action="/" method="GET" name="form_contact_us">
          <div class="row gy-3 mb-3">
            <div class="col-6">
              <label class="form-label" for="">
                {m.contactFormFirstName()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-6">
              <label class="form-label" for="">
                {m.contactFormLastName()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-6">
              <label class="form-label" for="">
                {m.contactFormEmail()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-6">
              <label class="form-label" for="">
                {m.contactFormPhone()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-12">
              <label class="form-label" for="">
                {m.contactFormMessage()} <span class="text-theme">*</span>
              </label>
              <textarea class="form-control form-control-lg fs-15px" rows="8"
              ></textarea>
            </div>

            <div class="col-12">
              <button
                type="submit"
                class="btn btn-outline-theme btn-lg btn-block px-4 fs-15px"
              >
                {m.contactFormSend()}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</div>
<!-- END #contact -->

<!-- BEGIN #footer -->
<div
  id="footer"
  class="py-5 bg-gray-900 bg-opacity-75 text-body text-opacity-75"
  data-bs-theme="dark"
>
  <div class="container-xxl px-3 px-lg-5">
    <div class="row gx-lg-5 gx-3 gy-lg-4 gy-3">
      <div class="col-lg-3 col-md-6">
        <div class="mb-3">
          <div class="h2">{m.footerBrandTitle()}</div>
        </div>

        <p class="mb-4">{m.footerBrandDescription()}</p>

        <h5>{m.footerFollowUs()}</h5>
        <div class="d-flex">
          <a href="#/" aria-label="link" class="me-2 text-body text-opacity-50">
            <i class="fab fa-lg fa-facebook fa-fw" aria-hidden="true"></i>
          </a>
          <a href="#/" aria-label="link" class="me-2 text-body text-opacity-50">
            <i class="fab fa-lg fa-instagram fa-fw" aria-hidden="true"></i>
          </a>
          <a href="#/" aria-label="link" class="me-2 text-body text-opacity-50">
            <i class="fab fa-lg fa-twitter fa-fw" aria-hidden="true"></i>
          </a>
          <a href="#/" aria-label="link" class="me-2 text-body text-opacity-50">
            <i class="fab fa-lg fa-youtube fa-fw" aria-hidden="true"></i>
          </a>
          <a href="#/" aria-label="link" class="me-2 text-body text-opacity-50">
            <i class="fab fa-lg fa-linkedin fa-fw" aria-hidden="true"></i>
          </a>
        </div>
      </div>

      <div class="col-lg-3 col-md-6">
        <h5>{m.footerQuickLinks()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLinkNewsroom()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLinkCompanyInfo()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLinkCareers()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLinkInvestors()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLinkBrandResources()}
            </a>
          </li>
        </ul>

        <hr class="text-body text-opacity-50" />

        <h5>{m.footerServices()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerServiceApiGateway()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerServiceEventRouting()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerServiceAuthnAuthz()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerServiceObservability()}
            </a>
          </li>
        </ul>
      </div>

      <div class="col-lg-3 col-md-6">
        <h5>{m.footerResources()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerResourceDocs()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerResourceSupport()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerResourceFaqs()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerResourceCommunity()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerResourceTutorials()}
            </a>
          </li>
        </ul>

        <hr class="text-body text-opacity-50" />

        <h5>{m.footerLegal()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLegalPrivacy()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLegalTerms()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLegalCookies()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerLegalCompliance()}
            </a>
          </li>
        </ul>
      </div>

      <div class="col-lg-3 col-md-6">
        <h5>{m.footerHelpCenter()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpContactForm()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpLiveChat()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpPortal()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpEmailSupport()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpTechnicalDocs()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpServiceUpdates()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpDeveloperApi()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footerHelpKnowledgeBase()}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <hr class="text-body text-opacity-50" />

    <div class="row">
      <div class="col-sm-6 mb-3 mb-lg-0">
        <div class="footer-copyright-text">
          {m.footerCopyright()}
        </div>
      </div>

      <div class="col-sm-6 text-sm-end">
        <div class="dropdown me-4 d-inline">
          <button
            type="button"
            class="btn btn-link p-0 text-decoration-none dropdown-toggle text-body text-opacity-50"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            {currentLocale === 'th' ? m.langTh() : m.langEn()}
          </button>

          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <button
                type="button"
                class="dropdown-item"
                on:click={() => onChangeLanguage('en')}
              >
                {m.langEn()}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="dropdown-item"
                on:click={() => onChangeLanguage('th')}
              >
                {m.langTh()}
              </button>
            </li>
          </ul>
        </div>

        <a
          href="#/"
          aria-label="link"
          class="text-decoration-none text-body text-opacity-50"
        >
          {m.footerSitemap()}
        </a>
      </div>
    </div>
  </div>
</div>
<!-- END #footer -->
