<script lang="ts">
	import type { PageData } from './$types';
	import OrganizerDashboard from './OrganizerDashboard.svelte';
	import PreferenceForm from './PreferenceForm.svelte';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.ride.name} - PedalParty</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
	<div class="container mx-auto px-4 py-8">
		<!-- Header -->
		<div class="text-center mb-8">
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

		<!-- Content based on role -->
		{#if data.isOrganizer}
			<OrganizerDashboard
				ride={data.ride}
				preferencesSummary={data.preferencesSummary}
				orgToken={data.orgToken}
			/>
		{:else}
			<PreferenceForm rideId={data.ride.id} />
		{/if}
	</div>
</div>
