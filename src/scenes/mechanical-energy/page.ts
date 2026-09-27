import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams, writeOwnedSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { createControlCard } from '../../ui/components/ControlCard';
import { mechanicalEnergyControlsSchema } from './controls-schema';
import {
  createChromeScheduler,
  createMechanicalEnergyDataPanel,
  findMechanicalEnergyDataHost,
  mountDataPanel,
  syncDataPanelCollapsed
} from './data-panel';
import { asEnvironment, createMechanicalEnergyScene } from './scene.entry';
import { mechanicalEnergyMeta } from './scene.meta';
import {
  asBool,
  restoredUrlParams,
  shouldShowResistance,
  type MechanicalEnergyParams
} from './scene.sim';

const rawInitial = readSceneParams(mechanicalEnergyMeta);
const NUMBER_KEYS = ['resistance', 'mass', 'gravity', 'pointPeriod'] as const;

bootScenePage({
  meta: mechanicalEnergyMeta,
  autoPlay: asBool(rawInitial.autoRun, false),
  preferredLayout:
    typeof window !== 'undefined' && window.innerWidth <= 720
      ? 'mobile-stack'
      : 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 450,
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: true,
    graphHeight: 230,
    graphMinHeight: 160,
    graphMaxHeight: 340,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints, sceneWriter }) => {
    if (!canvas) throw new Error('mechanical-energy requires a canvas');
    const scene = createMechanicalEnergyScene({
      canvas,
      theme,
      mode,
      demoHints
    });
    const scheduler = createRenderScheduler(() => scene.render());
    const dispose = scene.dispose.bind(scene);
    const originalReset = scene.reset.bind(scene);
    const originalStartAll = scene.startAll.bind(scene);
    const originalPauseAll = scene.pauseAll.bind(scene);
    const syncUrl = (): void => {
      writeOwnedSceneParams(sceneWriter, restoredUrlParams(scene.getParams()));
    };
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
        syncUrl();
      },
      startAll(): void {
        originalStartAll();
        syncUrl();
      },
      pauseAll(): void {
        originalPauseAll();
        syncUrl();
      }
    };
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const energyScene = scene as ReturnType<typeof createMechanicalEnergyScene>;
    let applying = false;
    let last = energyScene.getParams();

    const renderer = renderSchema({
      mount,
      schema: mechanicalEnergyControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'environment') {
          const environment = asEnvironment(value) ?? 'resist';
          energyScene.setParams({ environment });
          renderer.setActive(key, environment);
          renderer.setVisible('resistance', shouldShowResistance(environment));
          writeParam?.(key, environment === 'ideal' ? 0 : 1);
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          energyScene.setParams({
            [key]: Number(value)
          } as Partial<MechanicalEnergyParams>);
          writeParam?.(key, value);
        }
        last = energyScene.getParams();
        render();
      },
      onAction: () => undefined
    });
    renderer.setVisible(
      'resistance',
      shouldShowResistance(energyScene.getParams().environment)
    );

    const panel = createMechanicalEnergyDataPanel();
    panel.update(energyScene.getState());
    let fallback: ReturnType<typeof createControlCard> | null = null;
    let disposed = false;

    function attachPanel(): void {
      if (disposed) return;
      // 作用域限定当前布局根，避免多容器宿主时串线；裸挂（测试）回退 document。
      const host = findMechanicalEnergyDataHost(
        mount.closest('[data-layout-id]') ?? undefined
      );
      if (host) {
        if (fallback) {
          fallback.element.remove();
          fallback = null;
        }
        mountDataPanel(host, panel.element);
        panel.update(energyScene.getState());
        syncDataPanelCollapsed(panel.element);
        return;
      }
      if (!fallback) {
        fallback = createControlCard('计数点', { span: 'full' });
        fallback.element.dataset.span = 'full';
        fallback.body.appendChild(panel.element);
        mount.appendChild(fallback.element);
      }
      panel.update(energyScene.getState());
    }

    attachPanel();
    const unsubscribe = energyScene.subscribe(() => {
      if (disposed) return;
      const p = energyScene.getParams();
      applying = true;
      if (p.environment !== last.environment) {
        renderer.setActive('environment', p.environment);
        renderer.setVisible('resistance', shouldShowResistance(p.environment));
      }
      if (p.resistance !== last.resistance) {
        renderer.setValue('resistance', p.resistance);
      }
      if (p.mass !== last.mass) renderer.setValue('mass', p.mass);
      if (p.gravity !== last.gravity) renderer.setValue('gravity', p.gravity);
      if (p.pointPeriod !== last.pointPeriod) {
        renderer.setValue('pointPeriod', p.pointPeriod);
      }
      applying = false;
      last = p;
      panel.update(energyScene.getState());
      syncDataPanelCollapsed(panel.element);
    });
    const onChrome = () => {
      if (disposed) return;
      attachPanel();
    };
    window.addEventListener('resize', onChrome);
    const chrome = createChromeScheduler(onChrome);
    chrome.start();

    const syncFromScene = (): void => {
      const p = energyScene.getParams();
      renderer.setActiveSilently('environment', p.environment);
      renderer.setVisible('resistance', shouldShowResistance(p.environment));
      renderer.setValueSilently('resistance', p.resistance);
      renderer.setValueSilently('mass', p.mass);
      renderer.setValueSilently('gravity', p.gravity);
      renderer.setValueSilently('pointPeriod', p.pointPeriod);
      last = p;
    };

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene,
      dispose: () => {
        disposed = true;
        unsubscribe();
        chrome.dispose();
        window.removeEventListener('resize', onChrome);
        panel.dispose();
        fallback?.element.remove();
        renderer.dispose();
      }
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'environment') {
        const environment = asEnvironment(value) ?? 'resist';
        ctx.scene.setParams({ environment });
        ctx.setControlActive(key, environment);
        return true;
      }
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const n = Number(value);
        if (!Number.isFinite(n)) return false;
        ctx.scene.setParams({ [key]: n } as Partial<MechanicalEnergyParams>);
        ctx.setControlValue(key, n);
        return true;
      }
      if (key === 'autoRun') {
        ctx.scene.setParams({ autoRun: asBool(value, false) });
        return true;
      }
      return false;
    }
  }
});
