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

(async () => {
	const projName = 'RMD';
	const logFlag = 1;
	const hashPrefix = `#_findMyDevice__`;

	if (window.location.hash.startsWith(hashPrefix)) {
		const deviceId = decodeURIComponent(window.location.hash.replace(hashPrefix, ''));
		// deviceId = 'Nothing A142' // .closest('selector')
		log(`Started. Looking for ${deviceId}`);

		// ⬇ Сначала выбираем ваш телефон по имени
		const phoneBtn = await waitForElement('div[role="button"]', deviceId);
		phoneBtn.click();

		// ⬇ После выбора ждём кнопку "Play sound"
		const soundBtn = await waitForElement('div[role="button"]', 'Play sound');
		soundBtn.click();
	}

	/**
	 * Асинхронная функция ожидания и поиска элемента
	 * @param selector - селектор элемента
	 * @param textContent - текстовое содержимое элемента (необязательный параметр)
	 * @param timeoutMs - таймаут в миллисекундах (по умолчанию 30000)
	 */
	async function waitForElement(
		selector: string,
		textContent?: string,
		timeoutMs: number = 30000,
	): Promise<HTMLElement> {
		log(`Element ${selector} with "${textContent}": waiting...`);

		return new Promise((resolve, reject) => {
			const observer = new MutationObserver(() => {
				const candidates = Array.from(document.querySelectorAll(selector));
				const el = textContent
					? candidates.find((e) => e.textContent?.includes(textContent))
					: candidates[0];

				if (el) {
					observer.disconnect();
					log(`Element ${selector} with "${textContent}": found!`, el);
					resolve(el as HTMLElement);
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });

			// Таймаут
			setTimeout(() => {
				observer.disconnect();
				reject(new Error(`Timeout waiting for ${selector} with "${textContent}"`));
			}, timeoutMs);
		});
	}

	// @ts-expect-error
	function log(...args) {
		if (logFlag) console.log(`[${projName}]`, ...args);
	}
})();
