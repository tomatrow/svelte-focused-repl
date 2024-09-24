import type { Plugin } from '@rollup/browser';
import { compile } from 'svelte/compiler';
import { rollup } from '@rollup/browser';

const FETCH_CACHE = new Map<string, Promise<{ url: string; body: string }>>();

async function fetch_if_uncached(url: string) {
	if (FETCH_CACHE.has(url)) {
		return FETCH_CACHE.get(url);
	}

	const promise = fetch(url)
		.then(async (r) => {
			if (!r.ok) throw new Error(await r.text());

			return {
				url: r.url,
				body: await r.text()
			};
		})
		.catch((err) => {
			FETCH_CACHE.delete(url);
			throw err;
		});

	FETCH_CACHE.set(url, promise);
	return promise;
}

async function follow_redirects(url: string) {
	const res = await fetch_if_uncached(url);
	return res?.url;
}

function loader(source: string): Plugin {
	return {
		name: 'loader',
		async resolveId(importee, importer) {
			if (importee === 'esm-env') return importee;

			if (importee === './__entry.js') {
				return importee;
			}

			if (importee === './App.svelte') {
				return importee;
			}

			if (importee.startsWith('svelte')) {
				let subpath = importee.slice(7);
				if (!subpath) subpath = 'index-client.js';
				const url = `https://unpkg.com/svelte@next/src/${subpath}`;
				return await follow_redirects(url);
			}

			// relative import in an external file
			if (importee.startsWith('.') && importer) {
				if (!URL.canParse(importer)) throw new Error('Non URL importer');

				const url = new URL(importee, importer).href;

				return await follow_redirects(url);
			}

			console.log('not resolved', {
				importee,
				importer
			});
		},

		async load(resolved) {
			if (resolved === 'esm-env') {
				return `export const BROWSER = true; export const DEV = true`;
			}

			if (resolved == './App.svelte') {
				const result = compile(source, { css: 'injected' });

				return result.js.code;
			}

			if (resolved === './__entry.js') {
				return `
					export { mount, unmount, untrack } from "svelte"
					export { default as App } from "./App.svelte"
				`;
			}

			const res = await fetch_if_uncached(resolved);
			return res?.body;
		}
	};
}

async function compileSvelteCode(source: string) {
	const bundle = await rollup({
		input: './__entry.js',
		plugins: [loader(source)],
		output: { inlineDynamicImports: true },
		onwarn() {}
	});

	const { output } = await bundle.generate({ format: 'iife' });

	return output[0].code;
}

onmessage = async (event) => {
	const action = JSON.parse(event.data);

	switch (action.type) {
		case 'compile': {
			try {
				postMessage(
					JSON.stringify({
						type: action.type,
						uid: action.uid,
						code: await compileSvelteCode(action.source)
					})
				);
			} catch (error) {
				console.error({ error });
			}
		}
	}
};
