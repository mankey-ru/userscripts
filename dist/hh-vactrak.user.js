// @ts-check
// ==UserScript==
// @name         [HH-VACTRAK] HH.ru vacancy tracker
// @description  Reloads the page every N minutes and alerts you if there are new vacancies on the page since the last check. It uses localStorage to remember which vacancies have already been seen.
// @author       mankey-ru
// @namespace    mankey-ru/hh-vactrak
// @version      1.0.0
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://raboya.by/search/vacancy?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        unsafeWindow
// @updateURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/hh-vactrak.user.js
// ==/UserScript==

(function () {
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
				Math.floor(Math.random() * (2 * VacTrak.jitterSeconds * 1000 + 1)) -
				VacTrak.jitterSeconds * 1000;

			const nextDelay = baseMs + jitterMs;

			VacTrak.log(
				`Следующая перезагрузка через ${(nextDelay / 1000).toFixed(1)} сек (jitter ${jitterMs} мс)`,
			);

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
		/** Очистить вакансии в localStorage
		 * @param {VacMem} vacMem */
		clearVacMem(vacMem) {
			localStorage.removeItem(this.vacMemKey);
			window.location.reload();
		}
	}

	new VacTrak().run();
})();
