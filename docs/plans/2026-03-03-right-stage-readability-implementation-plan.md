# Right Stage Readability Implementation Plan

> 状态：历史快照。归档设计/实施记录，不作为现行方案。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify right-side animation readability across all 2D scenes so 1080P projection at 3-4 meters remains legible in normal mode and clearly enhanced in presentation mode.

**Architecture:** Define one minimum readability baseline in shared standards, mirror equivalent tokens in each legacy HTML scene, and enforce thresholds with automated checks. Keep mode switching behavior intact (`normal` vs `presentation`) while only changing visual legibility parameters.

**Tech Stack:** TypeScript, Vitest, Vite, legacy inline HTML/JS canvas and SVG scenes.

---

### Task 1: Shared Standards Baseline

**Files:**

- Modify: `src/app/teaching-standards.ts`
- Test: `tests/unit/teaching-standards.spec.ts`

**Step 1: Write failing assertions for stronger baseline**

- Add assertions for minimum font/stroke thresholds in normal and presentation modes.

**Step 2: Run targeted test**

- Run: `pnpm test tests/unit/teaching-standards.spec.ts`
- Expected: FAIL before token updates.

**Step 3: Update standards tokens**

- Raise stroke and add explicit right-stage readability fields.

**Step 4: Re-run targeted test**

- Run: `pnpm test tests/unit/teaching-standards.spec.ts`
- Expected: PASS.

### Task 2: Legacy Scene Alignment

**Files:**

- Modify: `animations/electromagnetism/模拟电场线.html`
- Modify: `animations/electromagnetism/起电方式演示.html`
- Modify: `animations/electromagnetism/电动势类比动画.html`
- Modify: `animations/mechanics/v-t面积与微元法.html`
- Modify: `animations/mechanics/追击相遇问题.html`
- Modify: `src/scenes/projectile/scene.view.ts`

**Step 1: Add per-scene readability token block**

- Ensure every scene has a clearly named normal/presentation token object.

**Step 2: Replace hard-coded canvas/SVG font and line values**

- Wire draw logic to tokens for major/minor strokes and primary/secondary text.

**Step 3: Ensure presentation mode scales above normal**

- Keep existing controls and mode toggles; only update visual parameters.

**Step 4: Smoke-check scene boot**

- Run: `pnpm build`
- Expected: Build success.

### Task 3: Automated Detection

**Files:**

- Add: `tests/unit/right-stage-readability.spec.ts`

**Step 1: Add file-based threshold checks**

- Parse each legacy scene file and verify presence/value of readability tokens.

**Step 2: Verify detection catches regressions**

- Run targeted test command and ensure failures show missing/weak tokens.

### Task 4: End-to-End Verification

**Files:**

- Modify (if needed): `tests/visual/*` (only if existing snapshots must be updated)

**Step 1: Run static quality gates**

- Run: `pnpm lint`
- Expected: PASS.

**Step 2: Run tests**

- Run: `pnpm test`
- Expected: PASS.

**Step 3: Run build**

- Run: `pnpm build`
- Expected: PASS.

**Step 4: Visual confirmation**

- Capture normal and presentation screenshots for each `legacy-2d` scene at 1080P viewport and confirm line/text clarity.
