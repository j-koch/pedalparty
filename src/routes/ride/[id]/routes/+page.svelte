<script lang="ts">
	import type { PageData } from './$types';
	import Map from '$lib/components/Map.svelte';
	import type { GeneratedRoute } from '$lib/database.types';

	let { data }: { data: PageData } = $props();

	let selectedRouteId = $state<string | null>(null);

	const routes = data.routes as GeneratedRoute[];

	const vibeLabels: Record<string, string> = {
		coffee_shop: 'Coffee Stop',
		scenic_views: 'Scenic Views',
		low_traffic: 'Low Traffic',
		gravel_ok: 'Gravel OK',
		waterfront: 'Waterfront',
		minimize_hills: 'Flat Route',
		maximize_hills: 'Hilly Route'
	};

	const routeColors = ['#059669', '#0891b2', '#7c3aed'];

	function selectRoute(routeId: string) {
		selectedRouteId = selectedRouteId === routeId ? null : routeId;
	}

	const mapRoutes = $derived(
		routes.map((route, index) => ({
			id: route.id,
			name: route.name,
			geometry: route.geometry,
			color: routeColors[index % routeColors.length]
		}))
	);
</script>

<svelte:head>
	<title>Routes - {data.ride.name} - PedalParty</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="text-center mb-6">
			<a href="/" class="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
				PedalParty
			</a>
			<h1 class="text-3xl font-bold text-gray-900 mt-2">{data.ride.name}</h1>
			{#if data.ride.date_time}
				<p class="text-gray-600 mt-1">
					{new Date(data.ride.date_time).toLocaleDateString('en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit'
					})}
				</p>
			{/if}
		</div>

		<div class="grid lg:grid-cols-3 gap-6">
			<!-- Map -->
			<div class="lg:col-span-2">
				<div class="bg-white rounded-2xl shadow-xl overflow-hidden">
					<div class="h-[500px]">
						<Map routes={mapRoutes} {selectedRouteId} />
					</div>
				</div>
			</div>

			<!-- Route Cards -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold text-gray-800">Generated Routes</h2>

				{#each routes as route, index}
					{@const color = routeColors[index % routeColors.length]}
					<button
						onclick={() => selectRoute(route.id)}
						class="w-full text-left bg-white rounded-xl shadow-lg p-4 transition-all duration-200 hover:shadow-xl {selectedRouteId === route.id ? 'ring-2 ring-emerald-500' : ''}"
					>
						<div class="flex items-start gap-3">
							<div
								class="w-4 h-4 rounded-full mt-1 shrink-0"
								style="background-color: {color}"
							></div>
							<div class="flex-1 min-w-0">
								<h3 class="font-semibold text-gray-900">{route.name}</h3>

								<div class="flex gap-4 mt-2 text-sm text-gray-600">
									<span>{route.distance_km} km</span>
									{#if route.elevation_gain_m}
										<span>{route.elevation_gain_m}m gain</span>
									{/if}
								</div>

								{#if route.matched_vibes && route.matched_vibes.length > 0}
									<div class="flex flex-wrap gap-1 mt-2">
										{#each route.matched_vibes as vibe}
											<span class="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs">
												{vibeLabels[vibe] || vibe}
											</span>
										{/each}
									</div>
								{/if}

								{#if route.pois && route.pois.length > 0}
									<div class="mt-3 pt-3 border-t border-gray-100">
										<span class="text-xs text-gray-500 block mb-1">Points of Interest</span>
										<div class="space-y-1">
											{#each route.pois.slice(0, 3) as poi}
												<div class="text-sm text-gray-600 truncate">
													{poi.name}
												</div>
											{/each}
											{#if route.pois.length > 3}
												<div class="text-xs text-gray-400">
													+{route.pois.length - 3} more
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						</div>
					</button>
				{/each}

				<!-- Share Button -->
				<div class="pt-4">
					<button
						onclick={async () => {
							await navigator.clipboard.writeText(window.location.href);
							alert('Link copied!');
						}}
						class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
						</svg>
						Share Routes
					</button>
				</div>
			</div>
		</div>
	</div>
</div>
