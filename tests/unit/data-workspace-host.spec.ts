import { describe, expect, it, vi } from 'vitest';
import {
  cloneSession,
  createDataWorkspaceHost,
  createEmptySession,
  freezeSession,
  type DataWorkspaceHost,
  type DataWorkspaceSession
} from '../../src/platform/data-workspace';

function stubInner(
  overrides: Partial<DataWorkspaceHost> = {}
): DataWorkspaceHost {
  const session = freezeSession(cloneSession(createEmptySession(2)));
  return {
    getSpec: () => {
      throw new Error('spec');
    },
    getEligibility: () => ({ ok: true as const }),
    getSession: () => session,
    getKnowns: () => [],
    getHint: () => 'hint',
    setActive: vi.fn(),
    submitField: vi.fn(() => ({
      feedback: { ok: true, message: 'ok' },
      session
    })),
    applyDrafts: vi.fn(() => session),
    resetSession: vi.fn(),
    syncInstrument: vi.fn(),
    addTrial: vi.fn(() => session),
    removeTrial: vi.fn(() => ({ session, needsConfirm: false })),
    invalidateAll: vi.fn(),
    invalidateSigFigsDerived: vi.fn(),
    renderResult: vi.fn(() => 'result'),
    ...overrides
  };
}

function emptyOf(rows: number): (active: boolean) => DataWorkspaceSession {
  return (active) => {
    const session = createEmptySession(rows);
    session.active = active;
    return freezeSession(cloneSession(session));
  };
}

describe('createDataWorkspaceHost', () => {
  it('keeps ticker-sized empty sessions at 7 rows and DS-sized at 1', () => {
    const ticker = createDataWorkspaceHost({
      load: async () => stubInner(),
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(7),
      prefetch: false,
      notify: vi.fn(),
      effects: {
        submitField: 'renderAndNotify',
        addTrial: 'none',
        removeTrial: 'none',
        syncInstrument: 'none'
      },
      loadingMessage: '数据任务加载中…',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    const ds = createDataWorkspaceHost({
      load: async () => stubInner(),
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(1),
      prefetch: false,
      notify: vi.fn(),
      effects: {
        submitField: 'notify',
        addTrial: 'notify',
        removeTrial: 'notify',
        syncInstrument: 'notify'
      },
      loadingMessage: '数据任务加载中',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    expect(ticker.getSession().trials).toHaveLength(7);
    expect(ds.getSession().trials).toHaveLength(1);
  });

  it('prefetches when prefetch is true and stays lazy when false', async () => {
    const eagerLoad = vi.fn(async () => stubInner());
    const lazyLoad = vi.fn(async () => stubInner());
    createDataWorkspaceHost({
      load: eagerLoad,
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(7),
      prefetch: true,
      notify: vi.fn(),
      effects: {
        submitField: 'renderAndNotify',
        addTrial: 'none',
        removeTrial: 'none',
        syncInstrument: 'none'
      },
      loadingMessage: '…',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    createDataWorkspaceHost({
      load: lazyLoad,
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(1),
      prefetch: () => false,
      notify: vi.fn(),
      effects: {
        submitField: 'notify',
        addTrial: 'notify',
        removeTrial: 'notify',
        syncInstrument: 'notify'
      },
      loadingMessage: 'loading',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    expect(eagerLoad).toHaveBeenCalledTimes(1);
    expect(lazyLoad).not.toHaveBeenCalled();
    await Promise.resolve();
  });

  it('submitField renderAndNotify vs notify-only matches the two shells', async () => {
    const tickerNotify = vi.fn();
    const tickerRender = vi.fn();
    const dsNotify = vi.fn();
    const dsRender = vi.fn();
    const tickerInner = stubInner();
    const dsInner = stubInner();
    const ticker = createDataWorkspaceHost({
      load: async () => tickerInner,
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(7),
      prefetch: true,
      notify: tickerNotify,
      renderAndEmit: tickerRender,
      effects: {
        submitField: 'renderAndNotify',
        addTrial: 'none',
        removeTrial: 'none',
        syncInstrument: 'none'
      },
      loadingMessage: '数据任务加载中…',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    const ds = createDataWorkspaceHost({
      load: async () => dsInner,
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(1),
      prefetch: true,
      notify: dsNotify,
      renderAndEmit: dsRender,
      effects: {
        submitField: 'notify',
        addTrial: 'notify',
        removeTrial: 'notify',
        syncInstrument: 'notify'
      },
      loadingMessage: '数据任务加载中',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    await Promise.resolve();
    tickerNotify.mockClear();
    dsNotify.mockClear();
    ticker.submitField({ field: 'x', raw: '1' });
    ds.submitField({ field: 'x', raw: '1' });
    expect(tickerRender).toHaveBeenCalled();
    expect(tickerNotify).toHaveBeenCalled();
    expect(dsRender).not.toHaveBeenCalled();
    expect(dsNotify).toHaveBeenCalled();
  });

  it('addTrial notifies only when the effect is notify', async () => {
    const tickerNotify = vi.fn();
    const dsNotify = vi.fn();
    const ticker = createDataWorkspaceHost({
      load: async () => stubInner(),
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(7),
      prefetch: true,
      notify: tickerNotify,
      effects: {
        submitField: 'renderAndNotify',
        addTrial: 'none',
        removeTrial: 'none',
        syncInstrument: 'none'
      },
      loadingMessage: '…',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    const ds = createDataWorkspaceHost({
      load: async () => stubInner(),
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(1),
      prefetch: true,
      notify: dsNotify,
      effects: {
        submitField: 'notify',
        addTrial: 'notify',
        removeTrial: 'notify',
        syncInstrument: 'notify'
      },
      loadingMessage: 'loading',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    await Promise.resolve();
    tickerNotify.mockClear();
    dsNotify.mockClear();
    ticker.addTrial();
    ds.addTrial();
    expect(tickerNotify).not.toHaveBeenCalled();
    expect(dsNotify).toHaveBeenCalled();
  });

  it('forwards invalidateAll with per-scene notify', async () => {
    const tickerInner = stubInner();
    const dsInner = stubInner();
    const tickerNotify = vi.fn();
    const dsNotify = vi.fn();
    const ticker = createDataWorkspaceHost({
      load: async () => tickerInner,
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(7),
      prefetch: true,
      notify: tickerNotify,
      extensions: { invalidateAll: { notify: true } },
      effects: {
        submitField: 'renderAndNotify',
        addTrial: 'none',
        removeTrial: 'none',
        syncInstrument: 'none'
      },
      loadingMessage: '…',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    const ds = createDataWorkspaceHost({
      load: async () => dsInner,
      eligibility: () => ({ ok: false, reason: 'loading' }),
      emptySession: emptyOf(1),
      prefetch: true,
      notify: dsNotify,
      extensions: { invalidateAll: { notify: false } },
      effects: {
        submitField: 'notify',
        addTrial: 'notify',
        removeTrial: 'notify',
        syncInstrument: 'notify'
      },
      loadingMessage: 'loading',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    await Promise.resolve();
    tickerNotify.mockClear();
    dsNotify.mockClear();
    ticker.invalidateAll?.('tape');
    ds.invalidateAll?.('optics');
    expect(tickerInner.invalidateAll).toHaveBeenCalledWith('tape');
    expect(dsInner.invalidateAll).toHaveBeenCalledWith('optics');
    expect(tickerNotify).toHaveBeenCalled();
    expect(dsNotify).not.toHaveBeenCalled();
  });

  it('uses inactive eligibility copy until the inner module is ready', () => {
    const host = createDataWorkspaceHost({
      load: () => new Promise<DataWorkspaceHost>(() => undefined),
      eligibility: () => ({
        ok: false as const,
        reason: '请先暂停纸带播放再处理数据'
      }),
      emptySession: emptyOf(7),
      prefetch: false,
      notify: vi.fn(),
      effects: {
        submitField: 'renderAndNotify',
        addTrial: 'none',
        removeTrial: 'none',
        syncInstrument: 'none'
      },
      loadingMessage: '数据任务加载中…',
      notReadyError: 'not ready',
      loadErrorLabel: 'load failed'
    });
    expect(host.getEligibility()).toEqual({
      ok: false,
      reason: '请先暂停纸带播放再处理数据'
    });
  });
});
