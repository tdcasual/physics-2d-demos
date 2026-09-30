import { describe, expect, it, vi } from 'vitest';
import { createEventEmitter } from '../../src/app/layouts/event-emitter';
import { buildCapabilityContext } from '../../src/app/layouts/capability-context';
import type { SceneContainerEvents } from '../../src/app/layouts/types';
import { ModeOwner } from '../../src/app/layouts/mode-owner';
import { SidebarStateOwner } from '../../src/app/layouts/sidebar-state';
import { WorkspaceUiState } from '../../src/app/layouts/workspace-ui-state';

describe('buildCapabilityContext', () => {
  it('bridges mode changes to container state, events, capability updates, and scene mode', () => {
    const container = document.createElement('div');
    const emitter = createEventEmitter<SceneContainerEvents>('test');
    const updates: unknown[] = [];
    const modes: string[] = [];
    const events: unknown[] = [];

    emitter.on('layout:mode', (payload) => events.push(payload));

    const scene = {
      id: 'scene',
      preferredLayout: 'split-right',
      renderControl() {},
      renderAnimation() {},
      setMode: (mode: string) => modes.push(mode),
      requestStageRepaint() {}
    };

    const modeOwner = new ModeOwner({
      container,
      getScene: () => scene,
      applyAdapterMode: (mode) => {
        scene.setMode(mode);
      },
      emitMode: (payload) => emitter.emit('layout:mode', payload),
      updateCapabilities: (payload) => updates.push(payload)
    });

    const ctx = buildCapabilityContext({
      container,
      getTheme: () => 'light',
      setTheme: () => {},
      getCurrentLayoutId: () => 'split-right',
      switchLayout: () => {},
      getAvailableLayouts: () => [],
      scene,
      modeOwner,
      sidebar: new SidebarStateOwner(),
      workspaceUi: new WorkspaceUiState()
    });

    ctx.setMode('presentation');

    expect(container.getAttribute('data-mode')).toBe('presentation');
    expect(events[0]).toMatchObject({ mode: 'presentation', profile: null });
    expect(updates[0]).toMatchObject({ mode: 'presentation', profile: null });
    expect(modes).toEqual(['presentation']);
  });

  it('forwards requestStageRepaint to the scene and tolerates a null scene', () => {
    const container = document.createElement('div');
    const modeOwner = new ModeOwner({
      container,
      getScene: () => null,
      applyAdapterMode: () => {},
      emitMode: () => {},
      updateCapabilities: () => {}
    });
    const base = {
      container,
      getTheme: () => 'light' as const,
      setTheme: () => {},
      getCurrentLayoutId: () => 'split-right',
      switchLayout: () => {},
      getAvailableLayouts: () => [],
      modeOwner,
      sidebar: new SidebarStateOwner(),
      workspaceUi: new WorkspaceUiState()
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
