<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children?: Snippet;
		footer?: Snippet;
	}

	let { title, children, footer }: Props = $props();
</script>

<aside class="sidebar">
	<div class="sidebar-header">
		<a href="/" class="logo">
			<span class="logo-text">PEDALPARTY</span>
		</a>
		{#if title}
			<div class="sidebar-title">{title}</div>
		{/if}
	</div>

	<div class="sidebar-content">
		{#if children}
			{@render children()}
		{/if}
	</div>

	{#if footer}
		<div class="sidebar-footer">
			{@render footer()}
		</div>
	{/if}
</aside>

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
		overflow: hidden;
	}

	.sidebar-header {
		padding: 1rem;
		border-bottom: 1px solid var(--border);
	}

	.logo {
		display: block;
		text-decoration: none;
	}

	.logo-text {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.15em;
		color: var(--text-secondary);
	}

	.sidebar-title {
		margin-top: 0.75rem;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.sidebar-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}

	.sidebar-footer {
		padding: 1rem;
		border-top: 1px solid var(--border);
	}

	@media (max-width: 640px) {
		.sidebar {
			top: auto;
			left: 0;
			right: 0;
			bottom: 0;
			width: auto;
			max-height: 60vh;
			border-left: none;
			border-right: none;
			border-bottom: none;
		}
	}
</style>
