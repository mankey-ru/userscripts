# CLAUDE.md

Personal Tampermonkey userscripts (TypeScript, one folder per script in `src/<name>/`). Owner: mankey-ru.

## Safety rules

- Work only on a branch and open a PR. Never push to `main`: users install scripts straight from `main` (`@downloadURL` in each script header and the README Install links point at raw `dist/*.user.js`), so a merge reaches the owner's browser at once.
- Never edit `dist/` by hand and do not commit it from a branch. The GitHub workflow `.github/workflows/build_dist.yml` rebuilds `dist/` and commits it as `github-actions[bot]` on every push that touches `src/**`.
- A deleted script needs its `dist/<name>.user.js` deleted manually: the workflow only adds files, it never removes them.
- Do not add Claude attribution lines to commit messages or PR descriptions.

## Build and check

- Install: `npm ci`.
- Build: `npm run build` (dev, to `dist-dev/`, git-ignored) or `npm run build:prod` (to `dist/`). `build.mjs` bundles each `src/<name>/<name>.user.ts` with esbuild into an IIFE, writes it to flat `dist/<name>.user.js` (the `@downloadURL` paths depend on that) and copies the `// ==UserScript==` header block as the file banner.
- Type check: `npm run typecheck` (strict; `tsconfig.json` for scripts with DOM and Tampermonkey types, `tsconfig.test.json` for `*.test.ts` with Node types). TypeScript 7 ships a native binary per platform, so run `npm ci` on the machine that runs `tsc`: a `node_modules` installed on Windows fails on Linux with "Unable to resolve @typescript/typescript-linux-x64". The check is clean when `tsc` prints no errors.
- Format: `npm run format` (Prettier: tabs, single quotes, width 100).
- Tests: `npm test` runs `node --test` on `src/**/*.test.ts`. Only pure helpers are covered (e.g. `src/lyrics-clean-print/lib.ts`); DOM code is not. Behaviour on live sites cannot be checked in a cloud session: say so in the PR and list what the owner must click through.

## Conventions

- Every script starts with a `// ==UserScript==` header: `@name`, `@description`, `@author`, `@namespace mankey-ru/<name>`, `@version`, `@match`, `@icon`, `@grant`, `@downloadURL` (raw URL of its `dist` file). Bump `@version` when behaviour changes.
- A new script is `src/<name>/<name>.user.ts`; testable pure helpers go to `src/<name>/lib.ts`, their tests to `src/<name>/__tests__/lib.test.ts` (keep the `.test.ts` suffix), test data to `src/<name>/__tests__/fixtures/`. Add its section to `README.md` (name, sites, Install link, Source link) in the same PR.
- Shared code goes to `src/_shared/index.ts`; it is bundled into each script, not loaded at runtime.
- Keep files with LF line endings (the git index uses LF).

## Scripts

See `README.md` for the list, the sites each script runs on and the install links.
