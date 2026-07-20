// ==UserScript==
// @name         [LCP] Lyrics: Clean Print
// @description  Adds Clean button to make lyrics page print-ready. Supports Genius.com
// @author       mankey-ru
// @namespace    mankey-ru/lyrics-clean-print
// @version      1.1
// @match        https://genius.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=genius.com
// @grant        none
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lyrics-clean-print.user.js
// @run-at       document-end
// ==/UserScript==


"use strict";
(() => {
  // src/lyrics-clean-print.user.ts
  var projName = "LCP";
  var logFlag = 1;
  var colCount = 1;
  init();
  function init() {
    if (window.self !== window.top) return;
    log(`userScript loaded for document ${document.location.href}`);
    createButton(`Clean: Easy`, () => {
      cleanPage("EASY");
    });
    createButton(`Clean: Hardcore`, () => {
      cleanPage("HARDCORE");
    });
  }
  function cleanPage(mode = "EASY") {
    log(`cleanPage mode=${mode}`);
    const titleEl = document.querySelector("h1");
    const artistEl = document.querySelector(`[class^="SongHeader-desktop__CreditList"]`);
    const lyricsEls = document.querySelectorAll('[data-lyrics-container="true"]');
    if (!titleEl) throw `${projName}: no titleEl`;
    if (!artistEl) throw `${projName}: no artistEl`;
    if (!lyricsEls.length) throw `${projName}: no lyricsEl`;
    const songTitle = cleanTranslation(titleEl.textContent.trim());
    const songArtist = cleanTranslation(artistEl.textContent.trim());
    const artistFeatElAll = document.querySelector(`[class^="SongHeader-desktop__TwoColumnArtistContainer"]`)?.querySelectorAll?.('[class^="PortalTooltip__Container"]');
    const artistFeatElFiltered = artistFeatElAll ? [...artistFeatElAll]?.filter?.((el) => el.textContent?.trim()) : null;
    const yearEl = document.querySelector('[class^="MetadataStats__Container"]')?.querySelector?.('[class^="LabelWithIcon__Label"]');
    const artistFeatList = artistFeatElFiltered?.length ? artistFeatElFiltered.map((el) => cleanTranslation(el.textContent.trim())).filter((artistFeatName) => artistFeatName !== songArtist).join(", ") : "";
    const excludedElements = document.querySelectorAll(`[data-exclude-from-selection=true]`);
    log(
      `excludedElements.innerText=`,
      Array.from(excludedElements).map((el) => el.innerText.trim()).join(" | ")
    );
    excludedElements.forEach((el) => el.remove());
    const yearMatch = yearEl?.textContent?.match?.(/\b\d{4}\b/);
    const songYear = yearMatch ? `${yearMatch[0]}` : "";
    const cleanedLyricsHTML = Array.from(lyricsEls).map((el) => getCleanedLyricsHTML(el)).join(`<!-- ${projName}: \u0437\u0434\u0435\u0441\u044C \u0440\u0430\u0437\u0440\u044B\u0432 -->`);
    document.body.innerHTML = "";
    const lineQty = cleanedLyricsHTML.split("<br>").length;
    const threshold1 = 20;
    const threshold2 = 50;
    if (lineQty < threshold1) {
      colCount = 1;
    } else if (lineQty < threshold2) {
      colCount = 2;
    } else {
      colCount = 3;
    }
    console.log(
      `lineQty=`,
      lineQty,
      `colCount=`,
      colCount,
      `threshold1=`,
      threshold1,
      `threshold2=`,
      threshold2
    );
    const container = document.createElement("div");
    container.id = "clean-print-container";
    container.style.padding = "20px";
    container.innerHTML = `
            <div class="lyr-header">
				<span class="lyr-songNameFull">
					<span class="lyr-year">${songYear}</span>
					<span class="lyr-artist">${songArtist}</span> \u2014 <span class="lyr-title">${songTitle}</span>
				</span>
				<span class="lyr-featArtist">${artistFeatList}</span>
			</div>
            <div class="lyr-container">${cleanedLyricsHTML}</div>
        `;
    document.body.appendChild(container);
    createStyle(mode);
  }
  function createStyle(mode = "EASY") {
    const style = document.createElement("style");
    const isEasy = mode === "EASY";
    style.textContent = `
            /* Global CSS Reset */
            * {
                margin: 0;
                padding: 0;
                border: 0;
                outline: 0;
                background: transparent !important;
                font-size: inherit;
                font-family: inherit;
                font-weight: inherit;
                line-height: inherit;
                color: inherit;
                text-decoration: none;
                vertical-align: baseline;
            }
            /* Hide unwanted elements */
           /*  img, picture, [class*="ad"], [id*="ad"], nav, header, footer, aside, .dfp-unit, .banner, .sidebar {
                display: none !important;
            }
            #clean-print-container, #clean-print-container * {
                display: block !important;
                visibility: visible !important;
            } */
            br { display: block; margin: 0; }
            a { text-decoration: none; }

			.lyr-par {
				break-inside: avoid;
				display: inline;
			}
			.lyr-par:empty {
				display: none;
			}
			.lyr-subdiv::before {
				content: '\u2B50';
				margin-right: 5px;
			}
			.lyr-subdiv {
				font-style: italic;
				display: block;
				margin-top:1em;
				margin-bottom:.3em;
			}
            .lyr-header {
				font-family: sans-serif;
				margin-bottom: 1em;
			}
			/* .lyr-year, .lyr-artist, .lyr-title {	 */
			.lyr-songNameFull {
				font-size: 2em;
			}
			.lyr-year {
				font-size: 70%;
    			color: grey;
				margin-right: 5px;
			}
			.lyr-year:empty {
				display: none;
			}

			.lyr-featArtist {
				display: block;
				font-size: 80%;
				color: grey;
			}
			.lyr-featArtist:empty {
				display: none;
			}
			.lyr-featArtist::before {
				content: '\u{1F3A4}';
				margin-right: 5px;
			}

			.lyr-artist {
				font-weight: bold;
			}
			.lyr-title {
				break-inside: avoid;
			}
            .lyr-container {
                font-family: serif;
                white-space: pre-wrap;
                column-count: ${colCount};
                column-gap: 20px;
                /* column-rule: 1px solid #ccc; */
				line-height: 1.2;
            }
        `;
    document.head.appendChild(style);
  }
  function getCleanedLyricsHTML(lyricsEl) {
    let cleanedLyricsHTML = lyricsEl.innerHTML;
    cleanedLyricsHTML = cleanedLyricsHTML.replace(/<a[^>]*>(.*?)<\/a>/gis, "$1");
    cleanedLyricsHTML = cleanedLyricsHTML.replace(/<span[^>]*>(.*?)<\/span>/gis, "$1");
    cleanedLyricsHTML = cleanedLyricsHTML.replace(/<i[^>]*>(.*?)<\/i>/gis, "$1");
    cleanedLyricsHTML = cleanedLyricsHTML.split(/<br\s*\/?>\s*<br\s*\/?>/gi).map((part) => `<p class="lyr-par">${part.trim()}</p>`).join("");
    cleanedLyricsHTML = cleanedLyricsHTML.replace(/\[Текст песни (.*?)\]/gis, "");
    cleanedLyricsHTML = cleanedLyricsHTML.replace(/\[Songtext (.*?)\]/gis, "");
    cleanedLyricsHTML = cleanedLyricsHTML.replaceAll(/\[Instrumental(.*?)\]/gis, "");
    cleanedLyricsHTML = cleanedLyricsHTML.replace(
      /\[(.*?)\]<br\s*\/?>/gis,
      '<span class="lyr-subdiv">$1</span>'
    );
    cleanedLyricsHTML = cleanedLyricsHTML.replace(/&nbsp;/g, " ");
    return cleanedLyricsHTML;
  }
  function createButton(text = "\u0442\u0435\u043A\u0441\u0442 \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D", onClick = () => alert("onClick \u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D")) {
    const button = document.createElement("button");
    button.textContent = text;
    button.style.position = "fixed";
    button.style.top = "4em";
    button.style.cursor = "pointer";
    button.style.right = "1em";
    button.style.zIndex = "9999";
    button.style.padding = "10px 15px";
    button.style.backgroundColor = "#06fa27ff";
    button.style.color = "#000";
    button.style.border = ".8em solid #000";
    button.style.borderRadius = "23px";
    button.style.cursor = "pointer";
    button.style.fontSize = "18px";
    button.style.fontFamily = "Arial, sans-serif";
    button.addEventListener("click", onClick);
    document.body.appendChild(button);
  }
  function log(...args) {
    if (logFlag) console.log(`[${projName}]`, ...args);
  }
  function cleanTranslation(str) {
    const cyrillicWithEnglishParensRegex = /^([А-Яа-яеЁ\s]+)\s+\([A-Za-z\s]+\)$/;
    const match = str.match(cyrillicWithEnglishParensRegex);
    return match ? match[1].trim() : str;
  }
})();
