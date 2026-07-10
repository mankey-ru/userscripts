// ==UserScript==
// @name         [HH-VACTRAK] HH.ru vacancy tracker
// @description  Reloads the page every N minutes and alerts you if there are new vacancies on the page since the last check. It uses localStorage to remember which vacancies have already been seen.
// @author       mankey-ru
// @namespace    mankey-ru/hh-vactrak
// @version      1.68
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://rabota.by/search/vacancy?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        unsafeWindow
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/hh-vactrak.user.js
// ==/UserScript==


"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/hh-vactrak.user.ts
  var VacTrak = class {
    constructor() {
      __publicField(this, "vacMemKeyBase", "vacMem");
      __publicField(this, "vacMemKey", `${this.vacMemKeyBase}__${window.location.search}`);
      /** @type {string} @private */
      __publicField(this, "vacMemVersion", "1.1");
      /** @type {number} @private */
      __publicField(this, "vacTrakIntervalMins", 3);
      /** @type {number} @private */
      __publicField(this, "jitterSeconds", 5);
      // ±30 секунд fuzzing
      // @ts-expect-error
      __publicField(this, "log", (...args) => {
        console.log(`[VacTrak v${this.vacMemVersion}]`, ...args);
      });
    }
    /**
     * Рекурсивный таймер с jitter
     * @private
     */
    scheduleNextReload() {
      const baseMs = 1e3 * 60 * this.vacTrakIntervalMins;
      const jitterMs = Math.floor(Math.random() * (2 * this.jitterSeconds * 1e3 + 1)) - this.jitterSeconds * 1e3;
      const nextDelay = baseMs + jitterMs;
      this.topScreenProgressBar(nextDelay);
      this.log(
        `\u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0430\u044F \u043F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0447\u0435\u0440\u0435\u0437 ${(nextDelay / 1e3).toFixed(1)} \u0441\u0435\u043A (jitter ${jitterMs} \u043C\u0441)`
      );
      setTimeout(() => {
        if (document.querySelector(`.chatik-integration_visible`)) {
          this.log(`Chatik detected. Not reloading the page`);
          this.scheduleNextReload();
        } else {
          this.log(`No new vacancies found. Reloading the page`);
          window.location.reload();
        }
      }, nextDelay);
    }
    run() {
      this.log(`
Loaded.
Next check in: ${this.vacTrakIntervalMins} minute(s) \xB1 ${this.jitterSeconds} sec jitter. 
Key is "${this.vacMemKey}"`);
      unsafeWindow.vacTrak = this;
      if (this.getNewVacs().length) {
        this.processNewVacs();
      }
      this.cleanOutdatedVacs();
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
      return Array.from(document.querySelectorAll(`[data-qa='vacancy-serp__vacancy']`)).map((el) => el.querySelector(`[class^="vacancy-card--"]`)?.id).filter((id) => !!id && this.isVacIdString(id));
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
     */
    processNewVacs() {
      const newVacs = this.getNewVacs();
      const vacMem = this.getVacMem();
      let newVacsNames = [];
      if (newVacs.length) {
        newVacs.forEach((vacId) => {
          vacMem[vacId] = (/* @__PURE__ */ new Date()).toISOString();
          const vacEl = document.getElementById(vacId);
          if (vacEl) {
            vacEl.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
            const vacNameEl = vacEl.querySelector(`[data-qa='serp-item__title-text']`);
            if (vacNameEl) {
              newVacsNames.push(`[${vacId}] ${vacNameEl.textContent.trim()}`);
            }
          }
        });
        GM_notification({
          title: `\u041D\u043E\u0432\u044B\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438!`,
          text: `${newVacsNames.join(";\n")}`,
          // timeout: 60 * 60 * 1000,
          highlight: true,
          onclick: (evt) => {
            unsafeWindow.focus();
            GM_openInTab(window.location.href, { active: true });
          }
        });
        this.setVacMem(vacMem);
        return true;
      }
      return false;
    }
    /** Удаляет из localStorage вакансии, которых нет на текущей странице */
    cleanOutdatedVacs() {
      const vacMem = this.getVacMem();
      const vacIdsOnPage = this.getVacIdsOnPage();
      for (const vacId in vacMem) {
        if (this.isVacIdString(vacId) && !vacIdsOnPage.includes(vacId)) {
          delete vacMem[vacId];
        }
      }
      this.setVacMem(vacMem);
    }
    /** Получить память о вакансиях */
    getVacMem() {
      const stored = localStorage.getItem(this.vacMemKey);
      if (!stored) {
        return {};
      }
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed !== "object" || parsed === null) {
          return {};
        }
        return parsed;
      } catch (e) {
        console.warn("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u0430\u0440\u0441\u0438\u0442\u044C VacMem \u0438\u0437 localStorage", e);
        return {};
      }
    }
    /** Запомнить вакансии в localStorage */
    setVacMem(vacMem) {
      localStorage.setItem(this.vacMemKey, JSON.stringify(vacMem));
    }
    /** Очистить вакансии 	orage */
    clearVacMem() {
      localStorage.removeItem(this.vacMemKey);
      window.location.reload();
    }
    topScreenProgressBar(durationMs = 6e4, color = "#00ff00") {
      let bar = document.getElementById("progress-bar-top");
      if (!bar) {
        bar = document.createElement("div");
        bar.id = "progress-bar-top";
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
        document.documentElement.appendChild(bar);
      }
      bar.style.width = "0%";
      bar.style.background = color;
      const startTime = Date.now();
      const interval = 50;
      const timer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / durationMs * 100, 100);
        bar.style.width = `${progress}%`;
        if (progress >= 100) {
          clearInterval(timer);
        }
      }, interval);
      return { bar, timer };
    }
  };
  if (document.body.innerHTML.includes(
    "<p><b>502 - Bad Gateway .</b> <ins>That\u2019s an error.</ins></p><p>Looks like we have got an invalid response from the upstream server.  <ins>That\u2019s all we know.</ins></p>"
  )) {
    window.location.reload();
  }
  new VacTrak().run();
})();
