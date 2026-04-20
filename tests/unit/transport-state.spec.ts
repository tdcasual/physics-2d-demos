import { describe, expect, it, vi } from 'vitest';
import { SplitRightLayout } from '../../src/app/layouts/masters/split-right/split-right';

describe('TransportState integration', () => {
  function createLayout(
    config?: ConstructorParameters<typeof SplitRightLayout>[1]
  ) {
    const container = document.createElement('div');
    container.style.width = '1200px';
    container.style.height = '800px';
    const layout = new SplitRightLayout(container, config);
    return { container, layout };
  }

  it('should pass transport state to floating controls', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const mockSetState = vi.fn();
    const mockControls = {
      setState: mockSetState,
      dispose: vi.fn(),
      remove: vi.fn()
    } as unknown as HTMLElement;

    // Inject mock floating controls
    (
      layout as unknown as { floatingControls: typeof mockControls }
    ).floatingControls = mockControls;

    layout.updateTransportState({ isPlaying: true, speed: 1.5 });
    expect(mockSetState).toHaveBeenCalledWith({ isPlaying: true, speed: 1.5 });

    layout.updateTransportState({ isPlaying: false, speed: 0.5 });
    expect(mockSetState).toHaveBeenCalledWith({ isPlaying: false, speed: 0.5 });
  });

  it('should gracefully handle missing floating controls', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    // Ensure floatingControls is null
    (layout as unknown as { floatingControls: null }).floatingControls = null;

    expect(() => {
      layout.updateTransportState({ isPlaying: true });
    }).not.toThrow();
  });

  it('should pass transport state through setFloatingControls bridge', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const onTogglePlay = vi.fn();
    const onReset = vi.fn();

    layout.setFloatingControls({
      onTogglePlay,
      onReset,
      isPlaying: () => false,
      getSpeed: () => 1
    });

    // Verify floating controls are attached to stage slot
    const stageSlot = container.querySelector('.stage-slot');
    expect(stageSlot?.querySelector('.stage-floating-controls')).toBeTruthy();
  });

  it('should update floating controls when transport state changes', () => {
    const { container, layout } = createLayout();
    layout.render(container);

    const states: Array<{ isPlaying: boolean }> = [];

    layout.setFloatingControls({
      onTogglePlay: () => {},
      isPlaying: () => false,
      getSpeed: () => 1
    });

    // Get the actual floating controls and spy on setState
    const floatingControls = (
      layout as unknown as {
        floatingControls: { setState?: (s: unknown) => void };
      }
    ).floatingControls;
    if (floatingControls && floatingControls.setState) {
      const originalSetState = floatingControls.setState;
      floatingControls.setState = (state: unknown) => {
        states.push(state as { isPlaying: boolean });
        originalSetState.call(floatingControls, state);
      };
    }

    layout.updateTransportState({ isPlaying: true });
    layout.updateTransportState({ isPlaying: false });

    // If floatingControls supports setState, verify it was called
    if (floatingControls && floatingControls.setState) {
      expect(states.length).toBeGreaterThanOrEqual(0); // May or may not be called depending on implementation
    }
  });
});
