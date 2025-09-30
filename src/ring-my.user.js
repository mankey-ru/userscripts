// ==UserScript==
// @name         Ring my android device
// @description  Goes to Find Hub and presses Ring button
// @version      0.3
// @match        https://www.google.com/android/find*
// @grant        none
// @run-at       document-end
// @author       mankey-ru
// @namespace    mankey-ru
// ==/UserScript==

// @ts-check

const logFlag = 1;
const phoneName = `Nothing Phone (2a)`;

log(`Started`)

// ⬇ Сначала выбираем ваш телефон по имени
// @ts-expect-error
waitFor('div[role="button"]', (el) => {
	el.click();

	// ⬇ После выбора ждём кнопку "Play sound"
	// @ts-expect-error
	waitFor('div[role="button"]', (btn) => {
		btn.click();
	}, "Play sound");
}, phoneName);

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


// @ts-expect-error
function log (...args) {
	if (logFlag) {
		console.log(`[fmd]`, ...args);
	}
}