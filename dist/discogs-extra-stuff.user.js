// ==UserScript==
// @name         [DES] Discogs Extra Stuff
// @description  Adds extra search links to discogs.com including Rutracker and VK.com music
// @author       mankey-ru
// @namespace    mankey-ru/discogs-extra-stuff
// @version      1.1
// @match        https://www.discogs.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=discogs.com
// @grant        none
// @downloadURL    https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/discogs-extra-stuff.user.js
// ==/UserScript==


"use strict";
(() => {
  // scripts/discogs-extra-stuff/discogs-extra-stuff.user.ts
  var projName = "DES";
  var logFlag = 1;
  var LINK_STYLE = "background: purple; display: inline-block; padding: 5px; color: #fff; text-decoration:none; border-radius: 5px; white-space: nowrap; cursor: pointer;";
  window.setTimeout(init, 1e3);
  function init() {
    const titleEl = document.querySelector("h1");
    const trackListEl = document.querySelector("[class^=tracklist]");
    const trackTitleTds = document.querySelectorAll("td[class^=trackTitle]");
    if (!titleEl || !trackListEl || !trackTitleTds.length) {
      console.error(`Discogs Search Links: required elements not found`, {
        titleEl,
        trackListEl,
        trackTitleTds
      });
      return;
    }
    const { artist: releaseArtist, title: releaseTitle } = parseReleaseHeading(titleEl.textContent);
    const isVarious = releaseArtist === "Various";
    log({ isVarious, releaseArtist, releaseTitle });
    const vkHrefs = [];
    trackTitleTds.forEach((trackTitleTd, i) => {
      const trackRow = trackTitleTd.closest("tr");
      if (!trackRow) return;
      const trackArtist = isVarious ? getTrackRowArtist(trackRow) : releaseArtist;
      const trackTitle = trackTitleTd.textContent.trim();
      log(`${i} ${trackArtist} - ${trackTitle}`);
      const q = encodeURIComponent(trackArtist + " \u2014 " + trackTitle);
      const vkHref = `https://vk.com/audios1239592?q=${q}`;
      vkHrefs.push(vkHref);
      appendCell(trackRow, createLink("Vk Music", vkHref));
      appendCell(
        trackRow,
        createLink(
          "Google",
          `https://www.google.com/search?num=20&newwindow=1&source=lnms&tbm=vid&q=${q}`
        )
      );
    });
    const releaseBtnBar = document.createElement("div");
    releaseBtnBar.style.textAlign = "right";
    trackListEl.prepend(releaseBtnBar);
    releaseBtnBar.append(
      createOpenAllLink(vkHrefs),
      createLink(
        "\u041D\u0430\u0439\u0442\u0438 \u0440\u0435\u043B\u0438\u0437 \u043D\u0430 Rutracker",
        rutrackerSearchUrl(`${isVarious ? "VA" : releaseArtist} - ${releaseTitle}`)
      )
    );
  }
  function parseReleaseHeading(heading) {
    const [artist, title] = heading.split("\u2013");
    return { artist: artist.trim(), title: title.trim() };
  }
  function getTrackRowArtist(trackRow) {
    const artistEl = trackRow.querySelector("[class^=artist_]");
    if (!artistEl) return "";
    return artistEl.textContent.trim().replace("\u2013", "").replace(/\(\d+\)$/g, "");
  }
  function rutrackerSearchUrl(query) {
    return `https://rutracker.org/forum/tracker.php?nm=${encodeURIComponent(query)}&f[]=-1&o=10&s=2&pn=`;
  }
  function createLink(text, href) {
    const link = document.createElement("a");
    link.style.cssText = LINK_STYLE;
    link.textContent = text;
    if (href) {
      link.href = href;
      link.target = "_blank";
    }
    return link;
  }
  function appendCell(row, content) {
    const td = document.createElement("td");
    td.appendChild(content);
    row.appendChild(td);
  }
  function createOpenAllLink(hrefs) {
    const link = createLink("\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432\u0441\u0435 \u0442\u0440\u0435\u043A\u0438 VK");
    link.addEventListener("click", () => {
      if (confirm(`\u041E\u0442\u043A\u0440\u044B\u0442\u044C ${hrefs.length} \u0432\u043A\u043B\u0430\u0434\u043E\u043A VK?`)) openOneByOne(hrefs);
    });
    return link;
  }
  function openOneByOne(urls, delayMs = 30) {
    const queue = urls.slice();
    const interval = window.setInterval(() => {
      window.open(queue.shift(), "_blank");
      if (queue.length === 0) window.clearInterval(interval);
    }, delayMs);
  }
  function log(...args) {
    if (logFlag) console.log(`[${projName}]`, ...args);
  }
})();
