import type { DemoRenderHints } from '../../platform/demo-profile';
import type { TeachingMode, TeachingTheme } from '../../platform/standards';
import {
  chartStepReady,
  cloneSession,
  createEmptySession,
  freezeSession,
  type DataWorkspaceFieldResult,
  type DataWorkspaceHost,
  type DataWorkspaceSession
} from '../../platform/data-workspace';
import {
  clampTimeScale,
  createStandardSceneEntry
} from '../scene-entry-helpers';
import { tickerTapeMeta } from './scene.meta';
import {
  createTickerTapeSim,
  type NoiseLevel,
  type TapeKind,
  type TickerTapeParams,
  type TickerTapeState
} from './scene.sim';
import { createTickerTapeView } from './scene.view';
import type { createTickerTapeDataWorkspace } from './data-task';

const KIND_BY_INDEX: TapeKind[] = ['uniform', 'ua', 'ud', 'variable'];
const NOISE_BY_INDEX: NoiseLevel[] = ['off', 'typical', 'large'];

export type CreateTickerTapeSceneOptions = {
  canvas?: HTMLCanvasElement;
  theme?: TeachingTheme;
  mode?: TeachingMode;
  demoHints?: DemoRenderHints;
};

function asKind(value: unknown): TapeKind | undefined {
  if (
    value === 'uniform' ||
    value === 'ua' ||
    value === 'ud' ||
    value === 'variable'
  ) {
    return value;
  }
  if (typeof value === 'number' && KIND_BY_INDEX[value]) {
    return KIND_BY_INDEX[value];
  }
  return undefined;
}

function asNoise(value: unknown): NoiseLevel | undefined {
  if (value === 'off' || value === 'typical' || value === 'large') return value;
  if (typeof value === 'number' && NOISE_BY_INDEX[value]) {
    return NOISE_BY_INDEX[value];
  }
  return undefined;
}

export function createTickerTapeScene(
  options: CreateTickerTapeSceneOptions = {}
) {
  const sim = createTickerTapeSim({
    speed: tickerTapeMeta.defaultParams.speed ?? 1,
    tapeKind: 'ua',
    countEvery: 1,
    noise: 'off',
    showA: false
  });
  const view = createTickerTapeView({
    canvas: options.canvas,
    theme: options.theme ?? 'light',
    mode: options.mode ?? 'normal',
    demoHints: options.demoHints
  });

  let timeScale = 1;
  const base = createStandardSceneEntry({
    sim,
    view,
    getState: () => sim.getState(),
    resetView: () => view.reset()
  });

  type InnerWorkspace = ReturnType<typeof createTickerTapeDataWorkspace>;
  let innerWorkspace: InnerWorkspace | null = null;
  let workspaceLoadPromise: Promise<void> | null = null;
  let workspaceChromeOpen = false;
  let hostRef: InnerWorkspace | null = null;

  view.setPlotGateReader(() => {
    if (!innerWorkspace) return false;
    return chartStepReady(
      innerWorkspace.getSession(),
      innerWorkspace.getSpec()
    );
  });

  function emptyHostSession(): DataWorkspaceSession {
    const session = createEmptySession(7);
    session.active = workspaceChromeOpen;
    return freezeSession(cloneSession(session));
  }

  function ensureDataWorkspace(): void {
    if (innerWorkspace || workspaceLoadPromise) return;
    workspaceLoadPromise = import('./data-task')
      .then((mod) => {
        innerWorkspace = mod.createTickerTapeDataWorkspace({
          getState: () => sim.getState(),
          getPlotStatus: () => view.getPlotStatus(sim.getState()),
          writeBack: {
            setMeasuredX: (index, value) => sim.setMeasuredX(index, value),
            setDeltaX: (index, value) => sim.setDeltaX(index, value),
            setV: (index, value) => sim.setV(index, value)
          }
        });
        hostRef = innerWorkspace;
        innerWorkspace.setActive(workspaceChromeOpen);
        base.notify();
      })
      .catch((error: unknown) => {
        console.error('[ticker-tape] 数据任务模块加载失败', error);
      })
      .finally(() => {
        workspaceLoadPromise = null;
      });
  }

  const inactiveEligibility = () => {
    if (sim.getState().playing) {
      return { ok: false as const, reason: '请先暂停纸带播放再处理数据' };
    }
    return { ok: false as const, reason: '数据任务加载中…' };
  };

  const dataWorkspace: DataWorkspaceHost & {
    invalidateAll(reason: string): void;
    invalidateSigFigsDerived(reason: string): void;
  } = {
    getSpec() {
      if (!innerWorkspace) {
        throw new Error('[ticker-tape] data workspace not ready');
      }
      return innerWorkspace.getSpec();
    },
    getEligibility() {
      return innerWorkspace?.getEligibility() ?? inactiveEligibility();
    },
    getSession() {
      const session = innerWorkspace?.getSession() ?? emptyHostSession();
      if (session.active === workspaceChromeOpen) return session;
      return freezeSession(
        cloneSession({ ...session, active: workspaceChromeOpen })
      );
    },
    getKnowns() {
      return innerWorkspace?.getKnowns() ?? [];
    },
    getHint() {
      return innerWorkspace?.getHint() ?? '';
    },
    setActive(active: boolean) {
      workspaceChromeOpen = active;
      if (active) ensureDataWorkspace();
      innerWorkspace?.setActive(active);
      base.renderAndEmit();
      base.notify();
    },
    submitField(input) {
      ensureDataWorkspace();
      if (!innerWorkspace) {
        return {
          feedback: { ok: false, message: '数据任务加载中…' },
          session: emptyHostSession()
        } satisfies DataWorkspaceFieldResult;
      }
      const result = innerWorkspace.submitField(input);
      base.renderAndEmit();
      base.notify();
      return result;
    },
    applyDrafts(drafts) {
      ensureDataWorkspace();
      if (!innerWorkspace) return emptyHostSession();
      const session = innerWorkspace.applyDrafts(drafts);
      base.notify();
      return session;
    },
    resetSession() {
      innerWorkspace?.resetSession();
      base.notify();
    },
    invalidateAll(reason: string) {
      innerWorkspace?.invalidateAll(reason);
      base.notify();
    },
    invalidateSigFigsDerived(reason: string) {
      innerWorkspace?.invalidateSigFigsDerived(reason);
      base.notify();
    },
    syncInstrument() {
      // Paper tape has no instrument to synchronize.
    },
    addTrial() {
      ensureDataWorkspace();
      if (!innerWorkspace) return emptyHostSession();
      return innerWorkspace.addTrial();
    },
    removeTrial(rowId: string, confirmed = false) {
      if (!innerWorkspace) {
        return { session: emptyHostSession(), needsConfirm: false };
      }
      return innerWorkspace.removeTrial(rowId, confirmed);
    }
  };

  // The task is small but must be ready before the shared toolbar enables entry.
  ensureDataWorkspace();

  view.setOnOriginDrag((tickIndex) => {
    if (dataWorkspace.getSession().active) return;
    const before = sim.getState().originTickIndex;
    sim.setOriginTickIndex(tickIndex);
    if (sim.getState().originTickIndex !== before) {
      hostRef?.invalidateAll('纸带已更换，请重新测量校对');
    }
    base.renderAndEmit();
    base.notify();
  });

  return {
    ...base,
    step(dt: number): void {
      sim.step(dt * timeScale);
    },
    startAll(): void {
      sim.startPlayback();
      base.renderAndEmit();
      base.notify();
    },
    pauseAll(): void {
      sim.pausePlayback();
      base.notify();
    },
    reset(): void {
      sim.reset();
      view.reset();
      hostRef?.invalidateAll('纸带已重置，请重新测量校对');
      base.renderAndEmit();
      base.notify();
    },
    plotScatter(): void {
      view.plotScatter(sim.getState());
      base.renderAndEmit();
      base.notify();
    },
    plotFit(): boolean {
      const ok = view.plotFit(sim.getState());
      base.renderAndEmit();
      base.notify();
      return ok;
    },
    getPlotStatus() {
      return view.getPlotStatus(sim.getState());
    },
    setSelectedGraphs(kinds: ReadonlyArray<'x' | 'v'>): void {
      view.setSelectedGraphs(kinds);
      base.renderAndEmit();
      base.notify();
    },
    setTimeScale(scale: number): void {
      timeScale = clampTimeScale(scale);
      base.notify();
    },
    getTimeScale(): number {
      return timeScale;
    },
    getTransportState(): { isPlaying: boolean; speed: number } {
      const s = sim.getState();
      return { isPlaying: s.playing, speed: timeScale };
    },
    attachGraphCanvas(canvas: HTMLCanvasElement): void {
      view.attachGraphCanvas(canvas);
      base.renderAndEmit();
    },
    fillFromRuler(): void {
      sim.fillFromRuler();
      // 与换纸带/换噪声/拖零点/reset 同一条失效路径：sim 的 measuredXCm
      // 已被覆写、vMs/Δx 已清空，会话里的已校对值必须一起作废，
      // 否则图像描点（读 sim）与判分（读会话）两套真值分叉。空会话上是无害 no-op。
      hostRef?.invalidateAll('已按尺重新填数，请重新校对');
      base.renderAndEmit();
      base.notify();
    },
    setMeasuredX(index: number, value: number | null): void {
      sim.setMeasuredX(index, value);
      base.renderAndEmit();
      base.notify();
    },
    setDeltaX(index: number, value: number | null): void {
      sim.setDeltaX(index, value);
      base.renderAndEmit();
      base.notify();
    },
    setV(index: number, value: number | null): void {
      sim.setV(index, value);
      base.renderAndEmit();
      base.notify();
    },
    setParams(
      next: Partial<{
        preset: string;
        speed: number;
        countEvery: number | boolean;
        noise: string | number;
        showA: number | boolean;
        tapeKind: string;
        vSigFigs: number;
      }>
    ): TickerTapeParams {
      const patch: Partial<TickerTapeParams> = {};
      if (typeof next.speed === 'number') {
        timeScale = clampTimeScale(next.speed);
        patch.speed = timeScale;
      }
      const kind = asKind(next.preset ?? next.tapeKind);
      if (kind) patch.tapeKind = kind;
      if (typeof next.countEvery === 'boolean') {
        patch.countEvery = next.countEvery ? 5 : 1;
      } else if (next.countEvery === 1 || next.countEvery === 5) {
        patch.countEvery = next.countEvery;
      }
      const noise = asNoise(next.noise);
      if (noise) patch.noise = noise;
      if (typeof next.showA === 'boolean') patch.showA = next.showA;
      else if (typeof next.showA === 'number') patch.showA = next.showA > 0;
      if (typeof next.vSigFigs === 'number') {
        patch.vSigFigs = next.vSigFigs;
      }
      const before = sim.getParams();
      sim.setParams(patch);
      const after = sim.getParams();
      if (before.tapeKind !== after.tapeKind || before.noise !== after.noise) {
        hostRef?.invalidateAll('纸带已更换，请重新测量校对');
      } else if (before.vSigFigs !== after.vSigFigs) {
        dataWorkspace.invalidateSigFigsDerived(
          `有效位数要求已改为 ${after.vSigFigs} 位，请按新要求重新填写校对`
        );
      }
      base.renderAndEmit();
      base.notify();
      return sim.getParams();
    },
    getParams(): {
      speed: number;
      tapeKind: TapeKind;
      countEvery: 1 | 5;
      noise: number;
      showA: number;
      preset: TapeKind;
      vSigFigs: number;
    } {
      const p = sim.getParams();
      return {
        speed: p.speed,
        tapeKind: p.tapeKind,
        countEvery: p.countEvery,
        noise: NOISE_BY_INDEX.indexOf(p.noise),
        showA: p.showA ? 1 : 0,
        preset: p.tapeKind,
        vSigFigs: p.vSigFigs
      };
    },
    getState(): TickerTapeState {
      return sim.getState();
    },
    getDataWorkspace() {
      return dataWorkspace;
    },
    getReadoutItems() {
      const s = sim.getState();
      const items = [
        { key: 'period', label: '打点周期', value: '0.02 s' },
        { key: 'T', label: '计数间隔 T', value: `${s.T.toFixed(2)} s` },
        { key: 'tape', label: '纸带', value: s.tapeKind }
      ];
      if (s.showA && s.aMs2 !== null) {
        items.push({
          key: 'a',
          label: 'a（逐差）',
          value: `${s.aMs2.toFixed(2)} m/s²`
        });
      }
      return items;
    },
    dispose(): void {
      hostRef?.resetSession();
      dataWorkspace.setActive(false);
      base.dispose();
    }
  };
}

export type TickerTapeScene = ReturnType<typeof createTickerTapeScene>;
