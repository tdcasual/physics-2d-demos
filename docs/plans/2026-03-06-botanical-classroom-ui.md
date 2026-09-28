# Botanical Classroom UI Implementation Plan

> 状态：历史快照。归档设计/实施记录，不作为现行方案。

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the first complete pass of the botanical-classroom UI across the navigation page and modern teaching shell.

**Architecture:** Add regression coverage first, then update navigation content structure and shared theme tokens, and finally restyle the teaching shell to express spring/day and moonlit/night while keeping scene canvases visually strict.

**Tech Stack:** Vite, TypeScript, Playwright, Vitest, CSS custom properties

---

### Task 1: Add navigation/theme regression coverage

**Files:**

- Modify: `tests/unit/navigation-branding.spec.ts`
- Modify: `tests/visual/navigation.spec.ts`
- Modify: `tests/visual/title-normalization.spec.ts`
- Modify: `tests/visual/shell-1080-layout.spec.ts`

**Step 1: Write failing tests**

- Add assertions for exhibit-style navigation structure, card concept rows, and day/night theme affordances.

**Step 2: Run tests to verify failure**
Run: `pnpm vitest run tests/unit/navigation-branding.spec.ts && pnpm playwright test tests/visual/navigation.spec.ts tests/visual/title-normalization.spec.ts tests/visual/shell-1080-layout.spec.ts`

**Step 3: Implement minimal production changes**

- Update navigation markup/data rendering and shell theme labels/tokens until the tests pass.

**Step 4: Re-run targeted tests**
Run the same commands and confirm green.

### Task 2: Refresh navigation page into exhibit wall

**Files:**

- Modify: `index.html`

**Step 1: Implement exhibit-wall layout**

- Add hero intro, search label, light category chips, and placard card structure with concept rows.

**Step 2: Preserve accessibility and search behavior**

- Keep filtering, card counts, and keyboard-friendly semantics intact.

**Step 3: Validate in browser**
Run Playwright visual checks and inspect the page manually.

### Task 3: Apply botanical-classroom theme to teaching shell

**Files:**

- Modify: `src/app/teaching-demo-shell.ts`
- Modify: `src/ui/teaching-demo.css`

**Step 1: Introduce spring/day and moonlit/night tokens**

- Define CSS variables and theme classes for cards, chrome, status, and toolbar.

**Step 2: Keep stage canvas disciplined**

- Restrict decorative treatment to frame/chrome; keep the main stage surface clean.

**Step 3: Verify shell behavior**

- Ensure desktop/mobile toggles, status pills, and readout overlays still behave correctly.

### Task 4: Full verification

**Files:**

- Verify only

**Step 1: Run project checks**
Run: `pnpm lint && pnpm test && pnpm test:visual && pnpm build`

**Step 2: Run browser smoke checks**

- Verify navigation, one day-mode page, and one night-mode page in browser.
