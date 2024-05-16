import { preserveDirectives } from 'rollup-plugin-preserve-directives'
import { defineConfig, mergeConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { externalizeDeps } from 'vite-plugin-externalize-deps'
import tsconfigPaths from 'vite-tsconfig-paths'

const buildOutputDir = 'dist'
const rootDir = './src'

// https://vitejs.dev/config/
const config = defineConfig({
	plugins: [],
})

const buildConfig = defineConfig({
	plugins: [
		externalizeDeps({
			include: [],
		}),
		preserveDirectives(),
		tsconfigPaths(),
		dts({
			outDir: `${buildOutputDir}/esm`,
			entryRoot: rootDir,
			include: rootDir,
			exclude: `${rootDir}/dev`,
			compilerOptions: {
				// @ts-expect-error
				module: 'esnext',
				declarationMap: false,
			},
		}),
		dts({
			outDir: `${buildOutputDir}/cjs`,
			entryRoot: rootDir,
			include: rootDir,
			exclude: `${rootDir}/dev`,
			compilerOptions: {
				// @ts-expect-error
				module: 'commonjs',
				declarationMap: false,
			},
		}),
	],
	build: {
		outDir: buildOutputDir,
		minify: true,
		sourcemap: true,
		lib: {
			entry: [`${rootDir}/core/index.ts`, `${rootDir}/react/index.ts`],
			formats: ['es', 'cjs'],
			fileName: (format) => {
				if (format === 'cjs') return 'cjs/[name].cjs'
				return 'esm/[name].js'
			},
		},
		rollupOptions: {
			output: {
				preserveModules: true,
			},
		},
	},
})

export default mergeConfig(config, buildConfig)
