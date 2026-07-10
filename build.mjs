// @ts-check
import { build } from 'esbuild';
import { readdirSync } from 'fs';
import { join, basename } from 'path';

const srcDir = 'src';
const distDir = 'dist';

const files = readdirSync(srcDir).filter((f) => f.endsWith('.user.ts'));

console.log(`Building ${files.length} userscripts...`);

for (const file of files) {
	const input = join(srcDir, file);
	const outputName = basename(file, '.ts') + '.js';
	const output = join(distDir, file);

	await build(
		/** @type {import('esbuild').BuildOptions} */ {
			entryPoints: [input],
			outfile: output,
			bundle: true,
			minify: false,
			sourcemap: false,
			target: 'es2020',
			format: 'esm',
		},
	);

	console.log(`  ✓ ${outputName}`);
}

console.log('Build complete!');
