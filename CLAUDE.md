# CLAUDE.md

Personal Tampermonkey userscripts (TypeScript, one script per file in `src/*.user.ts`). Owner: mankey-ru.

## Safety rules

- Work only on a branch and open a PR. Never push to `main`: users install scripts straight from `main` (`@downloadURL` in each script header and the README Install links point at raw `dist/*.user.js`), so a merge reaches the owner's browser at once.
- Never edit `dist/` by hand and do not commit it from a branch. The GitHub workflow `.github/workflows/build_dist.yml` rebuilds `dist/` and commits it as `github-actions[bot]` on every push that touches `src/**`.
- A deleted script needs its `dist/<name>.user.js` deleted manually: the workflow only adds files, it never removes them.
- Do not add Claude attribution lines to commit messages or PR descriptions.

## Build and check

- Install: `npm ci`.
- Build: `npm run build` (dev, to `dist-dev/`, git-ignored) or `npm run build:prod` (to `dist/`). `build.mjs` bundles each `src/*.user.ts` with esbuild into an IIFE and copies the `// ==UserScript==` header block as the file banner.
- Type check: `npx tsc --noEmit` (strict, `tsconfig.json`). TypeScript 7 ships a native binary per platform, so run `npm ci` on the machine that runs `tsc`: a `node_modules` installed on Windows fails on Linux with "Unable to resolve @typescript/typescript-linux-x64". The check is clean when it prints nothing.
- Format: `npm run format` (Prettier: tabs, single quotes, width 100).
- There are no automated tests (`npm test` is a stub). Behaviour on live sites cannot be checked in a cloud session: say so in the PR and list what the owner must click through.

## Conventions

- Every script starts with a `// ==UserScript==` header: `@name`, `@description`, `@author`, `@namespace mankey-ru/<name>`, `@version`, `@match`, `@icon`, `@grant`, `@downloadURL` (raw URL of its `dist` file). Bump `@version` when behaviour changes.
- A new script is `src/<name>.user.ts`; add its section to `README.md` (name, sites, Install link, Source link) in the same PR.
- Shared code goes to `src/_shared.ts`; it is bundled into each script, not loaded at runtime.
- Keep files with LF line endings (the git index uses LF).

## Scripts

See `README.md` for the list, the sites each script runs on and the install links.
