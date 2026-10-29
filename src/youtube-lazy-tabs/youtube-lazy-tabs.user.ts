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

const projName = 'YLT';
const logFlag = 1;

// Tab must stay visible this long before it loads, so flicking through tabs with Ctrl+Tab
// doesn't load every one of them
const LOAD_DELAY_MS = 300;
// Titles of normally loaded pages are remembered so deferred tabs are still recognizable
const TITLES_STORAGE_KEY = 'ylt-titles';
const TITLES_MAX = 500;
const TITLE_SAVE_INTERVAL_MS = 3000;

if (isHiddenAtStart()) {
	defer();
} else {
	rememberTitles();
}

function isHiddenAtStart() {
	// don't break browser prerendering (it's hidden too, but activates as a normal page)
	if ((document as Document & { prerendering?: boolean }).prerendering) return false;
	return document.visibilityState === 'hidden';
}

function defer() {
	// halts loading of the page and all its scripts/media
	window.stop();
	renderPlaceholder();
	log('deferred', location.href);

	let loadTimer: ReturnType<typeof setTimeout> | undefined;
	document.addEventListener('visibilitychange', function () {
		clearTimeout(loadTimer);
		if (document.visibilityState === 'visible') {
			loadTimer = setTimeout(() => location.reload(), LOAD_DELAY_MS);
		}
	});
}

function renderPlaceholder() {
	const root = document.documentElement ?? document.appendChild(document.createElement('html'));
	const head = document.createElement('head');
	const body = document.createElement('body');

	const favicon = document.createElement('link');
	favicon.rel = 'icon';
	favicon.href = '/favicon.ico';
	head.appendChild(favicon);

	const title = document.createElement('title');
	title.textContent = '💤 ' + (getSavedTitle() ?? 'YouTube');
	head.appendChild(title);

	body.setAttribute(
		'style',
		'margin: 0; height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f0f0f; color: #aaa; font: 16px sans-serif;',
	);
	body.textContent = `[${projName}] Tab will load when you open it`;

	root.replaceChildren(head, body);
}

function rememberTitles() {
	setInterval(function () {
		if (document.visibilityState !== 'visible') return;
		const title = document.title.trim();
		// 'YouTube' is the placeholder title while SPA navigation is in progress
		if (!title || title === 'YouTube') return;
		const titles = loadTitles();
		const key = getPageKey();
		if (titles[key] === title) return;
		// re-insert to keep most recent at the end, so trimming drops the oldest ones
		delete titles[key];
		titles[key] = title;
		const keys = Object.keys(titles);
		for (const k of keys.slice(0, Math.max(0, keys.length - TITLES_MAX))) delete titles[k];
		saveTitles(titles);
	}, TITLE_SAVE_INTERVAL_MS);
}

function getSavedTitle(): string | undefined {
	return loadTitles()[getPageKey()];
}

function getPageKey() {
	const videoId = new URLSearchParams(location.search).get('v');
	return videoId ? 'v:' + videoId : location.pathname + location.search;
}

function loadTitles(): Record<string, string> {
	try {
		return JSON.parse(localStorage.getItem(TITLES_STORAGE_KEY) || '{}');
	} catch {
		return {};
	}
}

function saveTitles(titles: Record<string, string>) {
	try {
		localStorage.setItem(TITLES_STORAGE_KEY, JSON.stringify(titles));
	} catch (err) {
		log('failed to save titles', err);
	}
}

function log(...args: unknown[]) {
	if (logFlag) console.log(`[${projName}]`, ...args);
}
