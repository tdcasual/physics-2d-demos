import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createXtGraphScene } from './scene.entry';
import { xtGraphMeta } from './scene.meta';
import { xtGraphControlsSchema } from './controls-schema';

bootScenePage({
  meta: xtGraphMeta,
  preferredLayout: 'split-right',
  layoutConfig: {
    controlColumns: 'auto',
    readoutCollapsed: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    createXtGraphScene({ canvas, theme, mode, demoHints }),
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
      schema: xtGraphControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          scene.setParams({ preset: String(value) });
          writeParam?.(key, value);
        }
      },
      onAction: () => {}
    });

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      dispose: () => renderer.dispose()
    };
  }
});
