/**
 * CapabilityOrchestrator 单元测试
 *
 * 覆盖：wire/binding/preservation/dispose 等核心路径
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CapabilityOrchestrator } from '../../src/app/layouts/capability-orchestrator';
import type { CapabilityContext, CapabilityInstance, CapabilityId, LayoutSlots } from '../../src/app/layouts/core/types';
import type { ILayout, Scene } from '../../src/app/layouts/types';

// Mock capabilities module
vi.mock('../../src/app/layouts/capabilities', () => {
  function createMockInstance(_id: string): CapabilityInstance {
    return {
      update: vi.fn(),
      setCallbacks: vi.fn(),
      dispose: vi.fn(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type FactoryFn = (cfg?: any) => any;

  const scopeMap: Record<string, 'container' | 'layout'> = {
    'transport-bar': 'layout',
    'readout-panel': 'layout',
    'demo-profile': 'container',
    'theme-toggle': 'container',
    'mode-toggle': 'container',
    'sidebar-toggle': 'layout',
    'resizer': 'layout',
    'debug-overlay': 'container',
  };

  const factories: Record<string, FactoryFn> = {};
  for (const id of Object.keys(scopeMap)) {
    factories[id] = () => ({
      id,
      scope: scopeMap[id],
      mount(_slots: LayoutSlots, _config: unknown, _ctx: CapabilityContext): CapabilityInstance {
        return createMockInstance(id);
      },
    });
  }

  return {
    capabilityFactories: factories,
    getCapabilityScope: (id: string) => scopeMap[id] ?? 'layout',
    CAPABILITY_SCOPES: scopeMap,
  };
});

// ============================================================================
// Helpers
// ============================================================================

function createCtx(): CapabilityContext {
  let theme: 'light' | 'dark' = 'light';
  let mode: 'normal' | 'presentation' = 'normal';
  return {
    container: document.createElement('div'),
    getTheme: () => theme,
    setTheme: (t) => { theme = t; },
    getMode: () => mode,
    setMode: (m) => { mode = m; },
    on: () => () => {},
  };
}

function createMockLayout(capabilities: { id: CapabilityId; config?: unknown }[]): ILayout {
  return {
    id: 'mock-layout',
    name: 'Mock',
    description: 'Test layout',
    supportedSlots: ['control', 'animation'],
    capabilities,
    mount: async () => ({ control: document.createElement('div'), animation: document.createElement('div') }),
    unmount: async () => {},
    setTheme: () => {},
    handleResize: () => {},
  };
}

function createMockScene(overrides: Partial<Scene> = {}): Scene {
  return {
    id: 'test-scene',
    preferredLayout: 'split-right',
    renderControl: vi.fn(),
    renderAnimation: vi.fn(),
    getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1, canReset: false })),
    getReadoutItems: vi.fn(() => [{ label: 'x', value: 1 }]),
    subscribe: vi.fn(() => vi.fn()),
    startAll: vi.fn(),
    pauseAll: vi.fn(),
    reset: vi.fn(),
    setTimeScale: vi.fn(),
    ...overrides,
  } as unknown as Scene;
}

// ============================================================================
// Tests
// ============================================================================

describe('CapabilityOrchestrator', () => {
  let orchestrator: CapabilityOrchestrator;

  beforeEach(() => {
    orchestrator = new CapabilityOrchestrator();
  });

  // ---- wire basics ----

  it('should wire capabilities from layout declarations', () => {
    const layout = createMockLayout([
      { id: 'transport-bar' },
      { id: 'readout-panel' },
    ]);
    const scene = createMockScene();
    const slots: Partial<LayoutSlots> = { animation: document.createElement('div'), readout: document.createElement('div') };

    orchestrator.wire(layout, scene, slots, createCtx());

    expect(orchestrator.getInstances('transport-bar').length).toBeGreaterThanOrEqual(1);
    expect(orchestrator.getInstances('readout-panel').length).toBeGreaterThanOrEqual(1);
  });

  it('should skip unknown capability ids gracefully', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = createMockLayout([{ id: 'nonexistent-cap' as CapabilityId }]);

    orchestrator.wire(layout, null, {}, createCtx());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown capability'));
    warnSpy.mockRestore();
  });

  it('should skip duplicate capabilities (except resizer)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const layout = createMockLayout([
      { id: 'transport-bar' },
      { id: 'transport-bar' },
    ]);

    orchestrator.wire(layout, null, { animation: document.createElement('div') }, createCtx());

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Duplicate capability'));
    expect(orchestrator.getInstances('transport-bar')).toHaveLength(1);
    warnSpy.mockRestore();
  });

  // ---- scene binding ----

  it('should push initial data and subscribe for transport-bar', () => {
    const layout = createMockLayout([{ id: 'transport-bar' }]);
    const scene = createMockScene();

    orchestrator.wire(layout, scene, { animation: document.createElement('div') }, createCtx());

    const inst = orchestrator.getInstances('transport-bar')[0];
    expect(inst.update).toHaveBeenCalledWith({ isPlaying: false, speed: 1, canReset: false });
    expect(inst.setCallbacks).toHaveBeenCalled();
  });

  it('should push initial data for readout-panel', () => {
    const layout = createMockLayout([{ id: 'readout-panel' }]);
    const scene = createMockScene();

    orchestrator.wire(layout, scene, { animation: document.createElement('div') }, createCtx());

    const inst = orchestrator.getInstances('readout-panel')[0];
    expect(inst.update).toHaveBeenCalledWith([{ label: 'x', value: 1 }]);
  });

  it('should not bind scene when scene is null', () => {
    const layout = createMockLayout([{ id: 'transport-bar' }]);

    orchestrator.wire(layout, null, { animation: document.createElement('div') }, createCtx());

    expect(orchestrator.getInstances('transport-bar')).toHaveLength(1);
  });

  it('should skip binding when scene lacks required methods', () => {
    const layout = createMockLayout([{ id: 'transport-bar' }]);
    // Scene without getTransportState
    const scene = createMockScene({ getTransportState: undefined });

    orchestrator.wire(layout, scene, { animation: document.createElement('div') }, createCtx());

    const inst = orchestrator.getInstances('transport-bar')[0];
    // Should NOT have received update or callbacks
    expect(inst.update).not.toHaveBeenCalled();
    expect(inst.setCallbacks).not.toHaveBeenCalled();
  });

  it('should ignore capabilities not in SCENE_BINDINGS', () => {
    const layout = createMockLayout([{ id: 'theme-toggle' }]);
    const scene = createMockScene();

    orchestrator.wire(layout, scene, {}, createCtx());

    expect(orchestrator.getInstances('theme-toggle')).toHaveLength(1);
  });

  // ---- re-wire behavior ----

  it('should dispose all capabilities on re-wire and create fresh instances', () => {
    const layout1 = createMockLayout([
      { id: 'theme-toggle' },
      { id: 'transport-bar' },
    ]);
    const layout2 = createMockLayout([
      { id: 'theme-toggle' },
      { id: 'transport-bar' },
    ]);

    const slots = { animation: document.createElement('div') };

    orchestrator.wire(layout1, null, slots, createCtx());
    const firstThemeInst = orchestrator.getInstances('theme-toggle')[0];
    const firstTransportInst = orchestrator.getInstances('transport-bar')[0];

    orchestrator.wire(layout2, null, slots, createCtx());
    // Both should be disposed (no preservation — DOM is destroyed on layout switch)
    expect(firstThemeInst.dispose).toHaveBeenCalled();
    expect(firstTransportInst.dispose).toHaveBeenCalled();
    // New instances created
    expect(orchestrator.getInstances('theme-toggle')).toHaveLength(1);
    expect(orchestrator.getInstances('transport-bar')).toHaveLength(1);
    expect(orchestrator.getInstances('theme-toggle')[0]).not.toBe(firstThemeInst);
  });

  it('should dispose instances no longer declared by new layout', () => {
    const layout1 = createMockLayout([{ id: 'debug-overlay' }]);
    const layout2 = createMockLayout([]); // no debug-overlay

    orchestrator.wire(layout1, null, {}, createCtx());
    const debugInst = orchestrator.getInstances('debug-overlay')[0];

    orchestrator.wire(layout2, null, {}, createCtx());
    expect(debugInst.dispose).toHaveBeenCalled();
    expect(orchestrator.getInstances('debug-overlay')).toHaveLength(0);
  });

  // ---- self-cleanup on wire ----

  it('should cleanup scene bindings at the start of wire()', () => {
    const unsub = vi.fn();
    const layout1 = createMockLayout([{ id: 'transport-bar' }]);
    const scene = createMockScene({ subscribe: vi.fn(() => unsub) });

    orchestrator.wire(layout1, scene, { animation: document.createElement('div') }, createCtx());
    expect(unsub).not.toHaveBeenCalled();

    // Second wire should auto-cleanup
    orchestrator.wire(layout1, scene, { animation: document.createElement('div') }, createCtx());
    expect(unsub).toHaveBeenCalled();
  });

  // ---- subscribe error handling ----

  it('should handle subscribe throw gracefully', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const layout = createMockLayout([{ id: 'transport-bar' }]);
    const scene = createMockScene({ subscribe: vi.fn(() => { throw new Error('subscribe fail'); }) });

    // Should not throw
    orchestrator.wire(layout, scene, { animation: document.createElement('div') }, createCtx());

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('subscribe failed'), expect.any(Error));
    errorSpy.mockRestore();
  });

  // ---- cleanup/dispose ----

  it('cleanupSceneBindings should clear subscriptions', () => {
    const unsub = vi.fn();
    const layout = createMockLayout([{ id: 'transport-bar' }]);
    const scene = createMockScene({ subscribe: vi.fn(() => unsub) });

    orchestrator.wire(layout, scene, { animation: document.createElement('div') }, createCtx());
    orchestrator.cleanupSceneBindings();

    expect(unsub).toHaveBeenCalled();
  });

  it('dispose should dispose all instances and clear bindings', () => {
    const layout = createMockLayout([
      { id: 'transport-bar' },
      { id: 'theme-toggle' },
    ]);
    const slots = { animation: document.createElement('div') };

    orchestrator.wire(layout, null, slots, createCtx());
    const transportInst = orchestrator.getInstances('transport-bar')[0];
    const themeInst = orchestrator.getInstances('theme-toggle')[0];

    orchestrator.dispose();

    expect(transportInst.dispose).toHaveBeenCalled();
    expect(themeInst.dispose).toHaveBeenCalled();
    expect(orchestrator.getInstances('transport-bar')).toHaveLength(0);
    expect(orchestrator.getInstances('theme-toggle')).toHaveLength(0);
  });

  it('getInstances should return empty array for unknown id', () => {
    expect(orchestrator.getInstances('nonexistent')).toEqual([]);
  });

  it('wire after dispose should be a no-op', () => {
    const layout = createMockLayout([{ id: 'transport-bar' }]);

    orchestrator.dispose();
    orchestrator.wire(layout, null, { animation: document.createElement('div') }, createCtx());

    // No instances created after dispose
    expect(orchestrator.getInstances('transport-bar')).toHaveLength(0);
  });

  it('double dispose should be safe', () => {
    const layout = createMockLayout([{ id: 'transport-bar' }]);

    orchestrator.wire(layout, null, { animation: document.createElement('div') }, createCtx());
    const inst = orchestrator.getInstances('transport-bar')[0];

    orchestrator.dispose();
    orchestrator.dispose();

    // dispose called only once per instance
    expect(inst.dispose).toHaveBeenCalledTimes(1);
  });
});
