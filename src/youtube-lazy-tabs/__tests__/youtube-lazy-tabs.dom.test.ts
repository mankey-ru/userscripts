import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
	type Browser,
	launchBrowser,
	openWithUserscript,
} from '../../../test-utils/dom-harness.ts';

const WATCH_URL = 'https://www.youtube.com/watch?v=abc123';
const PAGE = `<!doctype html><html><head><title>Artist - Song - YouTube</title></head>
<body><div id="content">video page</div></body></html>`;
const TITLES_KEY = 'ylt-titles';

declare global {
	interface Window {
		setTabVisible: (visible: boolean) => void;
	}
}

/**
 * Headless tabs are always visible, so visibility is faked. The state lives in
 * sessionStorage to survive the reload the script does
 */
function fakeVisibility() {
	const state = () => sessionStorage.getItem('test-visibility') ?? 'hidden';
	Object.defineProperty(document, 'visibilityState', { get: state });
	Object.defineProperty(document, 'hidden', { get: () => state() === 'hidden' });
	window.setTabVisible = (visible) => {
		sessionStorage.setItem('test-visibility', visible ? 'visible' : 'hidden');
		document.dispatchEvent(new Event('visibilitychange'));
	};
}

function startVisible() {
	sessionStorage.setItem('test-visibility', 'visible');
}

function open(...init: Array<() => void>) {
	return openWithUserscript(browser, {
		url: WATCH_URL,
		html: PAGE,
		script: 'youtube-lazy-tabs',
		init: [...init, fakeVisibility],
	});
}

const bodyText = (page: Awaited<ReturnType<typeof open>>['page']) =>
	page.evaluate(() => document.body?.textContent ?? '');

let browser: Browser;
before(async () => (browser = await launchBrowser()));
after(() => browser.close());

describe('youtube-lazy-tabs: tab hidden at start', () => {
	test('shows a placeholder instead of the page', async () => {
		const { page, errors } = await open();
		await page.waitForFunction(() => document.title.startsWith('💤'));

		assert.equal(await page.title(), '💤 YouTube');
		assert.match(await bodyText(page), /Tab will load when you open it/);
		assert.deepEqual(errors, []);
	});

	test('uses the title remembered for this video', async () => {
		const { page } = await open(() => {
			localStorage.setItem('ylt-titles', JSON.stringify({ 'v:abc123': 'Artist - Song' }));
		});
		await page.waitForFunction(() => document.title.startsWith('💤'));

		assert.equal(await page.title(), '💤 Artist - Song');
	});

	test('loads the page after the tab stays visible for 300 ms', async () => {
		const { page } = await open();
		await page.waitForFunction(() => document.title.startsWith('💤'));

		await page.evaluate(() => window.setTabVisible(true));
		await Promise.all([page.waitForEvent('load'), page.clock.runFor(300)]);

		assert.equal(await page.title(), 'Artist - Song - YouTube');
		assert.equal(await bodyText(page), 'video page');
	});

	test('stays deferred when the tab is only flicked through', async () => {
		const { page } = await open();
		await page.waitForFunction(() => document.title.startsWith('💤'));

		await page.evaluate(() => window.setTabVisible(true));
		await page.clock.runFor(200);
		await page.evaluate(() => window.setTabVisible(false));
		await page.clock.runFor(1000);

		assert.equal(await page.title(), '💤 YouTube');
	});
});

describe('youtube-lazy-tabs: tab visible at start', () => {
	test('loads normally and remembers the title', async () => {
		const { page, errors } = await open(startVisible);
		await page.waitForLoadState('load');
		assert.equal(await bodyText(page), 'video page');

		await page.clock.runFor(3000);
		const titles = await page.evaluate((key) => localStorage.getItem(key), TITLES_KEY);
		assert.deepEqual(JSON.parse(titles ?? '{}'), { 'v:abc123': 'Artist - Song - YouTube' });
		assert.deepEqual(errors, []);
	});

	test('keeps at most 500 titles, dropping the oldest', async () => {
		const { page } = await open(startVisible, () => {
			const titles: Record<string, string> = {};
			for (let i = 0; i < 500; i++) titles['v:old' + i] = 'Old ' + i;
			localStorage.setItem('ylt-titles', JSON.stringify(titles));
		});
		await page.waitForLoadState('load');
		await page.clock.runFor(3000);

		const titles = JSON.parse(
			(await page.evaluate((key) => localStorage.getItem(key), TITLES_KEY)) ?? '{}',
		);
		const keys = Object.keys(titles);
		assert.equal(keys.length, 500);
		assert.equal(keys[0], 'v:old1');
		assert.equal(keys.at(-1), 'v:abc123');
	});
});
