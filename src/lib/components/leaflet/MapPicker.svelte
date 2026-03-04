<!-- src/lib/components/leaflet/MapPicker.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  // Props
  let {
    lat = 13.7563, // Default: Bangkok
    lng = 100.5018,
    zoom = 13,
    height = '300px',
    readonly = false,
    disabled = false,
    onchange = () => {},
    showLocationButton = false
  } = $props()

  let container: HTMLDivElement
  let map: any = null
  let marker: any = null
  let loadingLocation = $state(false)
  let L: any = null

  // Custom pin icon for dark theme - uses dynamic L
  function createPinIcon(): any {
    if (!L) return null
    return L.divIcon({
      className: 'custom-map-pin',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: 2px solid #fff;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5);
        "></div>
        <div style="
          width: 8px;
          height: 8px;
          background: #fff;
          border-radius: 50%;
          position: absolute;
          top: 6px;
          left: 6px;
        "></div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 24]
    })
  }

  function updateMarker() {
    if (!map) return

    if (lat !== undefined && lng !== undefined) {
      const pinIcon = createPinIcon()
      if (marker) {
        marker.setLatLng([lat, lng])
      } else {
        marker = L.marker([lat, lng], {
          icon: pinIcon,
          draggable: !readonly && !disabled
        })
        marker.addTo(map)
        if (!readonly && !disabled && marker) {
          marker.on('dragend', () => {
            const position = marker?.getLatLng()
            if (position) {
              onchange(position.lat, position.lng)
            }
          })
        }
      }
    }
  }

  onMount(async () => {
    // Only run on client side
    if (typeof window === 'undefined') return

    // Load Leaflet dynamically
    const leafletModule = await import('leaflet')
    L = leafletModule.default

    // Small delay to ensure DOM is ready
    setTimeout(() => {
      if (!container || map) return

      // Initialize map
      map = L.map(container, {
        center: [lat, lng],
        zoom,
        worldCopyJump: true,
        zoomControl: !readonly,
        scrollWheelZoom: !readonly && !disabled,
        doubleClickZoom: !readonly && !disabled,
        dragging: !readonly && !disabled
      })

      // Add OSM tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19
      }).addTo(map)

      // Add marker
      updateMarker()

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
    marker = null
  })

  // Handle map click - reactive effect
  $effect(() => {
    if (!readonly && !disabled && map && L) {
      const clickHandler = (e: { latlng: { lat: number; lng: number } }) => {
        const { lat: newLat, lng: newLng } = e.latlng
        // Normalize lng ให้อยู่ใน [-180, 180] กันปัญหา world-wrap
        const normalizedLng = ((((newLng + 180) % 360) + 360) % 360) - 180
        onchange(newLat, normalizedLng)
        updateMarkerAt(newLat, normalizedLng)
      }
      map.on('click', clickHandler)
      return () => map.off('click', clickHandler)
    }
  })

  function updateMarkerAt(newLat: number, newLng: number) {
    if (marker) {
      marker.setLatLng([newLat, newLng])
    }
  }

  function loadCurrentLocation() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    loadingLocation = true
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        onchange(latitude, longitude)
        loadingLocation = false
      },
      (error) => {
        console.error('Error getting location:', error)
        alert('Unable to retrieve your location')
        loadingLocation = false
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  }
</script>

<div class="map-picker-wrapper">
  <div
    class="map-picker"
    class:disabled
    style="height: {height}; width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid var(--border, rgba(255,255,255,0.08));"
    bind:this={container}
  ></div>
  {#if showLocationButton && !readonly && !disabled}
    <button
      class="btn btn-sm btn-outline-theme mt-2 w-100"
      type="button"
      onclick={loadCurrentLocation}
      disabled={loadingLocation}
    >
      {#if loadingLocation}
        <span class="spinner-border spinner-border-sm me-1"></span>
        Getting location...
      {:else}
        <i class="bi bi-geo-alt me-1"></i>Use current location
      {/if}
    </button>
  {/if}
</div>

<style>
  .map-picker-wrapper {
    position: relative;
  }

  .map-picker {
    position: relative;
    z-index: 1;
    min-height: 200px;
  }

  .map-picker :global(.leaflet-container) {
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

  .map-picker :global(.leaflet-bar) {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }

  .map-picker :global(.leaflet-bar a) {
    background-color: var(--panel2, #0c1629);
    color: var(--text, #d8e1ff);
    border-color: var(--border, rgba(255,255,255,0.08));
  }

  .map-picker :global(.leaflet-bar a:hover) {
    background-color: var(--bg, #0b1220);
  }

  .map-picker :global(.custom-map-pin) {
    position: relative;
  }
</style>
