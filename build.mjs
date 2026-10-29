// @ts-check
import { build } from 'esbuild';
import { readdirSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

const scriptsDir = 'scripts';
const dev = process.argv.includes('--devbuild');
const distDir = dev ? 'dist-dev' : 'dist';

// Создаём dist, если нет
mkdirSync(distDir, { recursive: true });

// Entry points: scripts/<name>/<name>.user.ts -> dist/<name>.user.js (flat, @downloadURL relies on it)
const files = readdirSync(scriptsDir, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => join(scriptsDir, d.name, `${d.name}.user.ts`))
	.filter((f) => existsSync(f));

console.log(`Building ${files.length} userscripts...`);

/**
 * Извлекает // ==UserScript== ... // ==/UserScript== блок
 * @param {string} code
 */
function extractUserscriptHeader(code) {
	const match = code.match(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/);
	return match ? match[0] + '\n\n' : '';
}

for (const input of files) {
	const outputName = basename(input, '.ts') + '.js'; // ← .user.js
	const output = join(distDir, outputName);

	const source = readFileSync(input, 'utf8');
	const header = extractUserscriptHeader(source);

	await build(
		/** @type {import('esbuild').BuildOptions} */ ({
			entryPoints: [input],
			outfile: output,
			bundle: true,
			minify: false,          // true для prod
			sourcemap: false,       // 'inline' для dev
			target: 'es2022',
			format: 'iife',
			platform: 'browser',
			banner: {
				js: header,
			},
			// legalComments: 'none', // если не нужны @license из зависимостей
		}),
	);

	console.log(`  ✓ ${outputName}`);
}

console.log('Build complete!');
