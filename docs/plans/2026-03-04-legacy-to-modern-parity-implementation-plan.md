# Legacy To Modern Parity Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all legacy 2D demos to modern scene modules while preserving scene behavior and teaching outcomes, then remove the legacy runtime path so only one architecture remains.

**Architecture:** Build a parity-first migration pipeline. For each legacy scene, define deterministic parity checkpoints (state/readout/controls/visual). Re-implement scene logic in modern `scene.meta/sim/view/entry/page` structure, validate against parity checkpoints, then switch routing from legacy host to modern page. After all scenes pass parity gates, delete legacy adapter/protocol/pages and legacy HTML assets.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright, Canvas2D scene stack, existing scene shell/runtime, pnpm scripts.

---

### Task 1: Freeze Migration Scope and Parity Contract

**Files:**
- Create: `docs/plans/legacy-parity-checklist.md`
- Modify: `src/app/legacy-animation-catalog.ts`
- Test: `tests/unit/legacy-animation-catalog.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/legacy-animation-catalog.spec.ts
import { describe, expect, it } from 'vitest';
import { legacyAnimationCatalog } from '../../src/app/legacy-animation-catalog';

describe('legacyAnimationCatalog parity metadata', () => {
  it('marks every legacy scene as not yet migrated by default', () => {
    expect(legacyAnimationCatalog.every((s) => s.migrationStatus === 'legacy')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/legacy-animation-catalog.spec.ts`
Expected: FAIL because `migrationStatus` is not defined yet.

**Step 3: Write minimal implementation**

```ts
// src/app/legacy-animation-catalog.ts
export type LegacyMigrationStatus = 'legacy' | 'migrated';

export type LegacyAnimationRecord = {
  // ...
  migrationStatus: LegacyMigrationStatus;
};
```

Set all current legacy scenes to `migrationStatus: 'legacy'`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/legacy-animation-catalog.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/legacy-animation-catalog.ts tests/unit/legacy-animation-catalog.spec.ts docs/plans/legacy-parity-checklist.md
git commit -m "chore: define legacy migration parity scope metadata"
```

### Task 2: Add Parity Test Harness (Legacy vs Modern)

**Files:**
- Create: `tests/visual/helpers/parity.ts`
- Create: `tests/visual/parity.spec.ts`
- Modify: `playwright.config.ts`

**Step 1: Write the failing test**

```ts
// tests/visual/parity.spec.ts
import { test, expect } from '@playwright/test';
import { captureParitySnapshot } from './helpers/parity';

test('legacy vs modern parity: chase-meet baseline', async ({ page }) => {
  const { legacy, modern } = await captureParitySnapshot(page, {
    legacyPath: '/src/pages/legacy-2d.html?scene=legacy-chase-meet',
    modernPath: '/src/pages/chase-meet.html',
    settleMs: 1200
  });
  expect(modern).toMatchSnapshot(legacy, { maxDiffPixelRatio: 0.01 });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/visual/parity.spec.ts`
Expected: FAIL because helper and modern page do not exist.

**Step 3: Write minimal implementation**
- Implement helper that captures same viewport region from both pages.
- Keep this test skipped until each modern scene exists.
- Configure deterministic viewport and timezone in Playwright project.

**Step 4: Run test to verify expected behavior**

Run: `pnpm playwright test tests/visual/parity.spec.ts`
Expected: PASS with skipped cases until scene migration begins.

**Step 5: Commit**

```bash
git add tests/visual/helpers/parity.ts tests/visual/parity.spec.ts playwright.config.ts
git commit -m "test: add visual parity harness for legacy-to-modern migration"
```

### Task 3: Migrate Scene 1 - Chase Meet

**Files:**
- Create: `src/scenes/chase-meet/scene.meta.ts`
- Create: `src/scenes/chase-meet/scene.sim.ts`
- Create: `src/scenes/chase-meet/scene.view.ts`
- Create: `src/scenes/chase-meet/scene.entry.ts`
- Create: `src/scenes/chase-meet/controls.ts`
- Create: `src/scenes/chase-meet/page.ts`
- Create: `src/pages/chase-meet.html`
- Modify: `src/catalog/scene-registry.ts`
- Modify: `src/app/legacy-animation-catalog.ts`
- Test: `tests/unit/chase-meet.sim.spec.ts`
- Test: `tests/contract/scene-contract.spec.ts`
- Test: `tests/visual/parity.spec.ts`

**Step 1: Write the failing tests**

```ts
// tests/unit/chase-meet.sim.spec.ts
import { describe, expect, it } from 'vitest';
import { createChaseMeetSim } from '../../src/scenes/chase-meet/scene.sim';

describe('chase-meet sim', () => {
  it('distance shrinks when pursuer speed > target speed', () => {
    const sim = createChaseMeetSim({ leadDistance: 100, pursuerSpeed: 12, targetSpeed: 8 });
    const before = sim.getState().distance;
    sim.step(1);
    const after = sim.getState().distance;
    expect(after).toBeLessThan(before);
  });
});
```

Add contract + parity assertions for `chase-meet`.

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/chase-meet.sim.spec.ts tests/contract/scene-contract.spec.ts`
Expected: FAIL due missing scene files.

**Step 3: Write minimal implementation**
- Implement deterministic chase model.
- Render using existing teaching shell standards.
- Reproduce legacy controls semantics (play/pause/reset/step + parameter controls).
- Emit readout fields matching legacy labels and units.

**Step 4: Run tests to verify they pass**

Run:

```bash
pnpm vitest run tests/unit/chase-meet.sim.spec.ts tests/contract/scene-contract.spec.ts
pnpm playwright test tests/visual/parity.spec.ts --grep "chase-meet"
```

Expected: PASS with parity within agreed diff threshold.

**Step 5: Commit**

```bash
git add src/scenes/chase-meet src/pages/chase-meet.html src/catalog/scene-registry.ts src/app/legacy-animation-catalog.ts tests/unit/chase-meet.sim.spec.ts tests/contract/scene-contract.spec.ts tests/visual/parity.spec.ts
git commit -m "feat: migrate chase-meet scene to modern architecture with parity checks"
```

### Task 4: Migrate Scene 2 - VT Integral

**Files:**
- Create: `src/scenes/vt-integral/*`
- Create: `src/pages/vt-integral.html`
- Modify: `src/catalog/scene-registry.ts`
- Modify: `src/app/legacy-animation-catalog.ts`
- Test: `tests/unit/vt-integral.sim.spec.ts`
- Test: `tests/visual/parity.spec.ts`

**Step 1: Write failing tests**
- Add numeric area/increment checks in `vt-integral.sim.spec.ts`.
- Add parity case in `parity.spec.ts`.

**Step 2: Run tests to verify fail**

Run: `pnpm vitest run tests/unit/vt-integral.sim.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Build modern scene structure.
- Preserve legacy sub-scene switch semantics and displayed formulas/readouts.

**Step 4: Run tests to verify pass**

Run:

```bash
pnpm vitest run tests/unit/vt-integral.sim.spec.ts
pnpm playwright test tests/visual/parity.spec.ts --grep "vt-integral"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/scenes/vt-integral src/pages/vt-integral.html src/catalog/scene-registry.ts src/app/legacy-animation-catalog.ts tests/unit/vt-integral.sim.spec.ts tests/visual/parity.spec.ts
git commit -m "feat: migrate vt-integral scene to modern architecture"
```

### Task 5: Migrate Scene 3 - Electrification

**Files:**
- Create: `src/scenes/electrification/*`
- Create: `src/pages/electrification.html`
- Modify: `src/catalog/scene-registry.ts`
- Modify: `src/app/legacy-animation-catalog.ts`
- Test: `tests/unit/electrification.sim.spec.ts`
- Test: `tests/visual/parity.spec.ts`

**Step 1: Write failing tests**
- Add state transition tests for friction/induction/contact sequences.
- Add parity case in visual parity suite.

**Step 2: Run tests to verify fail**

Run: `pnpm vitest run tests/unit/electrification.sim.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Implement scene state machine + timeline.
- Keep control flow labels and outcomes equivalent to legacy behavior.

**Step 4: Run tests to verify pass**

Run:

```bash
pnpm vitest run tests/unit/electrification.sim.spec.ts
pnpm playwright test tests/visual/parity.spec.ts --grep "electrification"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/scenes/electrification src/pages/electrification.html src/catalog/scene-registry.ts src/app/legacy-animation-catalog.ts tests/unit/electrification.sim.spec.ts tests/visual/parity.spec.ts
git commit -m "feat: migrate electrification scene to modern architecture"
```

### Task 6: Migrate Scene 4 - EMF Analogy

**Files:**
- Create: `src/scenes/emf-analogy/*`
- Create: `src/pages/emf-analogy.html`
- Modify: `src/catalog/scene-registry.ts`
- Modify: `src/app/legacy-animation-catalog.ts`
- Test: `tests/unit/emf-analogy.sim.spec.ts`
- Test: `tests/visual/parity.spec.ts`

**Step 1: Write failing tests**
- Add flow/circuit state tests.
- Add parity visual case.

**Step 2: Run tests to verify fail**

Run: `pnpm vitest run tests/unit/emf-analogy.sim.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Rebuild analogy model with deterministic update loop.
- Match legacy controls and readout semantics.

**Step 4: Run tests to verify pass**

Run:

```bash
pnpm vitest run tests/unit/emf-analogy.sim.spec.ts
pnpm playwright test tests/visual/parity.spec.ts --grep "emf-analogy"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/scenes/emf-analogy src/pages/emf-analogy.html src/catalog/scene-registry.ts src/app/legacy-animation-catalog.ts tests/unit/emf-analogy.sim.spec.ts tests/visual/parity.spec.ts
git commit -m "feat: migrate emf-analogy scene to modern architecture"
```

### Task 7: Migrate Scene 5 - Field Lines

**Files:**
- Create: `src/scenes/field-lines/*`
- Create: `src/pages/field-lines.html`
- Modify: `src/catalog/scene-registry.ts`
- Modify: `src/app/legacy-animation-catalog.ts`
- Test: `tests/unit/field-lines.sim.spec.ts`
- Test: `tests/visual/parity.spec.ts`

**Step 1: Write failing tests**
- Add force-line generation invariants and drag response tests.
- Add parity visual case.

**Step 2: Run tests to verify fail**

Run: `pnpm vitest run tests/unit/field-lines.sim.spec.ts`
Expected: FAIL.

**Step 3: Write minimal implementation**
- Build deterministic vector field model.
- Match legacy interaction semantics (drag, density, scenarios).

**Step 4: Run tests to verify pass**

Run:

```bash
pnpm vitest run tests/unit/field-lines.sim.spec.ts
pnpm playwright test tests/visual/parity.spec.ts --grep "field-lines"
```

Expected: PASS.

**Step 5: Commit**

```bash
git add src/scenes/field-lines src/pages/field-lines.html src/catalog/scene-registry.ts src/app/legacy-animation-catalog.ts tests/unit/field-lines.sim.spec.ts tests/visual/parity.spec.ts
git commit -m "feat: migrate field-lines scene to modern architecture"
```

### Task 8: Cut Legacy Runtime Path and Assets

**Files:**
- Delete: `src/pages/legacy-2d.html`
- Delete: `src/app/legacy-2d-adapter.ts`
- Delete: `src/app/legacy-2d-page.ts`
- Delete: `src/app/legacy-2d-protocol.ts`
- Delete: `src/app/legacy-*-controls.ts` (legacy-only controls)
- Delete: `animations/**`
- Modify: `src/app/scene-index.ts`
- Modify: `src/catalog/scene-registry.ts`
- Modify: `README.md`
- Modify: `tests/unit/legacy-*.spec.ts`
- Modify: `tests/visual/*.spec.ts`

**Step 1: Write failing tests**
- Add assertion that no registry entries have `source: 'legacy'`.
- Add assertion that `LEGACY_2D_HOST_PAGE_PATH` is removed.

**Step 2: Run tests to verify fail**

Run: `pnpm vitest run tests/unit/scene-registry.spec.ts`
Expected: FAIL due remaining legacy references.

**Step 3: Write minimal implementation**
- Remove legacy runtime and assets.
- Ensure all scene routes resolve to modern pages.
- Update docs and tests to single-architecture assumptions.

**Step 4: Run tests to verify pass**

Run:

```bash
pnpm generate:index
pnpm lint
pnpm test
pnpm test:visual
pnpm build
```

Expected: PASS.

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove legacy runtime and finalize single modern architecture"
```

## Final Verification Checklist

Run in order:

```bash
pnpm generate:index
pnpm lint
pnpm test
pnpm test:visual
pnpm build
```

Runtime checks:
- `/` shows only modern scene routes.
- Every migrated scene page supports unified play/pause/reset/step workflow.
- No iframe/postMessage dependency remains in runtime.
