<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { m } from '$lib/i18n/messages'
  import { onMount, onDestroy } from 'svelte'
  import Icon from '@iconify/svelte'
  import { base } from '$app/paths'
  import { createAssetHelper } from '$lib/utils'

  import { setPageTitle } from '$lib/utils/title'
  import { appOptions } from '$lib/stores/appOptions'

  import {
    currentLocaleStore,
    initLocale,
    changeLocale,
    type AppLocale
  } from '$lib/i18nClient/setLanguage'

  const asset = createAssetHelper(base)

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

    setPageTitle(m.landing_page_title())
    $appOptions.appContentClass = 'p-0 pt-5 mt-4px'
    $appOptions.appSidebarHide = true
    $appOptions.appHeaderHide = true
  })

  onDestroy(() => {
    $appOptions.appContentClass = ''
    $appOptions.appSidebarHide = true
    $appOptions.appHeaderHide = true
  })
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
          <span class="brand-img-text text-theme">G</span>
        </span>
        <span class="brand-text">{m.landing_home()}</span>
      </span>
    </a>

    <div class="collapse navbar-collapse" id="navbarContent">
      <div
        class="navbar-nav ms-auto mb-2 mb-lg-0 text-uppercase small fw-semibold"
      >
        <div class="nav-item me-2">
          <a href="#home" aria-label="link" class="nav-link link-body-emphasis">
            {m.nav_home()}
          </a>
        </div>
        <div class="nav-item me-2">
          <a
            href="#about"
            aria-label="link"
            class="nav-link link-body-emphasis"
          >
            {m.nav_about()}
          </a>
        </div>
        <div class="nav-item me-2">
          <a
            href="#features"
            aria-label="link"
            class="nav-link link-body-emphasis"
          >
            {m.nav_features()}
          </a>
        </div>
        <div class="nav-item me-2">
          <a
            href="#contact"
            aria-label="link"
            class="nav-link link-body-emphasis"
          >
            {m.nav_contact()}
          </a>
        </div>
      </div>
    </div>

    <a
      href={`${base}/dashboard`}
      class="btn btn-outline-theme btn-sm fw-semibold text-uppercase px-2 py-1 fs-10px"
    >
      {m.landing_get_started()} <i class="fa fa-arrow-right ms-1"></i>
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
          <h1 class="display-6 fw-600 mb-2 mt-4">{m.hero_title()}</h1>

          <div class="fs-18px text-body text-opacity-75 mb-4">
            {m.hero_description_line1()}
            <span class="d-xl-inline d-none"><br /></span>
            {m.hero_description_line2()}
            <span class="d-xl-inline d-none"><br /></span>
            {m.hero_description_line3()}
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
            <a href="/" class="btn btn-lg btn-outline-white px-3">
              {m.hero_primary_cta()}
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
                    {m.hero_stat_download_value()}
                  </div>
                  <div class="fw-500 text-body text-opacity-75">
                    {m.hero_stat_download_label()}
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
                    {m.hero_stat_version_value()}
                  </div>
                  <div class="fw-500 text-body text-opacity-75">
                    {m.hero_stat_version_label()}
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
        alt={m.hero_mock_image_alt()}
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
    <h1 class="mb-3">{m.about_title()}</h1>
    <p class="fs-16px text-body text-opacity-50 mb-5">
      {m.about_description_line1()} <br />
      {m.about_description_line2()}
    </p>

    <div class="row text-start g-3 gx-lg-5 gy-lg-4">
      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:monitor-smartphone-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item1_title()}</h4>
          <p class="mb-0">{m.about_item1_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:settings-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item2_title()}</h4>
          <p class="mb-0">{m.about_item2_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:bolt-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item3_title()}</h4>
          <p class="mb-0">{m.about_item3_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:lock-keyhole-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item4_title()}</h4>
          <p class="mb-0">{m.about_item4_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:dialog-2-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item5_title()}</h4>
          <p class="mb-0">{m.about_item5_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:help-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item6_title()}</h4>
          <p class="mb-0">{m.about_item6_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:tuning-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item7_title()}</h4>
          <p class="mb-0">{m.about_item7_desc()}</p>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6 d-flex">
        <div
          class="w-50px h-50px bg-theme bg-opacity-15 text-theme fs-32px d-flex align-items-center justify-content-center"
        >
          <Icon icon="solar:widget-5-line-duotone" />
        </div>
        <div class="flex-1 ps-3">
          <h4>{m.about_item8_title()}</h4>
          <p class="mb-0">{m.about_item8_desc()}</p>
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
      <h1 class="mb-3">{m.features_title()}</h1>
      <p class="fs-16px text-body text-opacity-50 mb-5">
        {m.features_description_line1()} <br />
        {m.features_description_line2()} <br />
        {m.features_description_line3()}
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
          {m.features_item1_label()}
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
          {m.features_item2_label()}
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
          {m.features_item3_label()}
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
          {m.features_item4_label()}
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
          {m.features_item5_label()}
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
          {m.features_item6_label()}
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
          {m.features_item7_label()}
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
          {m.features_item8_label()}
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
          {m.features_item9_label()}
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
          {m.features_item10_label()}
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
          {m.features_item11_label()}
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
          {m.features_item12_label()}
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
<!-- <div id="pricing" class="py-5 text-body text-opacity-75">
  <div class="container-xxl p-3 p-lg-5">
    <h1 class="mb-3 text-center">{m.pricing_title()}</h1>
    <p class="fs-16px text-body text-opacity-50 text-center mb-0">
      {m.pricing_description_line1()} <br />
      {m.pricing_description_line2()} <br />
      {m.pricing_description_line3()}
    </p>

    <div class="row g-3 py-3 gx-lg-5 pt-lg-5">
      <div class="col-xl-3 col-md-4 col-sm-6 py-xl-5">
        <div class="card h-100">
          <div class="card-body p-4 d-flex flex-column">
            <div class="d-flex align-items-center">
              <div class="flex-1">
                <div class="h6 font-monospace">{m.pricing_plan1_name()}</div>
                <div class="h1 fw-semibold mb-0">
                  {m.pricing_plan1_price()}
                  <small class="h6 fw-semibold text-body text-opacity-50">
                    {m.pricing_per_month_suffix()}
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
                    >{m.pricing_storage_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_bandwidth_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_gateway_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_ssl_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_support_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-times fa-lg text-body text-opacity-25"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_sso_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_sso()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-times fa-lg text-body text-opacity-25"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_audit_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan1_audit()}</b>
                </div>
              </div>
            </div>

            <div class="mx-n2">
              <a
                href="#/"
                aria-label="link"
                class="btn btn-outline-default btn-lg w-100 font-monospace"
              >
                {m.pricing_cta_get_started()} <i class="fa fa-arrow-right"></i>
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
                <div class="h6 font-monospace">{m.pricing_plan2_name()}</div>
                <div class="h1 fw-semibold mb-0">
                  {m.pricing_plan2_price()}
                  <small class="h6 fw-semibold text-body text-opacity-50">
                    {m.pricing_per_month_suffix()}
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
                    >{m.pricing_storage_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan2_storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_bandwidth_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan2_bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_gateway_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan2_gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_ssl_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan2_ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_support_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan2_support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-times fa-lg text-body text-opacity-25"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_audit_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan2_audit()}</b>
                </div>
              </div>
            </div>

            <a href="/dashboard" class="btn btn-lg btn-outline-white px-3">
              {m.pricing_cta_get_started()}
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
                  {m.pricing_plan3_name()}
                </div>
                <div class="display-6 fw-bold mb-0 text-theme">
                  {m.pricing_plan3_price()}
                  <small class="h6 text-body text-opacity-50"
                    >{m.pricing_per_month_suffix()}</small
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
                    >{m.pricing_storage_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricing_bandwidth_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricing_gateway_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricing_ssl_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricing_support_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricing_sso_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_sso()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace text-body text-opacity-50 small"
                    >{m.pricing_audit_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan3_audit()}</b>
                </div>
              </div>
            </div>

            <a
              href="/dashboard"
              aria-label="link"
              class="btn btn-theme btn-lg w-100 text-black font-monospace"
            >
              {m.pricing_cta_get_started()} <i class="fa fa-arrow-right"></i>
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
                <div class="h6 font-monospace">{m.pricing_plan4_name()}</div>
                <div class="display-6 fw-bold mb-0">
                  {m.pricing_plan4_price()}
                  <small class="h6 text-body text-opacity-50"
                    >{m.pricing_per_month_suffix()}</small
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
                    >{m.pricing_storage_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan4_storage()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_bandwidth_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan4_bandwidth()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_gateway_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan4_gateway()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_ssl_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan4_ssl()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check fa-lg text-theme"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_support_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan4_support()}</b>
                </div>
              </div>

              <div class="d-flex align-items-center mb-1">
                <i class="fa fa-check text-theme fa-lg"></i>
                <div class="flex-1 ps-3">
                  <span class="font-monospace small"
                    >{m.pricing_audit_label()}</span
                  >
                  <b class="text-body">{m.pricing_plan4_audit()}</b>
                </div>
              </div>
            </div>

            <div class="mx-n2">
              <a
                href="/dashboard"
                aria-label="link"
                class="btn btn-outline-default btn-lg w-100 font-monospace"
              >
                {m.pricing_cta_get_started()} <i class="fa fa-arrow-right"></i>
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
</div> -->
<!-- END #pricing -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #testimonials -->
<!-- <div id="testimonials" class="py-5 text-body text-opacity-75">
  <div class="container-xxl p-3 p-lg-5">
    <div class="text-center mb-5">
      <h1 class="mb-3 text-center">{m.testimonials_title()}</h1>
      <p class="fs-16px text-body text-opacity-50 text-center mb-0">
        {m.testimonials_description_line1()} <br />
        {m.testimonials_description_line2()} <br />
        {m.testimonials_description_line3()}
      </p>
    </div>

    <div class="row g-3 g-lg-4 mb-4">
      <div class="col-xl-4 col-md-6">
        <div class="card p-4 h-100">
          <div class="d-flex align-items-center mb-3">
            <img
              src={asset('/img/user/user.jpg')}
              class="rounded-circle me-3 w-50px"
              alt={m.testimonials_client1_alt()}
            />
            <div>
              <h5 class="mb-0">{m.testimonials_client1_name()}</h5>
              <small class="text-muted">{m.testimonials_client1_role()}</small>
            </div>
          </div>

          <div class="d-flex">
            <i class="fa fa-quote-left fa-2x text-body text-opacity-15"></i>
            <div class="p-3">
              <div
                class="text-warning d-flex mb-2"
                aria-label={m.testimonials_star_rating_label()}
              >
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
              </div>
              {m.testimonials_client1_quote()}
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
              alt={m.testimonials_client2_alt()}
            />
            <div>
              <h5 class="mb-0">{m.testimonials_client2_name()}</h5>
              <small class="text-muted">{m.testimonials_client2_role()}</small>
            </div>
          </div>

          <div class="d-flex">
            <i class="fa fa-quote-left fa-2x text-body text-opacity-15"></i>
            <div class="p-3">
              <div
                class="text-warning d-flex mb-2"
                aria-label={m.testimonials_star_rating_label()}
              >
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
              </div>
              {m.testimonials_client2_quote()}
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
              alt={m.testimonials_client3_alt()}
            />
            <div>
              <h5 class="mb-0">{m.testimonials_client3_name()}</h5>
              <small class="text-muted">{m.testimonials_client3_role()}</small>
            </div>
          </div>

          <div class="d-flex">
            <i class="fa fa-quote-left fa-2x text-body text-opacity-15"></i>
            <div class="p-3">
              <div
                class="text-warning d-flex mb-2"
                aria-label={m.testimonials_star_rating_label()}
              >
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
                <Icon icon="ic:baseline-star" class="fs-18px" />
              </div>
              {m.testimonials_client3_quote()}
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
</div> -->
<!-- END #testimonials -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #blog -->
<!-- <div id="blog" class="py-5 bg-component">
  <div class="container-xxl p-3 p-lg-5">
    <div class="text-center mb-5">
      <h1 class="mb-3 text-center">{m.blog_title()}</h1>
      <p class="fs-16px text-body text-opacity-50 text-center mb-0">
        {m.blog_description_line1()} <br />
        {m.blog_description_line2()} <br />
        {m.blog_description_line3()}
      </p>
    </div>

    <div class="row g-3 g-xl-4 mb-5">
      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-1.jpg')}
              alt={m.blog_card1_alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 px-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blog_card1_tag()}
              </span>
            </div>
            <h5>{m.blog_card1_title()}</h5>
            <p>{m.blog_card1_desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blog_card1_date()}
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-2.jpg')}
              alt={m.blog_card2_alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 p-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blog_card2_tag()}
              </span>
            </div>
            <h5>{m.blog_card2_title()}</h5>
            <p>{m.blog_card2_desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blog_card2_date()}
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-3.jpg')}
              alt={m.blog_card3_alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 p-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blog_card3_tag()}
              </span>
            </div>
            <h5>{m.blog_card3_title()}</h5>
            <p>{m.blog_card3_desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blog_card3_date()}
          </div>
        </div>
      </div>

      <div class="col-xl-3 col-lg-4 col-sm-6">
        <div class="card d-flex flex-column h-100 mb-5 mb-lg-0">
          <div class="card-body">
            <img
              src={asset('/img/landing/blog-4.jpg')}
              alt={m.blog_card4_alt()}
              class="object-fit-cover h-200px w-100 d-block"
            />
          </div>
          <div class="flex-1 p-3 pb-0">
            <div class="mb-2">
              <span
                class="bg-theme bg-opacity-15 text-theme px-2 py-1 rounded small fw-bold"
              >
                {m.blog_card4_tag()}
              </span>
            </div>
            <h5>{m.blog_card4_title()}</h5>
            <p>{m.blog_card4_desc()}</p>
          </div>
          <div class="p-3 pt-0 text-body text-opacity-50">
            {m.blog_card4_date()}
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
        {m.blog_see_more()} <i class="fa fa-arrow-right ms-3"></i>
      </a>
    </div>
  </div>
</div> -->
<!-- END #blog -->

<!-- BEGIN divider -->
<div class="container-xxl px-3 px-lg-5"><hr class="opacity-4 m-0" /></div>
<!-- END divider -->

<!-- BEGIN #contact -->
<div id="contact" class="py-5 text-body text-opacity-75">
  <div class="container-xl p-3 p-lg-5">
    <div class="text-center mb-5">
      <h1 class="mb-3 text-center">{m.contact_title()}</h1>
      <p class="fs-16px text-body text-opacity-50 text-center mb-0">
        {m.contact_description_line1()} <br />
        {m.contact_description_line2()} <br />
        {m.contact_description_line3()}
      </p>
    </div>

    <div class="row gx-3 gx-lg-5">
      <div class="col-lg-6">
        <h4>{m.contact_left_title()}</h4>
        <p>{m.contact_left_paragraph1()}</p>
        <p>
          <span class="fw-bolder">{m.contact_company_name()}</span><br />
          {m.contact_address_line1()}<br />
          {m.contact_address_line2()}<br /><br />

          {m.contact_hours_line1()}<br />
          {m.contact_hours_line2()}<br /><br />

          {m.contact_phone_label()}
          <a href="#/" aria-label="link" class="text-theme"
            >{m.contact_phone_value()}</a
          ><br />
          {m.contact_international_label()}
          <a href="#/" aria-label="link" class="text-theme"
            >{m.contact_international_value()}</a
          ><br />
          {m.contact_email_label()}
          <a href="#/" aria-label="link" class="text-theme"
            >{m.contact_email_value()}</a
          >
        </p>
      </div>

      <div class="col-lg-6">
        <form action="/" method="GET" name="form_contact_us">
          <div class="row gy-3 mb-3">
            <div class="col-6">
              <label class="form-label" for="">
                {m.contact_form_first_name()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-6">
              <label class="form-label" for="">
                {m.contact_form_last_name()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-6">
              <label class="form-label" for="">
                {m.contact_form_email()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-6">
              <label class="form-label" for="">
                {m.contact_form_phone()} <span class="text-theme">*</span>
              </label>
              <input type="text" class="form-control form-control-lg fs-15px" />
            </div>

            <div class="col-12">
              <label class="form-label" for="">
                {m.contact_form_message()} <span class="text-theme">*</span>
              </label>
              <textarea class="form-control form-control-lg fs-15px" rows="8"
              ></textarea>
            </div>

            <div class="col-12">
              <button
                type="submit"
                class="btn btn-outline-theme btn-lg btn-block px-4 fs-15px"
              >
                {m.contact_form_send()}
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
          <div class="h2">{m.footer_brand_title()}</div>
        </div>

        <p class="mb-4">{m.footer_brand_description()}</p>

        <h5>{m.footer_follow_us()}</h5>
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
        <h5>{m.footer_quick_links()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_link_newsroom()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_link_company_info()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_link_careers()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_link_investors()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_link_brand_resources()}
            </a>
          </li>
        </ul>

        <hr class="text-body text-opacity-50" />

        <h5>{m.footer_services()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_service_api_gateway()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_service_event_routing()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_service_authn_authz()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_service_observability()}
            </a>
          </li>
        </ul>
      </div>

      <div class="col-lg-3 col-md-6">
        <h5>{m.footer_resources()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_resource_docs()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_resource_support()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_resource_faqs()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_resource_community()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_resource_tutorials()}
            </a>
          </li>
        </ul>

        <hr class="text-body text-opacity-50" />

        <h5>{m.footer_legal()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_legal_privacy()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_legal_terms()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_legal_cookies()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_legal_compliance()}
            </a>
          </li>
        </ul>
      </div>

      <div class="col-lg-3 col-md-6">
        <h5>{m.footer_help_center()}</h5>
        <ul class="list-unstyled">
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_contact_form()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_live_chat()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_portal()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_email_support()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_technical_docs()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_service_updates()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_developer_api()}
            </a>
          </li>
          <li class="mb-3px">
            <a
              href="#/"
              aria-label="link"
              class="text-decoration-none text-body text-opacity-75"
            >
              {m.footer_help_knowledge_base()}
            </a>
          </li>
        </ul>
      </div>
    </div>

    <hr class="text-body text-opacity-50" />

    <div class="row">
      <div class="col-sm-6 mb-3 mb-lg-0">
        <div class="footer-copyright-text">
          {m.footer_copyright()}
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
            {currentLocale === 'th' ? m.lang_th() : m.lang_en()}
          </button>

          <ul class="dropdown-menu dropdown-menu-end">
            <li>
              <button
                type="button"
                class="dropdown-item"
                on:click={() => onChangeLanguage('en')}
              >
                {m.lang_en()}
              </button>
            </li>
            <li>
              <button
                type="button"
                class="dropdown-item"
                on:click={() => onChangeLanguage('th')}
              >
                {m.lang_th()}
              </button>
            </li>
          </ul>
        </div>

        <a
          href="#/"
          aria-label="link"
          class="text-decoration-none text-body text-opacity-50"
        >
          {m.footer_sitemap()}
        </a>
      </div>
    </div>
  </div>
</div>
<!-- END #footer -->
