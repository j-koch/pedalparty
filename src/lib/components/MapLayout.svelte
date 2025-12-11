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

	interface Waypoint {
		name: string;
		category: string;
		lat: number;
		lng: number;
	}

	interface CandidatePOI {
		id: string;
		name: string;
		lat: number;
		lng: number;
		distance_km?: number;
	}

	interface Props {
		routes?: Route[];
		waypoints?: Waypoint[];
		candidatePois?: CandidatePOI[];
		selectedRouteId?: string | null;
		center?: { lat: number; lng: number };
		zoom?: number;
		onCandidateSelect?: (candidate: CandidatePOI) => void;
		children?: Snippet;
	}

	let {
		routes = [],
		waypoints = [],
		candidatePois = [],
		selectedRouteId = null,
		center = { lat: 39.8283, lng: -98.5795 },
		zoom = 4,
		onCandidateSelect,
		children
	}: Props = $props();

	let mapContainer: HTMLDivElement;
	let map: LeafletMap | null = null;
	let routeLines: Polyline[] = [];
	let waypointMarkers: Marker[] = [];
	let candidateMarkers: Marker[] = [];
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
		waypointMarkers.forEach((marker) => marker.remove());
		waypointMarkers = [];

		if (waypoints.length === 0) return;

		waypoints.forEach((wp, index) => {
			const icon = L.divIcon({
				className: 'waypoint-marker',
				html: `<div class="waypoint-marker-inner" title="${wp.name}">${index + 1}</div>`,
				iconSize: [28, 28],
				iconAnchor: [14, 14]
			});

			const marker = L.marker([wp.lat, wp.lng], { icon })
				.bindPopup(`<strong>${wp.name}</strong><br><span class="waypoint-category">${wp.category}</span>`)
				.addTo(map!);

			waypointMarkers.push(marker);
		});
	}

	function updateCandidateMarkers() {
		if (!map || !L) return;

		// Clear existing candidate markers
		candidateMarkers.forEach((marker) => marker.remove());
		candidateMarkers = [];

		if (candidatePois.length === 0) return;

		candidatePois.forEach((poi, index) => {
			const icon = L.divIcon({
				className: 'candidate-marker',
				html: `<div class="candidate-marker-inner">${index + 1}</div>`,
				iconSize: [32, 32],
				iconAnchor: [16, 16]
			});

			const marker = L.marker([poi.lat, poi.lng], { icon })
				.bindTooltip(poi.name, { permanent: false, direction: 'top' })
				.addTo(map!);

			// If callback provided, make markers clickable
			if (onCandidateSelect) {
				marker.on('click', () => onCandidateSelect(poi));
			}

			candidateMarkers.push(marker);
		});

		// Fit bounds to show all candidates
		if (candidatePois.length > 0) {
			const bounds = L.latLngBounds(candidatePois.map((p) => [p.lat, p.lng] as [number, number]));
			map.fitBounds(bounds, { padding: [100, 100], maxZoom: 14 });
		}
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
			const _ = waypoints;
			updateMarkers();
		}
	});

	$effect(() => {
		// Access candidatePois array to track changes
		const _ = [...candidatePois];
		if (map && L) {
			updateCandidateMarkers();
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

	/* Waypoint Markers */
	:global(.waypoint-marker) {
		background: transparent !important;
		border: none !important;
	}

	:global(.waypoint-marker-inner) {
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--success, #4a9d6b);
		border: 3px solid white;
		border-radius: 50%;
		font-size: 12px;
		font-weight: 600;
		color: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	:global(.waypoint-marker-inner:hover) {
		transform: scale(1.15);
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
	}

	:global(.waypoint-category) {
		text-transform: capitalize;
		color: #666;
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

	/* Candidate POI Markers */
	:global(.candidate-marker) {
		background: transparent !important;
		border: none !important;
	}

	:global(.candidate-marker-inner) {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--accent, #4a90a4);
		border: 3px solid white;
		border-radius: 50%;
		font-size: 14px;
		font-weight: 600;
		color: white;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	:global(.candidate-marker-inner:hover) {
		transform: scale(1.15);
		box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4);
	}
</style>
