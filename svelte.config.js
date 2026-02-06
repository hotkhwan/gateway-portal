// svelte.config.js
import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const rawBase = process.env.PUBLIC_APP_BASE_URL || ''
const base = rawBase === '/' ? '' : rawBase.replace(/\/+$/, '')

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		alias: {
			$paraglide: 'src/paraglide'
		},
		adapter: adapter({
			fallback: 'index.html'
		}),
		paths: {
			base
		},
		prerender: {
			handleHttpError: 'warn'
		}
	}
}

export default config
