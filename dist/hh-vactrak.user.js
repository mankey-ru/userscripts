// ==UserScript==
// @name         [HH-VACTRAK] HH.ru vacancy tracker
// @description  Reloads the page every N minutes and alerts you if there are new vacancies on the page since the last check. It uses localStorage to remember which vacancies have already been seen.
// @author       mankey-ru
// @namespace    mankey-ru/hh-vactrak
// @version      1.64
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://rabota.by/search/vacancy?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        unsafeWindow
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/hh-vactrak.user.js
// ==/UserScript==

class VacTrak {
	constructor(vacMemKeyBase = 'vacMem') {
		this.vacMemKey = `${vacMemKeyBase}__${window.location.search}`;
	}

	/** @type {string} @private */
	static vacMemVersion = '1.1';
	/** @type {number} @private */
	static vacTrakIntervalMins = 3;
	/** @type {number} @private */
	static jitterSeconds = 5; // ±30 секунд fuzzing

	// @ts-expect-error
	static log = (...args) => {
		console.log(`[VacTrak v${VacTrak.vacMemVersion}]`, ...args);
	};

	/**
	 * Рекурсивный таймер с jitter
	 * @private
	 */
	scheduleNextReload() {
		const baseMs = 1000 * 60 * VacTrak.vacTrakIntervalMins;
		const jitterMs =
			Math.floor(Math.random() * (2 * VacTrak.jitterSeconds * 1000 + 1)) - VacTrak.jitterSeconds * 1000;

		const nextDelay = baseMs + jitterMs;

		topScreenProgressBar(nextDelay); // запускаем прогресс бар сверху экрана

		VacTrak.log(`Следующая перезагрузка через ${(nextDelay / 1000).toFixed(1)} сек (jitter ${jitterMs} мс)`);

		setTimeout(() => {
			if (document.querySelector(`.chatik-integration_visible`)) {
				VacTrak.log(`Chatik detected. Not reloading the page`);
				this.scheduleNextReload(); // продолжаем таймер
			} else {
				VacTrak.log(`No new vacancies found. Reloading the page`);
				window.location.reload();
			}
		}, nextDelay);
	}

	run() {
		VacTrak.log(`
Loaded.
Next check in: ${VacTrak.vacTrakIntervalMins} minute(s) ± ${VacTrak.jitterSeconds} sec jitter. 
Key is "${this.vacMemKey}"`);

		// @ts-expect-error
		unsafeWindow.vacTrak = this;

		if (this.getNewVacs().length) {
			this.processNewVacs();
		}

		this.cleanOutdatedVacs();

		// Запускаем первый таймер с jitter
		this.scheduleNextReload();
	}

	// @ts-expect-error
	static log = (...args) => {
		console.log(`[VacTrak v${VacTrak.vacMemVersion}]`, ...args);
	};

	/**
	 * ISO 8601 строка в формате, который возвращает `new Date().toISOString()`
	 * Пример: "2026-07-08T13:24:56.789Z"
	 * @typedef {`${number}${number}${number}${number}-${number}${number}-${number}${number}T${number}${number}:${number}${number}:${number}${number}.${number}${number}${number}Z`} IsoDateTimeString
	 *
	 * ID вакансии в виде строки, которая может быть использована как ключ в объекте
	 * Пример: "12345678"
	 * @typedef {`${number}`} VacIdString
	 *
	 * Запись в localStorage id вакансии : дата сохранения
	 * Пример: "2026-07-08T13:24:56.789Z"
	 * @typedef {Record<VacIdString, IsoDateTimeString>} VacMem
	 */

	/**
	 * Получить все id вакансий на текущей странице
	 * @returns {VacIdString[]}
	 * @private
	 */
	getVacIdsOnPage() {
		return Array.from(document.querySelectorAll(`[data-qa='vacancy-serp__vacancy']`))
			.map((el) => el.querySelector(`[class^="vacancy-card--"]`)?.id)
			.filter((id) => !!id && this.isVacIdString(id));
	}

	/**
	 * @param {string} id
	 * @returns {id is VacIdString}
	 * @private
	 */
	isVacIdString(id) {
		return /^\d+$/.test(id);
	}

	/**
	 * Получить новые вакансии, которых нет в localStorage
	 * @returns {VacIdString[]}
	 * @private
	 */
	getNewVacs() {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.getVacIdsOnPage();
		const newVacs = vacIdsOnPage.filter((id) => !vacMem[id]);
		return newVacs;
	}

	/**
	 * Обрабатывает новые вакансии: сохраняет их в localStorage, подсвечивает на странице и показывает уведомление
	 * @returns {boolean} true если были новые вакансии, false если нет
	 * @private
	 */
	processNewVacs() {
		const newVacs = this.getNewVacs();
		const vacMem = this.getVacMem();
		/** @type {string[]} */
		let newVacsNames = [];
		if (newVacs.length) {
			// сортируем
			// Object.entries(vacMem).sort(([, a], [, b]) => new Date(a) - new Date(b))
			newVacs.forEach((vacId) => {
				vacMem[vacId] = /** @type {IsoDateTimeString} */ (new Date().toISOString());
				const vacEl = document.getElementById(vacId);
				if (vacEl) {
					vacEl.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
					const vacNameEl = vacEl.querySelector(`[data-qa='serp-item__title-text']`);
					if (vacNameEl) {
						newVacsNames.push(`[${vacId}] ${vacNameEl.textContent.trim()}`);
					}
				}
			});
			// Notification.requestPermission().then((permission) => {
			// 	if (permission === 'granted') {
			// 		new Notification(`Новые вакансии:\n${newVacsNames.join(';\n')}`);
			// 	}
			// }

			// @ts-expect-error
			GM_notification(`Новые вакансии:\n${newVacsNames.join(';\n')}`);
			this.setVacMem(vacMem);
			return true;
		}
		return false;
	}

	/**
	 * Удаляет из localStorage вакансии, которых нет на текущей странице
	 * @private
	 */
	cleanOutdatedVacs() {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.getVacIdsOnPage();
		for (const vacId in vacMem) {
			// @ts-expect-error
			if (!vacIdsOnPage.includes(vacId)) {
				// @ts-expect-error
				delete vacMem[vacId];
			}
		}
		this.setVacMem(vacMem);
	}

	/**
	 * Получить память о вакансиях
	 * Возвращает объект, где ключи - это id вакансий, а значения - это дата публикации вакансии в формате ISO 8601 (не всякая, а та что возвращается toIsoString())
	 * @returns Record<`${number}`, IsoDateTimeString>
	 * @private
	 */
	getVacMem() {
		const stored = localStorage.getItem(this.vacMemKey);

		if (!stored) {
			return {};
		}

		try {
			const parsed = JSON.parse(stored);

			// Опционально: runtime проверка структуры
			if (typeof parsed !== 'object' || parsed === null) {
				return {};
			}

			return /** @type {VacMem} */ (parsed);
		} catch (e) {
			console.warn('Не удалось распарсить VacMem из localStorage', e);
			return {};
		}
	}
	/** Запомнить вакансии в localStorage
	 * @param {VacMem} vacMem
	 * @private
	 */
	setVacMem(vacMem) {
		localStorage.setItem(this.vacMemKey, JSON.stringify(vacMem));
	}
	/** Очистить вакансии в localStorage */
	clearVacMem() {
		localStorage.removeItem(this.vacMemKey);
		window.location.reload();
	}
}

new VacTrak().run();

/**
 * Options object for the GM_notification function.
 * @typedef {Object} GMNotificationOptions
 * @property {string} text - The main body text of the notification.
 * @property {string} [title] - The title of the notification.
 * @property {string} [image] - URL of an image/icon to display in the notification.
 * @property {boolean} [highlight] - Whether to highlight the tab that sent the notification (defaults to false).
 * @property {boolean} [silent] - Whether to play no sound (defaults to false).
 * @property {number} [timeout] - Time in milliseconds after which the notification automatically closes.
 * @property {function} [onclick] - Callback function triggered when the user clicks on the notification.
 * @property {function} [ondone] - Callback function triggered when the notification is closed (either by timeout or user).
 */

/**
 * Displays a desktop notification to the user.
 * @global
 * @function GM_notification
 * @param {GMNotificationOptions|string} details - The notification options object, or the main text string.
 * @param {string} [title] - The title of the notification (only used if the first param is a string).
 * @param {string} [image] - URL of an icon (only used if the first param is a string).
 * @param {function} [onclick] - Click callback (only used if the first param is a string).
 * @returns {void}
 */

/**
 * Запускает progress bar сверху экрана на 60 секунд
 * @param {number} durationMs - длительность в мс (по умолчанию 60000)
 * @param {string} color - цвет бара (по умолчанию #00ff00)
 */
function topScreenProgressBar(durationMs = 60000, color = '#00ff00') {
	let bar = document.getElementById('progress-bar-top');

	// Создаём элемент, если его нет
	if (!bar) {
		bar = document.createElement('div');
		bar.id = 'progress-bar-top';
		bar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                height: 2px;
                background: ${color};
                width: 0%;
                z-index: 999999;
                transition: width 0.05s linear;
                pointer-events: none;
            `;
		document.documentElement.appendChild(bar); // или document.body
	}

	// Сброс и запуск
	bar.style.width = '0%';
	bar.style.background = color;

	const startTime = Date.now();
	const interval = 50;

	const timer = setInterval(() => {
		const elapsed = Date.now() - startTime;
		const progress = Math.min((elapsed / durationMs) * 100, 100);
		bar.style.width = `${progress}%`;

		if (progress >= 100) {
			clearInterval(timer);
			// bar.style.background = '#ff4444'; // цвет завершения
		}
	}, interval);

	return { bar, timer }; // для остановки при необходимости
}
