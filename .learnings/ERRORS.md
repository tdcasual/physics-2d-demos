## [ERR-20260808-001] git add index lock

**Logged**: 2026-08-08T00:00:00Z
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary

The workspace sandbox allows source edits but mounts `.git` read-only, so Git cannot create `index.lock` without elevated permissions.

### Error

```
fatal: Unable to create '/home/tdcasual/codework/physics-2d-demos/.git/index.lock': Read-only file system
```

### Context

- Command: `git add -A`
- Environment: workspace-write sandbox with read-only `.git`

### Suggested Fix

Run Git index and ref mutations with explicitly approved elevated permissions.

### Metadata

- Reproducible: yes
- Related Files: .git/index

### Resolution

- **Resolved**: 2026-08-08T00:00:00Z
- **Notes**: Retried the scoped Git operation with elevated permissions.

---

## [ERR-20260805-001] pnpm quality:core

**Logged**: 2026-08-05T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary

`pnpm quality:core` cannot start because pnpm cannot open its global store-index SQLite database.

### Error

```
[ERR_SQLITE_ERROR] unable to open database file
```

### Context

- Command: `pnpm quality:core`
- Environment: workspace-write sandbox; project-local `node_modules/.bin` is available
- Failure occurs during pnpm's dependency status check, before project scripts run

### Suggested Fix

Use a writable pnpm store/cache for sandboxed runs, or invoke the already-installed project binaries directly for read-only verification.

### Metadata

- Reproducible: yes
- Related Files: package.json

---

## [ERR-20260805-007] visual audit approval timeout

**Logged**: 2026-08-05T00:00:00Z
**Priority**: low
**Status**: pending
**Area**: tests

### Summary

The escalated visual Playwright run was rejected because automatic permission review timed out before process creation.

### Error

```
The automatic permission approval review did not finish before its deadline.
```

### Context

- Command: system-Chrome Playwright run for `tests/visual`
- The tool explicitly permits one retry

### Suggested Fix

Retry once or run the same command under an already-approved Playwright test rule.

### Metadata

- Reproducible: unknown
- Related Files: playwright.system-audit.config.ts
- See Also: ERR-20260805-004

---

## [ERR-20260805-006] Playwright unsupported host

**Logged**: 2026-08-05T00:00:00Z
**Priority**: high
**Status**: pending
**Area**: tests

### Summary

Playwright 1.58.2 refuses to install Chromium on the current Ubuntu 26.04 host.

### Error

```
Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64
```

### Context

- Command: `npx playwright install chromium`
- This blocks local E2E, visual regression, screenshots, and axe browser scans unless a compatible system browser is available

### Suggested Fix

Run browser tests in a supported container/CI image, or configure Playwright to use a verified system Chromium executable.

### Metadata

- Reproducible: yes
- Related Files: playwright.config.ts, playwright.e2e.config.ts
- See Also: ERR-20260805-005

---

## [ERR-20260805-005] missing Playwright Chromium

**Logged**: 2026-08-05T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary

All Playwright tests abort before execution because the Chromium runtime for Playwright 1.58.2 is not installed.

### Error

```
browserType.launch: Executable doesn't exist at .../chromium_headless_shell-1208/...
```

### Context

- Command: `./node_modules/.bin/playwright test -c playwright.e2e.config.ts`
- 77 tests were discovered; every failure occurred during browser launch

### Suggested Fix

Run `npx playwright install chromium` after dependency updates and cache the browser runtime in CI/dev environments.

### Metadata

- Reproducible: yes
- Related Files: package.json, playwright.e2e.config.ts
- See Also: ERR-20260805-004

---

## [ERR-20260805-004] playwright sandbox server visibility

**Logged**: 2026-08-05T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: tests

### Summary

Sandboxed Playwright cannot see the approved local preview server and falls back to the configured pnpm webServer command, which fails.

### Error

```
Error: Process from config.webServer was not able to start. Exit code: 1
```

### Context

- Command: `./node_modules/.bin/playwright test -c playwright.e2e.config.ts`
- Preview server is running at `http://127.0.0.1:5177/` outside the sandbox

### Suggested Fix

Run Playwright with the same approved network scope as the preview server.

### Metadata

- Reproducible: yes
- Related Files: tests/playwright.shared.ts
- See Also: ERR-20260805-003

---

## [ERR-20260805-003] vite preview socket

**Logged**: 2026-08-05T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary

The sandbox blocks the local preview server from listening on loopback.

### Error

```
Error: listen EPERM: operation not permitted 127.0.0.1:5177
```

### Context

- Command: `./node_modules/.bin/vite preview --host 127.0.0.1 --port 5177`
- Needed to run Playwright E2E, visual, and axe audits against the production build

### Suggested Fix

Run the preview server with approved network-listen permissions in restricted environments.

### Metadata

- Reproducible: yes
- Related Files: tests/playwright.shared.ts
- See Also: ERR-20260805-001

---

## [ERR-20260805-002] tsx CLI IPC

**Logged**: 2026-08-05T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: infra

### Summary

The project-local `tsx` CLI cannot create its IPC socket in the sandbox.

### Error

```
Error: listen EPERM: operation not permitted /tmp/tsx-1000/2.pipe
```

### Context

- Command: `./node_modules/.bin/tsx scripts/check-scenes.ts`
- Environment: workspace-write sandbox
- TypeScript, ESLint, and madge checks run normally through their local binaries

### Suggested Fix

Invoke TypeScript scripts with `node --import tsx` in restricted environments, or provide IPC permission for the `tsx` CLI.

### Metadata

- Reproducible: yes
- Related Files: scripts/check-scenes.ts
- See Also: ERR-20260805-001

---
