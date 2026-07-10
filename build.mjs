// @ts-check
import { build } from 'esbuild';
import { readdirSync, readFileSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

const srcDir = 'src';
const distDir = 'dist';

// Создаём dist, если нет
mkdirSync(distDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => f.endsWith('.user.ts'));

console.log(`Building ${files.length} userscripts...`);

/**
 * Извлекает // ==UserScript== ... // ==/UserScript== блок
 * @param {string} code
 */
function extractUserscriptHeader(code) {
	const match = code.match(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==/);
	return match ? match[0] + '\n\n' : '';
}

for (const file of files) {
	const input = join(srcDir, file);
	const outputName = basename(file, '.ts') + '.js'; // ← .user.js
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
			target: 'es2020',
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