import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	cleanLyricsHTML,
	cleanTranslation,
	countLines,
	extractYear,
	formatFeatArtists,
	pickColumnCount,
} from './lib.ts';

const par = (html: string) => `<p class="lyr-par">${html}</p>`;
const subdiv = (text: string) => `<span class="lyr-subdiv">${text}</span>`;

describe('cleanTranslation', () => {
	test('drops the English translation after a Cyrillic name', () => {
		assert.equal(cleanTranslation('Игорь Жирнов (Igor Zhirnov)'), 'Игорь Жирнов');
		assert.equal(cleanTranslation('Проститутка (Prostitute)'), 'Проститутка');
		assert.equal(cleanTranslation('Ёлка (Yolka)'), 'Ёлка');
	});

	test('keeps strings that are not "Cyrillic (Latin)"', () => {
		for (const str of ['English (Text)', 'Русский (русский)', 'Normal string', 'Слово', '']) {
			assert.equal(cleanTranslation(str), str);
		}
	});

	test('lowercase ё in the name', { todo: 'regex has е instead of ё' }, () => {
		assert.equal(cleanTranslation('Сёстры (Sisters)'), 'Сёстры');
	});

	test('digits and hyphens in the name', { todo: 'regex allows letters and spaces only' }, () => {
		assert.equal(cleanTranslation('Би-2 (Bi-2)'), 'Би-2');
	});
});

describe('cleanLyricsHTML', () => {
	test('unwraps annotation links and spans, keeps line breaks', () => {
		const html =
			'<a href="/123/Line-one" class="ReferentFragment"><span class="Highlight">Line one<br>Line two</span></a><br>Line three';
		assert.equal(cleanLyricsHTML(html), par('Line one<br>Line two<br>Line three'));
	});

	test('unwraps <i>', () => {
		assert.equal(cleanLyricsHTML('Oh <i>whisper</i> oh'), par('Oh whisper oh'));
	});

	test('splits paragraphs on a double <br> in any form', () => {
		assert.equal(
			cleanLyricsHTML('One<br><br>Two<br/> <BR />Three'),
			par('One') + par('Two') + par('Three'),
		);
	});

	test('turns section headers into subdiv spans', () => {
		assert.equal(
			cleanLyricsHTML('[Verse 1]<br>Line one<br><br>[Chorus: Corey Taylor]<br>La'),
			par(subdiv('Verse 1') + 'Line one') + par(subdiv('Chorus: Corey Taylor') + 'La'),
		);
	});

	test('keeps a bracket that is not followed by a line break', () => {
		assert.equal(cleanLyricsHTML('La<br>[Outro]'), par('La<br>[Outro]'));
	});

	test('removes the "[Текст песни ...]" and "[Songtext ...]" captions', () => {
		assert.equal(cleanLyricsHTML('[Текст песни «Ляля»]<br>Раз'), par('<br>Раз'));
		assert.equal(cleanLyricsHTML('[Songtext zu „Lied“]<br>Eins'), par('<br>Eins'));
	});

	test(
		'caption removal leaves no leading line break',
		{ todo: 'the <br> after the caption stays' },
		() => {
			assert.equal(cleanLyricsHTML('[Текст песни «Ляля»]<br>Раз'), par('Раз'));
		},
	);

	test('removes [Instrumental ...] markers, leaving an empty paragraph hidden by CSS', () => {
		assert.equal(
			cleanLyricsHTML('Eins<br><br>[Instrumental Break]<br><br>Zwei'),
			par('Eins') + par('') + par('Zwei'),
		);
	});

	test('replaces &nbsp; with a space', () => {
		assert.equal(cleanLyricsHTML('La&nbsp;la'), par('La la'));
	});

	test(
		'an inline [?] before a section header',
		{ todo: '.*? runs from the [ of [?] to the header' },
		() => {
			assert.equal(
				cleanLyricsHTML('Hey [?] ok<br>[Chorus]<br>La'),
				par('Hey [?] ok<br>' + subdiv('Chorus') + 'La'),
			);
		},
	);

	test(
		'nested spans',
		{ todo: 'non-greedy match closes the outer span at the inner </span>' },
		() => {
			assert.equal(cleanLyricsHTML('<span a><span b>x</span>y</span>'), par('xy'));
		},
	);

	test('<img> is not taken for <i>', { todo: '<i[^>]*> also matches <img>' }, () => {
		assert.equal(
			cleanLyricsHTML('<img src="a.png">foo<i>bar</i>'),
			par('<img src="a.png">foobar'),
		);
	});
});

describe('countLines', () => {
	test('counts <br>-separated lines', () => {
		assert.equal(countLines(''), 1);
		assert.equal(countLines('a<br>b<br>c'), 3);
	});
});

describe('pickColumnCount', () => {
	test('1 column below 20 lines, 2 below 50, else 3', () => {
		assert.equal(pickColumnCount(1), 1);
		assert.equal(pickColumnCount(19), 1);
		assert.equal(pickColumnCount(20), 2);
		assert.equal(pickColumnCount(49), 2);
		assert.equal(pickColumnCount(50), 3);
		assert.equal(pickColumnCount(500), 3);
	});
});

describe('extractYear', () => {
	test('takes the 4-digit year from the release date label', () => {
		assert.equal(extractYear('Mar. 5, 2019'), '2019');
		assert.equal(extractYear('1999'), '1999');
	});

	test('returns an empty string when there is no year', () => {
		assert.equal(extractYear(null), '');
		assert.equal(extractYear(undefined), '');
		assert.equal(extractYear('12345 views'), '');
	});
});

describe('formatFeatArtists', () => {
	test('trims, drops translations and the main artist', () => {
		assert.equal(
			formatFeatArtists(
				[' Slipknot ', 'Игорь Жирнов (Igor Zhirnov)', 'Corey Taylor'],
				'Slipknot',
			),
			'Игорь Жирнов, Corey Taylor',
		);
	});

	test('returns an empty string when only the main artist is listed', () => {
		assert.equal(formatFeatArtists(['Slipknot'], 'Slipknot'), '');
		assert.equal(formatFeatArtists([], 'Slipknot'), '');
	});
});
