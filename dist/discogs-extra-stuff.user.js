// ==UserScript==
// @name         [DES] Discogs Extra Stuff
// @description  Adds extra search links to discogs.com including Rutracker and VK.com music
// @author       mankey-ru
// @namespace    mankey-ru/discogs-extra-stuff
// @version      1.0.9
// @match        https://www.discogs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discogs.com
// @grant        none
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/discogs-extra-stuff.user.js
// ==/UserScript==

const projName = 'DES';
const logFlag = 1;

window.setTimeout(init, 1000);

function init () {
	const linkStyle =
		'background: purple; display: inline-block; padding: 5px; color: #fff; text-decoration:none; border-radius: 5px; white-space: nowrap; cursor: pointer;';
	const vkHrefsList = [];

	/** Критичные элементы, которые могут сломаться при смене вёрстки */
	const titleEl = document.querySelector('h1');
	const trackListEl = document.querySelector('[class^=tracklist]');
	const trackTitleTds = document.querySelectorAll('td[class^=trackTitle]');

	if (!titleEl || !trackListEl || !trackTitleTds.length) {
		console.error(`Discogs Search Links: required elements not found`, { titleEl, trackListEl, trackTitleTds });
		return;
	}
	const titleTextParts = titleEl.textContent.split('–');
	const releaseArtist = titleTextParts[0].trim();
	const releaseTitle = titleTextParts[1].trim();
	const isVarious = releaseArtist === 'Various';
	log({ isVarious, releaseArtist, releaseTitle });

	// проверяем на компиле https://www.discogs.com/master/122710-Various-No-More-Ugly-Germans-On-One-Hundred-And-Twenty-Six-Beats-Per-Minute-Made-In-Frankfurt
	// проверяем на альбоме https://www.discogs.com/release/359013-SMILE-Space-Music-Is-Love-Energy-The-Album
	trackTitleTds.forEach(function (trackTitleSpan, i) {
		const trackRow = trackTitleSpan.closest('tr');
		const trackRowArtistElement = trackRow.querySelector('[class^=artist_]'); // trackRow.querySelector('[class^=artist__]');
		const trackRowArtist = trackRowArtistElement ?
			trackRowArtistElement.textContent.trim().replace('–', '').replace(/\(\d+\)$/g, '') : '';

		const trackArtist = isVarious ? trackRowArtist : releaseArtist;
		const trackTitle = trackTitleSpan.textContent.trim();
		log(`${i} ${trackArtist} - ${trackTitle}`);

		const q = encodeURIComponent(trackArtist + ' — ' + trackTitle);
		const vkHref = `https://vk.com/audios1239592?q=${q}`;

		addLink(vkHref, `Vk Music`);
		vkHrefsList.push(vkHref);
		addLink(
			`https://www.google.com/search?num=20&newwindow=1&source=lnms&tbm=vid&q=${q}`,
			`Google`
		);

		function addLink (href, text) {
			const link = document.createElement('a');
			link.target = '_blank';
			link.style.cssText = linkStyle;
			link.href = href;
			link.textContent = text;

			const td = document.createElement('td');
			td.appendChild(link);
			trackRow.appendChild(td);
		}
	});

	// создаём контейнер для обще-релизных кнопок
	const releaseBtnBar = document.createElement('div');
	releaseBtnBar.style.textAlign = 'right';
	trackListEl.prepend(releaseBtnBar);

	createAllTracksVkLink(releaseBtnBar);

	createRutrackerLink(releaseBtnBar);

	function createAllTracksVkLink (containerElement) {
		const vkAllTracksLink = document.createElement('a');
		// openAllLink.className = 'j-vkbtn-all';
		vkAllTracksLink.style.cssText = linkStyle;
		vkAllTracksLink.textContent = 'Открыть все треки VK';
		vkAllTracksLink.addEventListener('click', function () {
			if (confirm(`Открыть ${vkHrefsList.length} вкладок VK?`)) {
				const _links = vkHrefsList.slice();
				const interval = setInterval(function () {
					const url = _links.shift();
					window.open(url, '_blank');
					if (_links.length === 0) {
						clearInterval(interval);
					}
				}, 30);
			}
		});
		containerElement.appendChild(vkAllTracksLink);
	}
	function createRutrackerLink (containerElement) {
		const vkAllTracksLink = document.createElement('a');
		// openAllLink.className = 'j-vkbtn-all';
		vkAllTracksLink.style.cssText = linkStyle;
		vkAllTracksLink.textContent = 'Найти релиз на Rutracker';
		const query = `${isVarious ? 'VA' : releaseArtist} - ${releaseTitle}`;
		vkAllTracksLink.setAttribute('href', `https://rutracker.org/forum/tracker.php?nm=${encodeURIComponent(query)}&f[]=-1&o=10&s=2&pn=`);
		vkAllTracksLink.setAttribute('target', `_blank`);
		containerElement.appendChild(vkAllTracksLink);
	}
	function createAllTracksVkLink (containerElement) {
		const vkAllTracksLink = document.createElement('a');
		// openAllLink.className = 'j-vkbtn-all';
		vkAllTracksLink.style.cssText = linkStyle;
		vkAllTracksLink.textContent = 'Открыть все треки VK';
		vkAllTracksLink.addEventListener('click', function () {
			if (confirm(`Открыть ${vkHrefsList.length} вкладок VK?`)) {
				const _links = vkHrefsList.slice();
				const interval = setInterval(function () {
					const url = _links.shift();
					window.open(url, '_blank');
					if (_links.length === 0) {
						clearInterval(interval);
					}
				}, 30);
			}
		});
		containerElement.appendChild(vkAllTracksLink);
	}
}

function log (...args) {
	if (logFlag)
		console.log(`[${projName}]`, ...args);
}