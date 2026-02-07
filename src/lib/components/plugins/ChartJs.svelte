<!-- src/lib/components/plugins/ChartJs.svelte -->
<script lang="ts">
  import Chart from 'chart.js/auto'
  import type { Chart as ChartInstance, ChartConfiguration } from 'chart.js'
  import { onMount, onDestroy, afterUpdate } from 'svelte'
  import { appVariables } from '$lib/stores/appVariables'
  import type { Unsubscriber } from 'svelte/store'

  export let type: ChartConfiguration['type']
  export let data: ChartConfiguration['data']
  export let options: ChartConfiguration['options']
  export let height: number | undefined

  let chart: ChartInstance | null = null
  let canvas: HTMLCanvasElement | null = null
  let unsubscribe: Unsubscriber | null = null

  type ChartFontWeight = number | 'bold' | 'normal' | 'lighter' | 'bolder'

  function normalizeFontWeight(weight: unknown): ChartFontWeight {
    if (typeof weight === 'number') return weight

    if (typeof weight === 'string') {
      const w = weight.trim().toLowerCase()

      if (w === 'bold' || w === 'normal' || w === 'lighter' || w === 'bolder') {
        return w as ChartFontWeight
      }

      const n = Number.parseInt(w, 10)
      if (Number.isFinite(n)) return n
    }

    return 400
  }

  function pickTooltipBackground(vars: any): string {
    // อย่าอ้าง componentColor ตรงๆ เพราะ type ไม่การันตีว่ามี
    // ใช้ fallback chain จาก key ที่มักมีใน theme/bootstrap vars
    return (
      vars?.color?.componentColor ??
      vars?.color?.componentBg ??
      vars?.color?.bodyBg ??
      vars?.color?.cardBg ??
      'rgba(0,0,0,0.85)'
    )
  }

  function renderChart() {
    if (!canvas) return

    chart = new Chart(canvas, {
      type,
      data,
      options
    })
  }

  onMount(() => {
    unsubscribe = appVariables.subscribe((vars) => {
      if (!vars?.color || !vars?.font) return

      Chart.defaults.font.family = vars.font.bodyFontFamily
      Chart.defaults.font.size = 12
      Chart.defaults.color = vars.color.bodyColor
      Chart.defaults.borderColor = vars.color.borderColor

      Chart.defaults.plugins.legend.display = false

      Chart.defaults.plugins.tooltip = {
        ...Chart.defaults.plugins.tooltip,
        padding: 8,
        cornerRadius: 8,
        titleMarginBottom: 6,
        backgroundColor: pickTooltipBackground(vars),
        titleFont: {
          family: vars.font.bodyFontFamily,
          weight: normalizeFontWeight(vars.font.bodyFontWeight)
        }
      }

      chart?.destroy()
      renderChart()
    })
  })

  afterUpdate(() => {
    chart?.destroy()
    renderChart()
  })

  onDestroy(() => {
    chart?.destroy()
    unsubscribe?.()
  })
</script>

<canvas bind:this={canvas} {height}></canvas>
