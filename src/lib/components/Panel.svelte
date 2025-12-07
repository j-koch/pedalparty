<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		position?: 'right' | 'bottom-right' | 'center';
		width?: string;
		children?: Snippet;
		onClose?: () => void;
	}

	let {
		position = 'right',
		width = '360px',
		children,
		onClose
	}: Props = $props();

	const positionClasses: Record<string, string> = {
		'right': 'panel-right',
		'bottom-right': 'panel-bottom-right',
		'center': 'panel-center'
	};
</script>

<div class="panel-container {positionClasses[position]}" style="--panel-width: {width}">
	<div class="panel-inner">
		{#if onClose}
			<button class="panel-close" onclick={onClose}>
				<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M18 6L6 18M6 6l12 12" />
				</svg>
			</button>
		{/if}
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.panel-container {
		position: absolute;
		background: var(--surface-overlay);
		backdrop-filter: blur(12px);
		border: 1px solid var(--border);
	}

	.panel-right {
		top: 1rem;
		right: 1rem;
		bottom: 1rem;
		width: var(--panel-width);
	}

	.panel-bottom-right {
		right: 1rem;
		bottom: 1rem;
		width: var(--panel-width);
		max-height: calc(100vh - 2rem);
	}

	.panel-center {
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: var(--panel-width);
		max-width: calc(100vw - 2rem);
		max-height: calc(100vh - 2rem);
	}

	.panel-inner {
		position: relative;
		height: 100%;
		overflow-y: auto;
	}

	.panel-close {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		padding: 0.25rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		z-index: 1;
	}

	.panel-close:hover {
		color: var(--text-primary);
	}

	@media (max-width: 640px) {
		.panel-right,
		.panel-bottom-right {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: auto;
			max-height: 70vh;
			border-left: none;
			border-right: none;
			border-bottom: none;
		}

		.panel-center {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			transform: none;
			width: auto;
			max-height: 80vh;
			border-left: none;
			border-right: none;
			border-bottom: none;
		}
	}
</style>
