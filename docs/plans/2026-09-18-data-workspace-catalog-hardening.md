# Data workspace catalog hardening — 2026-09-18

> 状态：已执行。归档记录，不作为现行方案。

## Evidence (pre-change)

### Track A — data-workspace is scene-hardcoded

- `src/ui/components/data-workspace-panel.ts` hard-codes `TRIAL_FIELDS` ids `x1`, `x2`, `n`, `D`, `deltaX`, summary ids `averageDeltaX` / `lambda`, labels `D = x₂ − x₁`, `Δx = D / n`, `λ = d·平均Δx / L`, result sentence `测得波长 λ = …`.
- `src/platform/data-workspace.ts` types `TrialFieldId` / `SummaryFieldId` as those same ids; `TrialRecord` and `DataWorkspaceSession` expose named properties; `invalidateDownstream` walks a fixed `TRIAL_ORDER`; `isWavelengthReady` / `checkedDeltaXs` / `wavelengthNmFromAverage` / `checkWavelengthNm` are fringe-physics helpers in platform.
- Panel `harvestDrafts()` mutates the object from `host.getSession()` (writes `trial[field] = { raw, … }`) before add/remove. That is a published-immutability hole.
- Capability remains opt-in: `LayoutConfig.dataWorkspace` → `dataWorkspaceDeclarations`; not a new layout. CSS is scene-imported (`data-workspace.css`). Table-flow CSS in that file must stay pixel-identical.
- Double-slit host (`src/scenes/double-slit/data-task.ts`) already owns eligibility, knowns, hint, and field evaluation. Spec still carries `positionUnit` / `spacingUnit` / `wavelengthUnit` instead of per-field units.

### Track B — homepage catalog fan-out

- `src/catalog/scene-registry.ts` uses `import.meta.glob('/src/scenes/*/scene.meta.ts', { eager: true })`.
- `ExperimentsSection` imports `sceneRegistry` via `src/app/data/scenes.ts`. Production evidence: ExperimentsSection ~16.7 kB and pulls **120 scene-meta chunks**.
- Hero already isolates six featured metas in `src/app/data/featured-scenes.ts` (do not change unless a safer equivalent exists).
- Scene pages still need per-meta chunks (`vite.config.ts` `scene-meta-${id}` manualChunks). Contract tests use `sceneRegistry` + `testProfile`.
- README / AGENTS.md still claim homepage full catalog uses eager glob.

## Decisions

1. **Capability, not layout.** Keep `data-workspace` as opt-in layout capability. No new layout id.
2. **Spec owns field vocabulary.** `DataWorkspaceSpec.rowFields` / `summaryFields` are arbitrary string ids with label, unit, inputMode, `dependsOn` (`row` | `all-rows` | `summary`), optional `gated` + `readinessHint`. Panel renders only from spec.
3. **Session is field maps.** `TrialRecord.fields` and `session.summary` replace named properties. Platform session code never reads `x1`/`lambda`.
4. **Graph-derived invalidation and staging.** Downstream stale marks and gated enablement come from the declared dependency graph. Cycles and unknown ids fail with a clear error.
5. **Immutable getSession.** Host `applyDrafts` (batch) is the only draft write path. Panel harvests into `applyDrafts` before add/remove. `getSession()` returns a clone (frozen).
6. **Scene-driven results.** `spec.result` template (`{value}`, `{unit}`) and optional `host.renderResult`. Panel has no wavelength sentence.
7. **Physics stays in double-slit.** Wavelength / interval / D / Δx checkers move to `src/scenes/double-slit/`. Generic instrument reading, parse, row limits stay in platform.
8. **Snapshot.** `MeasurementSnapshot` is a generic instrument reading. Scene extras live in `metadata`; double-slit fringe order is read via `doubleSlitFringeOrder`.
9. **Catalog extractor.** TypeScript AST reads catalog + `testProfile` literals from each `scene.meta.ts`. Vite virtual module `virtual:scene-catalog`. Dev invalidates on meta change. Unsupported dynamics on required fields throw. No hand-maintained 120-row manifest.
10. **Fan-out gate.** Production artifact check: ExperimentsSection chunk must import **zero** `scene-meta-*` files. Wired into `pnpm check:bundle`.

## Migration recipe (double-slit)

1. Declare row/summary field specs with the current labels/units/inputModes and the historical dependency graph (`n`,`D` ← row `x1`,`x2`; `deltaX` ← row `D`,`n`; `averageDeltaX` ← all-rows `deltaX`; `lambda` ← summary `averageDeltaX`). Only summary fields are `gated` (row cells stay always editable — preserves current UX).
2. Point `evaluateDoubleSlitField` at `trial.fields[id]` / `session.summary[id]`.
3. Host implements `applyDrafts`; `getSession` clones.
4. Result: `spec.result.template = '测得波长 λ = {value} {unit}'` with `digits: 0`.
5. Keep min/max/initial rows, stable `row-N` ids, delete confirm, `contextKnownKeys`, `stageMode: 'instrument-only'`, chart opt-out, native+aria disabled, Enter/click guards, reset, a11y.

## Synthetic fixture

Unrelated ids: `mass`, `time`, `speed` (row); `meanSpeed` (summary, gated, all-rows `speed`). Proves generic render, enablement, invalidation, add/remove, draft preservation, result output. No double-slit copy.

## Risks

| Risk                                         | Mitigation                                                             |
| -------------------------------------------- | ---------------------------------------------------------------------- |
| Behavior drift (wording/pixels)              | Reuse exact double-slit labels; do not touch table-flow CSS; E2E 15/15 |
| Tests using `trial.x1`                       | Update to `getTrialField`; no dual-shape in panel                      |
| Catalog drift vs SceneMeta                   | AST from the same files; fail on non-literals; HMR invalidate          |
| Required field as identifier (`demoProfile`) | Only catalog/`testProfile` extracted; `demoProfile` skipped            |
| Scene-page meta chunks regress               | Keep `manualChunks` scene-meta rule; extractor is homepage-only        |
| Frozen session vs draft                      | Drafts go through `applyDrafts` only                                   |

## Acceptance (filled after implementation)

See bottom of this file after validation.

---

## Implementation notes (locked)

- Compatibility: `writeCheckedField(session, trialIndex, field, state, spec)` — spec required for graph walks.
- `DataWorkspaceExpected` and wavelength helpers leave platform.
- Architecture test: panel source must not contain double-slit field ids or formula substrings.

## Validation log (second cross-audit pass)

| Gate                                                                                                                   | Result                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Focused unit (generic + data-workspace + capability + architecture + extractor + catalog HMR + double-slit host/hints) | **78 passed**                                                                            |
| Double-slit E2E                                                                                                        | **15/15** passed                                                                         |
| Homepage catalog E2E                                                                                                   | **1/1** passed                                                                           |
| typecheck / lint / format:check                                                                                        | pass                                                                                     |
| check:scenes / check:layouts / check:circular                                                                          | pass (120 scenes, 4 layouts, no cycles)                                                  |
| production build                                                                                                       | pass                                                                                     |
| check:bundle                                                                                                           | pass; `ENTRY_BUDGET_OVERRIDES` empty; ExperimentsSection has **0** `scene-meta-` matches |
| git diff --check                                                                                                       | pass                                                                                     |
| artifacts/test-results                                                                                                 | cleaned                                                                                  |

### Cross-audit items

1. `applyFieldDrafts` resolves row id → index, `invalidateDownstream` first, then stores a clean unchecked draft (no leftover success feedback/snapshot; `failedAttempts` preserved and tested).
2. Gated **row** fields: native + `aria-disabled`, readiness hint, `update()` resync, Enter/click guards. Synthetic `speed` is gated. Double-slit row fields remain ungated.
3. `assertSpecGraph` checks `result.field` / `completionField` (summary) and `lockInstrumentFromField` (row); rejects unmodelable owner/scope combos; tests for unknown id, cycle, invalid scope.
4. Catalog `handleHotUpdate` + watcher: invalidate virtual module and `full-reload`; unit-tested `applySceneCatalogHotUpdate`.
5. Double-slit data-task/wavelength lazy-loaded at step 6 (and on `getDataWorkspace`/`setActive`); wrapper notifies when ready. Page JS **177.24 / 180 kB**. No entry override.
6. `fringeOrder` removed from `MeasurementSnapshot`; stored in `metadata` and read via `doubleSlitFringeOrder`.

### Before / after metrics

| Metric                                | Before (first pass)         | After (this pass)                 |
| ------------------------------------- | --------------------------- | --------------------------------- |
| ExperimentsSection scene-meta imports | 0                           | **0**                             |
| ExperimentsSection chunk size         | 59.49 kB                    | 59.49 kB                          |
| Catalog scene count                   | 120                         | 120                               |
| Double-slit page JS                   | 182.68 kB (185 kB override) | **177.24 / 180 kB** (no override) |
| Shared JS                             | 148.69 / 150 kB             | **149.96 / 150 kB**               |

### Remaining risks (after second pass)

- Shared JS was **0.04 kB** under budget. The generic data-workspace runtime still lived in the layouts/ui shared path because the capability factory was synchronous. Addressed in the third pass below.
- `scene-params-contract` still fails on pre-existing `internal-energy` / `variable-work` `autoRun` keys (untouched).
- Extractor still fails closed on non-literals in `scene.meta.ts`.

**CONSENSUS (second pass): AGREED**

---

## Validation log (third cross-audit pass — lazy capability boundary)

| Gate                                                                                                                                | Result                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Focused unit (generic + data-workspace + capability + architecture + lazy proxy + extractor + catalog HMR + double-slit host/hints) | **94 passed**                                                                            |
| Double-slit E2E                                                                                                                     | **15/15** passed                                                                         |
| Homepage catalog E2E                                                                                                                | **1/1** passed                                                                           |
| typecheck / lint / format:check                                                                                                     | pass                                                                                     |
| check:scenes / check:layouts / check:circular                                                                                       | pass (120 scenes, 4 layouts, no cycles)                                                  |
| production build                                                                                                                    | pass                                                                                     |
| check:bundle                                                                                                                        | pass; `ENTRY_BUDGET_OVERRIDES` empty; ExperimentsSection has **0** `scene-meta-` matches |
| git diff --check                                                                                                                    | pass                                                                                     |
| artifacts/test-results                                                                                                              | cleaned                                                                                  |

### Cross-audit items

1. `dataWorkspaceDeclarations` lives in a lightweight module. All four layouts import it; they do not statically import the runtime, platform engine, panel, or scene validation.
2. Registry `createDataWorkspace` is a synchronous proxy: one dynamic import, latest `update` buffered until mount, forwarding after resolve, dispose-before-resolve never mounts, load rejection logs `[data-workspace]`.
3. Public `CapabilityInstance` contract is unchanged. Toolbar, eligibility, four layouts, and double-slit UI behavior preserved (E2E 15/15).
4. Vite `manualChunks` puts engine/panel/capability runtime in `data-workspace`; `modulePreload` keeps that chunk off non-opt-in pages. Catalog HMR files untouched.

### Before / after metrics

| Metric                                | After second pass | After this pass                   |
| ------------------------------------- | ----------------- | --------------------------------- |
| ExperimentsSection scene-meta imports | 0                 | **0**                             |
| ExperimentsSection chunk size         | 59.49 kB          | 59.49 kB                          |
| Catalog scene count                   | 120               | 120                               |
| Double-slit page JS                   | 177.24 / 180 kB   | **177.77 / 180 kB** (no override) |
| Double-slit page CSS                  | 55.00 / 55 kB     | **55.00 / 55 kB**                 |
| Shared JS                             | 149.96 / 150 kB   | **128.55 / 150 kB**               |

### Remaining risks

- Shared JS is **128.55 / 150 kB** (21.45 kB headroom). Non-opt-in pages do not statically import or modulepreload `data-workspace-*.js`. A later static import of `platform/data-workspace` or the panel from layouts/ui/core, or dropping the Vite `manualChunks` / `modulePreload` exclusions, would pull the runtime back into shared JS.
- Double-slit page CSS remains **55.00 / 55 kB**; page JS is **177.77 / 180 kB**. The opt-in page still loads the runtime chunk.
- `scene-params-contract` still fails on pre-existing `internal-energy` / `variable-work` `autoRun` keys (untouched).
- Extractor still fails closed on non-literals in `scene.meta.ts`.

**CONSENSUS: NEEDS_CODEX_REVIEW**
