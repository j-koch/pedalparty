<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, LatLngExpression, Polyline, Marker } from 'leaflet';
	import type { Snippet } from 'svelte';

	interface Route {
		id: string;
		name: string;
		geometry: {
			type: 'LineString';
			coordinates: [number, number][];
		};
		color?: string;
	}

	interface POI {
		name: string;
		type: string;
		lat: number;
		lng: number;
	}

	interface Props {
		routes?: Route[];
		pois?: POI[];
		selectedRouteId?: string | null;
		center?: { lat: number; lng: number };
		zoom?: number;
		children?: Snippet;
	}

	let {
		routes = [],
		pois = [],
		selectedRouteId = null,
		center = { lat: 39.8283, lng: -98.5795 },
		zoom = 4,
		children
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: LeafletMap | null = null;
	let routeLines: Polyline[] = [];
	let poiMarkers: Marker[] = [];
	let L: typeof import('leaflet') | null = null;

	const routeColors = ['#d4a574', '#5c8dc4', '#4a9d6b'];

	const poiIcons: Record<string, string> = {
		cafe: '☕',
		viewpoint: '👁',
		water: '💧'
	};

	onMount(async () => {
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		map = L.map(mapContainer, {
			zoomControl: false
		}).setView([center.lat, center.lng], zoom);

		// Add zoom control to bottom right
		L.control.zoom({ position: 'bottomright' }).addTo(map);

		// Use CartoDB Voyager tiles - clean, light, professional
		L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
			subdomains: 'abcd',
			maxZoom: 20
		}).addTo(map);

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

		routeLines.forEach((line) => line.remove());
		routeLines = [];

		if (routes.length === 0) return;

		const bounds: LatLngExpression[] = [];

		routes.forEach((route, index) => {
			const latLngs: LatLngExpression[] = route.geometry.coordinates.map(
				([lng, lat]) => [lat, lng] as LatLngExpression
			);

			bounds.push(...latLngs);

			const isSelected = selectedRouteId === null || selectedRouteId === route.id;
			const color = route.color || routeColors[index % routeColors.length];

			const line = L.polyline(latLngs, {
				color: color,
				weight: isSelected ? 4 : 2,
				opacity: isSelected ? 1 : 0.3
			}).addTo(map!);

			routeLines.push(line);
		});

		if (bounds.length > 0) {
			map.fitBounds(L.latLngBounds(bounds), { padding: [100, 100] });
		}
	}

	function updateMarkers() {
		if (!map || !L) return;

		// Clear existing markers
		poiMarkers.forEach((marker) => marker.remove());
		poiMarkers = [];

		if (pois.length === 0) return;

		pois.forEach((poi) => {
			const emoji = poiIcons[poi.type] || '📍';

			const icon = L.divIcon({
				className: 'poi-marker',
				html: `<div class="poi-marker-inner" title="${poi.name}">${emoji}</div>`,
				iconSize: [28, 28],
				iconAnchor: [14, 14]
			});

			const marker = L.marker([poi.lat, poi.lng], { icon })
				.bindPopup(`<strong>${poi.name}</strong><br><span style="text-transform: capitalize">${poi.type}</span>`)
				.addTo(map!);

			poiMarkers.push(marker);
		});
	}

	$effect(() => {
		if (map && L) {
			const _ = routes;
			const __ = selectedRouteId;
			updateRoutes();
		}
	});

	$effect(() => {
		if (map && L) {
			const _ = pois;
			updateMarkers();
		}
	});

	export function getMap() {
		return map;
	}

	export function getLeaflet() {
		return L;
	}
</script>

<div class="map-layout">
	<div bind:this={mapContainer} class="map-container"></div>
	<div class="ui-layer">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.map-layout {
		position: fixed;
		inset: 0;
		overflow: hidden;
	}

	.map-container {
		position: absolute;
		inset: 0;
		z-index: 0;
	}

	.ui-layer {
		position: absolute;
		inset: 0;
		z-index: 10;
		pointer-events: none;
	}

	.ui-layer :global(*) {
		pointer-events: auto;
	}

	/* POI Markers */
	:global(.poi-marker) {
		background: transparent !important;
		border: none !important;
	}

	:global(.poi-marker-inner) {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		border: 2px solid var(--gray-300);
		border-radius: 50%;
		font-size: 14px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	:global(.poi-marker-inner:hover) {
		transform: scale(1.15);
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
	}

	:global(.leaflet-popup-content-wrapper) {
		border-radius: var(--radius-sm);
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
	}

	:global(.leaflet-popup-content) {
		margin: 10px 12px;
		font-size: 13px;
		line-height: 1.4;
	}
</style>
