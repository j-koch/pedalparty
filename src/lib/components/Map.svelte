<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, LatLngExpression, Polyline, Marker, LatLngBounds } from 'leaflet';

	interface Route {
		id: string;
		name: string;
		geometry: {
			type: 'LineString';
			coordinates: [number, number][];
		};
		color?: string;
	}

	interface MapMarker {
		lat: number;
		lng: number;
		label?: string;
		color?: string;
	}

	interface Props {
		center?: { lat: number; lng: number };
		zoom?: number;
		routes?: Route[];
		markers?: MapMarker[];
		clickable?: boolean;
		onMapClick?: (lat: number, lng: number) => void;
		selectedRouteId?: string | null;
		class?: string;
	}

	let {
		center = { lat: 40, lng: -100 },
		zoom = 4,
		routes = [],
		markers = [],
		clickable = false,
		onMapClick,
		selectedRouteId = null,
		class: className = ''
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: LeafletMap | null = null;
	let routeLines: Polyline[] = [];
	let markerObjects: Marker[] = [];
	let L: typeof import('leaflet') | null = null;

	const routeColors = ['#059669', '#0891b2', '#7c3aed', '#dc2626'];

	onMount(async () => {
		// Dynamic import to avoid SSR issues
		L = await import('leaflet');

		// Import CSS
		await import('leaflet/dist/leaflet.css');

		map = L.map(mapContainer).setView([center.lat, center.lng], zoom);

		L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
		}).addTo(map);

		if (clickable && onMapClick) {
			map.on('click', (e) => {
				onMapClick(e.latlng.lat, e.latlng.lng);
			});
		}

		// Draw initial routes and markers
		updateRoutes();
		updateMarkers();
	});

	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
	});

	function updateRoutes() {
		if (!map || !L) return;

		// Clear existing routes
		routeLines.forEach((line) => line.remove());
		routeLines = [];

		if (routes.length === 0) return;

		const bounds: LatLngExpression[] = [];

		routes.forEach((route, index) => {
			// Convert [lng, lat] to [lat, lng] for Leaflet
			const latLngs: LatLngExpression[] = route.geometry.coordinates.map(
				([lng, lat]) => [lat, lng] as LatLngExpression
			);

			bounds.push(...latLngs);

			const isSelected = selectedRouteId === null || selectedRouteId === route.id;
			const color = route.color || routeColors[index % routeColors.length];

			const line = L.polyline(latLngs, {
				color: color,
				weight: isSelected ? 5 : 3,
				opacity: isSelected ? 1 : 0.4
			}).addTo(map!);

			line.bindPopup(`<strong>${route.name}</strong>`);
			routeLines.push(line);
		});

		// Fit bounds to show all routes
		if (bounds.length > 0) {
			map.fitBounds(L.latLngBounds(bounds), { padding: [50, 50] });
		}
	}

	function updateMarkers() {
		if (!map || !L) return;

		// Clear existing markers
		markerObjects.forEach((marker) => marker.remove());
		markerObjects = [];

		markers.forEach((m) => {
			const icon = L.divIcon({
				className: 'custom-marker',
				html: `<div style="background-color: ${m.color || '#059669'}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
				iconSize: [24, 24],
				iconAnchor: [12, 12]
			});

			const marker = L.marker([m.lat, m.lng], { icon }).addTo(map!);
			if (m.label) {
				marker.bindPopup(m.label);
			}
			markerObjects.push(marker);
		});
	}

	// Reactively update when routes or markers change
	$effect(() => {
		if (map && L) {
			// Need to reference these to trigger the effect
			const _ = routes;
			const __ = selectedRouteId;
			updateRoutes();
		}
	});

	$effect(() => {
		if (map && L) {
			const _ = markers;
			updateMarkers();
		}
	});

	// Update center when it changes
	$effect(() => {
		if (map && center) {
			map.setView([center.lat, center.lng], zoom);
		}
	});
</script>

<div bind:this={mapContainer} class="w-full h-full min-h-[300px] rounded-lg {className}"></div>

<style>
	:global(.custom-marker) {
		background: transparent !important;
		border: none !important;
	}
</style>
