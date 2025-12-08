<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let MapLayout: typeof import('$lib/components/MapLayout.svelte').default | null = $state(null);
	let showCreateModal = $state(false);
	let showSuccessModal = $state(false);
	let rideName = $state('');
	let rideDate = $state('');
	let isCreating = $state(false);
	let error = $state('');
	let createdRide = $state<{ pin: string; organizer_url: string; share_url: string } | null>(null);

	onMount(async () => {
		const module = await import('$lib/components/MapLayout.svelte');
		MapLayout = module.default;
	});

	async function createRide() {
		if (!rideName.trim()) {
			error = 'Enter a ride name';
			return;
		}

		isCreating = true;
		error = '';

		try {
			const response = await fetch('/api/rides', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: rideName.trim(),
					date: rideDate || null
				})
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to create ride');
			}

			localStorage.setItem(`organizer_${data.ride_id}`, data.organizer_token);
			createdRide = {
				pin: data.pin,
				organizer_url: data.organizer_url,
				share_url: data.share_url
			};
			showCreateModal = false;
			showSuccessModal = true;
			isCreating = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
			isCreating = false;
		}
	}

	function continueToRide() {
		if (createdRide) {
			goto(createdRide.organizer_url);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			showCreateModal = false;
		}
	}
</script>

<svelte:head>
	<title>PedalParty - Collaborative Route Planning</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if MapLayout}
	<MapLayout>
		<!-- Sidebar -->
		<aside class="sidebar">
			<div class="sidebar-header">
				<div class="logo">PEDALPARTY</div>
				<p class="tagline">Collaborative route planning for group rides</p>
			</div>

			<div class="sidebar-content">
				<button class="btn btn-primary w-full" onclick={() => (showCreateModal = true)}>
					+ New Ride
				</button>

				<div class="divider"></div>

				<div class="info-section">
					<h3 class="section-title">How it works</h3>
					<ol class="steps">
						<li>
							<span class="step-num">01</span>
							<span class="step-text">Create a ride and share the link</span>
						</li>
						<li>
							<span class="step-num">02</span>
							<span class="step-text">Participants submit their preferences</span>
						</li>
						<li>
							<span class="step-num">03</span>
							<span class="step-text">Generate optimized routes for everyone</span>
						</li>
					</ol>
				</div>
			</div>

			<div class="sidebar-footer">
				<span class="footer-text">No accounts. No cost. Just ride.</span>
			</div>
		</aside>

		<!-- Create Modal -->
		{#if showCreateModal}
			<div class="modal-overlay" onclick={() => (showCreateModal = false)}>
				<div class="modal" onclick={(e) => e.stopPropagation()}>
					<div class="modal-header">
						<h2>New Ride</h2>
						<button class="close-btn" onclick={() => (showCreateModal = false)}>
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M18 6L6 18M6 6l12 12" />
							</svg>
						</button>
					</div>

					<div class="modal-body">
						<div class="field">
							<label class="label" for="name">Ride Name</label>
							<input
								type="text"
								id="name"
								class="input"
								placeholder="Saturday Morning Ride"
								bind:value={rideName}
								disabled={isCreating}
							/>
						</div>

						<div class="field">
							<label class="label" for="date">Date <span class="optional">(optional)</span></label>
							<input
								type="date"
								id="date"
								class="input"
								bind:value={rideDate}
								disabled={isCreating}
							/>
						</div>

						{#if error}
							<div class="error-msg">{error}</div>
						{/if}
					</div>

					<div class="modal-footer">
						<button class="btn btn-secondary" onclick={() => (showCreateModal = false)} disabled={isCreating}>
							Cancel
						</button>
						<button class="btn btn-primary" onclick={createRide} disabled={isCreating}>
							{isCreating ? 'Creating...' : 'Create Ride'}
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Success Modal with PIN -->
		{#if showSuccessModal && createdRide}
			<div class="modal-overlay">
				<div class="modal success-modal">
					<div class="modal-body">
						<div class="success-icon">
							<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M20 6L9 17l-5-5" />
							</svg>
						</div>
						<h2 class="success-title">Ride Created!</h2>
						<p class="success-subtitle">Save your recovery PIN</p>

						<div class="pin-display">
							<span class="pin-value">{createdRide.pin}</span>
						</div>

						<p class="pin-note">
							Use this PIN to access your organizer dashboard if you lose the link.
						</p>
					</div>

					<div class="modal-footer">
						<button class="btn btn-primary w-full" onclick={continueToRide}>
							Continue to Dashboard
						</button>
					</div>
				</div>
			</div>
		{/if}
	</MapLayout>
{:else}
	<div class="loading">
		<span>Loading...</span>
	</div>
{/if}

<style>
	.sidebar {
		position: absolute;
		top: 1rem;
		left: 1rem;
		bottom: 1rem;
		width: 300px;
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
		color: var(--accent);
	}

	.tagline {
		margin-top: 0.5rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.sidebar-content {
		flex: 1;
		padding: 1.25rem;
		overflow-y: auto;
	}

	.w-full {
		width: 100%;
	}

	.info-section {
		margin-top: 0.5rem;
	}

	.section-title {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin-bottom: 1rem;
	}

	.steps {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.steps li {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 0.875rem;
	}

	.step-num {
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.6875rem;
		color: var(--text-muted);
	}

	.step-text {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.sidebar-footer {
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--border);
	}

	.footer-text {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	/* Modal */
	.modal-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}

	.modal {
		width: 100%;
		max-width: 400px;
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

	.field {
		margin-bottom: 1rem;
	}

	.field:last-child {
		margin-bottom: 0;
	}

	.optional {
		color: var(--text-muted);
		font-weight: 400;
		text-transform: none;
		letter-spacing: normal;
	}

	.error-msg {
		margin-top: 1rem;
		padding: 0.625rem 0.75rem;
		background: rgba(196, 92, 92, 0.1);
		border: 1px solid var(--error);
		border-radius: var(--radius-sm);
		color: var(--error);
		font-size: 0.8125rem;
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		padding: 1rem 1.25rem;
		border-top: 1px solid var(--border);
	}

	/* Success Modal */
	.success-modal {
		text-align: center;
	}

	.success-modal .modal-body {
		padding: 2rem 1.5rem 1.5rem;
	}

	.success-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 56px;
		height: 56px;
		background: rgba(74, 157, 107, 0.15);
		border-radius: 50%;
		color: var(--success);
		margin-bottom: 1rem;
	}

	.success-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-primary);
		margin-bottom: 0.25rem;
	}

	.success-subtitle {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin-bottom: 1.25rem;
	}

	.pin-display {
		background: var(--gray-100);
		border: 2px dashed var(--border);
		border-radius: var(--radius-sm);
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.pin-value {
		font-family: 'JetBrains Mono', monospace;
		font-size: 2rem;
		font-weight: 600;
		letter-spacing: 0.2em;
		color: var(--text-primary);
	}

	.pin-note {
		font-size: 0.75rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.success-modal .modal-footer {
		justify-content: center;
		border-top: none;
		padding-top: 0;
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
