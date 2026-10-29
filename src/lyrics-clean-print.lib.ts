// Pure helpers of lyrics-clean-print: no DOM access, so they run under node:test.

// Line counts at which the lyrics switch to 2 and 3 columns, so a song fits on one page
export const colThreshold1 = 20;
export const colThreshold2 = 50;

/**
 * Удаление перевода кототорый джениус суёт русским артистам типа `Игорь Жирнов (Igor Zhirnov)`
 */
export function cleanTranslation(str: string): string {
	const cyrillicWithEnglishParensRegex = /^([А-Яа-яеЁ\s]+)\s+\([A-Za-z\s]+\)$/;
	// If matches, return only the Cyrillic part (group 1); else return original
	const match = str.match(cyrillicWithEnglishParensRegex);
	return match ? match[1].trim() : str;
}

/**
 * Turns the innerHTML of a Genius lyrics container into print markup:
 * paragraphs as `p.lyr-par`, section headers like `[Chorus]` as `span.lyr-subdiv`.
 */
export function cleanLyricsHTML(lyricsHTML: string): string {
	let cleanedLyricsHTML = lyricsHTML;

	// Заменяем все ссылки на тупо их текст
	cleanedLyricsHTML = cleanedLyricsHTML.replace(/<a[^>]*>(.*?)<\/a>/gis, '$1');
	// Заменяем все спаны на тупо их текст
	cleanedLyricsHTML = cleanedLyricsHTML.replace(/<span[^>]*>(.*?)<\/span>/gis, '$1');
	// Заменяем все i на тупо их текст
	cleanedLyricsHTML = cleanedLyricsHTML.replace(/<i[^>]*>(.*?)<\/i>/gis, '$1');

	// Бьём на абзацы
	cleanedLyricsHTML = cleanedLyricsHTML
		.split(/<br\s*\/?>\s*<br\s*\/?>/gi)
		.map((part) => `<p class="lyr-par">${part.trim()}</p>`)
		.join('');

	// часто есть такая отдельная фраза хз зачем. Если после звездочки сунуть ? то будет non-greedy
	cleanedLyricsHTML = cleanedLyricsHTML.replace(/\[Текст песни (.*?)\]/gis, '');
	cleanedLyricsHTML = cleanedLyricsHTML.replace(/\[Songtext (.*?)\]/gis, '');
	cleanedLyricsHTML = cleanedLyricsHTML.replaceAll(/\[Instrumental(.*?)\]/gis, '');

	cleanedLyricsHTML = cleanedLyricsHTML.replace(
		/\[(.*?)\]<br\s*\/?>/gis,
		'<span class="lyr-subdiv">$1</span>',
	);

	cleanedLyricsHTML = cleanedLyricsHTML.replace(/&nbsp;/g, ' ');
	//cleanedLyricsHTML = cleanedLyricsHTML.replace(/(<br\s*\/?>\s*)+/gi, '<br>');
	return cleanedLyricsHTML;
}

export function countLines(lyricsHTML: string): number {
	return lyricsHTML.split('<br>').length;
}

// чтобы на 1 страницу помещалось
export function pickColumnCount(lineQty: number): number {
	if (lineQty < colThreshold1) return 1;
	if (lineQty < colThreshold2) return 2;
	return 3;
}

/** First standalone 4-digit number of the release date label, e.g. `Mar. 5, 2019` -> `2019` */
export function extractYear(label: string | null | undefined): string {
	const yearMatch = label?.match(/\b\d{4}\b/);
	return yearMatch ? yearMatch[0] : '';
}

/**
 * Comma list of featured artists without the main artist:
 * Genius repeats it there, e.g. https://genius.com/Slipknot-gently-original-version-lyrics
 */
export function formatFeatArtists(names: string[], songArtist: string): string {
	return names
		.map((name) => cleanTranslation(name.trim()))
		.filter((name) => name !== songArtist)
		.join(', ');
}
