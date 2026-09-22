import { describe, expect, it, vi } from 'vitest';
import { createEventEmitter } from '../../src/app/layouts/event-emitter';
import { buildCapabilityContext } from '../../src/app/layouts/capability-context';
import type { SceneContainerEvents } from '../../src/app/layouts/types';

describe('buildCapabilityContext', () => {
  it('bridges mode changes to container state, events, capability updates, and scene mode', () => {
    const container = document.createElement('div');
    const emitter = createEventEmitter<SceneContainerEvents>('test');
    const updates: unknown[] = [];
    const modes: string[] = [];
    const events: unknown[] = [];

    emitter.on('layout:mode', (payload) => events.push(payload));

    const ctx = buildCapabilityContext({
      container,
      getTheme: () => 'light',
      setTheme: () => {},
      getCurrentLayoutId: () => 'split-right',
      switchLayout: () => {},
      getAvailableLayouts: () => [],
      emit: (event, payload) => emitter.emit(event, payload),
      updateDemoProfileInstances: (payload) => updates.push(payload),
      scene: {
        id: 'scene',
        preferredLayout: 'split-right',
        renderControl() {},
        renderAnimation() {},
        setMode: (mode) => modes.push(mode),
        requestStageRepaint() {}
      }
    });

    ctx.setMode('presentation');

    expect(container.getAttribute('data-mode')).toBe('presentation');
    expect(events).toEqual([{ mode: 'presentation', profile: null }]);
    expect(updates).toEqual([{ mode: 'presentation', profile: null }]);
    expect(modes).toEqual(['presentation']);
  });

  it('forwards requestStageRepaint to the scene and tolerates a null scene', () => {
    const base = {
      container: document.createElement('div'),
      getTheme: () => 'light' as const,
      setTheme: () => {},
      getCurrentLayoutId: () => 'split-right',
      switchLayout: () => {},
      getAvailableLayouts: () => [],
      emit: () => {},
      updateDemoProfileInstances: () => {}
    };
    const requestStageRepaint = vi.fn();
    const ctx = buildCapabilityContext({
      ...base,
      scene: {
        id: 'scene',
        preferredLayout: 'split-right',
        renderControl() {},
        renderAnimation() {},
        requestStageRepaint
      }
    });
    ctx.requestStageRepaint();
    expect(requestStageRepaint).toHaveBeenCalledTimes(1);

    const sceneless = buildCapabilityContext({ ...base, scene: null });
    expect(() => sceneless.requestStageRepaint()).not.toThrow();
  });
});
