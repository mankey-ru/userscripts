# Git rules (userscripts)

- Solo repo: commit and push directly to `main`, no feature branches or PRs.
- Before every push, bump `@version` of each script whose built code changes
  in `origin/main..HEAD` (its `src/<name>/` files other than tests, or
  `src/_shared/`), unless those commits already raise it: last number + 1
  (`1.2` -> `1.3`), in its own commit `<name>: @version <new>`. Because
  Tampermonkey updates an installed script only when its `@version` grows.
