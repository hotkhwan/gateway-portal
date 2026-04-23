<!--
  DateRangeFilter.svelte — Single-trigger date range picker with presets.

  Emits ISO strings via `bind:startDate` / `bind:endDate` (RFC3339 UTC),
  which the API wrapper passes through to BE as `dateTime=from,to`.

  Click the trigger button to open a popover with preset chips
  (Today / Yesterday / Last 24h / Last 7d / Last 30d / This month / Custom).
  Custom reveals two `datetime-local` inputs.
-->
<script lang="ts">
  import { m } from '$lib/i18n/messages'
  import { onMount } from 'svelte'

  type Preset = 'today' | 'yesterday' | 'last24h' | 'last7d' | 'last30d' | 'thisMonth' | 'custom'

  type Props = {
    startDate: string  // RFC3339 UTC or ''
    endDate: string    // RFC3339 UTC or ''
    onApply?: () => void
    compact?: boolean
  }
  let { startDate = $bindable(''), endDate = $bindable(''), onApply, compact = true }: Props = $props()

  let open = $state(false)
  let selected = $state<Preset>('last24h')
  let customStart = $state('') // datetime-local format (local tz, no seconds)
  let customEnd = $state('')
  let rootEl: HTMLDivElement | undefined = $state()

  // Label for the trigger button
  let triggerLabel = $derived.by(() => {
    if (!startDate && !endDate) return m.filterRangePickLabel()
    const map: Record<Preset, string> = {
      today: m.filterRangePresetToday(),
      yesterday: m.filterRangePresetYesterday(),
      last24h: m.filterRangePresetLast24h(),
      last7d: m.filterRangePresetLast7d(),
      last30d: m.filterRangePresetLast30d(),
      thisMonth: m.filterRangePresetThisMonth(),
      custom: formatRange(startDate, endDate)
    }
    return map[selected]
  })

  function formatRange(s: string, e: string): string {
    const fmt = (iso: string) => {
      if (!iso) return ''
      const d = new Date(iso)
      if (isNaN(d.getTime())) return ''
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
    const a = fmt(s)
    const b = fmt(e)
    if (a && b) return `${a} – ${b}`
    if (a) return `${a} –`
    if (b) return `– ${b}`
    return m.filterRangePickLabel()
  }

  // datetime-local <-> ISO conversion.
  // datetime-local is in LOCAL time without tz; ISO is UTC.
  function localToIso(local: string): string {
    if (!local) return ''
    const d = new Date(local)
    return isNaN(d.getTime()) ? '' : d.toISOString()
  }
  function isoToLocal(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (isNaN(d.getTime())) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  function presetRange(p: Preset): { start: string; end: string } {
    const now = new Date()
    const end = new Date(now)
    const start = new Date(now)
    switch (p) {
      case 'today':
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'yesterday':
        start.setDate(start.getDate() - 1)
        start.setHours(0, 0, 0, 0)
        end.setDate(end.getDate() - 1)
        end.setHours(23, 59, 59, 999)
        break
      case 'last24h':
        start.setTime(now.getTime() - 24 * 3600_000)
        break
      case 'last7d':
        start.setTime(now.getTime() - 7 * 24 * 3600_000)
        break
      case 'last30d':
        start.setTime(now.getTime() - 30 * 24 * 3600_000)
        break
      case 'thisMonth':
        start.setDate(1)
        start.setHours(0, 0, 0, 0)
        break
      case 'custom':
        return { start: '', end: '' }
    }
    return { start: start.toISOString(), end: end.toISOString() }
  }

  function choosePreset(p: Preset) {
    selected = p
    if (p === 'custom') {
      customStart = isoToLocal(startDate)
      customEnd = isoToLocal(endDate)
      return
    }
    const { start, end } = presetRange(p)
    startDate = start
    endDate = end
    open = false
    onApply?.()
  }

  function applyCustom() {
    const s = localToIso(customStart)
    const e = localToIso(customEnd)
    if (s && e && new Date(s) > new Date(e)) return
    startDate = s
    endDate = e
    selected = 'custom'
    open = false
    onApply?.()
  }

  function clearRange() {
    startDate = ''
    endDate = ''
    customStart = ''
    customEnd = ''
    selected = 'last24h'
    open = false
    onApply?.()
  }

  function handleDocClick(e: MouseEvent) {
    if (!open || !rootEl) return
    if (!rootEl.contains(e.target as Node)) open = false
  }
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') open = false
  }
  onMount(() => {
    document.addEventListener('click', handleDocClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('click', handleDocClick)
      document.removeEventListener('keydown', handleKey)
    }
  })

  const presetList: { key: Preset; label: () => string }[] = [
    { key: 'today',      label: () => m.filterRangePresetToday() },
    { key: 'yesterday',  label: () => m.filterRangePresetYesterday() },
    { key: 'last24h',    label: () => m.filterRangePresetLast24h() },
    { key: 'last7d',     label: () => m.filterRangePresetLast7d() },
    { key: 'last30d',    label: () => m.filterRangePresetLast30d() },
    { key: 'thisMonth',  label: () => m.filterRangePresetThisMonth() },
    { key: 'custom',     label: () => m.filterRangePresetCustom() }
  ]
</script>

<div class="date-range-filter position-relative d-inline-block" bind:this={rootEl}>
  <button
    type="button"
    class="btn btn-outline-secondary d-inline-flex align-items-center gap-2"
    class:btn-sm={compact}
    style={compact ? 'font-size:0.75rem;' : ''}
    onclick={() => (open = !open)}
    aria-haspopup="dialog"
    aria-expanded={open}
  >
    <i class="bi bi-calendar-range"></i>
    <span>{triggerLabel}</span>
    <i class="bi bi-chevron-down ms-1"></i>
  </button>

  {#if open}
    <div
      class="popover-panel bg-body border rounded shadow position-absolute mt-1 p-2"
      style="z-index:1070;min-width:280px;max-width:360px;"
      role="dialog"
      aria-label={m.filterRangeLabel()}
    >
      <div class="d-flex flex-wrap gap-1 mb-2">
        {#each presetList as p}
          <button
            type="button"
            class="btn btn-sm"
            class:btn-theme={selected === p.key}
            class:btn-outline-secondary={selected !== p.key}
            onclick={() => choosePreset(p.key)}
          >
            {p.label()}
          </button>
        {/each}
      </div>

      {#if selected === 'custom'}
        <div class="border-top pt-2">
          <div class="mb-2">
            <label class="form-label small mb-1" for="drf-start">{m.filterRangeStart()}</label>
            <input
              id="drf-start"
              type="datetime-local"
              class="form-control form-control-sm"
              bind:value={customStart}
            />
          </div>
          <div class="mb-2">
            <label class="form-label small mb-1" for="drf-end">{m.filterRangeEnd()}</label>
            <input
              id="drf-end"
              type="datetime-local"
              class="form-control form-control-sm"
              bind:value={customEnd}
            />
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" onclick={clearRange}>
              {m.filterRangeClear()}
            </button>
            <button type="button" class="btn btn-sm btn-theme" onclick={applyCustom}>
              {m.filterRangeApply()}
            </button>
          </div>
        </div>
      {:else}
        <div class="d-flex justify-content-end">
          <button type="button" class="btn btn-sm btn-link text-decoration-none" onclick={clearRange}>
            {m.filterRangeClear()}
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>
