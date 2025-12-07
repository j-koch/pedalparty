<script lang="ts">
	import { goto } from '$app/navigation';

	let isCreating = $state(false);

	async function handleCreateRide() {
		isCreating = true;
		goto('/create');
	}
</script>

<svelte:head>
	<title>PedalParty - Plan Group Rides Together</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
	<div class="container mx-auto px-4 py-16">
		<!-- Hero Section -->
		<div class="text-center max-w-3xl mx-auto">
			<h1 class="text-5xl font-bold text-gray-900 mb-6">
				Plan Group Rides
				<span class="text-emerald-600">Together</span>
			</h1>

			<p class="text-xl text-gray-600 mb-8">
				Create a ride, share a link, and let everyone submit their preferences.
				We'll generate the perfect route that works for your whole group.
			</p>

			<button
				onclick={handleCreateRide}
				disabled={isCreating}
				class="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold text-lg px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
			>
				{#if isCreating}
					<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
					</svg>
					Creating...
				{:else}
					Create a Ride
				{/if}
			</button>
		</div>

		<!-- How It Works -->
		<div class="mt-24 max-w-4xl mx-auto">
			<h2 class="text-2xl font-bold text-center text-gray-800 mb-12">How It Works</h2>

			<div class="grid md:grid-cols-3 gap-8">
				<div class="text-center">
					<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span class="text-2xl font-bold text-emerald-600">1</span>
					</div>
					<h3 class="font-semibold text-gray-800 mb-2">Create a Ride</h3>
					<p class="text-gray-600">Give your ride a name and get a unique link to share with your group.</p>
				</div>

				<div class="text-center">
					<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span class="text-2xl font-bold text-emerald-600">2</span>
					</div>
					<h3 class="font-semibold text-gray-800 mb-2">Collect Preferences</h3>
					<p class="text-gray-600">Everyone submits their start location, distance, and ride preferences anonymously.</p>
				</div>

				<div class="text-center">
					<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span class="text-2xl font-bold text-emerald-600">3</span>
					</div>
					<h3 class="font-semibold text-gray-800 mb-2">Get Your Route</h3>
					<p class="text-gray-600">We generate optimized routes that balance everyone's preferences.</p>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="mt-24 text-center text-gray-500 text-sm">
			<p>No accounts needed. Free forever.</p>
		</div>
	</div>
</div>
