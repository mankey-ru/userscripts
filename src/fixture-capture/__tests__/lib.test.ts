import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { caseSlug, defaultCaseName, fixtureFileName, fixtureHeader, siteKey } from '../lib.ts';

describe('siteKey', () => {
	test('takes the label before the top-level domain', () => {
		assert.equal(siteKey('www.discogs.com'), 'discogs');
		assert.equal(siteKey('genius.com'), 'genius');
		assert.equal(siteKey('music.youtube.com'), 'youtube');
		assert.equal(siteKey('some.leprosorium.ru'), 'leprosorium');
	});

	test('single label and empty host', () => {
		assert.equal(siteKey('localhost'), 'localhost');
		assert.equal(siteKey(''), 'page');
	});
});

describe('caseSlug', () => {
	test('keeps lowercase latin, digits and single dashes', () => {
		assert.equal(caseSlug('Various Artist (2)'), 'various-artist-2');
		assert.equal(caseSlug('  --release__multi disc--  '), 'release-multi-disc');
	});

	test('drops non-latin text', () => {
		assert.equal(caseSlug('пост 1000+'), '1000');
		assert.equal(caseSlug('пост'), '');
	});

	test('limits the length to 60 chars without a trailing dash', () => {
		const slug = caseSlug('a'.repeat(59) + ' b');
		assert.equal(slug, 'a'.repeat(59));
	});
});

describe('defaultCaseName', () => {
	test('is made from the path', () => {
		assert.equal(
			defaultCaseName('/release/359013-SMILE-Space-Music-Is-Love-Energy-The-Album'),
			'release-359013-smile-space-music-is-love-energy-the-album',
		);
	});

	test('falls back to "home" for the root path', () => {
		assert.equal(defaultCaseName('/'), 'home');
	});
});

test('fixtureFileName', () => {
	assert.equal(fixtureFileName('discogs', 'master-various'), 'discogs__master-various.html');
});

describe('fixtureHeader', () => {
	const info = {
		url: 'https://genius.com/Rammstein-laichzeit-lyrics',
		capturedAt: new Date('2026-10-29T22:00:00Z'),
		userAgent: 'Mozilla/5.0 Chrome/141',
		scriptHandler: 'Tampermonkey 5.4',
	};

	test('lists source, date, browser and manager in one comment', () => {
		assert.equal(
			fixtureHeader(info),
			[
				'<!--',
				'source: https://genius.com/Rammstein-laichzeit-lyrics',
				'captured: 2026-10-29T22:00:00.000Z',
				'browser: Mozilla/5.0 Chrome/141',
				'manager: Tampermonkey 5.4',
				'-->',
			].join('\n'),
		);
	});

	test('escapes "-->" inside values', () => {
		const header = fixtureHeader({ ...info, url: 'https://x.com/?q=-->' });
		assert.equal(header.indexOf('-->'), header.length - 3);
	});
});
