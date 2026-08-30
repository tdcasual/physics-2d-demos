import { bootScenePage } from '../../app/scene-bootstrapper';
import { createProjectileScene } from './scene.entry';
import { projectileMeta } from './scene.meta';
import { projectileControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createParamMapper, createPresetApplier } from '../page-utils';
import type { ProjectileParams } from './scene.sim';

// meta 控制 key → sim 参数 key 映射（onChange 与 URL 管线共用同一份）
const projectileParamMap: Record<string, string> = {
  v0: 'speed',
  theta: 'angleDeg',
  h0: 'initialHeight',
  g: 'gravity',
  c: 'drag'
};

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
    paramMap: projectileParamMap,
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
    const applyParam = createParamMapper<ProjectileParams>(
      projectileParamMap,
      (params) => scene.setParams(params)
    );

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
          applyParam(key, value);
          writeParam(key, value);
        }
      },
      onAction: () => {
        // No action buttons in this schema
      }
    });

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      dispose() {
        renderer.dispose();
      }
    };
  }
});
