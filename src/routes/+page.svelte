<script lang="ts" module>
	import { browser } from '$app/environment';

	async function createBundler() {
		const BundlerWorker = await import('./bundler.worker?worker');
		const bundlerWorker = new BundlerWorker.default();
		let uid = 0;
		const callbacks = new Map<number, (compiledSource: string) => void>();

		bundlerWorker.addEventListener('message', (event) => {
			const action = JSON.parse(event.data);

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

	function useDarkMode() {
		if (!browser) return { isDarkMode: false };
		const query = window.matchMedia('(prefers-color-scheme: dark)');

		let isDarkMode = $state(query.matches);

		$effect(() => {
			function onChange() {
				isDarkMode = query.matches;
			}
			query.addEventListener('change', onChange);

			return () => query.removeEventListener('change', onChange);
		});

		return {
			get isDarkMode() {
				return isDarkMode;
			}
		};
	}
</script>

<script lang="ts">
	import counterSource from './Counter.svelte?raw';
	import srcdoc from './srcdoc.html?raw';
	import { codemirror, withCodemirrorInstance } from '@neocodemirror/svelte';
	import { solarizedDark } from 'cm6-theme-solarized-dark';
	import { solarizedLight } from 'cm6-theme-solarized-light';

	const { isDarkMode } = $derived(useDarkMode());
	let bundler = $state<Awaited<ReturnType<typeof createBundler>>>();
	let iframe: HTMLIFrameElement;
	let lastScript = '';

	const cmInstance = withCodemirrorInstance();

	$effect(() => {
		createBundler().then((newBundler) => (bundler = newBundler));
	});

	$effect(() => {
		bundler?.compile($cmInstance.value ?? '').then((script) => {
			if (script === lastScript) return;
			iframe.contentWindow?.postMessage({ script }, '*');
			lastScript = script;
		});
	});
</script>

<section>
	<div
		class="codemirror-container"
		use:codemirror={{
			value: counterSource,
			setup: 'basic',
			lang: 'svelte',
			useTabs: true,
			tabSize: 4,
			langMap: {
				js: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
				css: () => import('@codemirror/lang-css').then((m) => m.css()),
				svelte: () => import('@replit/codemirror-lang-svelte').then((m) => m.svelte())
			},
			lintOptions: { delay: 200 },
			autocomplete: true,
			instanceStore: cmInstance,
			extensions: [isDarkMode ? solarizedDark : solarizedLight]
		}}
	></div>

	<iframe
		title="Result"
		bind:this={iframe}
		sandbox={[
			'allow-popups-to-escape-sandbox',
			'allow-scripts',
			'allow-popups',
			'allow-forms',
			'allow-pointer-lock',
			'allow-top-navigation',
			'allow-modals',
			'allow-same-origin'
		].join(' ')}
		srcdoc={browser ? srcdoc : ''}
	></iframe>
</section>

<style>
	:global body {
		margin: 0;
		height: 100vh;
	}

	section {
		margin: auto;
		display: flex;
		height: 100vh;
	}

	iframe {
		width: 50%;
		height: 100%;
		border: none;
		display: block;
	}

	.codemirror-container {
		position: relative;
		width: 50%;
		height: 100vh;
		border: none;
		line-height: 1.5;
		overflow: hidden;
	}

	@font-face {
		font-family: 'Fira Code';
		font-style: normal;
		font-display: swap;
		font-weight: 400;
		src:
			url(@fontsource/fira-code/files/fira-code-latin-400-normal.woff2) format('woff2'),
			url(@fontsource/fira-code/files/fira-code-latin-400-normal.woff) format('woff');
		unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304,
			U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF,
			U+FFFD;
	}

	.codemirror-container :global {
		* {
			font: 400 1rem / 1.7 'Fira Code';
		}

		.cm-editor {
			height: 100%;
		}
	}
</style>
