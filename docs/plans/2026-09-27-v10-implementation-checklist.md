# Physics 2D v10 implementation checklist

> 状态：已执行。归档记录，不作为现行方案。

**Plan:** `/tmp/physics-2d-remediation-plan-v10.md`  
**SHA-256:** `3e581ed35a1c3809e9d20ecc5a64559794583344844ff3da19f2c2e43f94d5f5`  
**Branch:** `fix/physics-2d-remediation` @ `22616fe19e472c2fa194c2865f701880d72a17fe` (clean)  
**Date:** 2026-09-27

Wave 0 is inventory only. Implementation follows this map; old plan line numbers are locators, not patch coordinates.

**Progress (2026-09-27, gates green on this tree):** Implementation remains uncommitted on `fix/physics-2d-remediation`. `pnpm quality:core` 299 files / 7463 tests; E2E 546 passed; Linux visual container 41 passed after inspecting and replacing 4 linux goldens. Frozen B11 list is 101 ids. Line budgets unchanged (platform workspace 1413, ticker-tape view 1381). Darwin goldens for those 4 scenes were not regenerated. Independent/cross audits have not run.

## Baseline

| Item          | Value                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------ |
| HEAD          | `22616fe19e472c2fa194c2865f701880d72a17fe`                                                 |
| Worktree      | clean at start                                                                             |
| Forced layout | `?layout=` remains strategy-0 force (`scene-bootstrapper.ts`, `default-strategies.ts`, C5) |
| Quality       | `pnpm quality:core` / `pnpm quality:full`                                                  |
| Visual        | `scripts/visual-linux-container.sh` (verify / update)                                      |

## Finding → current symbols

| ID                    | Current authority / defect                                                                                                                                                                                                                                                 | Fix owner                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| R1 mode split         | Layouts write `dataset.mode='normal'` (`split-layout-base.ts`, `mobile-stack.ts`); unmount deletes it; `capability-context.setMode` writes DOM + inner scene; `SceneAdapter._mode` + `_reattachLiveScene` infers from DOM; Esc clicks `.mode-toggle` then adapter fallback | `ModeOwner` on container; mount projects, does not reset        |
| R2 dispose order      | `switchLayout` unmounts layout / `replaceChildren` then `mountScene` → `orchestrator.wire` disposes old instances                                                                                                                                                          | dispose capabilities before DOM detach                          |
| R3 panzoom boost      | `stage-panzoom.dispose` queries `slot.querySelectorAll('canvas')` after canvas moved                                                                                                                                                                                       | own canvas node refs + original boost                           |
| R4 workspace step     | capability-local `chartMode`; dispose forces false; hydrate from `session.active` only                                                                                                                                                                                     | `WorkspaceUiState` (`getStep`/`setStep`); not DataWorkspaceHost |
| R5 transport dup      | compact path `container.prepend(controls)`; dispose only `abort()`                                                                                                                                                                                                         | remember node, remove on dispose                                |
| R6 URL debounce       | module `writeTimeout` last-patch-wins                                                                                                                                                                                                                                      | per-owner timer + merge map                                     |
| R7 URL replay         | bootstrapper `createControls` always `readSceneParams` + `applySceneUrlParams`                                                                                                                                                                                             | restore-once generation + silent hydrate                        |
| R8 resize drop        | debounce returns if `_switching`                                                                                                                                                                                                                                           | dirty bit + drain after barrier                                 |
| R9 registry tests     | `stage-mount-attrs-contract` hardcodes 4 layouts                                                                                                                                                                                                                           | `clear → registerAllLayouts → list → create`                    |
| R10 pool config       | `_updateConfig` shallow merge; capabilities captured in ctor                                                                                                                                                                                                               | `reuseKey` + registration token                                 |
| R11 private selectors | data-workspace still queries `.lab-stage-main` / `.teaching-right-panel` / `.srgb-*`; ticker-tape uses semantic attrs already                                                                                                                                              | migrate remaining private selectors                             |
| R12 modules           | see line-budget table                                                                                                                                                                                                                                                      | split where justified; no-growth otherwise                      |
| R13 sidebar           | `dataset.sidebarHidden` written by toggle + demo-profile; `applyResponsiveColumns` reads it                                                                                                                                                                                | `SidebarStateOwner` (user hidden vs presentation suppress)      |
| R14 page dispose      | container unmounts layout then orchestrator.dispose                                                                                                                                                                                                                        | dispose capabilities first                                      |

## Async / canvas custody matrix

| Phase                         | Sync?           | Side effects                      | Abort                                          | Canvas custody                                   |
| ----------------------------- | --------------- | --------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| `onLayoutWillChange`          | async optional  | scene-defined; none in production | AbortSignal + ack; unacked → quarantine        | coordinator                                      |
| capability `disposeAll`       | sync            | observers/DOM/boost               | token guard; throw aggregated                  | coordinator (canvas still in slot until unmount) |
| layout `exit`                 | async animation | WAAPI; cancellable                | signal race; recoverable                       | coordinator                                      |
| layout `unmount`              | sync            | DOM teardown                      | token guard                                    | coordinator holds node ref                       |
| `registry.create` lazy import | async           | module eval assumed pure          | abort wait immediately; construct/pool guarded | coordinator                                      |
| layout `mount`                | sync            | writes DOM, may read `data-mode`  | token guard; project mode **before**           | pass to layout                                   |
| capability `wire`/`hydrate`   | sync            | DOM insert                        | errors propagate                               | layout                                           |
| layout `enter`                | async animation | WAAPI                             | signal race; skip events if stale              | layout                                           |

Watchdog aborts the current wait only. It must not increment generation, clear `_switching`, or drain. Recoverable lazy-import abort → rollback → serial drain. Effectful unacked phase → `quarantined`.

Keyboard `l` → `SceneAdapter.switchLayout` → `.layout-switch-btn` click. mobile-stack has no layout-switch capability (silent no-op). Fix: inject `onSwitchLayout` like `onSetMode`.

## URL writers (17 expressions / 16 files)

Scene `page.ts` (16 calls in 15 files): ampere-balance ×2, binding-energy, dynamic-circle, emf-internal-resistance, force-composition, harmonic-wave, impulse-momentum, internal-energy, mechanical-energy, potential-energy-graphs, rod-model, single-slit, three-forces, variable-work, vertical-circle.

Helper: `src/pages/single-loop-integration.ts` (same scene generation as `single-loop/page.ts`).

Plus bootstrapper scoped `writeParam` wrapper. No SceneContainer-less production utility page with writers.

## Controls hooks / projection

`syncFromScene`: double-slit, doppler-effect, mechanical-wave (and dynamic-circle / force-composition local subscribe).  
`refresh`: ampere-balance, centripetal-motion, charged-particle-circle, emf-internal-resistance, ganshe, internal-energy, mechanical-energy, precision-tools, projectile-components, resistor-measurement, single-loop-integration, spring-ball, spring-oscillator, variable-work.

Silent API required: current `SchemaRenderer.setValue` dispatches `input`. Select has no silent path. Slider label only updates on `input`.

## Line-budget (wc -l, Wave 0)

Over 1000:  
`src/platform/data-workspace/index.ts` 1413,  
`src/scenes/ticker-tape/scene.view.ts` 1381,  
`src/ui/components/data-workspace-panel/index.ts` 1099,  
`src/scenes/pendulum-period/scene.view.ts` 1091,  
`src/scenes/potential-energy-graphs/scene.view.ts` 1078,  
`src/scenes/multimeter-practice/scene.view.ts` 1019,  
`src/scenes/rod-model/scene.view.ts` 1006.

Near: internal-energy view 979, oscilloscope sim 970, three-forces sim 911, double-slit entry 903.  
`src/app/layouts/container.ts` 778 after Wave 5 switch-runtime split plus initial-mount path (B4 no exemption).  
A4 history 1104/219/121 must not be used as ratchet; current panel 1099 / chart-stage 222 / field-status 141 / review 90.  
Ledger `app/ui >1000` check is documentation-only → Wave 6 executable ratchet.

## Quality commands (record only in Wave 0)

`pnpm quality:core`, `pnpm quality:full`, `pnpm test`, `pnpm test:coverage`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `pnpm check:bundle`, `pnpm test:e2e`, `scripts/visual-linux-container.sh`.

## Implementation order

1. Wave 1: ModeOwner + SidebarStateOwner + WorkspaceUiState + serial switch/rollback/quarantine + registry abort race + capability dispose-before-DOM + panzoom/transport + page teardown
2. Wave 2: owner-scoped URL writer + restore-once + silent setters + resize drain
3. Wave 3: production registry mount contract + semantic selectors + drifted readout only
4. Wave 4: reuseKey + registration token
5. Wave 5: split container switch runtime / workspace modules where justified; scene views no-growth
6. Wave 6: ledger, AGENTS.md URL contract, line-budget spec, full gates
