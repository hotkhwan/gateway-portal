<!-- src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  import { base } from '$app/paths'
  import { onMount, onDestroy } from 'svelte'
  import { setPageTitle } from '$lib/utils'
  import { appVariables } from '$lib/stores/appVariables.js'
  import { m } from '$lib/i18n/messages'
  import Card from '$lib/components/bootstrap/Card.svelte'
  import CardBody from '$lib/components/bootstrap/CardBody.svelte'
  import CardExpandToggler from '$lib/components/bootstrap/CardExpandToggler.svelte'
  import ApexCharts from '$lib/components/plugins/ApexCharts.svelte'
  import 'jsvectormap/dist/jsvectormap.css'
  // import 'jsvectormap/dist/jsvectormap.min.css'

  import type { ApexOptions } from 'apexcharts'
  import type {
    AppVariables,
    StatItem,
    ServerData,
    TrafficData,
    ProductItem,
    LogItem,
    Unsubscribe,
    VectorMarker
  } from '$lib/types/dashboard'

  const asApex = (v: unknown) => v as ApexOptions

  const defaultAppVariables: AppVariables = {
    color: {
      theme: '#0d6efd',
      themeRgb: '13,110,253',
      inverse: '#ffffff',
      inverseRgb: '255,255,255',
      blackRgb: '0,0,0',
      bodyColor: '#212529',
      bodyColorRgb: '33,37,41'
    },
    font: {
      bodyFontFamily: 'system-ui',
      bodyFontfamily: 'system-ui'
    }
  }

  type VectorMapCtor = new (
    options: any
  ) => { destroy?: () => void; updateSize?: () => void }

  let statsData: StatItem[] | null = null
  let serverData: ServerData | null = null
  let trafficData: TrafficData | null = null
  let productData: ProductItem[] | null = null
  let logData: LogItem[] | null = null

  let jsVectorMapCtor: VectorMapCtor | null = null
  let vectorMap: { destroy?: () => void; updateSize?: () => void } | null = null
  let unsubscribe: Unsubscribe | null = null

  function normalizeAppVariables(
    value: AppVariables | null | undefined
  ): AppVariables {
    const merged: AppVariables = {
      ...defaultAppVariables,
      ...value,
      color: { ...defaultAppVariables.color, ...value?.color },
      font: { ...defaultAppVariables.font, ...value?.font }
    }

    if (!merged.font.bodyFontFamily && merged.font.bodyFontfamily) {
      merged.font.bodyFontFamily = merged.font.bodyFontfamily
    }
    if (!merged.font.bodyFontfamily && merged.font.bodyFontFamily) {
      merged.font.bodyFontfamily = merged.font.bodyFontFamily
    }

    return merged
  }

  function randomNo() {
    return Math.floor(Math.random() * 60) + 30
  }

  function getStatsData(appVars: AppVariables) {
    const theme = appVars.color!.theme
    const themeRgb = appVars.color!.themeRgb

    statsData = [
      {
        title: m.dashboardSiteVisitors(),
        total: '4.2m',
        info: [
          {
            icon: 'fa fa-chevron-up fa-fw me-1',
            text: m.dashboardMoreThanLastWeek({ pct: '33.3%' })
          },
          {
            icon: 'far fa-user fa-fw me-1',
            text: m.dashboardNewVisitors({ pct: '45.5%' })
          },
          {
            icon: 'far fa-times-circle fa-fw me-1',
            text: m.dashboardBounceRate({ pct: '3.25%' })
          }
        ],
        chartHeight: '30px',
        chartOptions: {
          chart: { height: '30px', type: 'bar', sparkline: { enabled: true } },
          colors: [theme],
          plotOptions: {
            bar: {
              horizontal: false,
              columnWidth: '65%',
              borderRadius: 4
            }
          },
          series: [
            {
              name: m.dashboardSeriesVisitors(),
              data: Array.from({ length: 13 }, () => randomNo())
            }
          ]
        } as ApexOptions
      },
      {
        title: m.dashboardStoreSales(),
        total: '$35.2K',
        info: [
          {
            icon: 'fa fa-chevron-up fa-fw me-1',
            text: m.dashboardMoreThanLastWeek({ pct: '20.4%' })
          },
          {
            icon: 'fa fa-shopping-bag fa-fw me-1',
            text: m.dashboardNewOrders({ pct: '33.5%' })
          },
          {
            icon: 'fa fa-dollar-sign fa-fw me-1',
            text: m.dashboardConversionRate({ pct: '6.21%' })
          }
        ],
        chartHeight: '30px',
        chartOptions: {
          chart: { height: '30px', type: 'line', sparkline: { enabled: true } },
          colors: [theme],
          stroke: { curve: 'straight', width: 2 },
          series: [
            {
              name: m.dashboardSeriesSales(),
              data: Array.from({ length: 13 }, () => randomNo())
            }
          ]
        } as ApexOptions
      },
      {
        title: m.dashboardNewMembers(),
        total: '4,490',
        info: [
          {
            icon: 'fa fa-chevron-up fa-fw me-1',
            text: m.dashboardMoreThanLastWeek({ pct: '59.5%' })
          },
          {
            icon: 'fab fa-facebook-f fa-fw me-1',
            text: m.dashboardFromFacebook({ pct: '45.5%' })
          },
          {
            icon: 'fab fa-youtube fa-fw me-1',
            text: m.dashboardFromYoutube({ pct: '15.25%' })
          }
        ],
        chartClass: 'mb-n2',
        chartHeight: '45px',
        chartOptions: {
          chart: { height: '45px', type: 'pie', sparkline: { enabled: true } },
          colors: [
            `rgba(${themeRgb}, 1)`,
            `rgba(${themeRgb}, .75)`,
            `rgba(${themeRgb}, .5)`
          ],
          stroke: { show: false },
          series: [randomNo(), randomNo(), randomNo()]
        } as ApexOptions
      },
      {
        title: m.dashboardBandwidth(),
        total: '4.5TB',
        info: [
          {
            icon: 'fa fa-chevron-up fa-fw me-1',
            text: m.dashboardMoreThanLastWeek({ pct: '5.3%' })
          },
          {
            icon: 'far fa-hdd fa-fw me-1',
            text: m.dashboardFromTotalUsage({ pct: '10.5%' })
          },
          {
            icon: 'far fa-hand-point-up fa-fw me-1',
            text: m.dashboardPerVisit({ size: '2MB' })
          }
        ],
        chartClass: 'mb-n2',
        chartHeight: '45px',
        chartOptions: asApex({
          chart: {
            height: '45px',
            type: 'donut',
            sparkline: { enabled: true }
          },
          colors: [
            `rgba(${themeRgb}, .15)`,
            `rgba(${themeRgb}, .35)`,
            `rgba(${themeRgb}, .55)`,
            `rgba(${themeRgb}, .75)`,
            `rgba(${themeRgb}, .95)`
          ],
          stroke: {
            show: false,
            curve: 'smooth',
            lineCap: 'butt',
            colors: [`rgba(${appVars.color.blackRgb}, .25)`],
            width: 2,
            dashArray: 0
          },
          plotOptions: { pie: { donut: { background: 'transparent' } } },
          series: [randomNo(), randomNo(), randomNo(), randomNo(), randomNo()]
        })
      }
    ]
  }

  function getServerData(appVars: AppVariables) {
    const theme = appVars.color!.theme
    const themeRgb = appVars.color!.themeRgb
    const inverseRgb = appVars.color!.inverseRgb
    const bodyColor = appVars.color!.bodyColor
    const bodyColorRgb = appVars.color!.bodyColorRgb
    const bodyFont =
      appVars.font.bodyFontFamily || appVars.font.bodyFontfamily || 'system-ui'

    const apexTheme: ApexOptions = {
      title: {
        style: {
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: bodyFont,
          color: bodyColor
        }
      },
      legend: { fontFamily: bodyFont, labels: { colors: bodyColor } },
      tooltip: { style: { fontSize: '12px', fontFamily: bodyFont } },
      grid: { borderColor: `rgba(${bodyColorRgb}, .25)` },
      dataLabels: {
        style: { fontSize: '12px', fontFamily: bodyFont, fontWeight: 'bold' }
      },
      xaxis: {
        axisBorder: {
          show: true,
          color: `rgba(${bodyColorRgb}, .25)`,
          height: 1,
          offsetX: 0,
          offsetY: -1
        },
        axisTicks: {
          show: true,
          borderType: 'solid',
          color: `rgba(${bodyColorRgb}, .25)`,
          height: 6,
          offsetX: 0,
          offsetY: 0
        },
        labels: {
          style: {
            colors: bodyColor,
            fontSize: '12px',
            fontFamily: bodyFont,
            fontWeight: 400
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: bodyColor,
            fontSize: '12px',
            fontFamily: bodyFont,
            fontWeight: 400
          }
        }
      }
    }

    serverData = {
      chartHeight: '100%',
      chartOptions: {
        ...apexTheme,
        series: [
          {
            name: m.dashboardMemoryUsage(),
            data: Array.from({ length: 24 }, () => randomNo())
          },
          {
            name: m.dashboardCpuUsage(),
            data: Array.from({ length: 24 }, () => randomNo())
          }
        ],
        colors: [`rgba(${inverseRgb}, .25)`, theme],
        xaxis: {
          categories: [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec',
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
          ],
          labels: { show: false }
        },
        fill: { opacity: 0.65 },
        tooltip: {
          y: {
            formatter: (val: number) => `$ ${val} thousands`
          }
        },
        chart: { height: '100%', type: 'bar', toolbar: { show: false } },
        plotOptions: {
          bar: { horizontal: false, columnWidth: '55%', borderRadius: 4 }
        },
        dataLabels: { enabled: false },
        grid: { show: true, borderColor: `rgba(${inverseRgb}, .15)` },
        stroke: { show: false }
      } as ApexOptions,
      stats: [
        {
          name: m.dashboardDiskUsage(),
          total: '20.04 / 256 GB',
          progress: '20%',
          time: m.dashboardLastUpdated({ value: '1' }),
          info: [
            { title: 'DISK C', value: '19.56GB', class: 'text-theme' },
            {
              title: 'DISK D',
              value: '0.50GB',
              class: 'text-theme text-opacity-50'
            }
          ],
          chartHeight: 50,
          chartOptions: {
            chart: { height: 50, type: 'donut', sparkline: { enabled: true } },
            colors: [
              `rgba(${themeRgb}, .15)`,
              `rgba(${themeRgb}, .35)`,
              `rgba(${themeRgb}, .55)`,
              `rgba(${themeRgb}, .75)`,
              `rgba(${themeRgb}, .95)`
            ],
            stroke: { show: false },
            plotOptions: { pie: { donut: { background: 'transparent' } } },
            series: [randomNo(), randomNo(), randomNo(), randomNo(), randomNo()]
          } as ApexOptions
        },
        {
          name: m.dashboardBandwidth(),
          total: '83.76GB / 10TB',
          progress: '10%',
          time: m.dashboardLastUpdated({ value: '1' }),
          info: [
            { title: 'HTTP', value: '35.47GB', class: 'text-theme' },
            {
              title: 'FTP',
              value: '1.25GB',
              class: 'text-theme text-opacity-50'
            }
          ],
          chartHeight: 50,
          chartOptions: {
            chart: { height: 50, type: 'donut', sparkline: { enabled: true } },
            colors: [
              `rgba(${themeRgb}, .15)`,
              `rgba(${themeRgb}, .35)`,
              `rgba(${themeRgb}, .55)`,
              `rgba(${themeRgb}, .75)`,
              `rgba(${themeRgb}, .95)`
            ],
            stroke: { show: false },
            plotOptions: { pie: { donut: { background: 'transparent' } } },
            series: [randomNo(), randomNo(), randomNo(), randomNo(), randomNo()]
          } as ApexOptions
        }
      ]
    }
  }

  function renderVectorMap(
    appVars: AppVariables,
    markers: Array<{ name: string; coords: [number, number] }>
  ) {
    if (!jsVectorMapCtor) return

    const container = document.getElementById('map-container')
    if (!container) return

    container.innerHTML = '<div id="map"></div>'

    if (vectorMap?.destroy) vectorMap.destroy()
    vectorMap = null

    vectorMap = new jsVectorMapCtor({
      selector: '#map',
      map: 'world',
      zoomButtons: true,
      normalizeFunction: 'polynomial',
      hoverOpacity: 0.5,
      hoverColor: false,
      zoomOnScroll: false,
      series: { regions: [{ normalizeFunction: 'polynomial' }] },
      labels: { markers: { render: (marker: VectorMarker) => marker.name } },
      focusOn: { x: 0.5, y: 0.5, scale: 1 },
      markers,
      markerStyle: {
        initial: { fill: appVars.color!.theme, stroke: 'none', r: 5 },
        hover: { fill: appVars.color!.theme }
      },
      markerLabelStyle: {
        initial: {
          fontFamily:
            appVars.font.bodyFontFamily ||
            appVars.font.bodyFontfamily ||
            'system-ui',
          fontSize: '12px',
          fill: `rgba(${appVars.color!.inverseRgb}, .75)`
        }
      },
      regionStyle: {
        initial: {
          fill: appVars.color!.inverse,
          fillOpacity: 0.35,
          stroke: 'none',
          strokeWidth: 0.4,
          strokeOpacity: 1
        },
        hover: { fillOpacity: 0.5 }
      },
      backgroundColor: 'transparent'
    })
  }

  function getTrafficData(appVars: AppVariables) {
    const themeRgb = appVars.color!.themeRgb
    const blackRgb = appVars.color!.blackRgb

    trafficData = {
      country: [
        { name: 'FRANCE', visits: '13,849', pct: '40.79%', class: '' },
        { name: 'SPAIN', visits: '3,216', pct: '9.79%', class: '' },
        {
          name: 'MEXICO',
          visits: '1,398',
          pct: '4.26%',
          class: 'fw-bold text-theme'
        },
        { name: 'UNITED STATES', visits: '1,090', pct: '3.32%', class: '' },
        { name: 'BELGIUM', visits: '1,045', pct: '3.18%', class: '' }
      ],
      source: [
        { name: 'FEED', percentage: '25.70%', class: 'bg-theme bg-opacity-95' },
        {
          name: 'ORGANIC',
          percentage: '24.30%',
          class: 'bg-theme bg-opacity-75'
        },
        {
          name: 'REFERRAL',
          percentage: '23.05%',
          class: 'bg-theme bg-opacity-55'
        },
        {
          name: 'DIRECT',
          percentage: '14.85%',
          class: 'bg-theme bg-opacity-35'
        },
        { name: 'EMAIL', percentage: '7.35%', class: 'bg-theme bg-opacity-15' }
      ],

      chart: {
        height: 70,
        options: {
          chart: { height: 70, type: 'donut', sparkline: { enabled: true } },
          colors: [
            `rgba(${themeRgb}, .15)`,
            `rgba(${themeRgb}, .35)`,
            `rgba(${themeRgb}, .55)`,
            `rgba(${themeRgb}, .75)`,
            `rgba(${themeRgb}, .95)`
          ],
          stroke: {
            show: false,
            curve: 'smooth',
            lineCap: 'butt',
            colors: [`rgba(${blackRgb}, .25)`],
            width: 2,
            dashArray: 0
          },
          plotOptions: { pie: { donut: { background: 'transparent' } } },
          series: [randomNo(), randomNo(), randomNo(), randomNo(), randomNo()]
        } as unknown as ApexOptions
      }
    }

    renderVectorMap(appVars, [
      { name: 'Egypt', coords: [26.8206, 30.8025] },
      { name: 'Russia', coords: [61.524, 105.3188] },
      { name: 'Canada', coords: [56.1304, -106.3468] },
      { name: 'Greenland', coords: [71.7069, -42.6043] },
      { name: 'Brazil', coords: [-14.235, -51.9253] }
    ])
  }

  async function initVectorMap() {
    // jsvectormap เป็น default export
    const mod = await import('jsvectormap')
    jsVectorMapCtor = mod.default as unknown as VectorMapCtor

    // โหลด world map
    await import('jsvectormap/dist/maps/world.js')
  }

  onMount(async () => {
    setPageTitle(m.dashboardTitle())
    await initVectorMap()

    productData = [
      {
        img: `${base}/img/dashboard/product-1.jpeg`,
        no: '1',
        sku: 'SKU90400',
        title: 'Huawei Smart Watch',
        price: '$399.00',
        qty: '129',
        revenue: '$51,471',
        profit: '$15,441'
      },
      {
        img: `${base}/img/dashboard/product-2.jpeg`,
        no: '2',
        sku: 'SKU85999',
        title: 'Nike Shoes Black Version',
        price: '$99.00',
        qty: '108',
        revenue: '$10,692',
        profit: '$5,346'
      },
      {
        img: `${base}/img/dashboard/product-3.jpeg`,
        no: '3',
        sku: 'SKU20400',
        title: 'White Sony PS4',
        price: '$599',
        qty: '72',
        revenue: '$43,128',
        profit: '$4,312'
      },
      {
        img: `${base}/img/dashboard/product-4.jpeg`,
        no: '4',
        sku: 'SKU19299',
        title: 'Apple Watch Series 5',
        price: '$1,099',
        qty: '53',
        revenue: '$58,247',
        profit: '$2,912'
      },
      {
        img: `${base}/img/dashboard/product-5.jpeg`,
        no: '5',
        sku: 'SKU19299',
        title: 'Black Nikon DSLR',
        price: '1,899',
        qty: '50',
        revenue: '$90,950',
        profit: '$2,848'
      }
    ]

    logData = [
      {
        title: 'You have sold an item - $1,299',
        time: 'just now',
        badge: 'PRODUCT',
        highlight: true
      },
      {
        title: 'Firewall upgrade',
        time: '1 min ago',
        badge: 'SERVER',
        highlight: false
      },
      {
        title: 'Push notification v2.0 installation',
        time: '1 mins ago',
        badge: 'ANDROID',
        highlight: false
      },
      {
        title: 'New Subscription - 1yr Plan',
        time: '1 min ago',
        badge: 'SALES',
        highlight: true
      },
      {
        title: '2 Unread enquiry',
        time: '2 mins ago',
        badge: 'ENQUIRY',
        highlight: false
      },
      {
        title: '$30,402 received from Paypal',
        time: '2 mins ago',
        badge: 'PAYMENT',
        highlight: true
      },
      {
        title: '3 payment received',
        time: '5 mins ago',
        badge: 'PAYMENT',
        highlight: true
      },
      {
        title: '1 pull request from github',
        time: '5 mins ago',
        badge: 'GITHUB',
        highlight: false
      },
      {
        title: '3 pending invoice to generate',
        time: '5 mins ago',
        badge: 'INVOICE',
        highlight: false
      },
      {
        title: '2 new message from fb messenger',
        time: '7 mins ago',
        badge: 'INBOX',
        highlight: false
      }
    ]

    const appVariablesStore = appVariables as unknown as {
      subscribe: (run: (value: AppVariables | null) => void) => Unsubscribe
    }

    unsubscribe = appVariablesStore.subscribe((value) => {
      const vars = normalizeAppVariables(value)
      getStatsData(vars)
      getServerData(vars)
      getTrafficData(vars)
    })
  })

  onDestroy(() => {
    if (unsubscribe) unsubscribe()
    if (vectorMap?.destroy) vectorMap.destroy()
  })
</script>

<!-- BEGIN row -->
<div class="row">
  <!-- BEGIN col-3 -->
  {#if statsData}
    {#each statsData as stat}
      <div class="col-xl-3 col-lg-6">
        <Card class="mb-3">
          <CardBody>
            <div class="d-flex fw-bold small mb-3">
              <span class="flex-grow-1">{stat.title}</span>
              <CardExpandToggler />
            </div>

            <div class="row align-items-center mb-2">
              <div class="col-7">
                <h3 class="mb-0">{stat.total}</h3>
              </div>
              <div class="col-5">
                <div class="mt-n2 {stat.chartClass}">
                  {#if stat.chartOptions}
                    <ApexCharts
                      options={stat.chartOptions}
                      height={stat.chartHeight ?? '30px'}
                    />
                  {/if}
                </div>
              </div>
            </div>

            <div class="small text-inverse text-opacity-50 text-truncate">
              {#if stat.info}
                {#each stat.info as info}
                  <div><i class={info.icon}></i> {info.text}</div>
                {/each}
              {/if}
            </div>
          </CardBody>
        </Card>
      </div>
    {/each}
  {/if}
  <!-- END col-3 -->

  <!-- BEGIN server-stats -->
  <div class="col-xl-6">
    <Card class="mb-3">
      <CardBody>
        <div class="d-flex fw-bold small mb-3">
          <span class="flex-grow-1">{m.dashboardServerStats()}</span>
          <CardExpandToggler />
        </div>

        <div class="ratio ratio-21x9 mb-3">
          {#if serverData?.chartOptions}
            <ApexCharts
              options={serverData.chartOptions}
              height={serverData.chartHeight ?? '100%'}
            />
          {/if}
        </div>

        <div class="row">
          {#if serverData?.stats}
            {#each serverData.stats as stat}
              <div class="col-lg-6 mb-3 mb-lg-0">
                <div class="d-flex align-items-center">
                  <div class="w-50px h-50px">
                    {#if stat.chartOptions}
                      <ApexCharts
                        options={stat.chartOptions}
                        height={stat.chartHeight ?? 50}
                      />
                    {/if}
                  </div>

                  <div class="ps-3 flex-1">
                    <div
                      class="fs-10px fw-bold text-inverse text-opacity-50 mb-1"
                    >
                      {stat.name}
                    </div>

                    <div class="mb-2 fs-5 text-truncate">{stat.total}</div>

                    <div class="progress h-3px mb-1">
                      <div
                        class="progress-bar bg-theme"
                        style="width: {stat.progress}"
                      ></div>
                    </div>

                    <div
                      class="fs-11px text-inverse text-opacity-50 mb-2 text-truncate"
                    >
                      {stat.time}
                    </div>

                    {#if stat.info}
                      {#each stat.info as info}
                        <div class="d-flex align-items-center small">
                          <i
                            class={'bi bi-circle-fill fs-6px me-2 ' +
                              info.class}
                          ></i>
                          <div class="flex-1">{info.title}</div>
                          <div>{info.value}</div>
                        </div>
                      {/each}
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </CardBody>
    </Card>
  </div>
  <!-- END server-stats -->

  <!-- BEGIN traffic-analytics -->
  <div class="col-xl-6">
    <Card class="mb-3">
      <CardBody>
        <div class="d-flex fw-bold small mb-3">
          <span class="flex-grow-1">{m.dashboardTrafficAnalytics()}</span>
          <CardExpandToggler />
        </div>

        <div class="ratio ratio-21x9 mb-3">
          <div class="jvm-without-padding" id="map-container"></div>
        </div>

        <div class="row gx-4">
          <div class="col-lg-6 mb-3 mb-lg-0">
            <table
              class="w-100 small mb-0 text-truncate text-inverse text-opacity-60"
            >
              <thead>
                <tr class="text-inverse text-opacity-75">
                  <th class="w-50">{m.dashboardTableCountry()}</th>
                  <th class="w-25 text-end">{m.dashboardTableVisits()}</th>
                  <th class="w-25 text-end">{m.dashboardTablePct()}</th>
                </tr>
              </thead>
              <tbody>
                {#if trafficData?.country}
                  {#each trafficData.country as country}
                    <tr class={country.class}>
                      <td>{country.name}</td>
                      <td class="text-end">{country.visits}</td>
                      <td class="text-end">{country.pct}</td>
                    </tr>
                  {/each}
                {:else}
                  <tr><td colspan="3">{m.commonNoRecords()}</td></tr>
                {/if}
              </tbody>
            </table>
          </div>

          <div class="col-lg-6">
            <Card>
              <CardBody class="py-2">
                <div class="d-flex align-items-center">
                  <div class="w-70px">
                    {#if trafficData?.chart}
                      <ApexCharts
                        options={trafficData.chart.options}
                        height={trafficData.chart.height ?? 70}
                      />
                    {/if}
                  </div>

                  <div class="flex-1 ps-2">
                    <table
                      class="w-100 small mb-0 text-inverse text-opacity-60"
                    >
                      <tbody>
                        {#if trafficData?.source}
                          {#each trafficData.source as source}
                            <tr>
                              <td>
                                <div class="d-flex align-items-center">
                                  <div
                                    class={'w-6px h-6px rounded-pill me-2 ' +
                                      source.class}
                                  ></div>
                                  {source.name}
                                </div>
                              </td>
                              <td class="text-end">{source.percentage}</td>
                            </tr>
                          {/each}
                        {:else}
                          <tr><td colspan="2">{m.commonNoRecords()}</td></tr>
                        {/if}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      </CardBody>
    </Card>
  </div>
  <!-- END traffic-analytics -->

  <!-- BEGIN top-products -->
  <div class="col-xl-6">
    <Card class="mb-3">
      <CardBody>
        <div class="d-flex fw-bold small mb-3">
          <span class="flex-grow-1">{m.dashboardTopProducts()}</span>
          <CardExpandToggler />
        </div>

        <div class="table-responsive">
          <table class="w-100 mb-0 small align-middle text-nowrap">
            <tbody>
              {#if productData}
                {#each productData as product}
                  <tr>
                    <td>
                      <div class="d-flex">
                        <div class="position-relative mb-2">
                          <div
                            class="bg-position-center bg-size-cover w-80px h-60px"
                            style="background-image: url({product.img})"
                          ></div>
                          <div class="position-absolute top-0 start-0">
                            <span
                              class="badge bg-theme text-theme-900 rounded-0 d-flex align-items-center justify-content-center w-20px h-20px"
                            >
                              {product.no}
                            </span>
                          </div>
                        </div>

                        <div class="flex-1 ps-3">
                          <div class="mb-1">
                            <small
                              class="fs-9px fw-500 lh-1 d-inline-block rounded-0 badge bg-inverse bg-opacity-25 text-inverse text-opacity-75 pt-5px"
                            >
                              {product.sku}
                            </small>
                          </div>
                          <div class="fw-500 text-inverse">{product.title}</div>
                          {product.price}
                        </div>
                      </div>
                    </td>

                    <td>
                      <table class="mb-2">
                        <tbody>
                          <tr>
                            <td class="pe-3">{m.dashboardQty()}:</td>
                            <td class="text-inverse text-opacity-75 fw-500"
                              >{product.qty}</td
                            >
                          </tr>
                          <tr>
                            <td class="pe-3">{m.dashboardRevenue()}:</td>
                            <td class="text-inverse text-opacity-75 fw-500"
                              >{product.revenue}</td
                            >
                          </tr>
                          <tr>
                            <td class="pe-3 text-nowrap"
                              >{m.dashboardProfit()}:</td
                            >
                            <td class="text-inverse text-opacity-75 fw-500"
                              >{product.profit}</td
                            >
                          </tr>
                        </tbody>
                      </table>
                    </td>

                    <td>
                      <a
                        href="#/"
                        aria-label="link"
                        class="text-decoration-none text-inverse"
                      >
                        <i class="bi bi-search"></i>
                      </a>
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr><td colspan="3">{m.commonNoRecords()}</td></tr>
              {/if}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  </div>
  <!-- END top-products -->

  <!-- BEGIN activity-log -->
  <div class="col-xl-6">
    <Card class="mb-3">
      <CardBody>
        <div class="d-flex fw-bold small mb-3">
          <span class="flex-grow-1">{m.dashboardActivityLog()}</span>
          <CardExpandToggler />
        </div>

        <div class="table-responsive">
          <table
            class="table table-striped table-borderless mb-2px small text-nowrap"
          >
            <tbody>
              {#if logData}
                {#each logData as log}
                  <tr>
                    <td>
                      <span class="d-flex align-items-center">
                        <i
                          class="bi bi-circle-fill fs-6px me-2"
                          class:text-theme={log.highlight}
                        ></i>
                        {log.title}
                      </span>
                    </td>
                    <td><small>{log.time}</small></td>
                    <td>
                      <span
                        class="badge d-block rounded-0 pt-5px w-70px"
                        class:bg-theme={log.highlight}
                        class:text-theme-900={log.highlight}
                        class:bg-inverse={!log.highlight}
                        class:bg-opacity-25={!log.highlight}
                        style="min-height: 18px"
                      >
                        {log.badge}
                      </span>
                    </td>
                    <td>
                      <a
                        href="#/"
                        aria-label="link"
                        class="text-decoration-none text-inverse"
                      >
                        <i class="bi bi-search"></i>
                      </a>
                    </td>
                  </tr>
                {/each}
              {:else}
                <tr><td colspan="4">{m.commonNoRecords()}</td></tr>
              {/if}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  </div>
  <!-- END activity-log -->
</div>
<!-- END row -->
