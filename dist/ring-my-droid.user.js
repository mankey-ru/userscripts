// ==UserScript==
// @name         [RMD] Ring My Droid
// @description  Automatically presses Ring button in Andoid Find Hub
// @author       mankey-ru
// @namespace    mankey-ru/ring-my-droid
// @version      1.0.9
// @match        https://www.google.com/android/find*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=android.com
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/ring-my-droid.user.js
// ==/UserScript==


"use strict";
(() => {
  // src/ring-my-droid.user.ts
  var projName = "RMD";
  var logFlag = 1;
  var hashPrefix = `#_findMyDevice__`;
  if (window.location.hash.startsWith(hashPrefix)) {
    const deviceId = decodeURIComponent(window.location.hash.replace(hashPrefix, ""));
    log(`Started. Looking for ${deviceId}`);
    waitFor('div[role="button"]', (el) => {
      el.click();
      waitFor('div[role="button"]', (btn) => {
        btn.click();
      }, "Play sound");
    }, deviceId);
  }
  function waitFor(selector, callback, textContent) {
    log(`Element ${selector} with "${textContent}": waiting...`);
    const observer = new MutationObserver(() => {
      const candidates = Array.from(document.querySelectorAll(selector));
      const el = textContent ? candidates.find((e) => e.textContent.includes(textContent)) : candidates[0];
      if (el) {
        observer.disconnect();
        log(`Element ${selector} with "${textContent}": found!`, el);
        callback(el);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  function log(...args) {
    if (logFlag)
      console.log(`[${projName}]`, ...args);
  }
})();
