// ==UserScript==
// @name         [DES] Discogs Extra Stuff
// @description  Adds extra search links to discogs.com including Rutracker and VK.com music
// @author       mankey-ru
// @namespace    mankey-ru/discogs-extra-stuff
// @version      1.2
// @match        https://www.discogs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discogs.com
// @grant        none
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/discogs-extra-stuff.user.js
// ==/UserScript==

const projName = 'DES';
const logFlag = 1;

const LINK_STYLE =
	'background: purple; display: inline-block; padding: 1px 6px; font-size: 12px; line-height: 1.5; color: #fff; text-decoration:none; border-radius: 3px; white-space: nowrap; cursor: pointer;';

const RELEASE_BAR_STYLE = 'display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 4px; margin-bottom: 4px;';

window.setTimeout(init, 1000);

// Test on a compilation: https://www.discogs.com/master/122710-Various-No-More-Ugly-Germans-On-One-Hundred-And-Twenty-Six-Beats-Per-Minute-Made-In-Frankfurt
// Test on an album: https://www.discogs.com/release/359013-SMILE-Space-Music-Is-Love-Energy-The-Album
function init() {
	/** Critical elements that can break when Discogs changes its markup */
	const titleEl = document.querySelector('h1');
	const trackTitleTds = document.querySelectorAll('td[class^=trackTitle]');
	const trackTableEl = trackTitleTds[0]?.closest('table');

	if (!titleEl || !trackTableEl) {
		console.error(`Discogs Search Links: required elements not found`, {
			titleEl,
			trackTableEl,
			trackTitleTds,
		});
		return;
	}

	const { artist: releaseArtist, title: releaseTitle } = parseReleaseHeading(titleEl.textContent);
	const isVarious = releaseArtist === 'Various';
	log({ isVarious, releaseArtist, releaseTitle });

	const vkHrefs: string[] = [];
	trackTitleTds.forEach((trackTitleTd, i) => {
		const trackRow = trackTitleTd.closest('tr');
		if (!trackRow) return;

		const trackArtist = isVarious ? getTrackRowArtist(trackRow) : releaseArtist;
		const trackTitle = getTrackTitle(trackTitleTd);
		log(`${i} ${trackArtist} - ${trackTitle}`);

		const query = `${trackArtist} — ${trackTitle}`;
		const q = encodeURIComponent(query);
		const vkHref = `https://vk.com/audios1239592?q=${q}`;
		vkHrefs.push(vkHref);

		appendCell(trackRow, createLink('VkMus', vkHref));
		appendCell(
			trackRow,
			createLink('Google', `https://www.google.com/search?num=20&newwindow=1&source=lnms&tbm=vid&q=${q}`),
		);
		// Web search, not video: the lyrics sites (Genius first) are in the web results
		appendCell(
			trackRow,
			createLink('Lyrics', `https://www.google.com/search?q=${encodeURIComponent(query + ' lyrics')}`),
		);
	});

	// Bar for the release-wide buttons: one row above the tracklist table, not inside it
	// (a div inside a table becomes an anonymous cell)
	const releaseBtnBar = document.createElement('div');
	releaseBtnBar.style.cssText = RELEASE_BAR_STYLE;
	trackTableEl.before(releaseBtnBar);

	releaseBtnBar.append(
		createOpenAllLink(vkHrefs),
		createLink(
			'Найти релиз на Rutracker',
			rutrackerSearchUrl(`${isVarious ? 'VA' : releaseArtist} - ${releaseTitle}`),
		),
	);
}

/** Splits the "Artist – Title" release heading */
function parseReleaseHeading(heading: string) {
	const [artist, title] = heading.split('–');
	return { artist: artist.trim(), title: title.trim() };
}

/** Artist of a single track, shown in its row on compilations */
function getTrackRowArtist(trackRow: HTMLTableRowElement): string {
	const artistEl = trackRow.querySelector('[class^=artist_]');
	if (!artistEl) return '';
	return artistEl.textContent
		.trim()
		.replace('–', '')
		.replace(/\(\d+\)$/g, '');
}

/** Track title alone: the same cell also holds the track credits (Written-By, Featuring...) */
function getTrackTitle(trackTitleTd: Element): string {
	const titleEl = trackTitleTd.querySelector('span[class*=trackTitle]');
	return (titleEl ?? trackTitleTd).textContent.trim();
}

function rutrackerSearchUrl(query: string): string {
	return `https://rutracker.org/forum/tracker.php?nm=${encodeURIComponent(query)}&f[]=-1&o=10&s=2&pn=`;
}

/** Styled link; with `href` it opens in a new tab */
function createLink(text: string, href?: string): HTMLAnchorElement {
	const link = document.createElement('a');
	link.style.cssText = LINK_STYLE;
	link.textContent = text;
	if (href) {
		link.href = href;
		link.target = '_blank';
	}
	return link;
}

function appendCell(row: HTMLTableRowElement, content: Node) {
	const td = document.createElement('td');
	td.appendChild(content);
	row.appendChild(td);
}

function createOpenAllLink(hrefs: string[]): HTMLAnchorElement {
	const link = createLink('Открыть все треки VK');
	link.addEventListener('click', () => {
		if (confirm(`Открыть ${hrefs.length} вкладок VK?`)) openOneByOne(hrefs);
	});
	return link;
}

/** Opens each URL in a new tab, one every `delayMs` */
function openOneByOne(urls: string[], delayMs = 30) {
	const queue = urls.slice();
	const interval = window.setInterval(() => {
		window.open(queue.shift(), '_blank');
		if (queue.length === 0) window.clearInterval(interval);
	}, delayMs);
}

function log(...args: unknown[]) {
	if (logFlag) console.log(`[${projName}]`, ...args);
}
