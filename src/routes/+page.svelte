<script lang="ts" module>
	import { browser } from '$app/environment';
	import { replaceState } from '$app/navigation';
	import { compress_and_encode_text, decode_and_decompress_text } from './gzip';

	async function loadSourceFromHash() {
		if (!browser) return;
		const hash = location.hash.slice(1);
		if (!hash) return;

		try {
			const data = await decode_and_decompress_text(hash);
			return JSON.parse(data).files.find((file: any) => file.name === 'App').source as string;
		} catch {
			return;
		}
	}

	async function onSourceChange(source: string) {
		replaceState(
			`${location.pathname}${location.search}#${await compress_and_encode_text(
				JSON.stringify({ files: [{ name: 'App', type: 'svelte', source }] })
			)}`,
			{}
		);
	}
</script>

<script lang="ts">
	import counterSource from './Counter.svelte?raw';
	import Repl from './Repl.svelte';
</script>

{#await loadSourceFromHash() then source}
	<Repl source={source ?? counterSource} onChange={onSourceChange} />
{/await}

<style>
	:global body {
		margin: 0;
		height: 100vh;
	}
</style>
