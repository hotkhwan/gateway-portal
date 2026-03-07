<!-- src/lib/components/leaflet/EventMap.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { CircleMarker } from 'leaflet'

  // Props
  let {
    geoCells = [], // Array of { cell, count, lat, lng }
    height = '300px',
    zoom = 5,
    readonly = true,
    onCellClick = () => {}
  } = $props()

  // Map ready state
  let mapReady = $state(false)

  let container: HTMLDivElement
  let map: any = null
  let markers: CircleMarker[] = []
  let L: any = null

  // Theme color
  const themeColor = '#0d6efd'

  // Create circle marker for geohash cell
  function createCellMarker(cell: {
    cell: string
    count: number
    lat: number
    lng: number
  }): CircleMarker {
    // Size based on count
    const radius = Math.min(Math.max(Math.sqrt(cell.count) * 3, 5), 30)
    // Opacity based on count
    const opacity = Math.min(Math.max(cell.count / 50, 0.3), 0.8)

    const marker = L.circleMarker([cell.lat, cell.lng], {
      radius,
      color: themeColor,
      fillColor: themeColor,
      fillOpacity: opacity,
      weight: 1,
      opacity: 1
    })

    // Add tooltip on hover
    marker.bindTooltip(
      `
        <div style="
          font-family: var(--bs-font-sans-serif);
          padding: 4px 8px;
          background: rgba(15, 26, 46, 0.95);
          border-radius: 4px;
          color: #fff;
        ">
          <strong>${cell.count} events</strong><br/>
          <small>Lat: ${cell.lat.toFixed(4)}</small><br/>
          <small>Lng: ${cell.lng.toFixed(4)}</small>
        </div>
      `,
      {
        direction: 'top',
        offset: [0, -radius - 5],
        className: 'custom-map-tooltip'
      }
    )

    // Click handler
    marker.on('click', () => {
      onCellClick(cell)
    })

    return marker
  }

  function updateMarkers() {
    if (!map || !L) return

    // Remove existing markers
    markers.forEach((m) => m.remove())
    markers = []

    // Add new markers
    if (geoCells.length > 0) {
      geoCells.forEach((cell) => {
        const marker = createCellMarker(cell)
        marker.addTo(map)
        markers.push(marker)
      })

      // Fit bounds to show all markers
      const group = L.featureGroup(markers)
      const bounds = group.getBounds()
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14, animate: true })
      }
    }
  }

  onMount(async () => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Load Leaflet dynamically (same pattern as MapPicker.svelte)
    const leafletModule = await import('leaflet')
    L = leafletModule.default

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (!container || map) return

      // Initialize map
      map = L.map(container, {
        center: [13.7563, 100.5018],
        zoom,
        worldCopyJump: true,
        zoomControl: true,
        scrollWheelZoom: !readonly,
        doubleClickZoom: !readonly,
        dragging: !readonly
      })

      // Add CartoDB Dark Matter tiles
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19
        }
      ).addTo(map)

      // Add markers
      updateMarkers()

      // Ensure proper rendering and mark as ready
      setTimeout(() => {
        map?.invalidateSize({ animate: false })
        mapReady = true
      }, 100)
    }, 50)
  })

  onDestroy(() => {
    if (map) {
      map.remove()
      map = null
      mapReady = false
    }
    markers = []
  })

  // Handle prop changes - update markers
  $effect(() => {
    if (mapReady) {
      updateMarkers()
    }
  })
</script>

<div class="event-map-wrapper">
  <div
    class="event-map"
    style="height: {height}; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid var(--border, rgba(255,255,255,0.08));"
    bind:this={container}
  ></div>
</div>

<style>
  .event-map-wrapper {
    position: relative;
  }

  .event-map {
    position: relative;
    z-index: 1;
    min-height: 200px;
  }

  .event-map :global(.leaflet-container) {
    height: 100%;
    background: var(--panel, #0f1a2e);
    font-family: var(
      --bs-font-sans-serif,
      system-ui,
      -apple-system,
      'Segoe UI',
      Roboto,
      'Helvetica Neue',
      Arial,
      sans-serif
    );
  }

  .event-map :global(.leaflet-bar) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .event-map :global(.leaflet-bar a) {
    background-color: var(--panel2, #0c1629);
    color: var(--text, #d8e1ff);
    border-color: var(--border, rgba(255, 255, 255, 0.08));
  }

  .event-map :global(.leaflet-bar a:hover) {
    background-color: var(--bg, #0b1220);
  }

  /* Custom tooltip styling */
  .event-map :global(.custom-map-tooltip) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .event-map :global(.leaflet-tooltip-left:before) {
    border-left-color: transparent;
  }

  .event-map :global(.leaflet-tooltip-right:before) {
    border-right-color: transparent;
  }

  /* Ensure markers are visible */
  .event-map :global(.leaflet-interactive) {
    cursor: pointer;
  }

  .event-map :global(.leaflet-container a) {
    color: var(--text, #d8e1ff);
  }

  .event-map :global(.leaflet-control-zoom a) {
    background-color: var(--panel, #0f1a2e);
    color: var(--text, #d8e1ff);
  }

  .event-map :global(.leaflet-control-container) {
    display: flex !important;
  }

  .event-map :global(.leaflet-control-zoom) {
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .event-map :global(.leaflet-control-zoom-in) {
    border-radius: 4px !important;
    background-color: var(--bg, #0b1220) !important;
    color: #fff !important;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08)) !important;
  }

  .event-map :global(.leaflet-control-zoom-out) {
    border-radius: 4px !important;
    background-color: var(--bg, #0b1220) !important;
    color: #fff !important;
    border: 1px solid var(--border, rgba(255, 255, 255, 0.08)) !important;
  }

  .event-map :global(.leaflet-control-attribution) {
    display: none !important;
  }
</style>
