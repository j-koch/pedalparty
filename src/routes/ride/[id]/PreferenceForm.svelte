<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import type { Vibe, RouteType } from '$lib/database.types';

	interface Props {
		rideId: string;
	}

	let { rideId }: Props = $props();

	// Form state
	let startLocation = $state<{ lat: number; lng: number } | null>(null);
	let distanceKm = $state(30);
	let routeType = $state<RouteType>('no_preference');
	let selectedVibes = $state<Vibe[]>([]);

	let isSubmitting = $state(false);
	let isSubmitted = $state(false);
	let error = $state('');
	let visitorToken = $state<string | null>(null);
	let LocationPicker: typeof import('$lib/components/LocationPicker.svelte').default | null = $state(null);

	const vibeOptions: { value: Vibe; label: string; icon: string }[] = [
		{ value: 'coffee_shop', label: 'Coffee Stop', icon: '☕' },
		{ value: 'scenic_views', label: 'Scenic Views', icon: '🏔️' },
		{ value: 'low_traffic', label: 'Low Traffic', icon: '🚗' },
		{ value: 'gravel_ok', label: 'Gravel OK', icon: '🪨' },
		{ value: 'waterfront', label: 'Waterfront', icon: '🌊' },
		{ value: 'minimize_hills', label: 'Flat Route', icon: '➡️' },
		{ value: 'maximize_hills', label: 'Hilly Route', icon: '⛰️' }
	];

	onMount(async () => {
		// Check for existing submission
		visitorToken = localStorage.getItem(`visitor_${rideId}`);

		// Load LocationPicker dynamically to avoid SSR issues
		const module = await import('$lib/components/LocationPicker.svelte');
		LocationPicker = module.default;

		// Try to get user's location
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					startLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
				},
				() => {
					console.log('Geolocation not available');
				}
			);
		}
	});

	function toggleVibe(vibe: Vibe) {
		if (selectedVibes.includes(vibe)) {
			selectedVibes = selectedVibes.filter((v) => v !== vibe);
		} else {
			selectedVibes = [...selectedVibes, vibe];
		}
	}

	function handleLocationChange(lat: number, lng: number) {
		startLocation = { lat, lng };
	}

	async function handleSubmit() {
		error = '';

		if (!startLocation) {
			error = 'Please set your start location on the map';
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch(`/api/rides/${rideId}/preferences`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					start_location: startLocation,
					distance_preference_km: distanceKm,
					route_type: routeType,
					vibes: selectedVibes,
					visitor_token: visitorToken
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to submit preferences');
			}

			// Store visitor token for future updates
			localStorage.setItem(`visitor_${rideId}`, data.visitor_token);
			visitorToken = data.visitor_token;
			isSubmitted = true;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="max-w-md mx-auto">
	{#if isSubmitted}
		<!-- Success State -->
		<div class="bg-white rounded-2xl shadow-xl p-8 text-center">
			<div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
				</svg>
			</div>
			<h2 class="text-xl font-semibold text-gray-900 mb-2">Preferences Submitted!</h2>
			<p class="text-gray-600">
				The organizer will share the generated route when everyone has submitted their preferences.
			</p>
			<button
				onclick={() => (isSubmitted = false)}
				class="mt-6 text-emerald-600 hover:text-emerald-700 font-medium"
			>
				Update my preferences
			</button>
		</div>
	{:else}
		<!-- Preference Form -->
		<div class="bg-white rounded-2xl shadow-xl p-6">
			<h2 class="text-lg font-semibold text-gray-800 mb-6">Your Preferences</h2>

			<div class="space-y-6">
				<!-- Start Location Map -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-gray-700">Start Location</span>
						{#if startLocation}
							<span class="text-xs text-emerald-600">
								{startLocation.lat.toFixed(4)}, {startLocation.lng.toFixed(4)}
							</span>
						{/if}
					</div>
					{#if LocationPicker}
						<LocationPicker
							location={startLocation}
							onLocationChange={handleLocationChange}
						/>
					{:else}
						<div class="w-full h-[200px] bg-gray-100 rounded-lg flex items-center justify-center">
							<span class="text-gray-400">Loading map...</span>
						</div>
					{/if}
				</div>

				<!-- Distance -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<span class="text-sm font-medium text-gray-700">Preferred Distance</span>
						<span class="font-semibold text-emerald-600">{distanceKm} km</span>
					</div>
					<input
						type="range"
						min="10"
						max="150"
						step="5"
						bind:value={distanceKm}
						class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
					/>
					<div class="flex justify-between text-xs text-gray-400 mt-1">
						<span>10 km</span>
						<span>150 km</span>
					</div>
				</div>

				<!-- Route Type -->
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">Route Type</span>
					<div class="grid grid-cols-3 gap-2">
						{#each [
							{ value: 'loop', label: 'Loop' },
							{ value: 'out_and_back', label: 'Out & Back' },
							{ value: 'no_preference', label: 'No Pref' }
						] as option}
							<button
								type="button"
								onclick={() => (routeType = option.value as RouteType)}
								class="px-3 py-2 rounded-lg text-sm font-medium transition-colors {routeType === option.value
									? 'bg-emerald-600 text-white'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							>
								{option.label}
							</button>
						{/each}
					</div>
				</div>

				<!-- Vibes -->
				<div>
					<span class="block text-sm font-medium text-gray-700 mb-2">What sounds good?</span>
					<div class="grid grid-cols-2 gap-2">
						{#each vibeOptions as vibe}
							<button
								type="button"
								onclick={() => toggleVibe(vibe.value)}
								class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors {selectedVibes.includes(vibe.value)
									? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500'
									: 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
							>
								<span>{vibe.icon}</span>
								<span>{vibe.label}</span>
							</button>
						{/each}
					</div>
				</div>

				{#if error}
					<div class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
						{error}
					</div>
				{/if}

				<button
					type="button"
					onclick={handleSubmit}
					disabled={isSubmitting || !startLocation}
					class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
				>
					{#if isSubmitting}
						<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						Submitting...
					{:else}
						{visitorToken ? 'Update Preferences' : 'Submit Preferences'}
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>
