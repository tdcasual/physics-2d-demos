# Decoupling and Debt-Defense Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce coupling between navigation/catalog/runtime layers, harden legacy adapter boundaries, and add architecture guardrails so future 2D scene expansion does not accumulate hidden technical debt.

**Architecture:** Introduce a single source of truth for scene catalog data, generate artifacts from that source, isolate legacy postMessage protocol into typed helpers, and enforce layer boundaries through automated tests/lint checks.

**Tech Stack:** TypeScript, Vite, Vitest, Playwright, ESLint, pnpm scripts.

---

### Task 1: Unify Scene Catalog as Single Source of Truth

**Files:**
- Create: `src/catalog/scene-registry.ts`
- Modify: `src/app/scene-index.ts`
- Modify: `src/app/legacy-animation-catalog.ts`
- Modify: `scripts/generate-scene-index.ts`
- Test: `tests/unit/scene-registry.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/scene-registry.spec.ts
import { describe, expect, it } from 'vitest';
import { sceneRegistry } from '../../src/catalog/scene-registry';

describe('sceneRegistry', () => {
  it('has unique ids and includes both modern and legacy scenes', () => {
    const ids = sceneRegistry.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain('projectile');
    expect(ids).toContain('legacy-field-lines');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/scene-registry.spec.ts`
Expected: FAIL because `src/catalog/scene-registry.ts` does not exist.

**Step 3: Write minimal implementation**

```ts
// src/catalog/scene-registry.ts
import { projectileMeta } from '../scenes/projectile/scene.meta';
import { legacyAnimationCatalog, buildLegacy2DHostPath } from '../app/legacy-animation-catalog';

export const sceneRegistry = [
  {
    id: projectileMeta.id,
    title: projectileMeta.title,
    path: projectileMeta.path,
    keywords: projectileMeta.keywords,
    source: 'modern' as const
  },
  ...legacyAnimationCatalog.map((item) => ({
    id: item.id,
    title: item.title,
    path: item.dimension === '2d' ? buildLegacy2DHostPath(item.id) : item.sourcePath,
    keywords: item.keywords,
    source: 'legacy' as const
  }))
];
```

Then make `scene-index.ts` and `generate-scene-index.ts` consume `sceneRegistry` instead of duplicating imports.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/scene-registry.spec.ts tests/unit/generate-scene-index.spec.ts tests/unit/legacy-animation-catalog.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/catalog/scene-registry.ts src/app/scene-index.ts src/app/legacy-animation-catalog.ts scripts/generate-scene-index.ts tests/unit/scene-registry.spec.ts
git commit -m "refactor: centralize scene catalog into single registry"
```

### Task 2: Remove Navigation Data Duplication (Generated Fallback)

**Files:**
- Create: `scripts/generate-nav-fallback.ts`
- Create: `public/scene-fallback.js` (generated)
- Modify: `index.html`
- Modify: `package.json`
- Test: `tests/unit/generate-nav-fallback.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/generate-nav-fallback.spec.ts
import { describe, expect, it } from 'vitest';
import { toFallbackScript } from '../../scripts/generate-nav-fallback';

describe('toFallbackScript', () => {
  it('serializes pages into window global', () => {
    const script = toFallbackScript([{ id: 'a', title: 'A', path: '/a' }]);
    expect(script).toContain('window.__SCENE_FALLBACK__');
    expect(script).toContain('"id":"a"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/generate-nav-fallback.spec.ts`
Expected: FAIL (missing module).

**Step 3: Write minimal implementation**

```ts
// scripts/generate-nav-fallback.ts
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { sceneRegistry } from '../src/catalog/scene-registry';

export function toFallbackScript(entries: unknown[]): string {
  return `window.__SCENE_FALLBACK__ = ${JSON.stringify(entries)};`;
}

export async function generateFallback(outFile = resolve(process.cwd(), 'public/scene-fallback.js')) {
  await writeFile(outFile, toFallbackScript(sceneRegistry), 'utf8');
}
```

Update `index.html`:
- Load `/scene-fallback.js`
- Replace inline hardcoded `fallbackPages` with `window.__SCENE_FALLBACK__ ?? []`

Update scripts:
- `generate:index` should run both generators.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/generate-nav-fallback.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add scripts/generate-nav-fallback.ts public/scene-fallback.js index.html package.json tests/unit/generate-nav-fallback.spec.ts
git commit -m "refactor: generate nav fallback from scene registry"
```

### Task 3: Harden Legacy Adapter Protocol and Origin Checks

**Files:**
- Create: `src/app/legacy-2d-protocol.ts`
- Modify: `src/app/legacy-2d-adapter.ts`
- Test: `tests/unit/legacy-2d-protocol.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/legacy-2d-protocol.spec.ts
import { describe, expect, it } from 'vitest';
import { isTrustedLegacyOrigin, isLegacyReadoutMessage } from '../../src/app/legacy-2d-protocol';

describe('legacy protocol', () => {
  it('accepts same-origin and rejects foreign origin', () => {
    expect(isTrustedLegacyOrigin('https://a.com', 'https://a.com')).toBe(true);
    expect(isTrustedLegacyOrigin('https://evil.com', 'https://a.com')).toBe(false);
  });

  it('validates readout payload shape', () => {
    expect(isLegacyReadoutMessage({ type: 'legacy:readout', items: [{ label: 'x', value: '1' }] })).toBe(true);
    expect(isLegacyReadoutMessage({ type: 'legacy:readout', items: [{ label: 'x' }] })).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/legacy-2d-protocol.spec.ts`
Expected: FAIL (module missing).

**Step 3: Write minimal implementation**
- Move message-shape validators from adapter into `legacy-2d-protocol.ts`.
- In adapter, compute `targetOrigin` from `sourcePath` and `window.location.origin`.
- Replace `postMessage(..., '*')` with `postMessage(..., targetOrigin)`.
- Filter inbound messages by both `event.source` and `event.origin === targetOrigin`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/legacy-2d-protocol.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/legacy-2d-protocol.ts src/app/legacy-2d-adapter.ts tests/unit/legacy-2d-protocol.spec.ts
git commit -m "feat: harden legacy adapter protocol with origin validation"
```

### Task 4: Remove Scene Singleton and Standardize Page Lifecycle Cleanup

**Files:**
- Create: `src/app/page-lifecycle.ts`
- Modify: `src/scenes/projectile/scene.entry.ts`
- Modify: `tests/contract/scene-contract.spec.ts`
- Modify: `src/scenes/projectile/page.ts`
- Modify: `src/app/legacy-2d-page.ts`
- Test: `tests/unit/page-lifecycle.spec.ts`

**Step 1: Write the failing test**

```ts
// tests/unit/page-lifecycle.spec.ts
import { describe, expect, it } from 'vitest';
import { createPageLifecycle } from '../../src/app/page-lifecycle';

describe('page lifecycle', () => {
  it('runs all disposers once', () => {
    const calls: string[] = [];
    const lifecycle = createPageLifecycle();
    lifecycle.onDispose(() => calls.push('a'));
    lifecycle.onDispose(() => calls.push('b'));
    lifecycle.dispose();
    lifecycle.dispose();
    expect(calls).toEqual(['a', 'b']);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/unit/page-lifecycle.spec.ts`
Expected: FAIL (module missing).

**Step 3: Write minimal implementation**
- Implement `createPageLifecycle` with idempotent `dispose()`.
- In `projectile/page.ts` and `legacy-2d-page.ts`, register listeners/disposers via lifecycle object.
- Remove global singleton export from `scene.entry.ts`:
  - delete `export const projectileScene = createProjectileScene();`
- Update contract test to instantiate scene via `createProjectileScene()`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/unit/page-lifecycle.spec.ts tests/contract/scene-contract.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/page-lifecycle.ts src/scenes/projectile/scene.entry.ts src/scenes/projectile/page.ts src/app/legacy-2d-page.ts tests/unit/page-lifecycle.spec.ts tests/contract/scene-contract.spec.ts
git commit -m "refactor: enforce scene factory usage and page lifecycle cleanup"
```

### Task 5: Add Architecture Boundary Guardrails

**Files:**
- Create: `tests/unit/architecture-boundaries.spec.ts`
- Modify: `.eslintrc.cjs`
- Modify: `README.md`

**Step 1: Write the failing test**

```ts
// tests/unit/architecture-boundaries.spec.ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('architecture boundaries', () => {
  it('scene.sim modules do not import app layer', () => {
    const simSource = readFileSync('src/scenes/projectile/scene.sim.ts', 'utf8');
    expect(simSource.includes("../app/")).toBe(false);
    expect(simSource.includes("../../app/")).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails meaningfully**

Temporarily add one forbidden import in local scratch to confirm red behavior, then remove scratch change.
Run: `pnpm vitest run tests/unit/architecture-boundaries.spec.ts`
Expected: FAIL during scratch check, then PASS after cleanup.

**Step 3: Write minimal implementation**
- Add `no-restricted-imports` rules in `.eslintrc.cjs`:
  - `src/core/**` cannot import `src/app/**` or `src/scenes/**/page`
  - `src/scenes/**/scene.sim.ts` cannot import `src/app/**` or `src/ui/**`
- Document boundary rules in README.

**Step 4: Run test/lint to verify pass**

Run: `pnpm lint && pnpm vitest run tests/unit/architecture-boundaries.spec.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/unit/architecture-boundaries.spec.ts .eslintrc.cjs README.md
git commit -m "chore: add architecture boundary checks and docs"
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

Then verify runtime behavior:
- `/` loads cards from generated index/fallback
- `/src/pages/projectile.html` control loop + mode switch + resize works
- `/src/pages/legacy-2d.html?scene=legacy-field-lines` can send control messages and render fallback readout

## Scope Guard (YAGNI)

This PR intentionally does **not** include:
- migrating any 3D legacy pages
- introducing React or additional runtime frameworks
- replacing current canvas renderer abstraction
- adding backend services

Focus is boundary cleanup + debt prevention only.
