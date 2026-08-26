# Physics 2D Animation Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a scalable static-site foundation for large-volume 2D physics teaching animations with deterministic simulation, reusable scene templates, and automated quality gates.

**Architecture:** Create a Vite multi-page TypeScript app with strict scene contracts. Keep physics (`sim`) and rendering (`view`) separated, use a deterministic fixed-step loop, and generate the navigation index from scene metadata at build time.

**Tech Stack:** pnpm, Vite, TypeScript, PixiJS v8, Vitest, Playwright, ESLint, Prettier.

---

## Required Skills During Execution

- `@superpowers/test-driven-development`
- `@superpowers/verification-before-completion`
- `@skills/playwright`

### Task 1: Bootstrap Toolchain and Red/Green Smoke Loop

**Files:**

- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/app/health.ts`
- Create: `tests/unit/health.spec.ts`
- Create: `.eslintrc.cjs`
- Create: `.prettierrc`

**Step 1: Write the failing test**

```ts
// tests/unit/health.spec.ts
import { describe, expect, it } from 'vitest';
import { getHealthStatus } from '../../src/app/health';

describe('getHealthStatus', () => {
  it('returns ok for bootstrap smoke check', () => {
    expect(getHealthStatus()).toBe('ok');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/health.spec.ts`
Expected: FAIL with module-not-found for `src/app/health`.

**Step 3: Write minimal implementation**

```ts
// src/app/health.ts
export function getHealthStatus(): string {
  return 'ok';
}
```

Also add minimal scripts/deps in `package.json` for `dev`, `build`, `test`, `lint`, `format`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/health.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/app/health.ts tests/unit/health.spec.ts .eslintrc.cjs .prettierrc
git commit -m "chore: bootstrap vite typescript test lint toolchain"
```

### Task 2: Fixed Timestep Simulation Core

**Files:**

- Create: `src/core/fixed-step.ts`
- Create: `tests/unit/fixed-step.spec.ts`
- Modify: `src/app/health.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/fixed-step.spec.ts
import { describe, expect, it } from 'vitest';
import { createFixedStepper } from '../../src/core/fixed-step';

describe('createFixedStepper', () => {
  it('clamps catch-up work to maxSubSteps', () => {
    const stepper = createFixedStepper({ dt: 1 / 60, maxSubSteps: 5 });
    const steps = stepper.consume(1.0);
    expect(steps).toBe(5);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/fixed-step.spec.ts`
Expected: FAIL with missing `createFixedStepper` export.

**Step 3: Write minimal implementation**

```ts
// src/core/fixed-step.ts
export function createFixedStepper(config: {
  dt: number;
  maxSubSteps: number;
}) {
  let accumulator = 0;
  return {
    consume(frameDt: number) {
      accumulator += Math.max(0, frameDt);
      let steps = 0;
      while (accumulator >= config.dt && steps < config.maxSubSteps) {
        accumulator -= config.dt;
        steps += 1;
      }
      if (steps === config.maxSubSteps) accumulator = 0;
      return steps;
    }
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/fixed-step.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/fixed-step.ts tests/unit/fixed-step.spec.ts
git commit -m "feat: add deterministic fixed timestep core"
```

### Task 3: Deterministic RNG and Parameter Guard

**Files:**

- Create: `src/core/rng.ts`
- Create: `src/core/guards.ts`
- Create: `tests/unit/rng.spec.ts`
- Create: `tests/unit/guards.spec.ts`

**Step 1: Write the failing tests**

```ts
// tests/unit/rng.spec.ts
import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/core/rng';

describe('createRng', () => {
  it('produces identical sequences for the same seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
```

```ts
// tests/unit/guards.spec.ts
import { describe, expect, it } from 'vitest';
import { clampParam } from '../../src/core/guards';

describe('clampParam', () => {
  it('returns nearest legal value for invalid input', () => {
    expect(clampParam(999, { min: 0, max: 10, fallback: 3 })).toBe(10);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/unit/rng.spec.ts tests/unit/guards.spec.ts`
Expected: FAIL with missing modules.

**Step 3: Write minimal implementation**

- `createRng(seed)` using deterministic LCG.
- `clampParam(value, { min, max, fallback })` with NaN fallback.

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/unit/rng.spec.ts tests/unit/guards.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/core/rng.ts src/core/guards.ts tests/unit/rng.spec.ts tests/unit/guards.spec.ts
git commit -m "feat: add deterministic rng and runtime param guards"
```

### Task 4: Scene Contract and First Example Scene (Projectile)

**Files:**

- Create: `src/scenes/types.ts`
- Create: `src/scenes/projectile/scene.meta.ts`
- Create: `src/scenes/projectile/scene.sim.ts`
- Create: `src/scenes/projectile/scene.view.ts`
- Create: `src/scenes/projectile/scene.entry.ts`
- Create: `tests/contract/scene-contract.spec.ts`
- Create: `tests/unit/projectile.sim.spec.ts`

**Step 1: Write the failing tests**

```ts
// tests/contract/scene-contract.spec.ts
import { describe, expect, it } from 'vitest';
import { projectileScene } from '../../src/scenes/projectile/scene.entry';

describe('scene contract', () => {
  it('implements required lifecycle methods', () => {
    expect(typeof projectileScene.init).toBe('function');
    expect(typeof projectileScene.reset).toBe('function');
    expect(typeof projectileScene.step).toBe('function');
    expect(typeof projectileScene.render).toBe('function');
    expect(typeof projectileScene.dispose).toBe('function');
  });
});
```

```ts
// tests/unit/projectile.sim.spec.ts
import { describe, expect, it } from 'vitest';
import { createProjectileSim } from '../../src/scenes/projectile/scene.sim';

describe('projectile sim', () => {
  it('moves x forward after one positive dt step', () => {
    const sim = createProjectileSim({ speed: 10, angleDeg: 45, gravity: 9.8 });
    const before = sim.getState().x;
    sim.step(1 / 60);
    const after = sim.getState().x;
    expect(after).toBeGreaterThan(before);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm vitest run tests/contract/scene-contract.spec.ts tests/unit/projectile.sim.spec.ts`
Expected: FAIL with missing scene files.

**Step 3: Write minimal implementation**

- Define `SceneLifecycle` interface in `src/scenes/types.ts`.
- Implement projectile sim with pure state updates.
- Implement minimal Pixi view object with `render(state)`.
- Export `projectileScene` from entry.

**Step 4: Run tests to verify they pass**

Run: `pnpm vitest run tests/contract/scene-contract.spec.ts tests/unit/projectile.sim.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/scenes/types.ts src/scenes/projectile tests/contract/scene-contract.spec.ts tests/unit/projectile.sim.spec.ts
git commit -m "feat: add scene lifecycle contract and first projectile scene"
```

### Task 5: Reusable Scene Shell and Common Controls

**Files:**

- Create: `src/ui/control-panel.ts`
- Create: `src/app/scene-shell.ts`
- Create: `src/pages/projectile.html`
- Create: `tests/unit/scene-shell.spec.ts`
- Modify: `vite.config.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/scene-shell.spec.ts
import { describe, expect, it } from 'vitest';
import { createTransportState } from '../../src/app/scene-shell';

describe('transport controls', () => {
  it('starts in paused mode', () => {
    expect(createTransportState().isPlaying).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/scene-shell.spec.ts`
Expected: FAIL with missing module.

**Step 3: Write minimal implementation**

- Create scene shell state (`play`, `pause`, `reset`, `stepOnce`).
- Add control panel component wiring.
- Register `src/pages/projectile.html` as Vite multi-page input.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/scene-shell.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/ui/control-panel.ts src/app/scene-shell.ts src/pages/projectile.html vite.config.ts tests/unit/scene-shell.spec.ts
git commit -m "feat: add reusable scene shell and transport controls"
```

### Task 6: Metadata Index Generation and Navigation Integration

**Files:**

- Create: `scripts/generate-scene-index.ts`
- Create: `src/app/scene-index.ts`
- Create: `public/scene-index.json` (generated)
- Modify: `index.html`
- Create: `tests/unit/generate-scene-index.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/generate-scene-index.spec.ts
import { describe, expect, it } from 'vitest';
import { toSceneIndex } from '../../scripts/generate-scene-index';

describe('toSceneIndex', () => {
  it('sorts scene metadata by title and keeps required fields', () => {
    const result = toSceneIndex([
      { id: 'b', title: 'B', path: '/b.html' },
      { id: 'a', title: 'A', path: '/a.html' }
    ]);
    expect(result.map((x) => x.id)).toEqual(['a', 'b']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/generate-scene-index.spec.ts`
Expected: FAIL with missing export/module.

**Step 3: Write minimal implementation**

- Implement `toSceneIndex` pure function and file-generation CLI.
- Add `pnpm generate:index` script.
- Update navigation page to load `scene-index.json` first, fallback to hardcoded list.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/generate-scene-index.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/generate-scene-index.ts src/app/scene-index.ts public/scene-index.json index.html tests/unit/generate-scene-index.spec.ts
git commit -m "feat: generate scene index from metadata and wire nav page"
```

### Task 7: Visual Regression Baseline with Playwright

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/visual/navigation.spec.ts`
- Create: `tests/visual/projectile.spec.ts`
- Create: `tests/visual/__screenshots__/` (baseline artifacts)
- Modify: `package.json`

**Step 1: Write the failing visual test**

```ts
// tests/visual/navigation.spec.ts
import { test, expect } from '@playwright/test';

test('navigation page renders cards', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(1, { timeout: 10000 });
});
```

**Step 2: Run visual test to verify it fails meaningfully**

Run: `pnpm playwright test tests/visual/navigation.spec.ts`
Expected: FAIL if preview server or page setup is missing.

**Step 3: Write minimal implementation**

- Configure Playwright `webServer` to run Vite preview/dev server.
- Add deterministic viewport and locale.
- Add first stable visual assertions and initial snapshot update command.

**Step 4: Run visual test to verify it passes**

Run: `pnpm playwright test tests/visual/navigation.spec.ts --update-snapshots`
Then run: `pnpm playwright test tests/visual/navigation.spec.ts`
Expected: PASS with zero failures.

**Step 5: Commit**

```bash
git add playwright.config.ts tests/visual package.json
git commit -m "test: add playwright visual regression baseline"
```

### Task 8: End-to-End Verification Gate and CI Workflow

**Files:**

- Create: `.github/workflows/ci.yml`
- Modify: `package.json`
- Create: `README.md`

**Step 1: Write the failing workflow expectation test (script-level)**

Create `tests/unit/ci-scripts.spec.ts` asserting required scripts exist in `package.json` (`lint`, `test`, `test:visual`, `build`).

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/ci-scripts.spec.ts`
Expected: FAIL if scripts are missing.

**Step 3: Write minimal implementation**

- Add CI workflow executing:
  - `pnpm install --frozen-lockfile`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm test:visual`
  - `pnpm build`
- Update README with local dev/test commands.

**Step 4: Run full verification to verify it passes**

Run: `pnpm lint && pnpm test && pnpm test:visual && pnpm build`
Expected: all commands pass with exit code 0.

**Step 5: Commit**

```bash
git add .github/workflows/ci.yml package.json README.md tests/unit/ci-scripts.spec.ts
git commit -m "chore: add ci quality gates and developer runbook"
```

## Final Verification Checklist (Before Any PR)

1. Run: `pnpm lint`
2. Run: `pnpm test`
3. Run: `pnpm test:visual`
4. Run: `pnpm build`
5. Run: `pnpm generate:index`
6. Confirm `index.html` shows generated scene entries and search works.
7. Confirm at least one scene supports `播放/暂停/重置/单步`.

## Notes for Legacy Migration

- Keep existing `animations/**/*.html` untouched during foundation build.
- Migrate legacy pages one-by-one into `src/scenes/*` after foundation is stable.
- Preserve old pages behind legacy links until migrated scenes reach parity.
