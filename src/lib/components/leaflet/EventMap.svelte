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

  let container: HTMLDivElement
  let map: any = null
  let markers: CircleMarker[] = []

  // Theme color
  const themeColor = '#0d6efd'

  // Create circle marker for geohash cell
  function createCellMarker(cell: { cell: string; count: number; lat: number; lng: number }): CircleMarker {
    const L = require('leaflet')
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
    const mapInstance = map
    if (!mapInstance) return

    // Remove existing markers
    markers.forEach((m) => m.remove())
    markers = []

    // Add new markers
    if (geoCells.length > 0) {
      const L = require('leaflet')
      geoCells.forEach((cell) => {
        const marker = createCellMarker(cell)
        marker.addTo(mapInstance)
        markers.push(marker)
      })

      // Fit bounds to show all markers
      const group = require('leaflet').featureGroup(markers)
      mapInstance.fitBounds(group.getBounds(), { padding: [20, 20], maxZoom: 12 })
    }
  }

  onMount(() => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (!container || map) return

      const L = require('leaflet')

      // Initialize map
      map = L.map(container, {
        center: [13.7563, 100.5018],
        zoom,
        worldCopyJump: true,
        zoomControl: !readonly,
        scrollWheelZoom: !readonly,
        doubleClickZoom: !readonly,
        dragging: !readonly
      })

      // Add CartoDB Dark Matter tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(map)

      // Add markers
      updateMarkers()

      // Ensure proper rendering
      setTimeout(() => {
        map?.invalidateSize({ animate: false })
      }, 100)
    }, 50)
  })

  onDestroy(() => {
    if (map) {
      map.remove()
      map = null
    }
    markers = []
  })

  // Handle prop changes - update markers
  $effect(() => {
    updateMarkers()
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
</style>
