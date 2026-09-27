import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { ampereBalanceControlsSchema } from './controls-schema';
import { ampereBalanceMeta } from './scene.meta';
import { createAmpereBalanceScene } from './scene.entry';
import {
  ampereBalanceConstants as C,
  ampereBalancePresets,
  ampereBalanceUrlPayload,
  ampereBalanceUrlReset,
  applyAmpereBalanceUrlParam,
  encodeCurrentDirection,
  encodeFieldDirection,
  parseCurrentDirection,
  parseFieldDirection,
  type AmpereBalanceParams
} from './scene.sim';

bootScenePage({
  meta: ampereBalanceMeta,
  autoPlay: false,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.34,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false,
    hideTransport: true
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('ampere-balance requires a canvas');
    const scene = createAmpereBalanceScene({ canvas, theme, mode, demoHints });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      }
    };
  },
  createControls: ({
    mount,
    scene,
    scheduleRender,
    writeParam,
    sceneWriter
  }) => {
    const render = scheduleRender ?? (() => scene.render());
    const syncSliders = () => {
      const params = scene.getParams();
      renderer.setValueSilently('inclineAngle', params.inclineAngle);
      renderer.setValueSilently('magneticField', params.magneticField);
      renderer.setValueSilently('current', params.current);
      renderer.setValueSilently('mass', params.mass);
      renderer.setActiveSilently('fieldDirection', params.fieldDirection);
      renderer.setActiveSilently('currentDirection', params.currentDirection);
    };
    const writeAll = (params: AmpereBalanceParams) => {
      writeOwnedSceneParams(sceneWriter, ampereBalanceUrlPayload(params));
    };
    const renderer = renderSchema({
      mount,
      schema: ampereBalanceControlsSchema,
      onChange: (key, value) => {
        if (key === 'fieldDirection') {
          const direction = parseFieldDirection(value);
          scene.setFieldDirection(direction);
          renderer.setActive(key, direction);
        } else if (key === 'currentDirection') {
          const direction = parseCurrentDirection(value);
          scene.setCurrentDirection(direction);
          renderer.setActive(key, direction);
        } else if (
          key === 'inclineAngle' ||
          key === 'magneticField' ||
          key === 'current' ||
          key === 'mass'
        ) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<AmpereBalanceParams>);
        }
        render();
        if (key === 'fieldDirection') {
          writeParam?.(key, encodeFieldDirection(parseFieldDirection(value)));
        } else if (key === 'currentDirection') {
          writeParam?.(
            key,
            encodeCurrentDirection(parseCurrentDirection(value))
          );
        } else {
          writeParam?.(key, value);
        }
      },
      onAction: (key) => {
        if (key === 'balance') {
          scene.setParams({ ...ampereBalancePresets.balance });
          syncSliders();
          writeAll(scene.getParams());
        } else if (key === 'support-zero') {
          scene.setParams({ ...ampereBalancePresets.supportZero });
          syncSliders();
          writeAll(scene.getParams());
        } else if (key === 'detach') {
          scene.setParams({ ...ampereBalancePresets.detach });
          syncSliders();
          writeAll(scene.getParams());
        } else if (key === 'reset') {
          scene.reset();
          renderer.setValue('inclineAngle', C.defaultInclineAngle);
          renderer.setValue('magneticField', C.defaultMagneticField);
          renderer.setValue('current', C.defaultCurrent);
          renderer.setValue('mass', C.defaultMass);
          renderer.setActive('fieldDirection', 'down');
          renderer.setActive('currentDirection', 'out');
          writeOwnedSceneParams(sceneWriter, ampereBalanceUrlReset());
        }
        render();
      }
    });
    return {
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setValueSilently: (key: string, value: number | string | boolean) =>
        renderer.setValueSilently(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      setActiveSilently: (key: string, value: string) =>
        renderer.setActiveSilently(key, value),
      refresh: () => syncSliders(),
      dispose: () => renderer.dispose()
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) =>
      applyAmpereBalanceUrlParam(key, value, {
        scene: ctx.scene,
        setControlActive: ctx.setControlActive,
        setControlValue: ctx.setControlValue
      })
  }
});
