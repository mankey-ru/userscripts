import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import {
	type Browser,
	launchBrowser,
	openWithUserscript,
} from '../../../test-utils/dom-harness.ts';

const FIND_URL = 'https://www.google.com/android/find';

// Minimal stand-in for Find Hub: devices render later (it's an SPA), and selecting one
// shows the "Play sound" button a bit later too
const PAGE = `<!doctype html><html><body><main id="app"></main><script>
window.played = [];
window.renderDevices = (names) => {
	for (const name of names) {
		const btn = document.createElement('div');
		btn.setAttribute('role', 'button');
		btn.textContent = name;
		btn.onclick = () => setTimeout(() => {
			const play = document.createElement('div');
			play.setAttribute('role', 'button');
			play.textContent = 'Play sound';
			play.onclick = () => window.played.push(name);
			document.getElementById('app').append(play);
		}, 100);
		document.getElementById('app').append(btn);
	}
};
</script></body></html>`;

declare global {
	interface Window {
		played: string[];
		renderDevices: (names: string[]) => void;
	}
}

let browser: Browser;
before(async () => (browser = await launchBrowser()));
after(() => browser.close());

describe('ring-my-droid', () => {
	test('rings the device named in the hash', async () => {
		const { page, errors } = await openWithUserscript(browser, {
			url: `${FIND_URL}#_findMyDevice__${encodeURIComponent('Test Phone')}`,
			html: PAGE,
			script: 'ring-my-droid',
		});
		await page.evaluate(() => window.renderDevices(['Test Tablet', 'Test Phone']));
		await page.clock.runFor(200);

		assert.deepEqual(await page.evaluate(() => window.played), ['Test Phone']);
		assert.deepEqual(errors, []);
	});

	test('does nothing without the hash', async () => {
		const { page, errors } = await openWithUserscript(browser, {
			url: FIND_URL,
			html: PAGE,
			script: 'ring-my-droid',
		});
		await page.evaluate(() => window.renderDevices(['Test Phone']));
		await page.clock.runFor(200);

		assert.deepEqual(await page.evaluate(() => window.played), []);
		assert.deepEqual(errors, []);
	});

	test(
		'rings when the device list is already rendered at start',
		{
			todo: 'waitForElement only checks on DOM mutations, so it times out after 30 s',
		},
		async () => {
			const { page } = await openWithUserscript(browser, {
				url: `${FIND_URL}#_findMyDevice__Test%20Phone`,
				html: PAGE.replace(
					'</body>',
					'<script>renderDevices(["Test Phone"])</script></body>',
				),
				script: 'ring-my-droid',
			});
			await page.clock.runFor(200);

			assert.deepEqual(await page.evaluate(() => window.played), ['Test Phone']);
		},
	);
});
