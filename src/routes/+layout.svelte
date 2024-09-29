<script lang="ts">
	import { pwaInfo } from 'virtual:pwa-info';
	import { pwaAssetsHead } from 'virtual:pwa-assets/head';

	const { children } = $props();

	const webManifest = pwaInfo?.webManifest?.linkTag ?? '';
</script>

<svelte:head>
	<!-- begin -->
	{#if pwaAssetsHead.themeColor}
		<meta name="theme-color" content={pwaAssetsHead.themeColor.content} />
	{/if}
	{#each pwaAssetsHead.links as link}
		<link {...link} />
	{/each}
	{@html webManifest}
	<!-- end -->
</svelte:head>

{@render children?.()}
