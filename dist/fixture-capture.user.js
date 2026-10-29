// ==UserScript==
// @name         [FXC] Fixture Capture
// @description  Menu command "Save fixture": downloads a cleaned snapshot of the page to use as a test fixture for these userscripts
// @author       mankey-ru
// @namespace    mankey-ru/fixture-capture
// @version      1.0
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        GM_registerMenuCommand
// @noframes
// @downloadURL  https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/fixture-capture.user.js
// ==/UserScript==


"use strict";
(() => {
  // src/fixture-capture/lib.ts
  function siteKey(hostname) {
    const labels = hostname.toLowerCase().split(".").filter(Boolean);
    return labels.length > 1 ? labels[labels.length - 2] : labels[0] || "page";
  }
  function caseSlug(input) {
    return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60).replace(/^-+|-+$/g, "");
  }
  function defaultCaseName(pathname) {
    return caseSlug(pathname) || "home";
  }
  function fixtureFileName(site, caseName) {
    return `${site}__${caseName}.html`;
  }
  function fixtureHeader(info) {
    const lines = [
      `source: ${info.url}`,
      `captured: ${info.capturedAt.toISOString()}`,
      `browser: ${info.userAgent}`,
      `manager: ${info.scriptHandler}`
    ];
    return `<!--
${lines.map((l) => l.replaceAll("-->", "--&gt;")).join("\n")}
-->`;
  }

  // src/fixture-capture/fixture-capture.user.ts
  var projName = "FXC";
  var logFlag = 1;
  var VISIBILITY_MARK = "data-fxc-visibility";
  var KEPT_LINK_RELS = ["canonical"];
  var DROPPED_META = /csrf|token|nonce|session|verification|content-security-policy/i;
  GM_registerMenuCommand("Save fixture", saveFixture);
  function saveFixture() {
    const suggested = defaultCaseName(location.pathname);
    const input = prompt("Fixture case name (latin letters, digits, dashes)", suggested);
    if (input === null) return;
    const fileName = fixtureFileName(siteKey(location.hostname), caseSlug(input) || suggested);
    const html = captureHtml();
    download(fileName, html);
    const sizeKb = Math.round(html.length / 1024);
    log(`saved ${fileName}, ${sizeKb} KB`);
    toast(`Saved ${fileName} (${sizeKb} KB)`);
  }
  function captureHtml() {
    const marked = markVisibility(document.body);
    let clone;
    try {
      clone = document.documentElement.cloneNode(true);
    } finally {
      marked.forEach((el) => el.removeAttribute(VISIBILITY_MARK));
    }
    applyVisibilityMarks(clone);
    cleanClone(clone);
    const header = fixtureHeader({
      url: location.href,
      capturedAt: /* @__PURE__ */ new Date(),
      userAgent: navigator.userAgent,
      scriptHandler: `${GM_info.scriptHandler} ${GM_info.version}`
    });
    return `<!doctype html>
${header}
${clone.outerHTML}
`;
  }
  function markVisibility(root) {
    const marked = [];
    const mark = (el, value) => {
      el.setAttribute(VISIBILITY_MARK, value);
      marked.push(el);
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(node) {
        const el = node;
        const style = getComputedStyle(el);
        if (style.display === "none") {
          mark(el, "display-none");
          return NodeFilter.FILTER_REJECT;
        }
        if (el.hasAttribute("hidden")) {
          mark(el, "hidden-attr-shown");
        } else if (style.visibility === "hidden" && el.parentElement && getComputedStyle(el.parentElement).visibility !== "hidden") {
          mark(el, "visibility-hidden");
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    while (walker.nextNode()) ;
    return marked;
  }
  function applyVisibilityMarks(root) {
    root.querySelectorAll(`[${VISIBILITY_MARK}]`).forEach((el) => {
      const value = el.getAttribute(VISIBILITY_MARK);
      el.removeAttribute(VISIBILITY_MARK);
      if (value === "display-none") {
        el.setAttribute("hidden", "");
        if (el.style.display && el.style.display !== "none") el.style.display = "none";
      } else if (value === "visibility-hidden") {
        el.style.visibility = "hidden";
      } else {
        el.removeAttribute("hidden");
      }
    });
  }
  function cleanClone(root) {
    root.querySelectorAll("script, noscript, style").forEach((el) => el.remove());
    root.querySelectorAll("link").forEach((el) => {
      if (!KEPT_LINK_RELS.includes(el.rel.toLowerCase())) el.remove();
    });
    root.querySelectorAll("meta").forEach((el) => {
      const key = [el.name, el.getAttribute("property"), el.httpEquiv].join(" ");
      if (DROPPED_META.test(key)) el.remove();
    });
    root.querySelectorAll("iframe, frame, object, embed").forEach((el) => {
      ["src", "srcdoc", "data"].forEach((attr) => el.removeAttribute(attr));
    });
    root.querySelectorAll("*").forEach((el) => {
      for (const { name } of Array.from(el.attributes)) {
        if (name.startsWith("on") || name === "nonce" || name === "integrity") {
          el.removeAttribute(name);
        }
      }
    });
    const comments = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
    while (walker.nextNode()) comments.push(walker.currentNode);
    comments.forEach((c) => c.parentNode?.removeChild(c));
  }
  function download(fileName, content) {
    const url = URL.createObjectURL(new Blob([content], { type: "text/html" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e4);
  }
  function toast(text) {
    const el = document.createElement("div");
    el.textContent = text;
    el.style.cssText = "position: fixed; top: 16px; right: 16px; z-index: 2147483647; background: purple; color: #fff; padding: 8px 12px; border-radius: 5px; font: 14px sans-serif;";
    document.body.append(el);
    setTimeout(() => el.remove(), 4e3);
  }
  function log(...args) {
    if (logFlag) console.log(`[${projName}]`, ...args);
  }
})();
