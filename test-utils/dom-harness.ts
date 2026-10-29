// DOM test harness: opens a fixture in headless Chromium at the real site URL and runs a
// userscript in it the way Tampermonkey would (same esbuild bundle, same @run-at timing).

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { build } from 'esbuild';
import { chromium, type Browser, type Page } from 'playwright';

export type { Browser, Page };

export interface OpenOptions {
	/** Page URL as on the real site; the hash is kept, so scripts can read it */
	url: string;
	/** Fixture HTML served for `url`; every other request is aborted */
	html: string;
	/** Userscript to inject: the `<name>` of `src/<name>/<name>.user.ts` */
	script: string;
	/**
	 * Run in the page in this order, before its own scripts and a document-start userscript.
	 * Each is serialized on its own, so it can't use variables from the test file
	 */
	init?: Array<() => void>;
}

export interface OpenedPage {
	page: Page;
	/** Uncaught errors thrown in the page */
	errors: Error[];
}

/** Chromium for one test file; CHROMIUM_PATH points to a preinstalled binary if needed */
export function launchBrowser(): Promise<Browser> {
	return chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
}

// Fixtures live in a public git repo and are cloned by every CI run
const FIXTURE_MAX_BYTES = 1024 * 1024;

/** Reads `name` from the `fixtures/` folder next to the test file; fails on oversized ones */
export function readFixture(testDir: string, name: string): string {
	const html = readFileSync(join(testDir, 'fixtures', name), 'utf8');
	const bytes = Buffer.byteLength(html);
	if (bytes > FIXTURE_MAX_BYTES) {
		throw new Error(`Fixture ${name} is ${Math.round(bytes / 1024)} KB, the limit is 1 MB`);
	}
	return html;
}

/**
 * Opens `html` at `url` with page timers under `page.clock` (advance them with
 * `page.clock.runFor(ms)`) and injects the userscript per its `@run-at`.
 */
export async function openWithUserscript(
	browser: Browser,
	options: OpenOptions,
): Promise<OpenedPage> {
	const page = await browser.newPage();
	const errors: Error[] = [];
	page.on('pageerror', (err) => errors.push(err));

	const pageUrl = stripHash(options.url);
	await page.route('**/*', (route) =>
		stripHash(route.request().url()) === pageUrl
			? route.fulfill({ contentType: 'text/html; charset=utf-8', body: options.html })
			: route.abort(),
	);
	await page.clock.install();
	for (const fn of options.init ?? []) await page.addInitScript(fn);

	const { code, runAt } = await bundleUserscript(options.script);
	if (runAt === 'document-start') {
		await page.addInitScript({ content: code });
		await page.goto(options.url, { waitUntil: 'commit' });
	} else {
		await page.goto(options.url, {
			waitUntil: runAt === 'document-end' ? 'domcontentloaded' : 'load',
		});
		await page.addScriptTag({ content: code });
	}
	return { page, errors };
}

type RunAt = 'document-start' | 'document-end' | 'document-idle';

const bundles = new Map<string, { code: string; runAt: RunAt }>();

/** Bundles a userscript like build.mjs does; cached per test process */
export async function bundleUserscript(name: string): Promise<{ code: string; runAt: RunAt }> {
	const cached = bundles.get(name);
	if (cached) return cached;

	const entry = join('src', name, `${name}.user.ts`);
	const result = await build({
		entryPoints: [entry],
		bundle: true,
		write: false,
		target: 'es2022',
		format: 'iife',
		platform: 'browser',
	});
	const header = readFileSync(entry, 'utf8').match(/^\/\/\s*@run-at\s+(\S+)/m);
	const bundle = {
		code: result.outputFiles[0].text,
		runAt: (header?.[1] ?? 'document-idle') as RunAt,
	};
	bundles.set(name, bundle);
	return bundle;
}

function stripHash(url: string): string {
	return url.split('#')[0];
}
