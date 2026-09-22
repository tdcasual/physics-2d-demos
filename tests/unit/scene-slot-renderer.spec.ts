import { describe, expect, it } from 'vitest';
import { renderSceneToSlots } from '../../src/app/layouts/scene-slot-renderer';
import type {
  ILayout,
  LayoutSlots,
  Scene,
  Theme
} from '../../src/app/layouts/types';

function createLayout(slots: Partial<LayoutSlots>): ILayout {
  return {
    id: 'test-layout',
    name: 'Test Layout',
    description: 'Test layout',
    supportedSlots: ['header', 'control', 'animation', 'graph', 'readout'],
    capabilities: [],
    async mount() {
      return slots as LayoutSlots;
    },
    async unmount() {},
    setTheme(_theme: Theme) {},
    handleResize() {},
    getSlots() {
      return slots;
    }
  };
}

describe('renderSceneToSlots', () => {
  it('clears non-animation slots before rendering and preserves animation canvas', () => {
    const control = document.createElement('section');
    control.textContent = 'old control';
    const animation = document.createElement('section');
    const canvas = document.createElement('canvas');
    animation.appendChild(canvas);

    const scene: Scene = {
      id: 'test-scene',
      preferredLayout: 'test-layout',
      requestStageRepaint() {},
      renderControl(container) {
        container.textContent = 'new control';
      },
      renderAnimation(container, slots) {
        expect(slots?.animation).toBe(animation);
        expect(container.querySelector('canvas')).toBe(canvas);
      }
    };

    renderSceneToSlots(scene, createLayout({ control, animation }));

    expect(control.textContent).toBe('new control');
    expect(animation.querySelector('canvas')).toBe(canvas);
  });
});
