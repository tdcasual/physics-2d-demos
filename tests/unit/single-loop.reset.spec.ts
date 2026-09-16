import { afterEach, describe, expect, it } from 'vitest';
import { SceneAdapter } from '../../src/app/scene-adapter';
import type { LayoutSlots } from '../../src/app/layouts/types';
import {
  createSingleLoopControls,
  withSingleLoopUrlSync
} from '../../src/pages/single-loop-integration';
import { singleLoopMeta } from '../../src/scenes/single-loop/scene.meta';
import { createSingleLoopScene } from '../../src/scenes/single-loop/scene.entry';
import { writeSceneParams } from '../../src/app/url-sync';

describe('single-loop Reset URL integration', () => {
  let adapter:
    | SceneAdapter<ReturnType<typeof createSingleLoopScene>>
    | undefined;
  let scene: ReturnType<typeof createSingleLoopScene> | undefined;

  afterEach(() => {
    adapter?.unmount();
    adapter = undefined;
    scene = undefined;
    window.history.replaceState({}, '', '/');
  });

  it('keeps restored URL defaults after SceneAdapter.reset refreshes real controls', async () => {
    window.history.replaceState(
      {},
      '',
      '/src/pages/single-loop.html?autoRun=1&initialVelocity=18&fieldStrength=3&mass=4&resistance=8&audit=scene29'
    );

    adapter = new SceneAdapter<ReturnType<typeof createSingleLoopScene>>({
      meta: singleLoopMeta,
      createScene: ({ canvas, theme, mode, demoHints }) => {
        scene = withSingleLoopUrlSync(
          createSingleLoopScene({ canvas, theme, mode, demoHints })
        );
        return scene;
      },
      createControls: ({ mount, scene: adapterScene }) =>
        createSingleLoopControls({
          mount,
          scene: adapterScene,
          writeParam: (key, value) => writeSceneParams({ [key]: value })
        })
    });

    const animation = document.createElement('div');
    const controls = document.createElement('div');
    adapter.renderAnimation(animation, {
      animation,
      control: controls
    } as LayoutSlots);
    adapter.renderControl(controls);

    scene?.setParams({
      autoRun: true,
      initialVelocity: 18,
      fieldStrength: 3,
      mass: 4,
      resistance: 8
    });
    expect(scene?.getParams()).toEqual({
      autoRun: true,
      initialVelocity: 18,
      fieldStrength: 3,
      mass: 4,
      resistance: 8
    });

    // The toolbar Reset callback enters through SceneAdapter.reset().
    adapter.reset();
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 220);
    });

    const params = new URL(window.location.href).searchParams;
    expect(params.get('autoRun')).toBe('0');
    expect(params.get('initialVelocity')).toBe('10');
    expect(params.get('fieldStrength')).toBe('1.5');
    expect(params.get('mass')).toBe('2');
    expect(params.get('resistance')).toBe('2');
    expect(params.get('audit')).toBe('scene29');
  });
});
