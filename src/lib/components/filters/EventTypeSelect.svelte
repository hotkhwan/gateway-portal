<!--
  EventTypeSelect.svelte — text input + native <datalist> for event type.
  User can type freely or pick from suggestions. `suggestions` is a list of
  known eventType strings (commonly aggregated from loaded data).
-->
<script lang="ts">
  import { m } from '$lib/i18n/messages'

  type Props = {
    value: string
    suggestions: string[]
    id?: string
    placeholder?: string
    onCommit?: () => void
    compact?: boolean
    widthPx?: number
  }

  let {
    value = $bindable(''),
    suggestions,
    id = 'evt-type-input',
    placeholder,
    onCommit,
    compact = true,
    widthPx = 200
  }: Props = $props()

  const listId = `${id}-list`
  let resolvedPlaceholder = $derived(placeholder ?? m.filterEventTypePlaceholder())

  // Deduplicate + sort
  let unique = $derived(Array.from(new Set(suggestions.filter(Boolean))).sort())

  function keydown(e: KeyboardEvent) {
    if (e.key === 'Enter') onCommit?.()
  }
</script>

<input
  {id}
  type="text"
  class="form-control"
  class:form-control-sm={compact}
  style="font-size:0.75rem;width:{widthPx}px"
  placeholder={resolvedPlaceholder}
  list={listId}
  bind:value
  onkeydown={keydown}
  onchange={() => onCommit?.()}
/>
<datalist id={listId}>
  {#each unique as s}
    <option value={s}></option>
  {/each}
</datalist>
