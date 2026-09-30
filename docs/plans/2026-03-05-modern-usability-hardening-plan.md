# Modern Usability Hardening Implementation Plan

> 状态：历史快照。归档设计/实施记录，不作为现行方案。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Land P0/P1/P2 usability upgrades for modern scenes: touch-safe targets, mobile stability, classroom-simple controls, structured status, unified touch/responsive strategy, with regression tests.

**Architecture:** Keep the existing unified shell and extend it with reusable capabilities (`status semantics`, `mobile readout drawer`, `control tier`, `responsive/touch helpers`). Apply the helpers scene-by-scene with minimal logic changes and enforce behavior through Playwright gates.

**Tech Stack:** TypeScript, Vite, Playwright, Vitest, CSS.

---

### Task 1: Add Failing Usability Regression Tests

**Files:**

- Create: `tests/visual/usability-mobile.spec.ts`

**Step 1: Write failing tests**

- Assert iPhone/iPad no horizontal overflow for all modern pages.
- Assert minimum touch target size for key controls is `>= 44px`.
- Assert mobile readout uses collapsible drawer.
- Assert classroom control tier toggle exists and advanced controls are hidden by default.
- Assert status area exposes semantic state token.
- Assert touch-action policy differs between default scenes and drag scenes.

**Step 2: Run test to verify it fails**

Run: `pnpm playwright test tests/visual/usability-mobile.spec.ts`

Expected: FAIL on current implementation.

### Task 2: Shell Upgrades (P0 + P1)

**Files:**

- Modify: `src/app/teaching-demo-shell.ts`
- Modify: `src/ui/teaching-demo.css`

**Step 1: Implement structured status**

- Add semantic status badge and status level mapping.
- Keep backward compatibility with existing `setStatus(text)` calls.

**Step 2: Implement mobile readout drawer**

- Add drawer toggle button.
- On narrow viewports, default drawer collapsed to reduce stage obstruction.

**Step 3: Increase touch target sizes**

- Ensure stage toolbar buttons and key controls meet `>=44px`.

### Task 3: Classroom Control Tier (P1)

**Files:**

- Create: `src/app/control-tier.ts`
- Modify: `src/scenes/projectile/controls.ts`
- Modify: `src/scenes/chase-meet/controls.ts`
- Modify: `src/scenes/field-lines/controls.ts`
- Modify: `src/scenes/vt-integral/controls.ts`

**Step 1: Add shared control-tier helper**

- Default to classroom-simple view.
- Toggle advanced controls with one button.

**Step 2: Mark per-scene advanced sections**

- Keep core classroom controls visible by default.

### Task 4: Responsive + Touch Strategy Template (P0 + P2)

**Files:**

- Create: `src/app/responsive-stage.ts`
- Create: `src/app/touch-interaction.ts`
- Modify: `src/scenes/chase-meet/scene.view.ts`
- Modify: `src/scenes/field-lines/page.ts`
- Modify: `src/app/teaching-demo-shell.ts`
- Modify: `src/ui/teaching-demo.css`

**Step 1: Add shared responsive helper**

- Resolve viewport width/height from `visualViewport` first.
- Provide narrow breakpoint helper for scene layouts.

**Step 2: Use helper in chase-meet**

- Fix narrow-screen width calculation.
- Stack plot panels vertically in narrow mode.

**Step 3: Add shared touch policy helper**

- Default mode: tap/manipulation.
- Drag mode: `touch-action: none` for drag-priority scenes.

### Task 5: Verification and Stabilization

**Files:**

- Modify (if needed): `tests/visual/shell-1080-layout.spec.ts`
- Modify (if needed): `tests/visual/*.spec.ts`

**Step 1: Run targeted tests**

Run:

- `pnpm playwright test tests/visual/usability-mobile.spec.ts`
- `pnpm playwright test tests/visual/shell-1080-layout.spec.ts`

**Step 2: Run project gates**

Run:

- `pnpm test`
- `pnpm lint`
- `pnpm build`
- `pnpm test:visual`

Expected: all pass.
