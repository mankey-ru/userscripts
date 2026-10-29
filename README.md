# userscripts

Personal [Tampermonkey](https://www.tampermonkey.net/)-style userscripts by [mankey-ru](https://github.com/mankey-ru). Sources live in [`src/`](src/), one folder per script (entry point, helpers, tests); installable builds are in [`dist/`](dist/).

**Install:** open an **Install** link below (raw `.user.js` from `main`). Your userscript manager should offer to install it. Requires a manager such as Tampermonkey, Violentmonkey, or Greasemonkey.

**Build:** `npm run build` (dev → `dist-dev/`) or `npm run build:prod` (→ `dist/`). Type check: `npm run typecheck`. Tests: `npm test`. See [`package.json`](package.json).

---

## Scripts

### [DES] Discogs Extra Stuff

Adds extra search links on [Discogs](https://www.discogs.com/) release/tracklist pages (e.g. VK Music, Google video search) for each track.

| | |
| --- | --- |
| **Sites** | `discogs.com` |
| **Install** | [discogs-extra-stuff.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/discogs-extra-stuff.user.js) |
| **Source** | [`src/discogs-extra-stuff/discogs-extra-stuff.user.ts`](src/discogs-extra-stuff/discogs-extra-stuff.user.ts) |

### [YSL] YouTube Search Links

On [YouTube](https://www.youtube.com/) watch pages, adds buttons next to the video title to search the current title on VK and Discogs.

| | |
| --- | --- |
| **Sites** | `youtube.com` |
| **Install** | [youtube-search-links.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/youtube-search-links.user.js) |
| **Source** | [`src/youtube-search-links/youtube-search-links.user.ts`](src/youtube-search-links/youtube-search-links.user.ts) |

### [LCP] Lyrics: Clean Print

On [Genius](https://genius.com/) lyrics pages, adds **Clean: Easy** / **Clean: Hardcore** controls to strip clutter and make the page print-friendly.

| | |
| --- | --- |
| **Sites** | `genius.com` |
| **Install** | [lyrics-clean-print.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lyrics-clean-print.user.js) |
| **Source** | [`src/lyrics-clean-print/lyrics-clean-print.user.ts`](src/lyrics-clean-print/lyrics-clean-print.user.ts) |

### [RMD] Ring My Droid

On [Google Find Hub / Android Find](https://www.google.com/android/find), if the URL hash is `#_findMyDevice__<device name>`, selects that device and presses **Play sound** (ring).

| | |
| --- | --- |
| **Sites** | `google.com/android/find` |
| **Install** | [ring-my-droid.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/ring-my-droid.user.js) |
| **Source** | [`src/ring-my-droid/ring-my-droid.user.ts`](src/ring-my-droid/ring-my-droid.user.ts) |



### [Lepro] Lepro Total Comments

For [Лепрозорий](https://leprosorium.ru/) comment pages: UI to show **лучшие** / **все** comments (fork of [lynxtaa/Lepro-Total-Comments](https://github.com/lynxtaa/Lepro-Total-Comments), lightly patched).

| | |
| --- | --- |
| **Sites** | `leprosorium.ru` comments |
| **Install** | [lepro-total-comments.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/lepro-total-comments.user.js) |
| **Source** | [`src/lepro-total-comments/lepro-total-comments.user.ts`](src/lepro-total-comments/lepro-total-comments.user.ts) |

### [FXC] Fixture Capture

Dev tool for this repo's tests. Its menu command **Save fixture** downloads the rendered page as `<site>__<case>.html`: scripts, styles, tokens and comments removed, CSS-hidden elements marked with `hidden`, source URL and capture date in a comment on top. Disable the userscript under test before capturing, so its own buttons don't end up in the fixture.

| | |
| --- | --- |
| **Sites** | any (menu command only) |
| **Install** | [fixture-capture.user.js](https://github.com/mankey-ru/userscripts/raw/refs/heads/main/dist/fixture-capture.user.js) |
| **Source** | [`src/fixture-capture/fixture-capture.user.ts`](src/fixture-capture/fixture-capture.user.ts) |

---

## License

See [LICENSE](LICENSE).
