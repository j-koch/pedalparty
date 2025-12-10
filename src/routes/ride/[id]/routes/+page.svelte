<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { GeneratedRoute, SelectedPOI } from '$lib/database.types';

	let { data }: { data: PageData } = $props();

	let MapLayout: typeof import('$lib/components/MapLayout.svelte').default | null = $state(null);
	let selectedRouteId = $state<string | null>(null);
	let copied = $state(false);

	const routes = data.routes as GeneratedRoute[];
	const routeColors = ['#d4a574', '#5c8dc4', '#4a9d6b'];

	onMount(async () => {
		const module = await import('$lib/components/MapLayout.svelte');
		MapLayout = module.default;
	});

	const mapRoutes = $derived(
		routes.map((route, index) => ({
			id: route.id,
			name: route.name,
			geometry: route.geometry,
			color: routeColors[index % routeColors.length]
		}))
	);

	// Collect all waypoints from routes for map display
	const allWaypoints = $derived.by(() => {
		const waypoints: { name: string; category: string; lat: number; lng: number }[] = [];

		for (const route of routes) {
			if (route.waypoints) {
				for (const wp of route.waypoints) {
					waypoints.push(wp);
				}
			}
		}

		return waypoints;
	});

	function selectRoute(id: string) {
		selectedRouteId = selectedRouteId === id ? null : id;
	}

	async function copyLink() {
		await navigator.clipboard.writeText(window.location.href);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function getRouteWaypoints(route: GeneratedRoute): SelectedPOI[] {
		return route.waypoints || [];
	}
</script>

<svelte:head>
	<title>Routes - {data.ride.name} - PedalParty</title>
</svelte:head>

{#if MapLayout}
	<MapLayout routes={mapRoutes} waypoints={allWaypoints} {selectedRouteId}>
		<aside class="sidebar">
			<div class="sidebar-header">
				<a href="/" class="logo">PEDALPARTY</a>
				<h1 class="ride-name">{data.ride.name}</h1>
				{#if data.ride.date}
					<div class="ride-date mono">
						{new Date(data.ride.date).toLocaleDateString('en-US', {
							weekday: 'short',
							month: 'short',
							day: 'numeric'
						})}
					</div>
				{/if}
			</div>

			<div class="sidebar-content">
				<div class="label">Routes</div>

				<div class="route-list">
					{#each routes as route, index}
						{@const color = routeColors[index % routeColors.length]}
						{@const isSelected = selectedRouteId === route.id}
						{@const waypoints = getRouteWaypoints(route)}
						<button
							class="route-card"
							class:selected={isSelected}
							onclick={() => selectRoute(route.id)}
						>
							<div class="route-header">
								<div class="route-color" style="background: {color}"></div>
								<div class="route-info">
									<div class="route-name">{route.name}</div>
									<div class="route-stats mono">
										{route.distance_km} km
										{#if route.elevation_gain_m}
											<span class="stat-sep">·</span>
											{route.elevation_gain_m}m
										{/if}
									</div>
								</div>
							</div>

							{#if waypoints.length > 0}
								<div class="route-waypoints">
									<div class="waypoints-label">Stops</div>
									<div class="waypoints-list">
										{#each waypoints as wp, i}
											<div class="waypoint-item">
												<span class="waypoint-num">{i + 1}</span>
												<div class="waypoint-info">
													<span class="waypoint-name">{wp.name}</span>
													<span class="waypoint-category">{wp.category}</span>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</button>
					{/each}
				</div>
			</div>

			<div class="sidebar-footer">
				<button class="btn btn-primary w-full" onclick={copyLink}>
					{copied ? 'Link Copied' : 'Share Routes'}
				</button>
			</div>
		</aside>
	</MapLayout>
{:else}
	<div class="loading">Loading...</div>
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

	.route-list {
		margin-top: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.route-card {
		width: 100%;
		text-align: left;
		padding: 0.875rem;
		background: var(--surface-secondary);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.route-card:hover {
		border-color: var(--gray-400);
		background: var(--gray-50);
	}

	.route-card.selected {
		border-color: var(--accent);
	}

	.route-header {
		display: flex;
		gap: 0.75rem;
		align-items: flex-start;
	}

	.route-color {
		width: 4px;
		height: 32px;
		flex-shrink: 0;
	}

	.route-info {
		flex: 1;
		min-width: 0;
	}

	.route-name {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-primary);
	}

	.route-stats {
		margin-top: 0.25rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.stat-sep {
		margin: 0 0.25rem;
		color: var(--text-muted);
	}

	.route-waypoints {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		padding-left: calc(4px + 0.75rem);
		border-top: 1px solid var(--border-subtle);
	}

	.waypoints-label {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}

	.waypoints-list {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.waypoint-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.waypoint-num {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.625rem;
		font-weight: 600;
		color: white;
		background: var(--success);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.waypoint-info {
		flex: 1;
		min-width: 0;
	}

	.waypoint-name {
		font-size: 0.8125rem;
		color: var(--text-primary);
		display: block;
	}

	.waypoint-category {
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.sidebar-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--border);
	}

	.w-full {
		width: 100%;
	}

	.loading {
		position: fixed;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--surface-primary);
		color: var(--text-muted);
		font-size: 0.8125rem;
	}

	@media (max-width: 640px) {
		.sidebar {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: auto;
			max-height: 50vh;
			border-left: none;
			border-right: none;
			border-bottom: none;
		}
	}
</style>
