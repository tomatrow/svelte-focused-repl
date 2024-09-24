<script lang="ts" module>
	async function createBundler() {
		const BundlerWorker = await import('./bundler.worker?worker');
		const bundlerWorker = new BundlerWorker.default();
		let uid = 0;
		const callbacks = new Map<number, (compiledSource: string) => void>();

		bundlerWorker.addEventListener('message', (event) => {
			const action = JSON.parse(event.data);
			// console.log('[bundlerWorker.message]', action);

			if (action.type === 'compile') {
				const { uid, code } = action;
				const callback = callbacks.get(uid);
				callback?.(code);
				callbacks.delete(uid);
			}
		});

		bundlerWorker.addEventListener('messageerror', (event) => {
			console.log('[bundlerWorker.messageerror]', event);
		});

		return {
			compile(source: string) {
				return new Promise<string>((resolve) => {
					callbacks.set(uid, resolve);

					bundlerWorker.postMessage(
						JSON.stringify({
							type: 'compile',
							uid,
							source
						})
					);

					uid++;
				});
			}
		};
	}
</script>

<script lang="ts">
	import counterSource from './Counter.svelte?raw';
	import { codemirror, withCodemirrorInstance } from '@neocodemirror/svelte';
	import type { Component, mount as SvelteMount, unmount as SvelteUnmount } from 'svelte';

	let bundler = $state<Awaited<ReturnType<typeof createBundler>>>();
	let output = $state<string>();
	let target: HTMLElement;

	const cmInstance = withCodemirrorInstance();

	$effect(() => {
		createBundler().then((newBundler) => (bundler = newBundler));
	});

	$effect(() => {
		if (!bundler) return;

		bundler.compile($cmInstance.value ?? '').then((newOutput) => (output = newOutput));
	});

	$effect(() => {
		if (!output) return;
		try {
			const {
				App,
				mount,
				unmount
			}: {
				App: Component;
				mount: typeof SvelteMount;
				unmount: typeof SvelteUnmount;
			} = (0, eval)(output);

			const app = mount(App, { target });

			return () => {
				unmount(app);
			};
		} catch (error) {
			console.error(error);
		}
	});
</script>

<section>
	<div
		use:codemirror={{
			value: counterSource,
			setup: 'minimal',
			useTabs: true,
			tabSize: 4,
			langMap: {
				js: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
				css: () => import('@codemirror/lang-css').then((m) => m.css()),
				svelte: () => import('@replit/codemirror-lang-svelte').then((m) => m.svelte())
			},
			// lint: diagnostics,
			lintOptions: { delay: 200 },
			autocomplete: true,
			instanceStore: cmInstance
		}}
	></div>
	<details>
		<pre>{output}</pre>
	</details>
	<div bind:this={target}></div>
</section>

<style>
	section {
		margin: auto;

		pre {
			width: 100%;
		}
	}
</style>
