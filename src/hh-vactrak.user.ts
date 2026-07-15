// ==UserScript==
// @name         [HH-VACTRAK] HH.ru vacancy tracker
// @description  Reloads the page every N minutes and alerts you if there are new vacancies on the page since the last check. It uses localStorage to remember which vacancies have already been seen.
// @author       mankey-ru
// @namespace    mankey-ru/hh-vactrak
// @version      2.0.0
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://rabota.by/search/vacancy?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        unsafeWindow
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/hh-vactrak.user.js
// ==/UserScript==

import { repoUrl } from './_shared.js';

class VacTrak {
	private vacMemKeyBase: string = 'vacMem';
	vacMemKey: string = `${this.vacMemKeyBase}__${window.location.search}`;
	constructor() {}

	private vacTrakIntervalMins = 2;
	private jitterSeconds = 30; // ±30 секунд fuzzing
	private vacTrakUrl = '';

	private getSettings() {
		const { VACTRAK_URL, VACTRAK_INTERVAL } = window.localStorage;
		if (VACTRAK_URL) this.vacTrakUrl = VACTRAK_URL.replace(/\/$/, '').trim(); // удаляем концевой слеш, если есть
		if (VACTRAK_INTERVAL) this.vacTrakIntervalMins = Math.max(1, VACTRAK_INTERVAL | 0);
	}

	init() {
		if (new URLSearchParams(window.location.search).get('use_vactrak') !== 'yes') {
			this.log('⚠️ VacTrak is disabled. Add `&use_vactrak=yes` to the URL to enable it.');
			return;
		}
		this.getSettings();
		this.log(
			`Loaded.
Next check in: ${this.vacTrakIntervalMins} minute(s) ± ${this.jitterSeconds} sec jitter.
Key is "${this.vacMemKey}"
`.trim(),
		);
		if (this.vacTrakUrl) {
			this.log(`⚠️ Vacancies will be sent to vacTrak URL: ${this.vacTrakUrl}. `);
		}

		if (
			document.body.innerHTML.includes(
				'<p><b>502 - Bad Gateway .</b> <ins>That’s an error.</ins></p><p>Looks like we have got an invalid response from the upstream server.  <ins>That’s all we know.</ins></p>',
			)
		) {
			unsafeWindow.location.reload();
		}

		// @ts-expect-error
		unsafeWindow.vacTrak = this;

		if (this.getNewVacs().length) {
			this.processNewVacs();
		}

		this.cleanOutdatedVacs();
		this.animateTitleCircle();
		this.scheduleNextReload();
	}

	// @ts-expect-error
	private log = (...args) => {
		console.log(`[VacTrak]`, ...args);
	};

	/** Рекурсивный таймер с jitter */
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
			}
			// else if (this.getNewVacs().length) {
			// 	this.log(`New vacancies found. Not reloading the page`);
			// 	this.scheduleNextReload(); // продолжаем таймер
			// }
			else {
				this.log(`Reloading the page`);
				window.location.reload();
			}
		}, nextDelay);
	}

	/** Получить все id вакансий на текущей странице	 */
	private getVacIdsOnPage() {
		return Array.from(document.querySelectorAll(`[data-qa='vacancy-serp__vacancy']`))
			.map((el) => el.querySelector(`[class^="vacancy-card--"]`)?.id)
			.filter((id) => typeof id === 'string');
	}

	/** Получить новые вакансии, которых нет в localStorage */
	private getUnsavedVacIds(): string[] {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.getVacIdsOnPage();
		const newVacs = vacIdsOnPage.filter((id) => !vacMem[id]);
		return newVacs;
	}

	/** Получить новые вакансии */
	private getNewVacs(): string[] {
		const unsavedVacIds = this.getUnsavedVacIds();
		const newVacs = unsavedVacIds.filter((vacId) => !this.isNotSuitable(vacId));
		return newVacs;
	}

	/** Обрабатывает новые вакансии: сохраняет их в localStorage, подсвечивает на странице и показывает уведомление */
	private async processNewVacs(): Promise<boolean> {
		const newVacs = this.getNewVacs();
		const vacMem = this.getVacMem();

		if (newVacs.length) {
			// сортируем
			// Object.entries(vacMem).sort(([, a], [, b]) => new Date(a) - new Date(b))
			type VacDetails = { id: number; title: string; company: string };
			const newVacDetails: VacDetails[] = [];
			const newVacIds = newVacs.map((vacId) => vacId);
			if (newVacs.length) {
				newVacs.forEach((vacId, index) => {
					vacMem[vacId] = new Date().toISOString() as IsoDateTimeString;
					const vacEl = document.getElementById(vacId);
					if (vacEl) {
						if (index === 0) {
							vacEl.scrollIntoView();
						}
						vacEl.style.backgroundColor = this.colors.fresh;
						const vacNameEl = vacEl.querySelector(`[data-qa='serp-item__title-text']`);
						const vacCompanyEl = vacEl.querySelector(
							`[data-qa='vacancy-serp__vacancy-employer-text']`,
						);
						newVacDetails.push({
							id: +vacId,
							title: vacNameEl?.textContent.trim() || '<notitle>',
							company: vacCompanyEl?.textContent.trim() || '<nocompany>',
						});
					}
				});
				newVacs.reverse()[0];
			}
			// Notification.requestPermission().then((permission) => {
			// 	if (permission === 'granted') {
			// 		new Notification(`Новые вакансии:\n${newVacsNames.join(';\n')}`);
			// 	}
			// }

			new Audio(`${repoUrl}/assets/sound/kirov.mp3`)
				.play()
				.catch((err) => this.log('Не удалось воспроизвести звук', err));

			GM_notification({
				title: `Новые вакансии (${newVacDetails.length})`,
				text: `${newVacDetails.map((d) => `${d.title} @ ${d.company}`).join(';\n')}`,
				// timeout: 60 * 60 * 1000,
				highlight: true,
				silent: false,
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
			this.animateTitleCircle('⚠️');
			this.setVacMem(vacMem);

			if (this.vacTrakUrl) {
				try {
					let res = await fetch(`${this.vacTrakUrl}/api/hh/vac`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Accept: 'application/json',
						},
						body: JSON.stringify({
							// filterParams: this.getFilterParams(),
							vacancyList: newVacDetails
						}),
					});
					let resJson = await res.json();
					this.log(`Запрос VACTRAK_URL ответил`, resJson);
				} catch (error) {
					this.log(`⚠️ Запрос VACTRAK_URL не удался`, error);
				}
			}
			return true;
		}
		return false;
	}

	/** Удаляет из localStorage неподходящие вакансии */
	private cleanOutdatedVacs() {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.getVacIdsOnPage();
		for (const vacId in vacMem) {
			if (this.isNotSuitable(vacId)) {
				delete vacMem[vacId];
			}
		}

		this.setVacMem(vacMem);
	}

	private isNotSuitable(vacId: string) {
		const vacMem = this.getVacMem();
		const vacEl = document.getElementById(vacId);
		return (
			isOld(vacMem[vacId]) ||
			vacEl?.querySelector?.('[data-qa="vacancy-serp__vacancy_responded"]') ||
			vacEl?.querySelector?.('[data-qa="vacancy-serp__vacancy_discard"]')
		);

		/** Определяет, что вакансия была запомнена более чем maxDays назад */
		function isOld(ds1: IsoDateTimeString, maxDays = 30) {
			const msInDay = 1000 * 60 * 60 * 24;
			const diffInDays = Math.abs(Date.now() - new Date(ds1).getTime()) / msInDay;
			return Math.floor(diffInDays) >= maxDays;
		}
	}

	/** Получить память о вакансиях */
	private getVacMem(): VacMemObj {
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
	setVacMem(vacMem: VacMemObj) {
		localStorage.setItem(this.vacMemKey, JSON.stringify(vacMem));
	}
	/** Очистить вакансии */
	clearVacMem() {
		localStorage.removeItem(this.vacMemKey);
		window.location.reload();
	}

	/** Запускает progress bar сверху экрана */
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

	private colors = {
		fresh: 'rgba(255, 255, 0, 0.2)',
		old: 'rgba(222, 0, 11, 0.2)',
	};

	private getFilterParams = () => {
		const params: Record<string, string | string[]> = {};
		new URLSearchParams(window.location.search).forEach((value, key) => {
			if (params[key]) {
				params[key] = Array.isArray(params[key])
					? [...params[key], value]
					: [params[key], value];
			} else {
				params[key] = value;
			}
		});
		return params;
	};

	/** Делает мигалку. Если передать customEmoji — останавливает анимацию и ставит его. */
	private animateTitleCircle(customEmoji?: string) {
		let faviconBlinkInterval: number | undefined = undefined;
		let isBlinking = false;
		let currentIndex = 0;
		const emojis = ['🔴', '⭕'];

		// Внутренняя функция смены фавикона
		const setFaviconEmoji = (emoji: string) => {
			document.querySelectorAll('link[rel*="icon"]').forEach((link) => link.remove());

			const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
			const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;

			const link = document.createElement('link');
			link.rel = 'icon';
			link.type = 'image/svg+xml';
			link.href = dataUrl;
			document.head.appendChild(link);
		};

		// Если передан кастомный эмодзи — ставим его и останавливаем мигалку
		if (customEmoji) {
			if (faviconBlinkInterval) {
				clearInterval(faviconBlinkInterval);
				faviconBlinkInterval = undefined;
			}
			isBlinking = false;
			setFaviconEmoji(customEmoji);
			return;
		}

		// Toggle-режим (без параметра)
		if (isBlinking) {
			clearInterval(faviconBlinkInterval);
			faviconBlinkInterval = undefined;
			isBlinking = false;
			return;
		}

		isBlinking = true;
		currentIndex = 0;
		setFaviconEmoji(emojis[0]);

		faviconBlinkInterval = setInterval(() => {
			currentIndex = (currentIndex + 1) % emojis.length;
			setFaviconEmoji(emojis[currentIndex]);
		}, 1000);
	}
}

new VacTrak().init();

/** ID вакансии в виде строки, которая может быть использована как ключ в объекте */
type VacIdString = `${number}`;
/**
 * ISO 8601 строка в формате, который возвращает `new Date().toISOString()`
 * Пример: "2026-07-08T13:24:56.789Z"
 */
type IsoDateTimeString =
	`${number}${number}${number}${number}-${number}${number}-${number}${number}T${number}${number}:${number}${number}:${number}${number}.${number}${number}${number}Z`;

/** Запись в localStorage id вакансии : дата сохранения */
type VacMemObj = Record<string, IsoDateTimeString>;

/** Разбивает массив на подмассивы (чанки) фиксированного максимального размера. */
export function arrToChunks<T>(arr: readonly T[], size: number): T[][] {
	if (size <= 0 || !arr.length) return [];

	return arr.reduce((chunks: T[][], item: T, index: number) => {
		if (index % size === 0) {
			chunks.push([]);
		}
		chunks[chunks.length - 1].push(item);
		return chunks;
	}, [] as T[][]);
}
