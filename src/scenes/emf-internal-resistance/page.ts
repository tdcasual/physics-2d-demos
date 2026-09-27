import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams, writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { emfInternalControlsSchema } from './controls-schema';
import { createEmfInternalScene } from './scene.entry';
import { emfInternalMeta } from './scene.meta';
import {
  asBool,
  asInternalResistance,
  asSourceVoltage,
  restoredUrlParams,
  type EmfInternalParams
} from './scene.sim';

function rawQuery(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get(key);
}

function urlValue(
  raw: Record<string, number | string>,
  key: string
): number | string | null {
  const parsed = raw[key];
  if (
    parsed !== undefined &&
    !(typeof parsed === 'number' && Number.isNaN(parsed))
  ) {
    return parsed;
  }
  return rawQuery(key);
}

function paramsFromUrl(
  raw: Record<string, number | string>
): Partial<EmfInternalParams> {
  const next: Partial<EmfInternalParams> = {};
  const sourceVoltage = asSourceVoltage(urlValue(raw, 'sourceVoltage'));
  if (sourceVoltage !== undefined) next.sourceVoltage = sourceVoltage;
  const internalResistance = asInternalResistance(
    urlValue(raw, 'internalResistance')
  );
  if (internalResistance !== undefined)
    next.internalResistance = internalResistance;
  const rheostat = urlValue(raw, 'rheostatResistance');
  if (rheostat !== null) {
    const rheostatResistance = Number(rheostat);
    if (Number.isFinite(rheostatResistance))
      next.rheostatResistance = rheostatResistance;
  }
  const switchClosed = urlValue(raw, 'switchClosed');
  if (switchClosed !== null) next.switchClosed = asBool(switchClosed, true);
  const systematicError = urlValue(raw, 'systematicError');
  if (systematicError !== null)
    next.systematicError = asBool(systematicError, false);
  const autoRun = urlValue(raw, 'autoRun');
  if (autoRun !== null) next.autoRun = asBool(autoRun, true);
  return next;
}

const initialParams = paramsFromUrl(readSceneParams(emfInternalMeta));

function syncSwitchButton(mount: HTMLElement, closed: boolean): void {
  const btn = mount.querySelector('[data-control-key="toggleSwitch"]');
  if (!(btn instanceof HTMLElement)) return;
  const label = btn.querySelector('span');
  if (label) label.textContent = closed ? '开关 · 闭合' : '开关 · 断开';
  btn.setAttribute('aria-pressed', String(closed));
}

function syncSelect(
  mount: HTMLElement,
  key: string,
  value: string | number | boolean
): void {
  if (key !== 'sourceVoltage' && key !== 'internalResistance') return;
  const select = mount.querySelector(`[data-control-key="${key}"] select`);
  if (select instanceof HTMLSelectElement) select.value = String(value);
}

function syncControls(
  renderer: ReturnType<typeof renderSchema>,
  params: EmfInternalParams,
  mount: HTMLElement
): void {
  renderer.setValueSilently('sourceVoltage', String(params.sourceVoltage));
  renderer.setActiveSilently('sourceVoltage', String(params.sourceVoltage));
  syncSelect(mount, 'sourceVoltage', params.sourceVoltage);
  renderer.setValueSilently(
    'internalResistance',
    String(params.internalResistance)
  );
  renderer.setActiveSilently(
    'internalResistance',
    String(params.internalResistance)
  );
  syncSelect(mount, 'internalResistance', params.internalResistance);
  renderer.setValueSilently('rheostatResistance', params.rheostatResistance);
  renderer.setValueSilently('systematicError', params.systematicError);
  renderer.setValueSilently('autoRun', params.autoRun);
  renderer.setValueSilently('switchClosed', params.switchClosed);
  syncSwitchButton(mount, params.switchClosed);
}

bootScenePage({
  meta: emfInternalMeta,
  autoPlay: initialParams.autoRun !== false,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 460,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 260,
    graphMinHeight: 180,
    graphMaxHeight: 320,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('emf-internal-resistance requires a canvas');
    const scene = createEmfInternalScene({
      canvas,
      theme,
      mode,
      demoHints,
      initialParams
    });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    const originalReset = scene.reset.bind(scene);
    return {
      ...scene,
      step(dt: number): void {
        scene.step(dt);
        scheduler.schedule();
      },
      dispose(): void {
        scheduler.dispose();
        dispose();
      },
      reset(): void {
        originalReset();
        writeOwnedSceneParams(
          sceneWriter,
          restoredUrlParams(scene.getParams())
        );
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const emfScene = scene as ReturnType<typeof createEmfInternalScene>;
    const render = scheduleRender ?? (() => emfScene.render());
    let syncingControls = false;
    const renderer = renderSchema({
      mount,
      schema: emfInternalControlsSchema,
      onChange: (key, value) => {
        if (syncingControls) return;
        if (key === 'sourceVoltage') {
          const sourceVoltage = asSourceVoltage(value) ?? 1.5;
          emfScene.setParams({ sourceVoltage });
          renderer.setValue(key, String(sourceVoltage));
          renderer.setActive(key, String(sourceVoltage));
          writeParam?.(key, sourceVoltage);
        } else if (key === 'internalResistance') {
          const internalResistance = asInternalResistance(value) ?? 0.5;
          emfScene.setParams({ internalResistance });
          renderer.setValue(key, String(internalResistance));
          renderer.setActive(key, String(internalResistance));
          writeParam?.(key, internalResistance);
        } else if (key === 'rheostatResistance') {
          emfScene.setParams({ rheostatResistance: Number(value) });
          writeParam?.(key, value);
        } else if (
          key === 'systematicError' ||
          key === 'autoRun' ||
          key === 'switchClosed'
        ) {
          const on = asBool(value, false);
          emfScene.setParams({
            [key]: on
          } as Partial<EmfInternalParams>);
          renderer.setValue(key, on);
          if (key === 'switchClosed') syncSwitchButton(mount, on);
          writeParam?.(key, on ? 1 : 0);
        }
        render();
      },
      onAction: (key) => {
        if (key === 'toggleSwitch') {
          const closed = emfScene.toggleSwitch();
          writeParam?.('switchClosed', closed ? 1 : 0);
          syncSwitchButton(mount, closed);
        } else if (key === 'record') {
          emfScene.recordPoint();
        } else if (key === 'fit') {
          emfScene.fitRecords();
        } else if (key === 'clear') {
          emfScene.clearRecords();
        }
        render();
      }
    });
    const syncFromScene = () => {
      syncingControls = true;
      try {
        syncControls(renderer, emfScene.getParams(), mount);
      } finally {
        syncingControls = false;
      }
    };
    syncFromScene();
    return {
      ...exposeSchemaHandle(renderer),
      setValue: (key: string, value: number | string | boolean) => {
        renderer.setValue(key, value);
        syncSelect(mount, key, value);
      },
      setActive: (key: string, value: string) => {
        renderer.setActive(key, value);
        syncSelect(mount, key, value);
      },
      syncFromScene
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'sourceVoltage') {
        const sourceVoltage = asSourceVoltage(value);
        if (sourceVoltage === undefined) return false;
        ctx.scene.setParams({ sourceVoltage });
        ctx.setControlValue(key, String(sourceVoltage));
        ctx.setControlActive(key, String(sourceVoltage));
        return true;
      }
      if (key === 'internalResistance') {
        const internalResistance = asInternalResistance(value);
        if (internalResistance === undefined) return false;
        ctx.scene.setParams({ internalResistance });
        ctx.setControlValue(key, String(internalResistance));
        ctx.setControlActive(key, String(internalResistance));
        return true;
      }
      if (key === 'rheostatResistance') {
        const rheostatResistance = Number(value);
        if (!Number.isFinite(rheostatResistance)) return false;
        ctx.scene.setParams({ rheostatResistance });
        ctx.setControlValue(key, rheostatResistance);
        return true;
      }
      if (
        key === 'switchClosed' ||
        key === 'systematicError' ||
        key === 'autoRun'
      ) {
        const on = asBool(value, false);
        ctx.scene.setParams({ [key]: on } as Partial<EmfInternalParams>);
        ctx.setControlValue(key, on);
        return true;
      }
      return false;
    }
  }
});
