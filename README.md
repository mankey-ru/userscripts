# userscripts

Personal [Tampermonkey](https://www.tampermonkey.net/)-style userscripts by [mankey-ru](https://github.com/mankey-ru). Sources live in [`src/`](src/); installable builds are in [`dist/`](dist/).

**Install:** open an **Install** link below (raw `.user.js` from `main`). Your userscript manager should offer to install it. Requires a manager such as Tampermonkey, Violentmonkey, or Greasemonkey.

**Build:** `npm run build` (dev → `dist-dev/`) or `npm run build:prod` (→ `dist/`). See [`package.json`](package.json).

---

## Scripts

### [VACTRAK] Vacancy Tracker

On job search result pages, reloads on an interval, detects new vacancies since the last check, and alerts via system notification (optional backend / Telegram integration when configured).

Works best with server counterpart: [`vactrak-service`](https://github.com/mankey-ru/vactrak-service).

| | |
| --- | --- |
| **Sites** | `hh.ru`, `hh.uz`, `hh1.az`, `rabota.by`, `career.habr.com` vacancy search |
| **Install** | [vactrak.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/vactrak.user.js) |
| **Source** | [`src/vactrak.user.ts`](src/vactrak.user.ts) |

### [DES] Discogs Extra Stuff

Adds extra search links on [Discogs](https://www.discogs.com/) release/tracklist pages (e.g. VK Music, Google video search) for each track.

| | |
| --- | --- |
| **Sites** | `discogs.com` |
| **Install** | [discogs-extra-stuff.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/discogs-extra-stuff.user.js) |
| **Source** | [`src/discogs-extra-stuff.user.ts`](src/discogs-extra-stuff.user.ts) |

### [YSL] YouTube Search Links

On [YouTube](https://www.youtube.com/) watch pages, adds buttons next to the video title to search the current title on VK and Discogs.

| | |
| --- | --- |
| **Sites** | `youtube.com` |
| **Install** | [youtube-search-links.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/youtube-search-links.user.js) |
| **Source** | [`src/youtube-search-links.user.ts`](src/youtube-search-links.user.ts) |

### [LCP] Lyrics: Clean Print

On [Genius](https://genius.com/) lyrics pages, adds **Clean: Easy** / **Clean: Hardcore** controls to strip clutter and make the page print-friendly.

| | |
| --- | --- |
| **Sites** | `genius.com` |
| **Install** | [lyrics-clean-print.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lyrics-clean-print.user.js) |
| **Source** | [`src/lyrics-clean-print.user.ts`](src/lyrics-clean-print.user.ts) |

### [RMD] Ring My Droid

On [Google Find Hub / Android Find](https://www.google.com/android/find), if the URL hash is `#_findMyDevice__<device name>`, selects that device and presses **Play sound** (ring).

| | |
| --- | --- |
| **Sites** | `google.com/android/find` |
| **Install** | [ring-my-droid.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/ring-my-droid.user.js) |
| **Source** | [`src/ring-my-droid.user.ts`](src/ring-my-droid.user.ts) |



### [Lepro] Lepro Total Comments

For [Лепрозорий](https://leprosorium.ru/) comment pages: UI to show **лучшие** / **все** comments (fork of [lynxtaa/Lepro-Total-Comments](https://github.com/lynxtaa/Lepro-Total-Comments), lightly patched).

| | |
| --- | --- |
| **Sites** | `leprosorium.ru` comments |
| **Install** | [lepro-total-comments.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lepro-total-comments.user.js) |
| **Source** | [`src/lepro-total-comments.user.ts`](src/lepro-total-comments.user.ts) |

---

## License

See [LICENSE](LICENSE).
