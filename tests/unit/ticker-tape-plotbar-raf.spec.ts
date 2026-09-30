/**
 * G5: ticker-tape plotBar rAF is cancelled on dispose and does not reschedule.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const captured = vi.hoisted(() => ({
  createControls: null as
    | null
    | ((opts: { mount: HTMLElement; scene: unknown }) => {
        dispose: () => void;
      })
}));

vi.mock('../../src/app/scene-bootstrapper', () => ({
  bootScenePage: (opts: {
    meta: { id: string };
    createControls: (o: { mount: HTMLElement; scene: unknown }) => {
      dispose: () => void;
    };
  }) => {
    captured.createControls = opts.createControls;
  }
}));

import '../../src/scenes/ticker-tape/page';

function mockTape() {
  return {
    getSelectedGraphs: () => ['x', 'v'] as Array<'x' | 'v'>,
    getPlotStatus: () => ({
      canScatter: false,
      canFit: false,
      hasScatter: false,
      hasFit: false,
      dirty: false
    }),
    subscribe: () => () => undefined,
    setParams: vi.fn(),
    plotScatter: vi.fn(),
    plotFit: vi.fn(),
    setSelectedGraphs: vi.fn(),
    fillFromRuler: vi.fn(),
    render: vi.fn(),
    getParams: () => ({
      countEvery: 1,
      noise: 0,
      showA: 0,
      vSigFigs: 2,
      preset: 'ua'
    })
  };
}

describe('ticker-tape plotBar rAF (G5)', () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const queued: FrameRequestCallback[] = [];
  const cancelled = new Set<number>();
  let nextId = 0;

  afterEach(() => {
    queued.length = 0;
    cancelled.clear();
    nextId = 0;
    globalThis.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = originalCancel;
  });

  it('cancels the pending frame on dispose and does not reschedule', () => {
    globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
      nextId += 1;
      queued.push(cb);
      return nextId;
    };
    globalThis.cancelAnimationFrame = (id: number) => {
      cancelled.add(id);
    };

    const createControls = captured.createControls;
    if (!createControls) throw new Error('ticker-tape createControls missing');
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const handle = createControls({ mount, scene: mockTape() });

    expect(queued.length).toBeGreaterThan(0);
    const pendingId = nextId;
    const pending = queued[queued.length - 1];
    handle.dispose();
    expect(cancelled.has(pendingId)).toBe(true);

    queued.length = 0;
    pending?.(0);
    expect(queued).toHaveLength(0);
    mount.remove();
  });
});
