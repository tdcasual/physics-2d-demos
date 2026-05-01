import { bootScenePage } from '../../app/scene-bootstrapper';
import { createProjectileScene } from './scene.entry';
import { projectileMeta } from './scene.meta';
import { projectileControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createParamMapper, createPresetApplier } from '../page-utils';
import type { ProjectileParams } from './scene.sim';

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
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createProjectileScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({ mount, scene }) => {
    const applyParam = createParamMapper<ProjectileParams>(
      {
        v0: 'speed',
        theta: 'angleDeg',
        h0: 'initialHeight',
        g: 'gravity',
        c: 'drag'
      },
      (params) => scene.setParams(params)
    );

    const applyPreset = createPresetApplier<ProjectileParams>(
      {
        earth: { gravity: 9.8, windAccel: 0 },
        moon: { gravity: 1.62, windAccel: 0 },
        mars: { gravity: 3.71, windAccel: 0 },
        wind: { windAccel: 2.0 }
      },
      (params) => scene.setParams(params),
      () => {
        scene.reset?.();
        scene.render();
      }
    );

    const renderer = renderSchema({
      mount,
      schema: projectileControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          if (applyPreset(String(value))) {
            renderer.setActive(key, String(value));
          }
        } else {
          applyParam(key, value);
        }
      },
      onAction: () => {
        // No action buttons in this schema
      }
    });

    return {
      setParam(key: string, value: number) {
        renderer.setValue(key, value);
      },
      updatePreset(preset: string) {
        renderer.setActive('preset', preset);
      },
      dispose() {
        renderer.dispose();
      }
    };
  }
});
