import { defineConfig, loadEnv } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '')
	const port = Number(env.PUBLIC_APP_BASE_PORT || env.PORT || 5173)

	return {
		plugins: [
			sveltekit(),
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: './src/lib/i18n',
				strategy: ['localStorage', 'cookie', 'baseLocale']
			})
		],
		server: {
			host: '0.0.0.0',
			port,
			strictPort: true,
			allowedHosts: true,
			watch: { usePolling: true, interval: 300 }
		},
		preview: {
			host: '0.0.0.0',
			port,
			strictPort: true
		}
	}
})
