<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { Vibe, RouteType } from '$lib/database.types';

	interface Props {
		ride: {
			id: string;
			name: string;
			date: string | null;
		};
	}

	let { ride }: Props = $props();

	// Form state
	let startLocation = $state<{ lat: number; lng: number } | null>(null);
	let distanceKm = $state(30);
	let routeType = $state<RouteType>('no_preference');
	let selectedVibes = $state<Vibe[]>([]);
	let earliestStart = $state('08:00');
	let latestEnd = $state('17:00');

	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let error = $state('');
	let visitorToken = $state<string | null>(null);

	// PIN recovery state
	let showPinModal = $state(false);
	let pinInput = $state('');
	let pinError = $state('');
	let isVerifying = $state(false);

	let mapReady = $state(false);
	let map: L.Map | null = null;
	let marker: L.Marker | null = null;
	let L: typeof import('leaflet') | null = null;

	const vibeOptions: { value: Vibe; label: string }[] = [
		{ value: 'coffee_shop', label: 'Coffee Stop' },
		{ value: 'scenic_views', label: 'Scenic Views' },
		{ value: 'low_traffic', label: 'Low Traffic' },
		{ value: 'gravel_ok', label: 'Gravel OK' },
		{ value: 'waterfront', label: 'Waterfront' },
		{ value: 'minimize_hills', label: 'Flat Route' },
		{ value: 'maximize_hills', label: 'Hilly Route' }
	];

	const routeTypes: { value: RouteType; label: string }[] = [
		{ value: 'loop', label: 'Loop' },
		{ value: 'out_and_back', label: 'Out & Back' },
		{ value: 'no_preference', label: 'No Pref' }
	];

	onMount(async () => {
		visitorToken = localStorage.getItem(`visitor_${ride.id}`);

		// Initialize map
		L = await import('leaflet');
		await import('leaflet/dist/leaflet.css');

		const mapEl = document.getElementById('location-map');
		if (!mapEl) return;

		map = L.map(mapEl, { zoomControl: false }).setView([39.8283, -98.5795], 4);

		L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; OSM &copy; CARTO'
		}).addTo(map);

		map.on('click', (e) => {
			setLocation(e.latlng.lat, e.latlng.lng);
		});

		// Try to get user location
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					setLocation(pos.coords.latitude, pos.coords.longitude);
					map?.setView([pos.coords.latitude, pos.coords.longitude], 12);
				},
				() => {
					// Geolocation failed
				}
			);
		}

		mapReady = true;
	});

	function setLocation(lat: number, lng: number) {
		startLocation = { lat, lng };

		if (!map || !L) return;

		if (marker) {
			marker.setLatLng([lat, lng]);
		} else {
			const icon = L.divIcon({
				className: 'location-marker',
				html: '<div class="marker-dot"></div>',
				iconSize: [20, 20],
				iconAnchor: [10, 10]
			});
			marker = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
			marker.on('dragend', () => {
				const pos = marker!.getLatLng();
				startLocation = { lat: pos.lat, lng: pos.lng };
			});
		}
	}

	function toggleVibe(vibe: Vibe) {
		if (selectedVibes.includes(vibe)) {
			selectedVibes = selectedVibes.filter((v) => v !== vibe);
		} else {
			selectedVibes = [...selectedVibes, vibe];
		}
	}

	async function handleSubmit() {
		error = '';

		if (!startLocation) {
			error = 'Click on the map to set your start location';
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch(`/api/rides/${ride.id}/preferences`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start_location: startLocation,
					distance_preference_km: distanceKm,
					route_type: routeType,
					vibes: selectedVibes,
					time_availability: {
						earliest_start: earliestStart,
						latest_end: latestEnd
					},
					visitor_token: visitorToken
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to submit');
			}

			localStorage.setItem(`visitor_${ride.id}`, data.visitor_token);
			visitorToken = data.visitor_token;
			isSubmitted = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isSubmitting = false;
		}
	}

	async function verifyPin() {
		if (!pinInput.trim()) {
			pinError = 'Enter your PIN';
			return;
		}

		isVerifying = true;
		pinError = '';

		try {
			const response = await fetch(`/api/rides/${ride.id}/verify-pin`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pin: pinInput.trim() })
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Invalid PIN');
			}

			// Store the organizer token and redirect
			localStorage.setItem(`organizer_${ride.id}`, data.organizer_token);
			goto(data.organizer_url);
		} catch (err) {
			pinError = err instanceof Error ? err.message : 'Something went wrong';
			isVerifying = false;
		}
	}
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<a href="/" class="logo">PEDALPARTY</a>
		<h1 class="ride-name">{ride.name}</h1>
		{#if ride.date}
			<div class="ride-date mono">
				{new Date(ride.date).toLocaleDateString('en-US', {
					weekday: 'short',
					month: 'short',
					day: 'numeric'
				})}
			</div>
		{/if}
		<button class="organizer-link" onclick={() => (showPinModal = true)}>
			I'm the organizer
		</button>
	</div>

	<div class="sidebar-content">
		{#if isSubmitted}
			<div class="success-state">
				<div class="success-icon">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M20 6L9 17l-5-5" />
					</svg>
				</div>
				<h2 class="success-title">Preferences Submitted</h2>
				<p class="success-text">The organizer will share routes when ready.</p>
				<button class="btn btn-secondary" onclick={() => (isSubmitted = false)}>
					Update Preferences
				</button>
			</div>
		{:else}
			<!-- Location Map -->
			<div class="section">
				<div class="label-row">
					<span class="label">Start Location</span>
					{#if startLocation}
						<span class="label-value mono">{startLocation.lat.toFixed(4)}, {startLocation.lng.toFixed(4)}</span>
					{/if}
				</div>
				<div id="location-map" class="location-map"></div>
				<div class="map-hint">Click to set location, drag to adjust</div>
			</div>

			<!-- Distance -->
			<div class="section">
				<div class="label-row">
					<span class="label">Distance</span>
					<span class="label-value mono">{distanceKm} km</span>
				</div>
				<input
					type="range"
					min="10"
					max="150"
					step="5"
					bind:value={distanceKm}
					class="range-input"
				/>
				<div class="range-labels">
					<span>10 km</span>
					<span>150 km</span>
				</div>
			</div>

			<!-- Route Type -->
			<div class="section">
				<div class="label">Route Type</div>
				<div class="toggle-group">
					{#each routeTypes as rt}
						<button
							class="toggle-btn"
							class:active={routeType === rt.value}
							onclick={() => (routeType = rt.value)}
						>
							{rt.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Vibes -->
			<div class="section">
				<div class="label">Features</div>
				<div class="chips">
					{#each vibeOptions as vibe}
						<button
							class="chip"
							class:chip-active={selectedVibes.includes(vibe.value)}
							onclick={() => toggleVibe(vibe.value)}
						>
							{vibe.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Time Availability -->
			<div class="section">
				<div class="label">Time Availability</div>
				<div class="time-inputs">
					<div class="time-field">
						<label class="time-label" for="earliest">Earliest</label>
						<input
							type="time"
							id="earliest"
							class="input time-input"
							bind:value={earliestStart}
						/>
					</div>
					<span class="time-separator">to</span>
					<div class="time-field">
						<label class="time-label" for="latest">Latest</label>
						<input
							type="time"
							id="latest"
							class="input time-input"
							bind:value={latestEnd}
						/>
					</div>
				</div>
			</div>
		{/if}
	</div>

	{#if !isSubmitted}
		<div class="sidebar-footer">
			{#if error}
				<div class="error-msg">{error}</div>
			{/if}
			<button
				class="btn btn-primary w-full"
				onclick={handleSubmit}
				disabled={isSubmitting || !startLocation}
			>
				{isSubmitting ? 'Submitting...' : visitorToken ? 'Update Preferences' : 'Submit Preferences'}
			</button>
		</div>
	{/if}
</aside>

<!-- PIN Recovery Modal -->
{#if showPinModal}
	<div class="modal-overlay" onclick={() => (showPinModal = false)}>
		<div class="modal" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Organizer Access</h2>
				<button class="close-btn" onclick={() => (showPinModal = false)}>
					<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="modal-body">
				<p class="modal-text">Enter your 6-digit PIN to access the organizer dashboard.</p>

				<div class="field">
					<label class="label" for="pin">PIN</label>
					<input
						type="text"
						id="pin"
						class="input pin-input"
						placeholder="000000"
						maxlength="6"
						bind:value={pinInput}
						disabled={isVerifying}
					/>
				</div>

				{#if pinError}
					<div class="error-msg">{pinError}</div>
				{/if}
			</div>

			<div class="modal-footer">
				<button class="btn btn-secondary" onclick={() => (showPinModal = false)} disabled={isVerifying}>
					Cancel
				</button>
				<button class="btn btn-primary" onclick={verifyPin} disabled={isVerifying}>
					{isVerifying ? 'Verifying...' : 'Access Dashboard'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.sidebar {
		position: absolute;
		top: 1rem;
		left: 1rem;
		bottom: 1rem;
		width: 320px;
		display: flex;
		flex-direction: column;
		background: var(--surface-overlay);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
	}

	.sidebar-header {
		padding: 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	.logo {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.15em;
		color: var(--text-muted);
		text-decoration: none;
	}

	.ride-name {
		margin-top: 0.75rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.ride-date {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.sidebar-content {
		flex: 1;
		padding: 1.25rem;
		overflow-y: auto;
	}

	.section {
		margin-bottom: 1.25rem;
	}

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.label-value {
		font-size: 0.75rem;
		color: var(--accent);
	}

	/* Location Map */
	.location-map {
		height: 140px;
		background: var(--gray-100);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
	}

	.map-hint {
		margin-top: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	:global(.location-marker) {
		background: transparent !important;
		border: none !important;
	}

	:global(.marker-dot) {
		width: 20px;
		height: 20px;
		background: var(--accent);
		border: 3px solid white;
		border-radius: 50%;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
	}

	/* Range Input */
	.range-input {
		width: 100%;
		height: 4px;
		background: var(--gray-200);
		border-radius: 2px;
		outline: none;
		appearance: none;
		cursor: pointer;
	}

	.range-input::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		background: var(--accent);
		border: none;
		cursor: pointer;
	}

	.range-labels {
		display: flex;
		justify-content: space-between;
		margin-top: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	/* Toggle Group */
	.toggle-group {
		display: flex;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.toggle-btn {
		flex: 1;
		padding: 0.5rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
		background: transparent;
		border: none;
		border-right: 1px solid var(--border);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.toggle-btn:last-child {
		border-right: none;
	}

	.toggle-btn:hover {
		color: var(--text-primary);
		background: var(--gray-100);
	}

	.toggle-btn.active {
		color: white;
		background: var(--accent);
	}

	/* Chips */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	/* Time Availability */
	.time-inputs {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.time-field {
		flex: 1;
	}

	.time-label {
		display: block;
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin-bottom: 0.25rem;
	}

	.time-input {
		width: 100%;
		font-family: 'JetBrains Mono', monospace;
	}

	.time-separator {
		font-size: 0.75rem;
		color: var(--text-muted);
		padding-bottom: 0.625rem;
	}

	/* Success State */
	.success-state {
		text-align: center;
		padding: 2rem 1rem;
	}

	.success-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 48px;
		height: 48px;
		background: rgba(74, 157, 107, 0.15);
		color: var(--success);
		margin-bottom: 1rem;
	}

	.success-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.5rem;
	}

	.success-text {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.sidebar-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--border);
	}

	.w-full {
		width: 100%;
	}

	.error-msg {
		margin-bottom: 0.75rem;
		padding: 0.5rem 0.75rem;
		background: rgba(196, 92, 92, 0.1);
		border: 1px solid var(--error);
		border-radius: var(--radius-sm);
		color: var(--error);
		font-size: 0.75rem;
	}

	/* Organizer Link */
	.organizer-link {
		margin-top: 0.75rem;
		padding: 0;
		font-size: 0.75rem;
		color: var(--text-muted);
		background: none;
		border: none;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.organizer-link:hover {
		color: var(--text-secondary);
	}

	/* Modal */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 1000;
	}

	.modal {
		width: 100%;
		max-width: 360px;
		background: var(--surface-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}

	.modal-header h2 {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.close-btn {
		padding: 0.25rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
	}

	.close-btn:hover {
		color: var(--text-primary);
	}

	.modal-body {
		padding: 1.25rem;
	}

	.modal-text {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
		line-height: 1.5;
	}

	.field {
		margin-bottom: 1rem;
	}

	.pin-input {
		font-family: 'JetBrains Mono', monospace;
		font-size: 1.25rem;
		letter-spacing: 0.2em;
		text-align: center;
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 640px) {
		.sidebar {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: auto;
			max-height: 70vh;
			border-left: none;
			border-right: none;
			border-bottom: none;
		}

		.location-map {
			height: 120px;
		}
	}
</style>
