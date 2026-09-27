import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createFaradayScene } from './scene.entry';
import { faradayMeta } from './scene.meta';
import { faradayControlsSchema } from './controls-schema';
import type {
  FaradayField,
  FaradayParamPatch,
  FaradayRotation
} from './scene.sim';

function asBoolean(value: unknown): boolean {
  return (
    value === true ||
    value === 1 ||
    value === '1' ||
    String(value).toLowerCase() === 'true'
  );
}

bootScenePage({
  meta: faradayMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 520,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '数据读数',
    hasGraph: false
  },
  paramSync: {
    activeKeys: ['rotation', 'field', 'preset']
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('faraday-disc requires a canvas');
    const scene = createFaradayScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        scene.dispose();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const faradayScene = scene as ReturnType<typeof createFaradayScene>;

    const syncPreset = (): void => {
      const id = faradayScene.matchingPreset();
      if (id) renderer.setActive('preset', id);
    };

    const renderer = renderSchema({
      mount,
      schema: faradayControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          const params = faradayScene.applyPreset(String(value));
          renderer.setActive('preset', String(value));
          renderer.setActive('rotation', params.rotation);
          renderer.setActive('field', params.field);
          renderer.setValue('closed', params.closed);
          render();
          writeParam?.('preset', value);
          writeParam?.('rotation', params.rotation);
          writeParam?.('field', params.field);
          writeParam?.('closed', params.closed ? 1 : 0);
          return;
        }
        if (key === 'rotation') {
          faradayScene.setRotation(String(value) as FaradayRotation);
          renderer.setActive(key, String(value));
          syncPreset();
        } else if (key === 'field') {
          faradayScene.setField(String(value) as FaradayField);
          renderer.setActive(key, String(value));
          syncPreset();
        } else if (key === 'closed') {
          faradayScene.setParams({ closed: asBoolean(value) });
          renderer.setValue('closed', asBoolean(value));
          syncPreset();
        } else {
          faradayScene.setParams({
            [key]: Number(value)
          } as FaradayParamPatch);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => {}
    });
    return {
      ...exposeSchemaHandle(renderer),
      setValue: (key: string, value: number | string | boolean) => {
        renderer.setValue(key, value);
        if (key === 'closed') syncPreset();
      }
    };
  }
});
