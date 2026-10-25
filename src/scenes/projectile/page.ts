import { bootScenePage } from '../../app/scene-bootstrapper';
import { createProjectileScene } from './scene.entry';
import { projectileMeta } from './scene.meta';
import { projectileControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createPresetApplier } from '../page-utils';
import { controlChangeToParams } from '../../platform/param-binding';
import type { ProjectileParams } from './scene.sim';

const projectilePresets: Record<string, Partial<ProjectileParams>> = {
  earth: { gravity: 9.8, windAccel: 0 },
  moon: { gravity: 1.62, windAccel: 0 },
  mars: { gravity: 3.71, windAccel: 0 },
  wind: { windAccel: 2.0 }
};

bootScenePage<ReturnType<typeof createProjectileScene>>({
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
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key !== 'preset') return false;
      const params = projectilePresets[String(value)];
      if (!params) return true; // 未知预设：忽略但视为已处理
      ctx.scene.setParams(params);
      ctx.scene.reset?.();
      ctx.setControlActive('preset', String(value));
      return true;
    }
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createProjectileScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    writeParam = () => {}
  }) => {
    const applyPreset = createPresetApplier<ProjectileParams>(
      projectilePresets,
      (params) => scene.setParams(params),
      () => {
        scene.reset?.();
        scheduleRender();
      }
    );

    const renderer = renderSchema({
      mount,
      schema: projectileControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          if (applyPreset(String(value))) {
            renderer.setActive(key, String(value));
            writeParam(key, value);
          }
        } else {
          scene.setParams(
            controlChangeToParams(
              key,
              value,
              renderer.bindings
            ) as Partial<ProjectileParams>
          );
          writeParam(key, value);
        }
      },
      onAction: () => {
        // No action buttons in this schema
      }
    });

    return renderer;
  }
});
