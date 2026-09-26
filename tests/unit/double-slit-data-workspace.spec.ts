import { describe, expect, it, vi } from 'vitest';
import { createDoubleSlitScene } from '../../src/scenes/double-slit/scene.entry';
import {
  createDoubleSlitDataWorkspace,
  doubleSlitDataWorkspaceSpec,
  type DoubleSlitMeasurementSource
} from '../../src/scenes/double-slit/data-task';
import {
  OPTICS_INVALIDATION_MESSAGE,
  opticsChangeReason
} from '../../src/scenes/double-slit/optics-params';
import type { DoubleSlitParams } from '../../src/scenes/double-slit/scene.sim';
import type { MeasurementSnapshot } from '../../src/platform/data-workspace';
import { withDoubleSlitFringeOrder } from '../../src/scenes/double-slit/snapshot-meta';
import {
  CALIPER_PRECISION_MM,
  CALIPER_READING_STRATEGY
} from '../../src/scenes/double-slit/reading-constants';
import {
  allTrialsComplete,
  shouldShowChartAnalysis,
  type DataWorkspaceHost
} from '../../src/platform/data-workspace';

function makeScene() {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const parent = document.createElement('div');
  parent.style.width = '800px';
  parent.style.height = '600px';
  parent.appendChild(canvas);
  document.body.appendChild(parent);
  return createDoubleSlitScene({ canvas, theme: 'light' });
}

/** scene.getDataWorkspace() 的运行时形态含本方案的扩展方法。 */
function sceneHost(scene: ReturnType<typeof createDoubleSlitScene>) {
  return scene.getDataWorkspace() as DataWorkspaceHost & {
    invalidateAll(reason: string): void;
    setActiveVisual(active: boolean): void;
  };
}

describe('double-slit data workspace host', () => {
  it('opts out of chart analysis', () => {
    expect(shouldShowChartAnalysis(doubleSlitDataWorkspaceSpec)).toBe(false);
  });

  it('keeps ordinary readout including theoretical Δx and instrument digits', () => {
    const scene = makeScene();
    scene.setParams({ step: 6, lightMode: 'mono' });
    const items = scene.getReadoutItems();
    expect(items.some((item) => item.key === 'delta-x')).toBe(true);
    expect(items.some((item) => /532/.test(String(item.value)))).toBe(true);
    scene.dispose();
  });

  it('hides λ, theoretical Δx and instrument digits in workspace mode', () => {
    const scene = makeScene();
    scene.setParams({ step: 6, lightMode: 'mono' });
    const host = scene.getDataWorkspace();
    host.setActive(true);
    const items = scene.getReadoutItems();
    expect(items.some((item) => item.key === 'delta-x')).toBe(false);
    expect(items.some((item) => item.key === 'caliper')).toBe(false);
    expect(items.some((item) => item.key === 'micrometer')).toBe(false);
    expect(items.some((item) => /532/.test(JSON.stringify(item)))).toBe(false);
    expect(items.some((item) => /Δx/.test(item.label))).toBe(false);
    expect(items.some((item) => item.key === 'd')).toBe(true);
    expect(items.some((item) => item.key === 'L')).toBe(true);
    scene.dispose();
  });

  it('does not rewrite params when the measurement condition is not met', () => {
    const scene = makeScene();
    scene.setParams({ step: 3, lightMode: 'white' });
    const before = scene.getState().params;
    const eligibility = scene.getDataWorkspace().getEligibility();
    expect(eligibility.ok).toBe(false);
    expect(scene.getState().params.step).toBe(before.step);
    expect(scene.getState().params.lightMode).toBe(before.lightMode);
    expect(scene.getState().params.lambda).toBe(before.lambda);
    scene.dispose();
  });

  it('restores ordinary readout after leaving the workspace', () => {
    const scene = makeScene();
    scene.setParams({ step: 6, lightMode: 'mono', lambda: 532 });
    const host = scene.getDataWorkspace();
    host.setActive(true);
    host.setActive(false);
    const items = scene.getReadoutItems();
    expect(items.some((item) => item.key === 'delta-x')).toBe(true);
    expect(items.some((item) => /532/.test(String(item.value)))).toBe(true);
    scene.dispose();
  });
});

function opticsParams(): DoubleSlitParams {
  return {
    step: 6,
    lambda: 532,
    slitDistance: 20,
    isPlaying: true,
    activeInstrument: 'caliper',
    showInstrumentReadout: false,
    micrometerOffset: 0,
    stripeOffset: 12,
    L: 0.7,
    lightMode: 'mono',
    filterColor: null
  };
}

function opticsSnapshot(
  readingMm: number,
  order: number,
  capturedAt: number
): MeasurementSnapshot {
  return withDoubleSlitFringeOrder(
    {
      readingMm,
      precisionMm: CALIPER_PRECISION_MM,
      displayDigits: 3,
      instrumentId: 'caliper',
      instrumentLabel: '干涉读数游标卡尺',
      capturedAt,
      aligned: true,
      residualPx: 0.1,
      readingStrategy: CALIPER_READING_STRATEGY
    },
    order
  );
}

function opticsSourceFrom(sequence: readonly MeasurementSnapshot[]) {
  let captures = 0;
  const source: DoubleSlitMeasurementSource = {
    getParams: opticsParams,
    capture: () => sequence[Math.min(captures++, sequence.length - 1)] ?? null
  };
  return { source };
}

describe('optics change invalidation (Fix 1)', () => {
  it('flags lambda / d / L / light mode / filter / micrometer zero changes', () => {
    const base = opticsParams();
    expect(opticsChangeReason(base, { ...base, lambda: 650 })).toBe(
      OPTICS_INVALIDATION_MESSAGE
    );
    expect(opticsChangeReason(base, { ...base, slitDistance: 21 })).toBe(
      OPTICS_INVALIDATION_MESSAGE
    );
    expect(opticsChangeReason(base, { ...base, L: 0.9 })).toBe(
      OPTICS_INVALIDATION_MESSAGE
    );
    expect(opticsChangeReason(base, { ...base, lightMode: 'white' })).toBe(
      OPTICS_INVALIDATION_MESSAGE
    );
    expect(opticsChangeReason(base, { ...base, filterColor: 'red' })).toBe(
      OPTICS_INVALIDATION_MESSAGE
    );
    expect(opticsChangeReason(base, { ...base, micrometerOffset: 0.5 })).toBe(
      OPTICS_INVALIDATION_MESSAGE
    );
  });

  it('exempts measurement-interaction params and same-value replay (idempotent)', () => {
    const base = opticsParams();
    expect(
      opticsChangeReason(base, { ...base, stripeOffset: 20.5 })
    ).toBeNull();
    expect(
      opticsChangeReason(base, { ...base, crosshairAngle: 45 })
    ).toBeNull();
    expect(
      opticsChangeReason(base, { ...base, viewMode: 'crosshair' })
    ).toBeNull();
    expect(opticsChangeReason(base, { ...base, step: 3 })).toBeNull();
    expect(
      opticsChangeReason(base, { ...base, activeInstrument: 'micrometer' })
    ).toBeNull();
    expect(opticsChangeReason(base, base)).toBeNull();
  });

  it('normalizes missing L to the default (URL replay safety)', () => {
    const base = opticsParams();
    expect(opticsChangeReason(base, { ...base, L: undefined })).toBeNull();
  });

  it('wires optics invalidation into setParams without touching session.active', () => {
    const scene = makeScene();
    const host = sceneHost(scene);
    const invalidate = vi.spyOn(host, 'invalidateAll');
    scene.setParams({ stripeOffset: 20.5, crosshairAngle: 45 });
    expect(invalidate).not.toHaveBeenCalled();
    scene.setParams({ lambda: 650 });
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledWith(OPTICS_INVALIDATION_MESSAGE);
    scene.setParams({ lambda: 650 });
    expect(invalidate).toHaveBeenCalledTimes(1);
    scene.dispose();
  });
});

describe('invalidateAll semantics (Fix 1)', () => {
  it('marks every checked field stale, clears the lock, and allows recovery', () => {
    const { source } = opticsSourceFrom([
      opticsSnapshot(10, 1, 1),
      opticsSnapshot(19.32, 6, 2),
      opticsSnapshot(10, 1, 3),
      opticsSnapshot(19.32, 6, 4)
    ]);
    const host = createDoubleSlitDataWorkspace(source);
    host.submitField({ field: 'x1', trialIndex: 0, raw: '10.00' });
    host.submitField({ field: 'x2', trialIndex: 0, raw: '19.32' });
    host.submitField({ field: 'n', trialIndex: 0, raw: '5' });
    host.submitField({ field: 'D', trialIndex: 0, raw: '9.32' });
    host.submitField({ field: 'deltaX', trialIndex: 0, raw: '1.86' });
    host.submitField({ field: 'averageDeltaX', raw: '1.86' });
    expect(
      allTrialsComplete(host.getSession(), doubleSlitDataWorkspaceSpec)
    ).toBe(true);
    expect(host.getSession().lockedInstrumentId).toBe('caliper');

    host.invalidateAll(OPTICS_INVALIDATION_MESSAGE);

    const session = host.getSession();
    expect(session.lockedInstrumentId).toBeUndefined();
    expect(allTrialsComplete(session, doubleSlitDataWorkspaceSpec)).toBe(false);
    const x1 = session.trials[0]?.fields.x1;
    expect(x1?.stale).toBe(true);
    expect(x1?.feedback?.message).toBe(OPTICS_INVALIDATION_MESSAGE);
    // summary 字段走平台 markFieldStale 的通用文案，与换仪器路径一致。
    expect(session.summary.averageDeltaX?.stale).toBe(true);
    expect(session.summary.averageDeltaX?.feedback?.message).toBe(
      '上游数据已改，请重新校对'
    );

    // 重新校对可恢复（capture 序列尾部重复，重测得到同一读数）。
    expect(
      host.submitField({ field: 'x1', trialIndex: 0, raw: '10.00' }).feedback.ok
    ).toBe(true);
    expect(
      host.submitField({ field: 'x2', trialIndex: 0, raw: '19.32' }).feedback.ok
    ).toBe(true);
    expect(
      allTrialsComplete(host.getSession(), doubleSlitDataWorkspaceSpec)
    ).toBe(false);
  });
});

describe('presentation visual suspension (Fix 5)', () => {
  it('restores stage visuals without clearing the session; resize does not write back', async () => {
    const parent = document.createElement('div');
    const frame = document.createElement('div');
    frame.setAttribute('data-stage-frame', '');
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    frame.appendChild(canvas);
    parent.appendChild(frame);
    document.body.appendChild(parent);
    const scene = createDoubleSlitScene({ canvas, theme: 'light' });
    scene.setParams({ step: 6, lightMode: 'mono' });
    const host = sceneHost(scene);

    host.setActive(true);
    expect(canvas.style.opacity).toBe('0');
    expect(canvas.style.pointerEvents).toBe('none');

    frame.style.setProperty('--dw-h', '220px');
    host.setActiveVisual(false);
    expect(canvas.style.opacity).toBe('');
    expect(canvas.style.pointerEvents).toBe('');
    expect(frame.style.getPropertyValue('--dw-h')).toBe('');
    expect(host.getSession().active).toBe(true);

    // 挂起期间 adapter setMode 触发的 resize 不得把视觉与 --dw-h 写回。
    scene.resize();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(canvas.style.opacity).toBe('');
    expect(frame.style.getPropertyValue('--dw-h')).toBe('');

    host.setActive(false);
    expect(host.getSession().active).toBe(false);
    scene.dispose();
  });
});
