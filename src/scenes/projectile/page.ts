import { bootScenePage } from '../../app/scene-bootstrapper';
import { createProjectileScene } from './scene.entry';
import { createProjectileControlsV4 } from './controls-v4';
import { projectileMeta } from './scene.meta';

bootScenePage({
  meta: projectileMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 260,
    leftMaxWidth: 960,
    hasGraph: false,
    controlColumns: 'auto',
    readoutCollapsed: true,
    hideHeader: true,
    readoutLabel: '数据区'
  },
  createScene: ({ canvas, theme, mode }) =>
    createProjectileScene({ canvas, theme, mode }),
  createControls: ({ mount, scene }) => {
    const controls = createProjectileControlsV4({
      mount,
      onParamChange: (key, value) => {
        const paramMap: Record<string, string> = {
          v0: 'speed',
          theta: 'angleDeg',
          h0: 'initialHeight',
          g: 'gravity',
          c: 'drag'
        };
        const paramKey = paramMap[key];
        if (paramKey) {
          (scene as any).setParams({ [paramKey]: value });
        }
      },
      onPresetSelect: (preset) => {
        let params: Partial<Record<string, number>> = {};
        switch (preset) {
          case 'earth':
            params = { gravity: 9.8, windAccel: 0 };
            break;
          case 'moon':
            params = { gravity: 1.62, windAccel: 0 };
            break;
          case 'mars':
            params = { gravity: 3.71, windAccel: 0 };
            break;
          case 'wind':
            params = { windAccel: 2.0 };
            break;
        }
        (scene as any).setParams(params);
        scene.reset?.();
        scene.render();
        controls.updatePreset(preset);
      }
    });
    return controls;
  }
});
