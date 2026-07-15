// ==UserScript==
// @name         [HH-VACTRAK] HH.ru vacancy tracker
// @description  Reloads the page every N minutes and alerts you if there are new vacancies on the page since the last check. It uses localStorage to remember which vacancies have already been seen.
// @author       mankey-ru
// @namespace    mankey-ru/hh-vactrak
// @version      1.83
// @match        https://hh.ru/search/vacancy?*
// @match        https://hh.uz/search/vacancy?*
// @match        https://rabota.by/search/vacancy?*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=hh.ru
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        unsafeWindow
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/hh-vactrak.user.js
// ==/UserScript==


"use strict";
(() => {
  // src/_shared.ts
  var repoUrl = "https://github.com/mankey-ru/userscripts";

  // src/hh-vactrak.user.ts
  var VacTrak = class {
    vacMemKeyBase = "vacMem";
    vacMemKey = `${this.vacMemKeyBase}__${window.location.search}`;
    constructor() {
    }
    vacTrakIntervalMins = 2;
    jitterSeconds = 30;
    // ±30 секунд fuzzing
    vacTrakUrl = "";
    getSettings() {
      const { VACTRAK_URL, VACTRAK_INTERVAL } = window.localStorage;
      if (VACTRAK_URL) this.vacTrakUrl = VACTRAK_URL;
      if (VACTRAK_INTERVAL) this.vacTrakIntervalMins = Math.max(1, VACTRAK_INTERVAL | 0);
    }
    init() {
      this.getSettings();
      this.log(
        `Loaded.
Next check in: ${this.vacTrakIntervalMins} minute(s) \xB1 ${this.jitterSeconds} sec jitter.
Key is "${this.vacMemKey}"
`.trim()
      );
      if (this.vacTrakUrl) {
        this.log(`\u26A0\uFE0F Vacancies will be sent to vacTrak URL: ${this.vacTrakUrl}. `);
      }
      if (document.body.innerHTML.includes(
        "<p><b>502 - Bad Gateway .</b> <ins>That\u2019s an error.</ins></p><p>Looks like we have got an invalid response from the upstream server.  <ins>That\u2019s all we know.</ins></p>"
      )) {
        unsafeWindow.location.reload();
      }
      unsafeWindow.vacTrak = this;
      if (this.getNewVacs().length) {
        this.processNewVacs();
      }
      this.cleanOutdatedVacs();
      this.animateTitleCircle();
      this.scheduleNextReload();
    }
    // @ts-expect-error
    log = (...args) => {
      console.log(`[VacTrak]`, ...args);
    };
    /** Рекурсивный таймер с jitter */
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
          this.log(`Reloading the page`);
          window.location.reload();
        }
      }, nextDelay);
    }
    /** Получить все id вакансий на текущей странице	 */
    getVacIdsOnPage() {
      return Array.from(document.querySelectorAll(`[data-qa='vacancy-serp__vacancy']`)).map((el) => el.querySelector(`[class^="vacancy-card--"]`)?.id).filter((id) => typeof id === "string");
    }
    /** Получить новые вакансии, которых нет в localStorage */
    getUnsavedVacIds() {
      const vacMem = this.getVacMem();
      const vacIdsOnPage = this.getVacIdsOnPage();
      const newVacs = vacIdsOnPage.filter((id) => !vacMem[id]);
      return newVacs;
    }
    /** Получить новые вакансии */
    getNewVacs() {
      const unsavedVacIds = this.getUnsavedVacIds();
      const newVacs = unsavedVacIds.filter((vacId) => !this.isNotSuitable(vacId));
      return newVacs;
    }
    /** Обрабатывает новые вакансии: сохраняет их в localStorage, подсвечивает на странице и показывает уведомление */
    async processNewVacs() {
      const newVacs = this.getNewVacs();
      const vacMem = this.getVacMem();
      if (newVacs.length) {
        const newVacsNames = [];
        const newVacIds = newVacs.map((vacId) => vacId);
        if (newVacs.length) {
          newVacs.forEach((vacId, index) => {
            vacMem[vacId] = (/* @__PURE__ */ new Date()).toISOString();
            const vacEl = document.getElementById(vacId);
            if (vacEl) {
              if (index === 0) {
                vacEl.scrollIntoView();
              }
              vacEl.style.backgroundColor = this.colors.fresh;
              const vacNameEl = vacEl.querySelector(`[data-qa='serp-item__title-text']`);
              if (vacNameEl) {
                newVacsNames.push(`[${vacId}] ${vacNameEl.textContent.trim()}`);
              }
            }
          });
          newVacs.reverse()[0];
        }
        new Audio(`${repoUrl}/assets/sound/kirov.mp3`).play().catch((err) => this.log("\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438 \u0437\u0432\u0443\u043A", err));
        GM_notification({
          title: `\u041D\u043E\u0432\u044B\u0435 \u0432\u0430\u043A\u0430\u043D\u0441\u0438\u0438 (${newVacsNames.length})`,
          text: `${newVacsNames.join(";\n")}`,
          // timeout: 60 * 60 * 1000,
          highlight: true,
          silent: false,
          onclick: () => {
            newVacIds.forEach((vacId, index) => {
              setTimeout(
                () => {
                  GM_openInTab(`https://hh.ru/vacancy/${vacId}`, {
                    active: index === 0,
                    insert: true
                  });
                },
                300 * (index + 1)
              );
            });
            unsafeWindow.focus();
          }
        });
        this.animateTitleCircle("\u26A0\uFE0F");
        this.setVacMem(vacMem);
        if (this.vacTrakUrl) {
          try {
            let baseUrl = localStorage.VACTRAK_URL;
            let res = await fetch(`${baseUrl}/api/hh/vac`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
              },
              body: JSON.stringify({ id: 123 })
            });
            let resJson = await res.json();
            this.log(`\u0417\u0430\u043F\u0440\u043E\u0441 VACTRAK_URL \u043E\u0442\u0432\u0435\u0442\u0438\u043B`, resJson);
          } catch (error) {
            this.log(`\u0417\u0430\u043F\u0440\u043E\u0441 VACTRAK_URL \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F`, error);
          }
        }
        return true;
      }
      return false;
    }
    /** Удаляет из localStorage неподходящие вакансии */
    cleanOutdatedVacs() {
      const vacMem = this.getVacMem();
      const vacIdsOnPage = this.getVacIdsOnPage();
      for (const vacId in vacMem) {
        if (this.isNotSuitable(vacId)) {
          delete vacMem[vacId];
        }
      }
      this.setVacMem(vacMem);
    }
    isNotSuitable(vacId) {
      const vacMem = this.getVacMem();
      const vacEl = document.getElementById(vacId);
      return isOld(vacMem[vacId]) || vacEl?.querySelector?.('[data-qa="vacancy-serp__vacancy_responded"]') || vacEl?.querySelector?.('[data-qa="vacancy-serp__vacancy_discard"]');
      function isOld(ds1, maxDays = 30) {
        const msInDay = 1e3 * 60 * 60 * 24;
        const diffInDays = Math.abs(Date.now() - new Date(ds1).getTime()) / msInDay;
        return Math.floor(diffInDays) >= maxDays;
      }
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
    /** Очистить вакансии */
    clearVacMem() {
      localStorage.removeItem(this.vacMemKey);
      window.location.reload();
    }
    /** Запускает progress bar сверху экрана */
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
    colors = {
      fresh: "rgba(255, 255, 0, 0.2)",
      old: "rgba(222, 0, 11, 0.2)"
    };
    /** Делает мигалку. Если передать customEmoji — останавливает анимацию и ставит его. */
    animateTitleCircle(customEmoji) {
      let faviconBlinkInterval = void 0;
      let isBlinking = false;
      let currentIndex = 0;
      const emojis = ["\u{1F534}", "\u2B55"];
      const setFaviconEmoji = (emoji) => {
        document.querySelectorAll('link[rel*="icon"]').forEach((link2) => link2.remove());
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="50%" y="50%" font-size="48" text-anchor="middle" dominant-baseline="middle">${emoji}</text></svg>`;
        const dataUrl = `data:image/svg+xml,${encodeURIComponent(svg)}`;
        const link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/svg+xml";
        link.href = dataUrl;
        document.head.appendChild(link);
      };
      if (customEmoji) {
        if (faviconBlinkInterval) {
          clearInterval(faviconBlinkInterval);
          faviconBlinkInterval = void 0;
        }
        isBlinking = false;
        setFaviconEmoji(customEmoji);
        return;
      }
      if (isBlinking) {
        clearInterval(faviconBlinkInterval);
        faviconBlinkInterval = void 0;
        isBlinking = false;
        return;
      }
      isBlinking = true;
      currentIndex = 0;
      setFaviconEmoji(emojis[0]);
      faviconBlinkInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % emojis.length;
        setFaviconEmoji(emojis[currentIndex]);
      }, 1e3);
    }
  };
  new VacTrak().init();
  function arrToChunks(arr, size) {
    if (size <= 0 || !arr.length) return [];
    return arr.reduce((chunks, item, index) => {
      if (index % size === 0) {
        chunks.push([]);
      }
      chunks[chunks.length - 1].push(item);
      return chunks;
    }, []);
  }
})();
