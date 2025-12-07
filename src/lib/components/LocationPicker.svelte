<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, Marker } from 'leaflet';

	interface Props {
		location: { lat: number; lng: number } | null;
		onLocationChange: (lat: number, lng: number) => void;
		class?: string;
	}

	let { location, onLocationChange, class: className = '' }: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: LeafletMap | null = null;
	let marker: Marker | null = null;
	let L: typeof import('leaflet') | null = null;

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		// Default center (will be updated if we get user location)
		const defaultCenter: [number, number] = location
			? [location.lat, location.lng]
			: [39.8283, -98.5795]; // Center of US
		const defaultZoom = location ? 13 : 4;

		map = L.map(mapContainer).setView(defaultCenter, defaultZoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		// Add marker if location exists
		if (location) {
			addMarker(location.lat, location.lng);
		}

		// Handle clicks
		map.on('click', (e) => {
			addMarker(e.latlng.lat, e.latlng.lng);
			onLocationChange(e.latlng.lat, e.latlng.lng);
		});

		// Try to get user location for better initial view
		if (!location && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					if (map && !location) {
						map.setView([pos.coords.latitude, pos.coords.longitude], 13);
					}
				},
				() => {
					// Geolocation failed, that's fine
				}
			);
		}
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	function addMarker(lat: number, lng: number) {
		if (!map || !L) return;

		// Remove existing marker
		if (marker) {
			marker.remove();
		}

		const icon = L.divIcon({
			className: 'custom-marker',
			html: `<div style="background-color: #059669; width: 32px; height: 32px; border-radius: 50%; border: 4px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
			iconSize: [32, 32],
			iconAnchor: [16, 16]
		});

		marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);

		marker.on('dragend', () => {
			const pos = marker!.getLatLng();
			onLocationChange(pos.lat, pos.lng);
		});
	}

	// Update marker when location prop changes
	$effect(() => {
		if (map && L && location) {
			addMarker(location.lat, location.lng);
		}
	});
</script>

<div class="space-y-2">
	<div
		bind:this={mapContainer}
		class="w-full h-[200px] rounded-lg border border-gray-200 {className}"
	></div>
	<p class="text-xs text-gray-500 text-center">
		Click on the map to set your start location, or drag the marker to adjust
	</p>
</div>

<style>
	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}
</style>
