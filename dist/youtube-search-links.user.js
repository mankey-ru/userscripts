// ==UserScript==
// @name         [YSL] Youtube Search Links
// @description  Adds extra search links to discogs.com including Rutracker and VK.com music
// @author       mankey-ru
// @namespace    mankey-ru/youtube-search-links
// @version      1.1
// @match        https://www.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/youtube-search-links.user.js
// ==/UserScript==


"use strict";
(() => {
  // src/youtube-search-links.user.ts
  var projName = "YSL";
  var logFlag = 1;
  var titleElementCheckInterval = setInterval(function() {
    if (getTitleEl()) {
      clearInterval(titleElementCheckInterval);
      init();
    }
  }, 50);
  function init() {
    log("init");
    makeLink("VK", "https://vk.com/audios1239592?q=");
    makeLink("Discogs", "https://www.discogs.com/search/?type=all&q=");
  }
  function makeLink(providerName, baseUrl) {
    const elToAppend = getTitleEl();
    const link = document.createElement("a");
    link.innerText = "Search " + providerName;
    link.setAttribute(
      "style",
      "background: purple; display: inline-block; padding: 5px; color: #fff; text-decoration:none; border-radius: 5px; margin-left: 1rem;"
    );
    link.setAttribute("target", "_blank");
    link.setAttribute("href", "#_href_will_be_set_on_click__target_is_blank_dont_be_a_pussy");
    if (!elToAppend || !elToAppend.parentNode)
      return log("makeLink: title element not found, aborting");
    elToAppend.parentNode.appendChild(link);
    link.addEventListener("click", function() {
      const trackTitle = getTitleEl().innerText;
      const href = baseUrl + encodeURIComponent(trackTitle);
      link.setAttribute("href", href);
      window.open(href, "_blank");
    });
    log("makeLink done.\nAppended to element:", elToAppend, "\nLink element", link);
    return link;
  }
  function getTitleEl() {
    const el1 = document.querySelector("h1 .ytd-video-primary-info-renderer");
    const el2 = document.querySelector("h1 .ytd-watch-metadata");
    return isVisible(el1) && el1 || isVisible(el2) && el2;
  }
  function isVisible(elem) {
    if (!elem) return false;
    return elem.offsetWidth > 0 || elem.offsetHeight > 0 || elem.getClientRects().length > 0;
  }
  function log(...args) {
    if (logFlag) console.log(`[${projName}]`, ...args);
  }
})();
