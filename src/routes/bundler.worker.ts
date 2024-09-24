import type { Plugin } from '@rollup/browser';
import { compile } from 'svelte/compiler';
import { rollup } from '@rollup/browser';
import * as resolve from 'resolve.exports';

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

			// relative import in an external file
			if (importee.startsWith('.') && importer) {
				if (!URL.canParse(importer)) throw new Error('Non URL importer');

				const url = new URL(importee, importer).href;
				const resolvedUrl = await follow_redirects(url);
				return resolvedUrl;
			}

			// svelte import
			if (importee.startsWith('svelte')) {
				let subpath = importee.slice(7);
				if (!subpath) subpath = '/index-client.js';
				if (subpath === 'store') {
					subpath = 'store/index-client.js';
				}

				const url = `https://unpkg.com/svelte@next/src/${subpath}`;
				const resolvedUrl = await follow_redirects(url);
				return resolvedUrl;
			}

			// import of an external package
			const match = /^((?:@[^/]+\/)?[^/]+)(\/.+)?$/.exec(importee);
			if (!match) throw new Error(`Invalid import "${importee}"`);

			try {
				const subpath = `.${match[2] ?? ''}`;

				const pkg_url = await follow_redirects(`https://unpkg.com/${importee}/package.json`);
				if (!pkg_url) throw new Error();

				const pkg_json = (await fetch_if_uncached(pkg_url))?.body;
				const pkg = JSON.parse(pkg_json ?? '""');
				const pkg_url_base = pkg_url.replace(/\/package\.json$/, '');

				const [resolved_id] =
					resolve.exports(pkg, subpath, {
						browser: true,
						conditions: ['svelte', 'production']
					}) ?? [];

				return new URL((resolved_id ?? '') + '', `${pkg_url_base}/`).href;
			} catch {}

			throw new Error('No resolution: ' + JSON.stringify({ importee, importer }));
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
