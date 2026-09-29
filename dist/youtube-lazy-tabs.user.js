// ==UserScript==
// @name         [YLT] Youtube Lazy Tabs
// @description  Youtube tabs loaded in background (e.g. on browser startup) are not loaded at all until focused: no autoplay noise, no memory/traffic
// @author       mankey-ru
// @namespace    mankey-ru/youtube-lazy-tabs
// @version      1.0
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://music.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-start
// @noframes
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/youtube-lazy-tabs.user.js
// ==/UserScript==


"use strict";
(() => {
  // src/youtube-lazy-tabs.user.ts
  var projName = "YLT";
  var logFlag = 1;
  var LOAD_DELAY_MS = 300;
  var TITLES_STORAGE_KEY = "ylt-titles";
  var TITLES_MAX = 500;
  var TITLE_SAVE_INTERVAL_MS = 3e3;
  if (isHiddenAtStart()) {
    defer();
  } else {
    rememberTitles();
  }
  function isHiddenAtStart() {
    if (document.prerendering) return false;
    return document.visibilityState === "hidden";
  }
  function defer() {
    window.stop();
    renderPlaceholder();
    log("deferred", location.href);
    let loadTimer;
    document.addEventListener("visibilitychange", function() {
      clearTimeout(loadTimer);
      if (document.visibilityState === "visible") {
        loadTimer = setTimeout(() => location.reload(), LOAD_DELAY_MS);
      }
    });
  }
  function renderPlaceholder() {
    const root = document.documentElement ?? document.appendChild(document.createElement("html"));
    const head = document.createElement("head");
    const body = document.createElement("body");
    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.href = "/favicon.ico";
    head.appendChild(favicon);
    const title = document.createElement("title");
    title.textContent = "\u{1F4A4} " + (getSavedTitle() ?? "YouTube");
    head.appendChild(title);
    body.setAttribute(
      "style",
      "margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f0f0f; color: #aaa; font: 16px sans-serif;"
    );
    body.textContent = `[${projName}] Tab will load when you open it`;
    root.replaceChildren(head, body);
  }
  function rememberTitles() {
    setInterval(function() {
      if (document.visibilityState !== "visible") return;
      const title = document.title.trim();
      if (!title || title === "YouTube") return;
      const titles = loadTitles();
      const key = getPageKey();
      if (titles[key] === title) return;
      delete titles[key];
      titles[key] = title;
      const keys = Object.keys(titles);
      for (const k of keys.slice(0, Math.max(0, keys.length - TITLES_MAX))) delete titles[k];
      saveTitles(titles);
    }, TITLE_SAVE_INTERVAL_MS);
  }
  function getSavedTitle() {
    return loadTitles()[getPageKey()];
  }
  function getPageKey() {
    const videoId = new URLSearchParams(location.search).get("v");
    return videoId ? "v:" + videoId : location.pathname + location.search;
  }
  function loadTitles() {
    try {
      return JSON.parse(localStorage.getItem(TITLES_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveTitles(titles) {
    try {
      localStorage.setItem(TITLES_STORAGE_KEY, JSON.stringify(titles));
    } catch (err) {
      log("failed to save titles", err);
    }
  }
  function log(...args) {
    if (logFlag) console.log(`[${projName}]`, ...args);
  }
})();
