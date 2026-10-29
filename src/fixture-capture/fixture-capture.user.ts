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

import { caseSlug, defaultCaseName, fixtureFileName, fixtureHeader, siteKey } from './lib.ts';

const projName = 'FXC';
const logFlag = 1;

// Set on live elements while the page is cloned, so the clone knows what CSS hid
const VISIBILITY_MARK = 'data-fxc-visibility';
// Fixtures carry no CSS, so visibility is kept through these instead
type VisibilityMark = 'display-none' | 'visibility-hidden' | 'hidden-attr-shown';

// <link> elements fetch resources; only the canonical URL is kept
const KEPT_LINK_RELS = ['canonical'];
// <meta> that carry tokens or a CSP that would block scripts injected by tests
const DROPPED_META = /csrf|token|nonce|session|verification|content-security-policy/i;

GM_registerMenuCommand('Save fixture', saveFixture);

function saveFixture() {
	const suggested = defaultCaseName(location.pathname);
	const input = prompt('Fixture case name (latin letters, digits, dashes)', suggested);
	if (input === null) return;

	const fileName = fixtureFileName(siteKey(location.hostname), caseSlug(input) || suggested);
	const html = captureHtml();
	download(fileName, html);
	const sizeKb = Math.round(html.length / 1024);
	log(`saved ${fileName}, ${sizeKb} KB`);
	toast(`Saved ${fileName} (${sizeKb} KB)`);
}

/** Rendered DOM without scripts, styles and tokens; CSS-hidden elements get `hidden` */
function captureHtml(): string {
	const marked = markVisibility(document.body);
	let clone: HTMLElement;
	try {
		clone = document.documentElement.cloneNode(true) as HTMLElement;
	} finally {
		marked.forEach((el) => el.removeAttribute(VISIBILITY_MARK));
	}
	applyVisibilityMarks(clone);
	cleanClone(clone);

	const header = fixtureHeader({
		url: location.href,
		capturedAt: new Date(),
		userAgent: navigator.userAgent,
		scriptHandler: `${GM_info.scriptHandler} ${GM_info.version}`,
	});
	return `<!doctype html>\n${header}\n${clone.outerHTML}\n`;
}

/** Marks live elements whose visibility comes from CSS; returns them for unmarking */
function markVisibility(root: Element): Element[] {
	const marked: Element[] = [];
	const mark = (el: Element, value: VisibilityMark) => {
		el.setAttribute(VISIBILITY_MARK, value);
		marked.push(el);
	};
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
		acceptNode(node) {
			const el = node as Element;
			const style = getComputedStyle(el);
			if (style.display === 'none') {
				mark(el, 'display-none');
				// children of a display:none element are hidden anyway
				return NodeFilter.FILTER_REJECT;
			}
			if (el.hasAttribute('hidden')) {
				mark(el, 'hidden-attr-shown');
			} else if (
				style.visibility === 'hidden' &&
				el.parentElement &&
				getComputedStyle(el.parentElement).visibility !== 'hidden'
			) {
				mark(el, 'visibility-hidden');
			}
			return NodeFilter.FILTER_ACCEPT;
		},
	});
	while (walker.nextNode());
	return marked;
}

function applyVisibilityMarks(root: HTMLElement) {
	root.querySelectorAll<HTMLElement>(`[${VISIBILITY_MARK}]`).forEach((el) => {
		const value = el.getAttribute(VISIBILITY_MARK) as VisibilityMark;
		el.removeAttribute(VISIBILITY_MARK);
		if (value === 'display-none') {
			el.setAttribute('hidden', '');
			// an inline display would win over the `hidden` attribute
			if (el.style.display && el.style.display !== 'none') el.style.display = 'none';
		} else if (value === 'visibility-hidden') {
			el.style.visibility = 'hidden';
		} else {
			el.removeAttribute('hidden');
		}
	});
}

function cleanClone(root: HTMLElement) {
	root.querySelectorAll('script, noscript, style').forEach((el) => el.remove());
	root.querySelectorAll('link').forEach((el) => {
		if (!KEPT_LINK_RELS.includes(el.rel.toLowerCase())) el.remove();
	});
	root.querySelectorAll('meta').forEach((el) => {
		const key = [el.name, el.getAttribute('property'), el.httpEquiv].join(' ');
		if (DROPPED_META.test(key)) el.remove();
	});
	// keep frames in place for structure, but without their content
	root.querySelectorAll('iframe, frame, object, embed').forEach((el) => {
		['src', 'srcdoc', 'data'].forEach((attr) => el.removeAttribute(attr));
	});
	root.querySelectorAll('*').forEach((el) => {
		for (const { name } of Array.from(el.attributes)) {
			if (name.startsWith('on') || name === 'nonce' || name === 'integrity') {
				el.removeAttribute(name);
			}
		}
	});
	const comments: Node[] = [];
	const walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);
	while (walker.nextNode()) comments.push(walker.currentNode);
	comments.forEach((c) => c.parentNode?.removeChild(c));
}

function download(fileName: string, content: string) {
	const url = URL.createObjectURL(new Blob([content], { type: 'text/html' }));
	const link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	document.body.append(link);
	link.click();
	link.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function toast(text: string) {
	const el = document.createElement('div');
	el.textContent = text;
	el.style.cssText =
		'position: fixed; top: 16px; right: 16px; z-index: 2147483647; background: purple; color: #fff; padding: 8px 12px; border-radius: 5px; font: 14px sans-serif;';
	document.body.append(el);
	setTimeout(() => el.remove(), 4000);
}

function log(...args: unknown[]) {
	if (logFlag) console.log(`[${projName}]`, ...args);
}
