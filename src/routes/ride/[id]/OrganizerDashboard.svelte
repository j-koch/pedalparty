<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	interface Props {
		ride: {
			id: string;
			name: string;
			status: string;
			generated_routes: unknown;
		};
		preferencesSummary: {
			count: number;
			avgDistance: number;
			vibeCounts: Record<string, number>;
			routeTypeCounts: Record<string, number>;
		} | null;
		orgToken: string | null;
	}

	let { ride, preferencesSummary, orgToken }: Props = $props();

	let copied = $state(false);
	let isGenerating = $state(false);
	let generateError = $state('');

	const shareUrl = $derived(`${$page.url.origin}/ride/${ride.id}`);
	const routesUrl = $derived(`${$page.url.origin}/ride/${ride.id}/routes`);
	const hasRoutes = $derived(ride.status === 'generated' && ride.generated_routes);

	const vibeLabels: Record<string, string> = {
		coffee_shop: 'Coffee Stop',
		scenic_views: 'Scenic Views',
		low_traffic: 'Low Traffic',
		gravel_ok: 'Gravel OK',
		waterfront: 'Waterfront',
		minimize_hills: 'Flat Route',
		maximize_hills: 'Hilly Route'
	};

	async function copyLink(url: string) {
		await navigator.clipboard.writeText(url);
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

			// Redirect to routes page
			goto(`/ride/${ride.id}/routes`);
		} catch (err) {
			generateError = err instanceof Error ? err.message : 'Something went wrong';
			isGenerating = false;
		}
	}
</script>

<div class="max-w-2xl mx-auto">
	<!-- Routes Generated Banner -->
	{#if hasRoutes}
		<div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
					<svg class="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<div class="flex-1">
					<h2 class="text-lg font-semibold text-emerald-800">Routes Generated!</h2>
					<p class="text-emerald-700 text-sm mt-1">
						Your routes are ready. Share the link below with your group.
					</p>
					<div class="flex flex-col sm:flex-row gap-3 mt-4">
						<a
							href="/ride/{ride.id}/routes"
							class="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
							</svg>
							View Routes
						</a>
						<button
							onclick={() => copyLink(routesUrl)}
							class="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-emerald-700 font-semibold py-2 px-4 rounded-lg border border-emerald-300 transition-colors"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
							</svg>
							{copied ? 'Copied!' : 'Copy Routes Link'}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Share Card -->
	<div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-800 mb-4">Share with your group</h2>

		<div class="flex gap-2">
			<input
				type="text"
				value={shareUrl}
				readonly
				class="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-sm"
			/>
			<button
				onclick={() => copyLink(shareUrl)}
				class="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
			>
				{#if copied}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
					Copied!
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
					</svg>
					Copy
				{/if}
			</button>
		</div>
	</div>

	<!-- Preferences Summary -->
	<div class="bg-white rounded-2xl shadow-xl p-6 mb-6">
		<h2 class="text-lg font-semibold text-gray-800 mb-4">Preferences</h2>

		{#if !preferencesSummary}
			<div class="text-center py-8">
				<div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
					</svg>
				</div>
				<p class="text-gray-500">No preferences submitted yet</p>
				<p class="text-gray-400 text-sm mt-1">Share the link above with your group</p>
			</div>
		{:else}
			<div class="space-y-4">
				<!-- Participant count -->
				<div class="flex items-center justify-between py-3 border-b border-gray-100">
					<span class="text-gray-600">Participants</span>
					<span class="font-semibold text-gray-900">{preferencesSummary.count}</span>
				</div>

				<!-- Average distance -->
				<div class="flex items-center justify-between py-3 border-b border-gray-100">
					<span class="text-gray-600">Average Distance</span>
					<span class="font-semibold text-gray-900">{preferencesSummary.avgDistance} km</span>
				</div>

				<!-- Route type preferences -->
				{#if Object.keys(preferencesSummary.routeTypeCounts).length > 0}
					<div class="py-3 border-b border-gray-100">
						<span class="text-gray-600 block mb-2">Route Type</span>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(preferencesSummary.routeTypeCounts) as [type, count]}
								<span class="px-3 py-1 bg-gray-100 rounded-full text-sm">
									{type.replace('_', ' ')} ({count})
								</span>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Vibe preferences -->
				{#if Object.keys(preferencesSummary.vibeCounts).length > 0}
					<div class="py-3">
						<span class="text-gray-600 block mb-2">Desired Features</span>
						<div class="flex flex-wrap gap-2">
							{#each Object.entries(preferencesSummary.vibeCounts).sort((a, b) => b[1] - a[1]) as [vibe, count]}
								<span class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">
									{vibeLabels[vibe] || vibe} ({count})
								</span>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Generate Routes Button -->
	{#if preferencesSummary && preferencesSummary.count > 0 && !hasRoutes}
		{#if generateError}
			<div class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
				{generateError}
			</div>
		{/if}

		<button
			onclick={generateRoutes}
			disabled={isGenerating}
			class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
		>
			{#if isGenerating}
				<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
				</svg>
				Generating Routes...
			{:else}
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
				</svg>
				Generate Routes
			{/if}
		</button>
	{/if}

	<!-- Regenerate option if routes exist -->
	{#if hasRoutes && preferencesSummary}
		<div class="text-center mt-4">
			<button
				onclick={generateRoutes}
				disabled={isGenerating}
				class="text-gray-500 hover:text-gray-700 text-sm font-medium"
			>
				{isGenerating ? 'Regenerating...' : 'Regenerate routes with new preferences'}
			</button>
		</div>
	{/if}
</div>
