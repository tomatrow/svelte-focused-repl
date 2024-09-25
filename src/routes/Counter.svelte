<script lang="ts">
	import { marked } from 'marked';

	let count: number = $state(0);

	function increment() {
		count += 1;
	}

	const html: string = $derived(marked.parse(`**Count**: _${count}_`));
</script>

<svelte:head>
	<link rel="stylesheet" href="https://unpkg.com/normalize.css" />
	<link rel="stylesheet" href="https://unpkg.com/magick.css" />
</svelte:head>

<main>
	<button onclick={increment}>
		{@html html}
	</button>
</main>

<style>
	button {
		margin: 2rem;
	}
</style>
