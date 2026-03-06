# Readout Panel Compact Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the shell-level readout panel on all modern scenes default collapsed on desktop, expandable and draggable after opening, with a denser two-column-capable layout.

**Architecture:** Keep the behavior in `createTeachingDemoShell()` so all modern pages inherit it automatically. Extend `ReadoutItem` with an optional compact layout hint, tighten `.stage-readout` CSS, and verify both desktop and mobile semantics with Playwright.

**Tech Stack:** TypeScript, Vite, Playwright, Vitest, CSS custom properties

---

### Task 1: Add regression coverage for compact readout behavior

**Files:**
- Modify: `tests/visual/shell-1080-layout.spec.ts`
- Modify: `tests/visual/emf-analogy.spec.ts`
- Modify: `tests/visual/usability-mobile.spec.ts`

**Step 1: Write failing tests**
- Assert all modern pages default to collapsed desktop readout.
- Assert opening the desktop readout reveals the drag handle and compact layout markers.
- Keep mobile drawer semantics intact.

**Step 2: Run tests to verify failure**
Run: `pnpm playwright test tests/visual/shell-1080-layout.spec.ts tests/visual/emf-analogy.spec.ts tests/visual/usability-mobile.spec.ts`

**Step 3: Implement minimal production changes**
- Update shell defaults and readout rendering structure until tests pass.

**Step 4: Re-run targeted tests**
Run the same command and confirm green.

### Task 2: Compact the shared readout component

**Files:**
- Modify: `src/app/teaching-demo-shell.ts`
- Modify: `src/ui/teaching-demo.css`
- Modify: `src/scenes/chase-meet/page.ts`

**Step 1: Add compact row metadata**
- Extend `ReadoutItem` with a layout hint for paired rows.
- Mark chase-meet pairs that should share one line.

**Step 2: Update shell rendering**
- Render compact row classes and default desktop collapse/drag behavior in shell.

**Step 3: Tighten CSS**
- Reduce padding, font size, and overlay width.
- Support two-column paired items without harming long message rows.

**Step 4: Verify in browser**
- Run targeted Playwright checks and inspect screenshots.

### Task 3: Full verification

**Files:**
- Verify only

**Step 1: Run project checks**
Run: `pnpm lint && pnpm test && pnpm test:visual && pnpm build`

**Step 2: Run browser smoke checks**
- Inspect at least one desktop scene and one mobile scene to confirm compact readout behavior visually.
