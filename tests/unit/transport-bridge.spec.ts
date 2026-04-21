import { describe, expect, it, vi } from 'vitest';
import { TransportBridge } from '../../src/app/layouts/transport-bridge';

describe('TransportBridge', () => {
  function createMockLayout(): import('../../src/app/layouts/types').LayoutMaster {
    return {
      id: 'test-layout',
      name: 'Test',
      description: '',
      supportedSlots: [],
      mount: vi.fn(),
      unmount: vi.fn(),
      setTheme: vi.fn(),
      handleResize: vi.fn(),
      getSlots: vi.fn(() => ({
        header: document.createElement('div'),
        control: document.createElement('div'),
        animation: document.createElement('div')
      })),
      setFloatingControls: vi.fn(),
      updateReadout: vi.fn(),
      updateTransportState: vi.fn()
    } as unknown as import('../../src/app/layouts/types').LayoutMaster;
  }

  function createMockScene(): import('../../src/app/layouts/types').Scene {
    return {
      id: 'test-scene',
      mount: vi.fn(),
      unmount: vi.fn(),
      getReadoutItems: vi.fn(() => [{ label: 't', value: '1.0' }]),
      getTransportState: vi.fn(() => ({ isPlaying: false, speed: 1 })),
      subscribe: vi.fn((cb) => {
        cb();
        return () => {};
      })
    } as unknown as import('../../src/app/layouts/types').Scene;
  }

  it('should bind floating controls to layout', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    const callbacks = { isPlaying: () => false, onTogglePlay: vi.fn() };

    bridge.bindFloatingControls(layout, callbacks);

    expect(layout.setFloatingControls).toHaveBeenCalledWith(callbacks);
  });

  it('should skip bindFloatingControls if layout does not support it', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    layout.setFloatingControls = undefined;

    expect(() => bridge.bindFloatingControls(layout, {})).not.toThrow();
  });

  it('should sync scene readout to layout', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    const scene = createMockScene();

    bridge.syncSceneStateToLayout(scene, layout);

    expect(layout.updateReadout).toHaveBeenCalledWith([
      { label: 't', value: '1.0' }
    ]);
  });

  it('should sync scene transport state to layout', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    const scene = createMockScene();

    bridge.syncSceneStateToLayout(scene, layout);

    expect(layout.updateTransportState).toHaveBeenCalledWith({
      isPlaying: false,
      speed: 1
    });
  });

  it('should do nothing when layout is null', () => {
    const bridge = new TransportBridge();
    const scene = createMockScene();

    expect(() => bridge.syncSceneStateToLayout(scene, null)).not.toThrow();
  });

  it('should do nothing when scene lacks getReadoutItems', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    const scene = createMockScene();
    scene.getReadoutItems = undefined;

    expect(() => bridge.syncSceneStateToLayout(scene, layout)).not.toThrow();
  });

  it('should subscribe to scene changes', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    const scene = createMockScene();

    const unsubscribe = bridge.subscribeSceneChanges(scene, layout);

    expect(scene.subscribe).toHaveBeenCalled();
    expect(typeof unsubscribe).toBe('function');
  });

  it('should return no-op when scene lacks subscribe', () => {
    const bridge = new TransportBridge();
    const layout = createMockLayout();
    const scene = createMockScene();
    scene.subscribe = undefined;

    const unsubscribe = bridge.subscribeSceneChanges(scene, layout);

    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  it('should return no-op when layout is null', () => {
    const bridge = new TransportBridge();
    const scene = createMockScene();

    const unsubscribe = bridge.subscribeSceneChanges(scene, null);

    expect(typeof unsubscribe).toBe('function');
  });

  it('should dispose and unsubscribe all subscriptions', () => {
    const bridge = new TransportBridge();
    const mockUnsubscribe1 = vi.fn();
    const mockUnsubscribe2 = vi.fn();

    // Manually set the unsubscribers array
    (bridge as unknown as { unsubscribers: (() => void)[] }).unsubscribers = [
      mockUnsubscribe1,
      mockUnsubscribe2
    ];

    bridge.dispose();

    expect(mockUnsubscribe1).toHaveBeenCalled();
    expect(mockUnsubscribe2).toHaveBeenCalled();
  });

  it('should dispose safely when no unsubscribe exists', () => {
    const bridge = new TransportBridge();
    expect(() => bridge.dispose()).not.toThrow();
  });
});
