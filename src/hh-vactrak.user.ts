// ==UserScript==
// @name         [HH-VACTRAK] HH.ru vacancy tracker
// @description  Reloads the page every N minutes and alerts you if there are new vacancies on the page since the last check. It uses localStorage to remember which vacancies have already been seen.
// @author       mankey-ru
// @namespace    mankey-ru/hh-vactrak
// @version      1.70
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://rabota.by/search/vacancy?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        unsafeWindow
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/hh-vactrak.user.js
// ==/UserScript==

class VacTrak {
	private vacMemKeyBase: string = 'vacMem';
	vacMemKey: string = `${this.vacMemKeyBase}__${window.location.search}`;
	constructor() {}

	/** @type {string} @private */
	private vacMemVersion = '1.1';
	/** @type {number} @private */
	private vacTrakIntervalMins = 3;
	/** @type {number} @private */
	private jitterSeconds = 5; // ±30 секунд fuzzing

	// @ts-expect-error
	private log = (...args) => {
		console.log(`[VacTrak v${this.vacMemVersion}]`, ...args);
	};

	/**
	 * Рекурсивный таймер с jitter
	 * @private
	 */
	scheduleNextReload() {
		const baseMs = 1000 * 60 * this.vacTrakIntervalMins;
		const jitterMs =
			Math.floor(Math.random() * (2 * this.jitterSeconds * 1000 + 1)) -
			this.jitterSeconds * 1000;

		const nextDelay = baseMs + jitterMs;

		this.topScreenProgressBar(nextDelay); // запускаем прогресс бар сверху экрана

		this.log(
			`Следующая перезагрузка через ${(nextDelay / 1000).toFixed(1)} сек (jitter ${jitterMs} мс)`,
		);

		setTimeout(() => {
			if (document.querySelector(`.chatik-integration_visible`)) {
				this.log(`Chatik detected. Not reloading the page`);
				this.scheduleNextReload(); // продолжаем таймер
			} else if (this.getNewVacs().length) {
				this.log(`New vacancies found. Not reloading the page`);
				this.scheduleNextReload(); // продолжаем таймер
			} else {
				this.log(`No new vacancies found. Reloading the page`);
				window.location.reload();
			}
		}, nextDelay);
	}

	run() {
		this.log(`
Loaded.
Next check in: ${this.vacTrakIntervalMins} minute(s) ± ${this.jitterSeconds} sec jitter.
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
	private isVacIdString(id: string): id is VacIdString {
		return /^\d+$/.test(id);
	}

	/**
	 * Получить новые вакансии, которых нет в localStorage
	 * @returns {VacIdString[]}
	 * @private
	 */
	private getNewVacs() {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.getVacIdsOnPage();
		const newVacs = vacIdsOnPage.filter((id) => !vacMem[id]);
		return newVacs;
	}

	/**
	 * Обрабатывает новые вакансии: сохраняет их в localStorage, подсвечивает на странице и показывает уведомление
	 * @returns {boolean} true если были новые вакансии, false если нет
	 */
	private processNewVacs(): boolean {
		const newVacs = this.getNewVacs();
		const vacMem = this.getVacMem();

		if (newVacs.length) {
			// сортируем
			// Object.entries(vacMem).sort(([, a], [, b]) => new Date(a) - new Date(b))
			const newVacsNames: string[] = [];
			const newVacIds = newVacs.map((vacId) => vacId);
			if (newVacs.length) {
				newVacs.forEach((vacId) => {
					vacMem[vacId] = new Date().toISOString() as IsoDateTimeString;
					const vacEl = document.getElementById(vacId);
					if (vacEl) {
						vacEl.style.backgroundColor = this.colors.fresh;
						const vacNameEl = vacEl.querySelector(`[data-qa='serp-item__title-text']`);
						if (vacNameEl) {
							newVacsNames.push(`[${vacId}] ${vacNameEl.textContent.trim()}`);
						}
					}
				});
				newVacs.reverse()[0];
			}
			// Notification.requestPermission().then((permission) => {
			// 	if (permission === 'granted') {
			// 		new Notification(`Новые вакансии:\n${newVacsNames.join(';\n')}`);
			// 	}
			// }

			GM_notification({
				title: `Новые вакансии!`,
				text: `${newVacsNames.join(';\n')}`,
				// timeout: 60 * 60 * 1000,
				highlight: true,
				onclick: () => {
					newVacIds.forEach((vacId, index) => {
						// открываем с дилеем, чтобы браузер не залупнулся :)
						setTimeout(
							() => {
								GM_openInTab(`https://hh.ru/vacancy/${vacId}`, {
									active: index === 0,
									insert: true,
								});
							},
							300 * (index + 1),
						);
					});
					unsafeWindow.focus();
				},
			});
			this.setVacMem(vacMem);
			return true;
		}
		return false;
	}

	/** Удаляет из localStorage вакансии, которых нет на текущей странице */
	private cleanOutdatedVacs() {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.getVacIdsOnPage();
		for (const vacId in vacMem) {
			if (this.isVacIdString(vacId)) {
				const vacEl = document.getElementById(vacId);
				if (vacEl?.textContent?.includes?.('You have applied')) {
					// Случай, когда вакансии возникают снова
					delete vacMem[vacId];
				}
				if (isOld(vacMem[vacId])) {
					delete vacMem[vacId];
				}
			}
		}
		/** Определяет, что вакансия была запомнена более чем maxDays назад */
		function isOld(ds1: IsoDateTimeString) {
			const maxDays = 20;
			const msInDay = 1000 * 60 * 60 * 24;
			const diffInDays = Math.abs(Date.now() - new Date(ds1).getTime()) / msInDay;
			return Math.floor(diffInDays) >= maxDays;
		}
		this.setVacMem(vacMem);
	}

	/** Получить память о вакансиях */
	private getVacMem(): VacMemItem {
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

			return parsed;
		} catch (e) {
			console.warn('Не удалось распарсить VacMem из localStorage', e);
			return {};
		}
	}
	/** Запомнить вакансии в localStorage */
	setVacMem(vacMem: VacMemItem) {
		localStorage.setItem(this.vacMemKey, JSON.stringify(vacMem));
	}
	/** Очистить вакансии 	orage */
	clearVacMem() {
		localStorage.removeItem(this.vacMemKey);
		window.location.reload();
	}
	topScreenProgressBar(durationMs = 60000, color = '#00ff00') {
		let bar = document.getElementById('progress-bar-top');

		// Создаём элемент, если его нет
		if (!bar) {
			bar = document.createElement('div');
			bar.id = 'progress-bar-top';
			bar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                height: 3px;
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

	colors = {
		fresh: 'rgba(255, 255, 0, 0.2)',
		old: 'rgba(222, 0, 11, 0.2)',
	};
}

if (
	document.body.innerHTML.includes(
		'<p><b>502 - Bad Gateway .</b> <ins>That’s an error.</ins></p><p>Looks like we have got an invalid response from the upstream server.  <ins>That’s all we know.</ins></p>',
	)
) {
	window.location.reload();
}
new VacTrak().run();

/** Запускает progress bar сверху экрана */

/** ID вакансии в виде строки, которая может быть использована как ключ в объекте */
type VacIdString = `${number}`;
/**
 * ISO 8601 строка в формате, который возвращает `new Date().toISOString()`
 * Пример: "2026-07-08T13:24:56.789Z"
 */
type IsoDateTimeString =
	`${number}${number}${number}${number}-${number}${number}-${number}${number}T${number}${number}:${number}${number}:${number}${number}.${number}${number}${number}Z`;

/** Запись в localStorage id вакансии : дата сохранения */
type VacMemItem = Record<VacIdString, IsoDateTimeString>;
