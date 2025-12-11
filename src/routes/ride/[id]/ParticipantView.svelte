<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { RouteType, SelectedPOI } from '$lib/database.types';

	interface POISearchResult {
		id: string;
		name: string;
		address: string;
		lat: number;
		lng: number;
		type: string;
		distance_km?: number;
	}

	interface CandidatePOI {
		id: string;
		name: string;
		lat: number;
		lng: number;
		distance_km?: number;
	}

	interface Props {
		ride: {
			id: string;
			name: string;
			date: string | null;
			categories: string[];
		};
		onCandidatesChange?: (candidates: CandidatePOI[], category: string | null) => void;
		onStartLocationPick?: () => void;
		startLocationFromMap?: { lat: number; lng: number } | null;
	}

	let { ride, onCandidatesChange, onStartLocationPick, startLocationFromMap }: Props = $props();

	// Form state
	let startLocation = $state<{ lat: number; lng: number } | null>(null);
	let distanceKm = $state(30);
	let routeType = $state<RouteType>('no_preference');
	let selectedPois = $state<SelectedPOI[]>([]);
	let earliestStart = $state('08:00');
	let latestEnd = $state('17:00');

	// POI search state per category
	let searchQueries = $state<Record<string, string>>({});
	let searchResults = $state<Record<string, POISearchResult[]>>({});
	let searchingCategory = $state<string | null>(null);
	let activeSearchCategory = $state<string | null>(null);

	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let error = $state('');
	let visitorToken = $state<string | null>(null);

	// PIN recovery state
	let showPinModal = $state(false);
	let pinInput = $state('');
	let pinError = $state('');
	let isVerifying = $state(false);

	// Mobile sidebar collapse state
	let sidebarCollapsed = $state(false);

	// Location picking mode
	let isPickingLocation = $state(false);

	const routeTypes: { value: RouteType; label: string }[] = [
		{ value: 'loop', label: 'Loop' },
		{ value: 'out_and_back', label: 'Out & Back' },
		{ value: 'no_preference', label: 'No Pref' }
	];

	onMount(() => {
		visitorToken = localStorage.getItem(`visitor_${ride.id}`);
	});

	// Watch for location updates from main map
	$effect(() => {
		if (startLocationFromMap) {
			startLocation = startLocationFromMap;
			isPickingLocation = false;
			sidebarCollapsed = false;
		}
	});

	function startLocationPicking() {
		isPickingLocation = true;
		sidebarCollapsed = true;
		onStartLocationPick?.();
	}


	async function searchPOI(category: string) {
		const query = searchQueries[category]?.trim();
		if (!query || !startLocation) return;

		searchingCategory = category;
		searchResults[category] = [];
		activeSearchCategory = category;

		// Clear candidates on main map
		onCandidatesChange?.([], null);

		try {
			const params = new URLSearchParams({
				q: query,
				lat: String(startLocation.lat),
				lng: String(startLocation.lng),
				limit: '5'
			});
			const response = await fetch(`/api/pois/search?${params}`);
			const data = await response.json();

			if (data.results) {
				searchResults[category] = data.results;
				// Notify parent of candidates for main map display
				const candidates: CandidatePOI[] = data.results.map((r: POISearchResult) => ({
					id: r.id,
					name: r.name,
					lat: r.lat,
					lng: r.lng,
					distance_km: r.distance_km
				}));
				onCandidatesChange?.(candidates, category);
			}
		} catch (err) {
			console.error('POI search error:', err);
		} finally {
			searchingCategory = null;
		}
	}

	function selectPOI(category: string, result: POISearchResult) {
		// Remove any existing POI for this category
		selectedPois = selectedPois.filter((p) => p.category !== category);

		// Add the new selection
		const poi: SelectedPOI = {
			id: result.id,
			name: result.name,
			category,
			lat: result.lat,
			lng: result.lng
		};
		selectedPois = [...selectedPois, poi];

		// Clear search results, query, and candidates on main map
		searchResults[category] = [];
		searchQueries[category] = '';
		activeSearchCategory = null;
		onCandidatesChange?.([], null);

	}

	// Called when a candidate is selected from the main map
	export function handleMapCandidateSelect(candidate: CandidatePOI) {
		if (!activeSearchCategory) return;

		const result: POISearchResult = {
			id: candidate.id,
			name: candidate.name,
			address: '',
			lat: candidate.lat,
			lng: candidate.lng,
			type: '',
			distance_km: candidate.distance_km
		};
		selectPOI(activeSearchCategory, result);

		// Expand sidebar back on mobile after selection
		sidebarCollapsed = false;
	}

	function removePOI(category: string) {
		selectedPois = selectedPois.filter((p) => p.category !== category);
	}

	function getSelectedPOI(category: string): SelectedPOI | undefined {
		return selectedPois.find((p) => p.category === category);
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
					selected_pois: selectedPois,
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

<aside class="sidebar" class:collapsed={sidebarCollapsed}>
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
			<!-- Start Location -->
			<div class="section">
				<div class="label-row">
					<span class="label">Start Location</span>
					{#if startLocation}
						<span class="label-value mono">{startLocation.lat.toFixed(4)}, {startLocation.lng.toFixed(4)}</span>
					{/if}
				</div>
				{#if startLocation}
					<button class="location-display" onclick={startLocationPicking}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
							<circle cx="12" cy="10" r="3" />
						</svg>
						<span>Location set</span>
						<span class="change-link">Change</span>
					</button>
				{:else}
					<button class="btn btn-location" onclick={startLocationPicking}>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
							<circle cx="12" cy="10" r="3" />
						</svg>
						Set Starting Point
					</button>
					<div class="location-hint">Tap to pick your start location on the map</div>
				{/if}
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

			<!-- POI Selection by Category -->
			{#if ride.categories && ride.categories.length > 0}
				<div class="section">
					<div class="label">Stops Along the Route</div>
					<p class="section-hint">Search and select places you'd like to visit</p>

					{#each ride.categories as category}
						{@const selected = getSelectedPOI(category)}
						<div class="poi-category">
							<div class="category-label">{category}</div>

							{#if selected}
								<div class="selected-poi">
									<span class="poi-name">{selected.name}</span>
									<button class="poi-remove" onclick={() => removePOI(category)}>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M18 6L6 18M6 6l12 12" />
										</svg>
									</button>
								</div>
							{:else}
								<div class="poi-search">
									<input
										type="text"
										class="input poi-input"
										placeholder="Search for {category.toLowerCase()}..."
										bind:value={searchQueries[category]}
										onkeydown={(e) => e.key === 'Enter' && searchPOI(category)}
										disabled={!startLocation}
									/>
									<button
										class="btn btn-secondary btn-sm"
										onclick={() => searchPOI(category)}
										disabled={!startLocation || searchingCategory === category}
									>
										{searchingCategory === category ? '...' : 'Search'}
									</button>
								</div>

								{#if !startLocation}
									<div class="poi-hint">Set your start location first</div>
								{/if}

								{#if searchResults[category]?.length > 0}
									<div class="search-results">
										{#each searchResults[category] as result, index}
											<button class="search-result" onclick={() => selectPOI(category, result)}>
												<span class="result-number">{index + 1}</span>
												<span class="result-name">{result.name}</span>
												{#if result.distance_km !== undefined}
													<span class="result-distance">{result.distance_km} km</span>
												{/if}
											</button>
										{/each}
									</div>
									<button class="btn btn-map-view" onclick={() => (sidebarCollapsed = true)}>
										<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
											<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
											<path d="M8 2v16" />
											<path d="M16 6v16" />
										</svg>
										View on Map
									</button>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			{/if}

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

<!-- Floating expand button when sidebar is collapsed (mobile) -->
{#if sidebarCollapsed && !isPickingLocation}
	<button class="expand-sidebar-btn" onclick={() => (sidebarCollapsed = false)}>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M4 6h16M4 12h16M4 18h16" />
		</svg>
		<span>Back to Form</span>
	</button>
{/if}

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

	/* Location Button */
	.btn-location {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: white;
		background: var(--accent);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.btn-location:hover {
		background: var(--accent-hover, #3d7a8a);
	}

	.location-hint {
		margin-top: 0.375rem;
		font-size: 0.6875rem;
		color: var(--text-muted);
		text-align: center;
	}

	.location-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.625rem 0.75rem;
		font-size: 0.8125rem;
		color: var(--text-primary);
		background: rgba(74, 157, 107, 0.1);
		border: 1px solid var(--success);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.location-display:hover {
		background: rgba(74, 157, 107, 0.15);
	}

	.location-display svg {
		color: var(--success);
		flex-shrink: 0;
	}

	.location-display span:first-of-type {
		flex: 1;
		text-align: left;
	}

	.change-link {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-decoration: underline;
		text-underline-offset: 2px;
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

	/* POI Selection */
	.section-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}

	.poi-category {
		margin-bottom: 0.75rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border);
	}

	.poi-category:last-child {
		margin-bottom: 0;
		padding-bottom: 0;
		border-bottom: none;
	}

	.category-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.375rem;
	}

	.poi-search {
		display: flex;
		gap: 0.375rem;
	}

	.poi-input {
		flex: 1;
		font-size: 0.8125rem;
	}

	.btn-sm {
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
	}

	.poi-hint {
		font-size: 0.6875rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.search-results {
		margin-top: 0.375rem;
		background: var(--surface-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	.search-result {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border);
		cursor: pointer;
		text-align: left;
		transition: background 0.15s ease;
	}

	.search-result:last-child {
		border-bottom: none;
	}

	.search-result:hover {
		background: var(--gray-100);
	}

	.result-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		background: var(--accent);
		color: white;
		font-size: 0.6875rem;
		font-weight: 600;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.result-name {
		flex: 1;
		font-size: 0.8125rem;
		color: var(--text-primary);
		text-align: left;
	}

	.result-distance {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.selected-poi {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.625rem;
		background: rgba(74, 157, 107, 0.1);
		border: 1px solid var(--success);
		border-radius: var(--radius-sm);
	}

	.poi-name {
		font-size: 0.8125rem;
		color: var(--text-primary);
	}

	.poi-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.125rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
	}

	.poi-remove:hover {
		color: var(--error);
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

	/* View on Map button */
	.btn-map-view {
		display: none;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		width: 100%;
		margin-top: 0.5rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--accent);
		background: rgba(74, 144, 164, 0.1);
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.btn-map-view:hover {
		background: rgba(74, 144, 164, 0.2);
	}

	/* Expand sidebar button */
	.expand-sidebar-btn {
		display: none;
		position: fixed;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: white;
		background: var(--accent);
		border: none;
		border-radius: var(--radius-md);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
		cursor: pointer;
		z-index: 100;
		transition: all 0.15s ease;
	}

	.expand-sidebar-btn:hover {
		background: var(--accent-hover, #3d7a8a);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
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
			border-radius: var(--radius-md) var(--radius-md) 0 0;
			transition: transform 0.3s ease;
		}

		.sidebar.collapsed {
			transform: translateY(100%);
		}

		.location-map {
			height: 120px;
		}

		.btn-map-view {
			display: flex;
		}

		.expand-sidebar-btn {
			display: flex;
		}
	}
</style>
