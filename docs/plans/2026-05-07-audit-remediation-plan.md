# Audit Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restore the project to a truthfully green quality gate by fixing the five audit issues: bundle budget failure, broken coverage upload, documentation drift, weak instrument coverage, and fragmented styling/token usage.

**Architecture:** Keep the existing layered architecture intact and fix process correctness first, then test blind spots, then documentation drift, then frontend hygiene. The highest-leverage change is to replace the current misleading multi-page bundle metric with an entry-aware budget model that still guards shared chunks and per-page payloads.

**Tech Stack:** Vite 7, TypeScript 5.9, React 18, Tailwind CSS v4, Vitest 3.2, Playwright, Codecov, pnpm

---

## Recommended Strategy

Use a two-phase rollout:

1. **Gate repair first**
   Fix the coverage artifact mismatch and the bundle-budget model so CI reflects reality instead of failing for misleading reasons.

2. **Confidence and maintainability second**
   Add missing instrument tests, remove documentation drift, and consolidate styling so the same problems do not reappear next month.

This is preferred over a pure byte-cutting pass because the current `check:bundle` script sums all JS assets across a multi-page site. As the site adds scenes, that metric will keep punishing legitimate growth even when each page remains lean.

---

### Task 1: Replace the Current Bundle Budget Model

**Why:** `pnpm quality:core` currently fails because `scripts/check-bundle-budget.ts` sums all generated JS across all entries. For a 14-scene multi-page app, total emitted JS is not the same thing as initial user cost.

**Files:**
- Modify: `scripts/check-bundle-budget.ts`
- Modify: `tests/unit/bundle-budget.spec.ts`
- Modify: `package.json`
- Inspect during implementation: `vite.config.ts`, `dist/.vite/manifest.json` or Vite build output shape

**Target behavior:**
- Keep guarding large shared chunks such as `vendor`, `layouts`, `ui`, and `core`
- Add per-entry initial JS budget for each HTML page
- Add per-entry initial CSS budget for each HTML page
- Keep a site-level shared-assets budget, but stop summing every lazy scene chunk into one total cap

**Recommended design:**
- Read Vite manifest data rather than recursively summing every emitted `.js` file
- For each HTML entry, compute:
  - initial JS reachable from that page
  - initial CSS reachable from that page
- Keep separate budgets for:
  - max shared vendor JS
  - max layout/core shared JS
  - max initial JS per scene entry
  - max initial CSS per scene entry
  - optional homepage initial budget stricter than scene pages

**Suggested default budgets:**
- Homepage initial JS: `<= 220 kB`
- Scene page initial JS: `<= 260 kB`
- Entry initial CSS: `<= 70 kB`
- Vendor shared JS: `<= 170 kB`
- Layout/core shared JS: `<= 90 kB`

**Step 1: Write failing tests for the new budget model**

Add cases in `tests/unit/bundle-budget.spec.ts` covering:
- a multi-entry site where total emitted JS is large but each entry budget passes
- a scene page whose reachable initial JS exceeds the new per-entry cap
- a vendor chunk that exceeds its shared cap

**Step 2: Run targeted tests to verify failure**

Run:

```bash
pnpm test tests/unit/bundle-budget.spec.ts
```

Expected: existing script assumptions fail against the new tests.

**Step 3: Implement the manifest-aware analyzer**

In `scripts/check-bundle-budget.ts`:
- parse the Vite manifest
- identify HTML entries and their imported chunks
- classify shared chunks versus entry-local chunks
- emit a report that explains which entry failed and why

Avoid:
- hard-coding current scene names
- silently raising budgets without changing the model

**Step 4: Validate against a real build**

Run:

```bash
pnpm build
pnpm check:bundle
```

Expected: the budget check passes only if real entry payloads fit the new caps.

**Step 5: Re-run the core gate**

Run:

```bash
pnpm quality:core
```

Expected: the bundle stage is no longer the red item unless a real per-entry/shared overage exists.

**Step 6: Commit**

```bash
git add scripts/check-bundle-budget.ts tests/unit/bundle-budget.spec.ts package.json
git commit -m "build: make bundle budget entry-aware"
```

---

### Task 2: Fix Coverage Artifact Generation and CI Upload

**Why:** CI uploads `coverage/lcov.info`, but Vitest is only configured to emit `text`, `html`, and `json`. Codecov integration currently looks configured but does not receive the expected artifact.

**Files:**
- Modify: `vite.config.ts`
- Modify: `.github/workflows/ci.yml`
- Optional test/doc touch: `README.md`

**Target behavior:**
- `pnpm test:coverage` should produce `coverage/lcov.info`
- CI should upload the exact artifact that local coverage emits
- Coverage upload failure should remain non-blocking only if intentionally desired

**Step 1: Write a narrow regression test or scripted assertion**

Preferred options:
- add a small unit test in `tests/unit/ci-scripts.spec.ts`, or
- extend the existing test to assert that the configured reporters include `lcov`

**Step 2: Run the test and confirm it fails first**

Run:

```bash
pnpm test tests/unit/ci-scripts.spec.ts
```

Expected: failure until `lcov` is configured.

**Step 3: Update coverage reporter configuration**

In `vite.config.ts`, change:

```ts
reporter: ['text', 'html', 'json']
```

to include `lcov`:

```ts
reporter: ['text', 'html', 'json', 'lcov']
```

**Step 4: Align CI with the actual artifact**

Review `.github/workflows/ci.yml` and keep the upload path consistent with Vitest output. If needed, upload both `lcov.info` and `coverage-final.json` for debugging.

**Step 5: Verify locally**

Run:

```bash
pnpm test:coverage
ls coverage/lcov.info
```

Expected: `coverage/lcov.info` exists.

**Step 6: Commit**

```bash
git add vite.config.ts .github/workflows/ci.yml tests/unit/ci-scripts.spec.ts
git commit -m "ci: align coverage reporters with codecov upload"
```

---

### Task 3: Eliminate Documentation and Metadata Drift

**Why:** README and AGENTS still describe an 8-scene project, while tests and runtime discovery confirm 14 scenes. The package name also still reads `teaching-animations-legacy-html`, which no longer matches the product identity.

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `package.json`
- Modify: `tests/contract/scene-contract.spec.ts` only if wording or helper comments need alignment
- Optional new check: `scripts/check-scenes.ts` or `tests/unit/ci-scripts.spec.ts`

**Target behavior:**
- Public docs describe the current project truthfully
- High-churn counts are either updated automatically or written in a non-brittle way
- Package metadata matches repository identity

**Recommended design:**
- Replace hard-coded overview text like "8 个场景" with one of:
  - "当前收录 14 个场景" if exact counts matter, or
  - "收录多个交互式 2D 物理场景" if the count changes often
- Rename the package to something aligned, for example:
  - `physics-2d-demos`
  - or `teaching-demo-hub`
- Add a doc consistency check only if it stays lightweight

**Step 1: Update the docs**

Revise:
- project overview
- project layout examples
- quick facts such as scene count and build artifact notes

**Step 2: Update package metadata**

Rename the package in `package.json` to match the repo/product.

**Step 3: Add a drift-prevention check**

Preferred lightweight option:
- extend `scripts/check-scenes.ts` or `tests/unit/ci-scripts.spec.ts`
- assert that `README.md` and `AGENTS.md` do not contain the outdated fixed phrase `8 个`

Avoid:
- overengineering a full doc parser
- duplicating scene count in many places

**Step 4: Verify**

Run:

```bash
pnpm check:scenes
pnpm test tests/contract/scene-contract.spec.ts tests/unit/ci-scripts.spec.ts
```

Expected: docs are current and the anti-drift assertion passes.

**Step 5: Commit**

```bash
git add README.md AGENTS.md package.json scripts/check-scenes.ts tests/unit/ci-scripts.spec.ts
git commit -m "docs: sync project metadata with current scene inventory"
```

---

### Task 4: Raise Instrument and Instrument-Library Test Coverage

**Why:** overall coverage is decent, but `src/instruments/` is nearly uncovered and `src/app/instrument-library/` is effectively uncovered. This is the largest confidence gap in the repository.

**Files:**
- Create: `tests/unit/instrument-registry.spec.ts`
- Create: `tests/unit/instrument-library.spec.ts`
- Create if needed: `tests/unit/instrument-manifest.spec.ts`
- Modify if needed for testability: `src/app/instrument-library/instrument-library.ts`
- Modify if needed for testability: `src/instruments/instrument-registry.ts`
- Optional new visual test: `tests/visual/instruments.spec.ts`

**Target behavior:**
- registry sorting, grouping, label mapping, and manifest validation are covered
- the instrument library page can render empty state and non-empty state in tests
- selecting an instrument is testable without needing a full production browser for every assertion

**Recommended design for testability:**
- extract small pure helpers from `bootInstrumentLibrary()` instead of testing one giant imperative blob
- examples:
  - `detectTheme(document, matchMedia)`
  - `createLibraryShell()`
  - `renderEmptyInstrumentState()`
  - `selectInstrument()` with injected loader/sim/view hooks

Do not rewrite the feature into React. Keep the DOM architecture.

**Step 1: Add registry tests**

Cover in `tests/unit/instrument-registry.spec.ts`:
- `buildInstrumentRegistry()` returns manifest-backed entries
- entries sort by category order then title
- `buildRegistryByCategory()` groups correctly
- `getCategoryLabel()` returns fallback for unknown category
- `validateManifest()` reports broken module paths

**Step 2: Add manifest sanity tests**

In `tests/unit/instrument-manifest.spec.ts`:
- each manifest entry has unique `id`
- `modulePath` matches `/src/instruments/<id>/index.ts`
- category values match allowed contract values

**Step 3: Add instrument-library DOM tests**

In `tests/unit/instrument-library.spec.ts`:
- empty registry shows empty state
- non-empty registry renders category headers and buttons
- clicking a registry item starts load and updates selected styles
- failure path shows an error state

To make this practical, inject or mock:
- `buildInstrumentRegistry`
- `buildRegistryByCategory`
- `sizeCanvasToFill`
- the instrument factory loader

**Step 4: Add one browser-level smoke test**

Create `tests/visual/instruments.spec.ts` or extend an existing visual suite:
- open `/src/pages/instruments.html`
- assert sidebar renders
- click one instrument
- assert canvas remains visible
- assert metadata panel updates

**Step 5: Verify coverage movement**

Run:

```bash
pnpm test tests/unit/instrument-registry.spec.ts tests/unit/instrument-manifest.spec.ts tests/unit/instrument-library.spec.ts
pnpm test:coverage
```

Expected:
- `src/instruments/` coverage materially improves
- `src/app/instrument-library/` is no longer at 0%

**Step 6: Commit**

```bash
git add tests/unit/instrument-registry.spec.ts tests/unit/instrument-manifest.spec.ts tests/unit/instrument-library.spec.ts tests/visual/instruments.spec.ts src/app/instrument-library/instrument-library.ts src/instruments/instrument-registry.ts
git commit -m "test: cover instrument registry and library flows"
```

---

### Task 5: Consolidate Styling, Tokens, and Font Delivery

**Why:** the project already has design tokens and theme layers, but homepage UI still embeds large `<style>` blocks, uses local hard-coded colors, and imports fonts from Fontshare at runtime. This weakens theme consistency, offline resilience, and long-term maintainability.

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/sections/ExperimentsSection.tsx`
- Modify: `src/app/data/scenes.ts`
- Modify: `src/styles/global.css`
- Modify: `src/styles/themes.css`
- Modify: `src/styles/design-tokens.css`
- Create: `src/styles/app/home.css`
- Optional create: `public/fonts/*` or `src/assets/fonts/*`

**Target behavior:**
- homepage components use shared CSS files instead of large inline `<style>` blocks
- semantic category and difficulty colors come from tokens or theme vars
- font delivery does not require runtime third-party CSS unless explicitly accepted
- theme updates remain centralized

**Recommended design:**
- move homepage layout and experiments-section styles into `src/styles/app/home.css`
- define tokens such as:
  - `--token-color-category-mechanics`
  - `--token-color-category-electromagnetism`
  - `--token-color-category-method`
  - `--token-color-difficulty-1/2/3`
- in `src/app/data/scenes.ts`, replace raw hex color metadata with semantic keys if possible
- replace remote `@import` fonts in `src/styles/global.css` with:
  - self-hosted `@font-face`, or
  - a documented fallback stack if self-hosting is postponed

**Step 1: Write focused tests before refactor**

Add or extend tests around:
- `tests/unit/app.spec.tsx`
- `tests/unit/navigation-branding.spec.ts`
- `tests/unit/scenes-data.spec.ts`

Assert:
- homepage still renders featured scenes
- theme toggle still updates `meta[name="theme-color"]`
- scene category rendering still works after replacing raw hex metadata

**Step 2: Extract homepage styles**

Move inline styles from:
- `src/app/App.tsx`
- `src/app/sections/ExperimentsSection.tsx`

into a shared stylesheet imported by the app entry.

**Step 3: Tokenize semantic colors**

Update:
- `src/styles/design-tokens.css`
- `src/styles/themes.css`
- `src/app/data/scenes.ts`

Use semantic names instead of repeated literal colors.

**Step 4: Decide and implement font strategy**

Preferred:
- self-host `Satoshi` and `Clash Display` if licensing allows

Fallback:
- replace the remote import with a stable local-first stack and document the trade-off

**Step 5: Verify visually and functionally**

Run:

```bash
pnpm test tests/unit/app.spec.tsx tests/unit/navigation-branding.spec.ts tests/unit/scenes-data.spec.ts
pnpm exec playwright test tests/visual/navigation.spec.ts tests/visual/color-contrast-audit.spec.ts --reporter=line
pnpm build
```

Expected:
- no homepage regressions
- no new contrast regressions
- CSS remains within budget

**Step 6: Commit**

```bash
git add src/app/App.tsx src/app/sections/ExperimentsSection.tsx src/app/data/scenes.ts src/styles/global.css src/styles/themes.css src/styles/design-tokens.css src/styles/app/home.css tests/unit/app.spec.tsx tests/unit/navigation-branding.spec.ts tests/unit/scenes-data.spec.ts
git commit -m "style: consolidate homepage styling and semantic tokens"
```

---

## Final Verification Pass

After all five tasks:

Run:

```bash
pnpm check:scenes
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm check:bundle
pnpm exec playwright test tests/visual/a11y-audit.spec.ts tests/visual/color-contrast-audit.spec.ts tests/visual/performance-audit.spec.ts --reporter=line
```

If time permits, finish with:

```bash
pnpm quality:full
```

Expected end state:
- core gate green
- coverage upload real, not decorative
- docs and metadata truthful
- instrument subsystem no longer a blind spot
- homepage styling and tokens consolidated

---

## Risk Notes

- **Task 1 risk:** If the new budget model is too permissive, CI loses teeth. Countermeasure: keep per-entry and shared-chunk caps strict, and print detailed failure diagnostics.
- **Task 4 risk:** Instrument-library tests may be awkward against one large imperative function. Countermeasure: allow small extraction refactors strictly for testability.
- **Task 5 risk:** Font self-hosting may require license review. Countermeasure: separate token/style cleanup from asset-hosting if needed.

---

## Suggested Execution Order

1. Task 2: coverage artifact fix
2. Task 1: bundle budget model fix
3. Task 4: instrument coverage uplift
4. Task 3: docs and metadata drift cleanup
5. Task 5: style/token/font consolidation
6. Final verification pass
