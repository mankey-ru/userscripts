// ==UserScript==
// @name         [VACTRAK] Vacancy Tracker
// @description  Reloads the page every N minutes, alerts you if there are new vacancies on the page since the last check via system notification and, if some settings are enabled, sends a notification to backend service with postgres and Telegam notifications
// @author       mankey-ru
// @namespace    mankey-ru/vactrak-usercript
// @version      3.1.2
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://hh1.az/search/vacancy?*
// @match        https://rabota.by/search/vacancy?*
// @match        https://career.habr.com/vacancies?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        unsafeWindow
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/vactrak.user.js
// ==/UserScript==

import { repoUrl } from './_shared.js';

const sourceAdapters: Record<CreateVacancyDto['source'], SourceAdapter> = {
	hh: {
		getVacIds() {
			const vacEls = document.querySelectorAll(`[data-qa='vacancy-serp__vacancy']`);
			return Array.from(vacEls)
				.map((el) => el.querySelector(`[class^="vacancy-card--"]`)?.id)
				.filter((id): id is string => typeof id === 'string');
		},
		getVacEl(vacId) {
			return document.getElementById(vacId);
		},
		getVacNameEl(vacEl) {
			return vacEl.querySelector(`[data-qa='serp-item__title-text']`);
		},
		getCompanyEl(vacEl) {
			return vacEl.querySelector(`[data-qa='vacancy-serp__vacancy-employer-text']`);
		},
		hasReloadBlockingElements() {
			return !!document.querySelector(`.chatik-integration_visible`);
		},
		getVacUrl(vacId) {
			return `https://hh.ru/vacancy/${vacId}`;
		},
		hasUnsuitableMarkers(vacEl) {
			return !!(
				vacEl?.querySelector?.('[data-qa="vacancy-serp__vacancy_responded"]') ||
				vacEl?.querySelector?.('[data-qa="vacancy-serp__vacancy_discard"]')
			);
		},
	},
	habr: {
		getVacIds() {
			const vacEls = document.querySelectorAll(`[data-vacancy-card]`);
			return Array.from(vacEls)
				.map((el) => el.getAttribute('data-vacancy-id'))
				.filter((id): id is string => typeof id === 'string');
		},
		getVacEl(vacId) {
			return document.querySelector(`[data-vacancy-card][data-vacancy-id="${vacId}"]`);
		},
		getVacNameEl(vacEl) {
			return vacEl.querySelector(`.vacancy-card__title-link`);
		},
		getCompanyEl(vacEl) {
			return vacEl.querySelector(`.vacancy-card__company .link-comp`);
		},
		hasReloadBlockingElements() {
			return false;
		},
		getVacUrl(vacId) {
			return `https://career.habr.com/vacancies/${vacId}`;
		},
		hasUnsuitableMarkers() {
			return false;
		},
	},
};

class VacTrak {
	private fetchInProgress = false;
	private vacTrakIntervalMins = 2;
	private jitterSeconds = 30; // ±30 секунд fuzzing
	private vacTrakUrl = 'https://vactrak-api.onrender.com/';
	private vacTrakToken = '';
	private source: CreateVacancyDto['source'] = window.location.hostname.includes('.habr.')
		? 'habr'
		: 'hh';
	private page: SourceAdapter = sourceAdapters[this.source];

	constructor() {
		const urlParams = this.getUrlParamsObj();
		if (urlParams.use_vactrak !== 'yes') {
			this.log('⚠️ VacTrak is disabled. Add `&use_vactrak=yes` to the URL to enable it.');
			return;
		}
		const { VACTRAK_URL, VACTRAK_INTERVAL, VACTRAK_TOKEN } = window.localStorage;
		let backendMsg = 'Using only client-side logic (localStorage.VACTRAK_TOKEN not set).';
		if (VACTRAK_TOKEN) {
			this.vacTrakUrl = (VACTRAK_URL || this.vacTrakUrl).replace(/\/$/, '').trim(); // удаляем концевой слеш, если есть
			this.vacTrakToken = VACTRAK_TOKEN;
			backendMsg = `New vacancies will be sent to backend: ${this.vacTrakUrl}. `;
		}
		if (VACTRAK_INTERVAL) {
			this.vacTrakIntervalMins = Math.max(1, VACTRAK_INTERVAL | 0);
		}

		this.log(
			`Loaded.
Source is "${this.source}".
Next check in: ${this.vacTrakIntervalMins} minute(s) ± ${this.jitterSeconds} sec jitter.
Storage key is "${this.getVacMemKey()}"
${backendMsg}
`.trim(),
		);

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

		const titlePrefix = this.getSearchKey() || 'VacTrak';
		document.title = `【${titlePrefix}】${document.title}`;

		this.cleanOutdatedVacs();
		this.animateTitleCircle();
		this.scheduleNextReload();
	}

	private getVacMemKey = (): string => {
		const vacMemKeyPrefix = 'vacTrak';
		const keySuffix = this.getSearchKey() || window.location.search;
		return `${vacMemKeyPrefix}__${keySuffix}`;
	};

	private getSearchKey = (): string => {
		const urlParams = this.getUrlParamsObj();
		return typeof urlParams?.vactrak_search_key === 'string'
			? urlParams.vactrak_search_key
			: '';
	};

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
			if (this.page.hasReloadBlockingElements()) {
				this.log(`Reload blocking elements found. Not reloading the page`);
				this.scheduleNextReload(); // продолжаем таймер
			}
			if (this.fetchInProgress) {
				// на случай долго просыпающегося инстанса
				// лучше дождаться ответа
				this.log(`Fetch in progress. Not reloading the page`);
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

	/** Получить новые вакансии, которых нет в localStorage */
	private getUnsavedVacIds(): string[] {
		const vacMem = this.getVacMem();
		const vacIdsOnPage = this.page.getVacIds();
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
			const newVacDetails: CreateVacancyDto[] = [];
			const newVacIds = newVacs.map((vacId) => vacId);
			if (newVacs.length) {
				newVacs.forEach((vacId, index) => {
					vacMem[vacId] = new Date().toISOString() as IsoDateTimeString;
					const vacEl = this.page.getVacEl(vacId);
					if (vacEl) {
						if (index === 0) {
							vacEl.scrollIntoView();
						}
						vacEl.style.backgroundColor = this.colors.fresh;
						const vacNameEl = this.page.getVacNameEl(vacEl);
						const vacCompanyEl = this.page.getCompanyEl(vacEl);
						newVacDetails.push({
							id_ext: vacId,
							title: vacNameEl?.textContent?.trim() || '<notitle>',
							company: vacCompanyEl?.textContent?.trim() || '<nocompany>',
							filter_json: this.getUrlParamsObj(),
							source: this.source,
							search_key: this.getSearchKey(),
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
								GM_openInTab(this.page.getVacUrl(vacId), {
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

			if (this.vacTrakUrl && this.vacTrakToken) {
				this.sendVacList(newVacDetails);
			}
			return true;
		}
		return false;
	}

	/** Удаляет из localStorage неподходящие вакансии */
	private cleanOutdatedVacs() {
		const vacMem = this.getVacMem();
		for (const vacId in vacMem) {
			if (this.isNotSuitable(vacId)) {
				delete vacMem[vacId];
			}
		}

		this.setVacMem(vacMem);
	}

	private isNotSuitable(vacId: string) {
		const vacMem = this.getVacMem();
		const vacEl = this.page.getVacEl(vacId);
		return isOld(vacMem[vacId]) || this.page.hasUnsuitableMarkers(vacEl);

		/** Определяет, что вакансия была запомнена более чем maxDays назад */
		function isOld(ds1: IsoDateTimeString, maxDays = 30) {
			const msInDay = 1000 * 60 * 60 * 24;
			const diffInDays = Math.abs(Date.now() - new Date(ds1).getTime()) / msInDay;
			return Math.floor(diffInDays) >= maxDays;
		}
	}

	/** Получить память о вакансиях */
	private getVacMem(): VacMemObj {
		const stored = localStorage.getItem(this.getVacMemKey());

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
		localStorage.setItem(this.getVacMemKey(), JSON.stringify(vacMem));
	}
	/** Очистить вакансии */
	clearVacMem() {
		localStorage.removeItem(this.getVacMemKey());
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

	private getUrlParamsObj = () => {
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

	private async sendVacList(newVacDetails: CreateVacancyDto[]) {
		try {
			this.fetchInProgress = true;
			let res = await fetch(`${this.vacTrakUrl}/api/vac`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: `Bearer ${this.vacTrakToken}`,
				},
				body: JSON.stringify({
					vacancyList: newVacDetails,
				}),
			});
			let resJson = await res.json();
			this.log(`Запрос VACTRAK_URL ответил`, resJson);
		} catch (error) {
			this.log(`⚠️ Запрос VACTRAK_URL не удался`, error);
		} finally {
			this.fetchInProgress = false;
		}
	}

	sendTestVac() {
		const vacId = String(Math.floor(Math.random() * 100000));
		this.sendVacList([
			{
				id_ext: vacId,
				title: `title ${vacId}`,
				company: `company ${vacId}`,
				filter_json: this.getUrlParamsObj(),
				source: this.source,
				search_key: `_______sendTestVac_______`,
			},
		]);
	}
}

new VacTrak();

/*
 *
 *
 *
 *
 *  ===================================================================
 *  							Типы
 *  ===================================================================
 *
 *
 *
 *
 */

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

type CreateVacancyDto = {
	/** vacancy id на хедхантере */
	id_ext: string;
	/** имя вакансии */
	title: string;
	/** имя компании */
	company: string;
	/** фильтр вакансий */
	filter_json: FilterJson;
	/** источник */
	source: 'hh' | 'habr';
	/** ключ поискового запроса */
	search_key?: string;
};

type FilterJson = Record<string, string | string[]>;

/** Page-source strategy: all DOM/URL differences live here, VacTrak stays source-agnostic. */
type SourceAdapter = {
	/** Get all vacancy ids on the current page */
	getVacIds(): string[];
	/** Vacancy card element in the SERP list */
	getVacEl(vacId: string): HTMLElement | null;
	/** Vacancy title element inside a card */
	getVacNameEl(vacEl: HTMLElement): Element | null;
	/** Company name element inside a card */
	getCompanyEl(vacEl: HTMLElement): Element | null;
	/** Whether something on the page should block auto-reload */
	hasReloadBlockingElements(): boolean;
	/** Canonical vacancy URL for a given id */
	getVacUrl(vacId: string): string;
	/** SERP markers that mean the vacancy is not a "new" candidate (responded, discarded, …) */
	hasUnsuitableMarkers(vacEl: HTMLElement | null): boolean;
};
