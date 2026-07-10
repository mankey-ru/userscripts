// ==UserScript==
// @name         [RMD] Ring My Droid
// @description  Automatically presses Ring button in Andoid Find Hub
// @author       mankey-ru
// @namespace    mankey-ru/ring-my-droid
// @version      1.1
// @match        https://www.google.com/android/find*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=android.com
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/ring-my-droid.user.js
// ==/UserScript==

const projName = 'RMD';
const logFlag = 1;
const hashPrefix = `#_findMyDevice__`;

if (window.location.hash.startsWith(hashPrefix)) {
	const deviceId = decodeURIComponent(window.location.hash.replace(hashPrefix, ''));
	log(`Started. Looking for ${deviceId}`)

	// ⬇ Сначала выбираем ваш телефон по имени
	waitFor('div[role="button"]', (el: HTMLElement) => {
		el.click();

		// ⬇ После выбора ждём кнопку "Play sound"
		waitFor('div[role="button"]', (btn: HTMLElement) => {
			btn.click();
		}, "Play sound");
	}, deviceId);
}

/** Функция ожидания элемента */
function waitFor (selector: string, callback: (el: HTMLElement) => void, textContent?: string) {
	log(`Element ${selector} with "${textContent}": waiting...`);
	const observer = new MutationObserver(() => {
		const candidates = Array.from(document.querySelectorAll(selector));
		const el = textContent
			? candidates.find(e => e.textContent.includes(textContent))
			: candidates[0];
		if (el) {
			observer.disconnect();
			log(`Element ${selector} with "${textContent}": found!`, el);
			// @ts-expect-error
			callback(el);
		}
	});
	observer.observe(document.body, { childList: true, subtree: true });
}


// @ts-expect-error
function log (...args) {
	if (logFlag)
		console.log(`[${projName}]`, ...args);
}