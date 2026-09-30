import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createTortoiseHareScene } from './scene.entry';
import { tortoiseHareMeta } from './scene.meta';
import { tortoiseHareControlsSchema } from './controls-schema';

bootScenePage({
  meta: tortoiseHareMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    controlColumns: 'auto',
    readoutCollapsed: false,
    hasGraph: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    createTortoiseHareScene({ canvas, theme, mode, demoHints }),
  // URL 参数（键集 = meta.defaultParams ∪ meta.urlSyncKeys ∪ {preset}）由
  // bootstrapper 参数管线自动应用与回写；speed 走默认 setParams 管线，
  // preset 语义因场景而异（默认管线跳过），由 applyParam 接管。
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key !== 'preset') return false;
      ctx.scene.setParams({ preset: String(value) });
      ctx.setControlActive('preset', String(value));
      return true;
    }
  },
  createControls: ({ mount, scene, writeParam }) => {
    const renderer = renderSchema({
      mount,
      schema: tortoiseHareControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          scene.setParams({ preset: String(value) });
          writeParam?.(key, value);
        }
      },
      onAction: () => {}
    });

    return exposeSchemaHandle(renderer);
  }
});
