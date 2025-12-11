<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let MapLayout: typeof import('$lib/components/MapLayout.svelte').default | null = $state(null);
	let OrganizerView: typeof import('./OrganizerView.svelte').default | null = $state(null);
	let ParticipantView: typeof import('./ParticipantView.svelte').default | null = $state(null);

	// State for POI candidate markers on main map
	interface CandidatePOI {
		id: string;
		name: string;
		lat: number;
		lng: number;
		distance_km?: number;
	}
	let candidatePois = $state<CandidatePOI[]>([]);
	let activeCategory = $state<string | null>(null);
	let participantViewRef: { handleMapCandidateSelect: (candidate: CandidatePOI) => void } | null = null;

	function handleCandidatesChange(candidates: CandidatePOI[], category: string | null) {
		candidatePois = candidates;
		activeCategory = category;
	}

	function handleCandidateSelect(candidate: CandidatePOI) {
		participantViewRef?.handleMapCandidateSelect(candidate);
	}

	onMount(async () => {
		const [mapModule, orgModule, partModule] = await Promise.all([
			import('$lib/components/MapLayout.svelte'),
			import('./OrganizerView.svelte'),
			import('./ParticipantView.svelte')
		]);
		MapLayout = mapModule.default;
		OrganizerView = orgModule.default;
		ParticipantView = partModule.default;
	});
</script>

<svelte:head>
	<title>{data.ride.name} - PedalParty</title>
</svelte:head>

{#if MapLayout && OrganizerView && ParticipantView}
	<MapLayout
		candidatePois={!data.isOrganizer ? candidatePois : []}
		onCandidateSelect={handleCandidateSelect}
	>
		{#if data.isOrganizer}
			<OrganizerView
				ride={data.ride}
				preferencesSummary={data.preferencesSummary}
				orgToken={data.orgToken}
			/>
		{:else}
			<ParticipantView
				bind:this={participantViewRef}
				ride={data.ride}
				onCandidatesChange={handleCandidatesChange}
			/>
		{/if}
	</MapLayout>
{:else}
	<div class="loading">Loading...</div>
{/if}

<style>
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
</style>
