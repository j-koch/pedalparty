<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as LeafletMap, LatLngExpression, Polyline } from 'leaflet';
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

	interface Props {
		routes?: Route[];
		selectedRouteId?: string | null;
		center?: { lat: number; lng: number };
		zoom?: number;
		children?: Snippet;
	}

	let {
		routes = [],
		selectedRouteId = null,
		center = { lat: 39.8283, lng: -98.5795 },
		zoom = 4,
		children
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: LeafletMap | null = null;
	let routeLines: Polyline[] = [];
	let L: typeof import('leaflet') | null = null;

	const routeColors = ['#d4a574', '#5c8dc4', '#4a9d6b'];

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

	$effect(() => {
		if (map && L) {
			const _ = routes;
			const __ = selectedRouteId;
			updateRoutes();
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
</style>
