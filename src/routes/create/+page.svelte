<script lang="ts">
	import { goto } from '$app/navigation';

	let name = $state('');
	let dateTime = $state('');
	let isSubmitting = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		error = '';

		if (!name.trim()) {
			error = 'Please enter a ride name';
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch('/api/rides', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: name.trim(),
					date_time: dateTime || null
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create ride');
			}

			// Store organizer token in localStorage
			localStorage.setItem(`organizer_${data.ride_id}`, data.organizer_token);

			// Redirect to the organizer dashboard
			goto(data.organizer_url);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create a Ride - PedalParty</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
	<div class="container mx-auto px-4 py-16">
		<div class="max-w-md mx-auto">
			<!-- Back link -->
			<a href="/" class="inline-flex items-center text-emerald-600 hover:text-emerald-700 mb-8">
				<svg class="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back
			</a>

			<!-- Form Card -->
			<div class="bg-white rounded-2xl shadow-xl p-8">
				<h1 class="text-2xl font-bold text-gray-900 mb-6">Create a Ride</h1>

				<form onsubmit={handleSubmit} class="space-y-6">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 mb-2">
							Ride Name
						</label>
						<input
							type="text"
							id="name"
							bind:value={name}
							placeholder="Saturday Morning Ride"
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
							disabled={isSubmitting}
						/>
					</div>

					<div>
						<label for="datetime" class="block text-sm font-medium text-gray-700 mb-2">
							Date & Time <span class="text-gray-400">(optional)</span>
						</label>
						<input
							type="datetime-local"
							id="datetime"
							bind:value={dateTime}
							class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
							disabled={isSubmitting}
						/>
					</div>

					{#if error}
						<div class="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
							{error}
						</div>
					{/if}

					<button
						type="submit"
						disabled={isSubmitting}
						class="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2"
					>
						{#if isSubmitting}
							<svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
							</svg>
							Creating...
						{:else}
							Create Ride
						{/if}
					</button>
				</form>
			</div>

			<p class="text-center text-gray-500 text-sm mt-6">
				You'll get a shareable link to send to your group.
			</p>
		</div>
	</div>
</div>
