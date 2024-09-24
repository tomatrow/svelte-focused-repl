<script lang="ts">
	import { marked } from 'marked';

	let count = $state(0);

	function increment() {
		count += 1;
	}

	const html = $derived(marked.parse(`**Count**: _${count}_`));
</script>

<button onclick={increment}>
	{@html html}
</button>

<style>
	button {
		all: unset;
		color: red;
		border: 1px solid blue;
		border-radius: 1rem;
		padding: 0.5rem;
	}
</style>
