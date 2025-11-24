// ==UserScript==
// @name         Ring My Droid [rmd]
// @description  Automatically presses Ring button in Andoid Find Hub
// @author       mankey-ru
// @namespace    mankey-ru
// @version      1.0
// @match        https://www.google.com/android/find*
// @grant        none
// @updateURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/ring-my-droid.user.js
// ==/UserScript==

const logFlag = 1;

const hashPrefix = `#_findMyDevice__`;

if (window.location.hash.startsWith(hashPrefix)) {
	const deviceId = decodeURIComponent(window.location.hash.replace(hashPrefix, ''));
	log(`Started. Looking for ${deviceId}`)

	// ⬇ Сначала выбираем ваш телефон по имени
	waitFor('div[role="button"]', (el) => {
		el.click();

		// ⬇ После выбора ждём кнопку "Play sound"
		waitFor('div[role="button"]', (btn) => {
			btn.click();
		}, "Play sound");
	}, deviceId);
}

/**
 * ⬇ Функция ожидания элемента
 * @param selector {string}
 * @param callback {any}
 * @param textContent {string}
 */
function waitFor (selector, callback, textContent) {
	log(`Element ${selector} with "${textContent}": waiting...`);
	const observer = new MutationObserver(() => {
		const candidates = Array.from(document.querySelectorAll(selector));
		const el = textContent
			? candidates.find(e => e.textContent.includes(textContent))
			: candidates[0];
		if (el) {
			observer.disconnect();
			log(`Element ${selector} with "${textContent}": found!`, el);
			callback(el);
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
}


function log (...args) {
	if (logFlag)
		console.log(`[rmd]`, ...args);
}