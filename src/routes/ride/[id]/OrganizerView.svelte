<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { SelectedPOI } from '$lib/database.types';

	interface POISuggestion {
		poi: { id: string; name: string; lat: number; lng: number };
		count: number;
	}

	interface CandidatePOI {
		id: string;
		name: string;
		lat: number;
		lng: number;
	}

	interface SelectedPOIMarker {
		id: string;
		name: string;
		category: string;
		lat: number;
		lng: number;
	}

	interface Props {
		ride: {
			id: string;
			name: string;
			date: string | null;
			status: string;
			categories: string[];
			generated_routes: unknown;
		};
		preferencesSummary: {
			count: number;
			avgDistance: number;
			poiByCategory: Record<string, POISuggestion[]>;
			routeTypeCounts: Record<string, number>;
		} | null;
		orgToken: string | null;
		onCandidatesChange?: (candidates: CandidatePOI[], category: string | null) => void;
		onSelectedPoisChange?: (pois: SelectedPOIMarker[]) => void;
	}

	let { ride, preferencesSummary, orgToken, onCandidatesChange, onSelectedPoisChange }: Props = $props();

	let copied = $state(false);
	let isGenerating = $state(false);
	let generateError = $state('');
	let selectedWaypoints = $state<SelectedPOI[]>([]);
	let isSavingWaypoints = $state(false);
	let activeCategory = $state<string | null>(null);
	let sidebarCollapsed = $state(false);

	const shareUrl = $derived(`${$page.url.origin}/ride/${ride.id}`);
	const hasRoutes = $derived(ride.status === 'generated' && ride.generated_routes);
	const hasPoiSuggestions = $derived(
		preferencesSummary?.poiByCategory && Object.keys(preferencesSummary.poiByCategory).length > 0
	);

	function selectWaypoint(category: string, poi: POISuggestion['poi']) {
		// Remove any existing selection for this category
		selectedWaypoints = selectedWaypoints.filter((w) => w.category !== category);

		// Add new selection
		selectedWaypoints = [
			...selectedWaypoints,
			{
				id: poi.id,
				name: poi.name,
				category,
				lat: poi.lat,
				lng: poi.lng
			}
		];

		// Clear candidates from map
		hideCategoryFromMap();
	}

	function deselectWaypoint(category: string) {
		selectedWaypoints = selectedWaypoints.filter((w) => w.category !== category);
	}

	function getSelectedWaypoint(category: string): SelectedPOI | undefined {
		return selectedWaypoints.find((w) => w.category === category);
	}

	function showCategoryOnMap(category: string) {
		const suggestions = preferencesSummary?.poiByCategory[category];
		if (!suggestions) return;

		activeCategory = category;
		const candidates: CandidatePOI[] = suggestions.map((s) => ({
			id: s.poi.id,
			name: s.poi.name,
			lat: s.poi.lat,
			lng: s.poi.lng
		}));
		onCandidatesChange?.(candidates, category);
	}

	function hideCategoryFromMap() {
		activeCategory = null;
		onCandidatesChange?.([], null);
	}

	// Called when a candidate is selected from the main map
	export function handleMapCandidateSelect(candidate: CandidatePOI) {
		if (!activeCategory) return;

		selectWaypoint(activeCategory, {
			id: candidate.id,
			name: candidate.name,
			lat: candidate.lat,
			lng: candidate.lng
		});
		hideCategoryFromMap();
		sidebarCollapsed = false;
	}

	async function saveWaypoints() {
		isSavingWaypoints = true;
		try {
			const response = await fetch(`/api/rides/${ride.id}/waypoints?token=${orgToken}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ waypoints: selectedWaypoints })
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save waypoints');
			}
		} catch (err) {
			console.error('Failed to save waypoints:', err);
		} finally {
			isSavingWaypoints = false;
		}
	}

	async function copyLink() {
		await navigator.clipboard.writeText(shareUrl);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	async function generateRoutes() {
		isGenerating = true;
		generateError = '';

		try {
			const response = await fetch(`/api/rides/${ride.id}/generate?token=${orgToken}`, {
				method: 'POST'
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to generate routes');
			}

			goto(`/ride/${ride.id}/routes`);
		} catch (err) {
			generateError = err instanceof Error ? err.message : 'Something went wrong';
			isGenerating = false;
		}
	}

	// Notify parent when selected waypoints change
	$effect(() => {
		const pois = selectedWaypoints.map(w => ({
			id: w.id,
			name: w.name,
			category: w.category,
			lat: w.lat,
			lng: w.lng
		}));
		onSelectedPoisChange?.(pois);
	});
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
	</div>

	<div class="sidebar-content">
		<!-- Routes Generated -->
		{#if hasRoutes}
			<div class="success-banner">
				<span class="success-text">Routes generated</span>
				<a href="/ride/{ride.id}/routes" class="btn btn-primary">View Routes</a>
			</div>
			<div class="divider"></div>
		{/if}

		<!-- Share Link -->
		<div class="section">
			<div class="label">Share Link</div>
			<div class="share-row">
				<input type="text" class="input mono" value={shareUrl} readonly />
				<button class="btn btn-secondary" onclick={copyLink}>
					{copied ? 'Copied' : 'Copy'}
				</button>
			</div>
		</div>

		<div class="divider"></div>

		<!-- Preferences -->
		<div class="section">
			<div class="label">Preferences</div>

			{#if !preferencesSummary}
				<div class="empty-state">
					<span class="empty-text">No submissions yet</span>
				</div>
			{:else}
				<div class="stats">
					<div class="stat-row">
						<span class="stat-label">Participants</span>
						<span class="stat-value mono">{preferencesSummary.count}</span>
					</div>
					<div class="stat-row">
						<span class="stat-label">Avg Distance</span>
						<span class="stat-value mono">{preferencesSummary.avgDistance} km</span>
					</div>
				</div>

				{#if Object.keys(preferencesSummary.routeTypeCounts).length > 0}
					<div class="chips-section">
						<div class="chips-label">Route Type</div>
						<div class="chips">
							{#each Object.entries(preferencesSummary.routeTypeCounts) as [type, count]}
								<span class="chip">{type.replace('_', ' ')} ({count})</span>
							{/each}
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<!-- POI Suggestions -->
		{#if hasPoiSuggestions}
			<div class="divider"></div>
			<div class="section">
				<div class="label">Route Stops</div>
				<p class="section-hint">Select places to include in the route</p>

				{#each Object.entries(preferencesSummary?.poiByCategory || {}) as [category, suggestions]}
					{@const selected = getSelectedWaypoint(category)}
					<div class="poi-category">
						<div class="category-label">{category}</div>

						{#if selected}
							<div class="selected-waypoint">
								<span class="waypoint-name">{selected.name}</span>
								<button class="waypoint-remove" onclick={() => deselectWaypoint(category)} aria-label="Remove selection">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M18 6L6 18M6 6l12 12" />
									</svg>
								</button>
							</div>
						{:else}
							<div class="poi-suggestions">
								{#each suggestions as { poi, count }, index}
									<button class="poi-suggestion" onclick={() => selectWaypoint(category, poi)}>
										<span class="suggestion-number">{index + 1}</span>
										<span class="suggestion-name">{poi.name}</span>
										<span class="suggestion-votes">{count} vote{count !== 1 ? 's' : ''}</span>
									</button>
								{/each}
							</div>
							<button
								class="btn btn-map-view"
								onclick={() => { showCategoryOnMap(category); if (window.innerWidth <= 640) sidebarCollapsed = true; }}
							>
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z" />
									<path d="M8 2v16" />
									<path d="M16 6v16" />
								</svg>
								View on Map
							</button>
						{/if}
					</div>
				{/each}

				{#if selectedWaypoints.length > 0}
					<button
						class="btn btn-secondary btn-sm save-btn"
						onclick={saveWaypoints}
						disabled={isSavingWaypoints}
					>
						{isSavingWaypoints ? 'Saving...' : 'Save Selections'}
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<div class="sidebar-footer">
		{#if generateError}
			<div class="error-msg">{generateError}</div>
		{/if}

		{#if preferencesSummary && preferencesSummary.count > 0}
			<button
				class="btn btn-primary w-full"
				onclick={generateRoutes}
				disabled={isGenerating}
			>
				{#if isGenerating}
					Generating...
				{:else if hasRoutes}
					Regenerate Routes
				{:else}
					Generate Routes
				{/if}
			</button>
		{/if}
	</div>
</aside>

<!-- Floating expand button when sidebar is collapsed (mobile) -->
{#if sidebarCollapsed && activeCategory}
	<button class="expand-sidebar-btn" onclick={() => { sidebarCollapsed = false; hideCategoryFromMap(); }}>
		<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path d="M4 6h16M4 12h16M4 18h16" />
		</svg>
		<span>Back to Form</span>
	</button>
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

	.logo:hover {
		color: var(--text-secondary);
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
		margin-bottom: 0.5rem;
	}

	.share-row {
		display: flex;
		gap: 0.5rem;
	}

	.share-row .input {
		flex: 1;
		font-size: 0.75rem;
	}

	.success-banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem;
		background: rgba(74, 157, 107, 0.1);
		border: 1px solid var(--success);
		border-radius: var(--radius-sm);
	}

	.success-text {
		font-size: 0.8125rem;
		color: var(--success);
	}

	.empty-state {
		padding: 1.5rem 0;
		text-align: center;
	}

	.empty-text {
		font-size: 0.8125rem;
		color: var(--text-muted);
	}

	.stats {
		margin-top: 0.5rem;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border-subtle);
	}

	.stat-label {
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.stat-value {
		font-size: 0.8125rem;
		color: var(--text-primary);
	}

	.chips-section {
		margin-top: 1rem;
	}

	.chips-label {
		font-size: 0.6875rem;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.5rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
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

	/* POI Selection Styles */
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

	.poi-category:last-of-type {
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

	.poi-suggestions {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.poi-suggestion {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.625rem;
		background: var(--surface-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		transition: all 0.15s ease;
	}

	.poi-suggestion:hover {
		background: var(--gray-100);
		border-color: var(--accent);
	}

	.suggestion-name {
		flex: 1;
		font-size: 0.8125rem;
		color: var(--text-primary);
		text-align: left;
	}

	.suggestion-votes {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.selected-waypoint {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 0.625rem;
		background: rgba(74, 157, 107, 0.1);
		border: 1px solid var(--success);
		border-radius: var(--radius-sm);
	}

	.waypoint-name {
		font-size: 0.8125rem;
		color: var(--text-primary);
	}

	.waypoint-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.125rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
	}

	.waypoint-remove:hover {
		color: var(--error);
	}

	.btn-sm {
		padding: 0.375rem 0.625rem;
		font-size: 0.75rem;
	}

	.save-btn {
		margin-top: 0.75rem;
		width: 100%;
	}

	.suggestion-number {
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

	/* View on Map button */
	.btn-map-view {
		display: flex;
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
			max-height: 60vh;
			border-left: none;
			border-right: none;
			border-bottom: none;
			border-radius: var(--radius-md) var(--radius-md) 0 0;
			transition: transform 0.3s ease;
		}

		.sidebar.collapsed {
			transform: translateY(100%);
		}

		.btn-map-view {
			display: flex;
		}

		.expand-sidebar-btn {
			display: flex;
		}
	}
</style>
