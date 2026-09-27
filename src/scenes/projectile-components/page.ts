import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams } from '../../app/url-sync';
import { createControlCard } from '../../ui/components/ControlCard';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import { projectileComponentsControlsSchema } from './controls-schema';
import {
  createChromeScheduler,
  createProjectileDataPanel,
  findProjectileDataHost,
  hideLabGraphFloat,
  placeLabDataFloat,
  suppressLabFloatInlineReadoutTitle
} from './data-panel';
import { projectileComponentsMeta } from './scene.meta';
import { createProjectileComponentsScene } from './scene.entry';
import { asBool, type ProjectileComponentsParams } from './scene.sim';

const rawInitial = readSceneParams(projectileComponentsMeta);
const NUMBER_KEYS = [
  'speed',
  'initialHeight',
  'gravity',
  'samplePeriod'
] as const;
const TOGGLE_KEYS = [
  'showTrajectory',
  'showVectors',
  'showShadows',
  'showStrobe'
] as const;

bootScenePage({
  meta: projectileComponentsMeta,
  autoPlay:
    rawInitial.autoRun === undefined ? true : asBool(rawInitial.autoRun, true),
  preferredLayout: window.innerWidth <= 720 ? 'mobile-stack' : 'lab-stage',
  layoutConfig: {
    controlColumns: 'auto',
    readoutCollapsed: true,
    readoutLabel: '数据读数',
    hasGraph: false,
    graphCollapsed: true,
    dataCollapsed: false
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('projectile-components requires a canvas');
    const scene = createProjectileComponentsScene({
      canvas,
      theme,
      mode,
      demoHints
    });
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
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const render = scheduleRender ?? (() => scene.render());
    const applying = false;
    const renderer = renderSchema({
      mount,
      schema: projectileComponentsControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          scene.setParams({
            [key]: Number(value)
          } as Partial<ProjectileComponentsParams>);
        } else if ((TOGGLE_KEYS as readonly string[]).includes(key)) {
          scene.setParams({
            [key]: Boolean(value)
          } as Partial<ProjectileComponentsParams>);
        }
        render();
        writeParam?.(key, value);
      },
      onAction: () => undefined
    });

    const panel = createProjectileDataPanel();
    panel.update(scene.getState());
    let fallback: ReturnType<typeof createControlCard> | null = null;
    let disposed = false;
    function attachPanel(): void {
      if (disposed) return;
      // 作用域限定当前布局根，避免多容器宿主时串线；裸挂（测试）回退 document。
      const host = findProjectileDataHost(
        mount.closest('[data-layout-id]') ?? undefined
      );
      if (host) {
        if (fallback) {
          fallback.element.remove();
          fallback = null;
        }
        if (panel.element.parentElement !== host) {
          host.appendChild(panel.element);
        }
        panel.update(scene.getState());
        // lab 的读数面板由 lab-stage 声明的 readout-panel 能力挂载与更新
        //（orchestrator SCENE_BINDINGS 自动绑定）；场景只抑制浮窗内的
        // 嵌套标题。
        suppressLabFloatInlineReadoutTitle();
        return;
      }
      if (!fallback) {
        fallback = createControlCard('数据读数', { span: 'full' });
        fallback.element.dataset.span = 'full';
        fallback.body.appendChild(panel.element);
        mount.appendChild(fallback.element);
      }
      panel.update(scene.getState());
    }
    attachPanel();
    const unsubscribe = scene.subscribe(() => {
      if (disposed) return;
      panel.update(scene.getState());
    });
    const onChrome = () => {
      if (disposed) return;
      attachPanel();
      placeLabDataFloat();
      hideLabGraphFloat();
      suppressLabFloatInlineReadoutTitle();
    };
    window.addEventListener('resize', onChrome);
    const chrome = createChromeScheduler(onChrome);
    chrome.start();

    return {
      ...exposeSchemaHandle(renderer),
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
      if ((NUMBER_KEYS as readonly string[]).includes(key)) {
        const number = Number(value);
        if (!Number.isFinite(number)) return false;
        ctx.scene.setParams({
          [key]: number
        } as Partial<ProjectileComponentsParams>);
        ctx.setControlValue(key, number);
        return true;
      }
      if (key === 'autoRun') {
        return true;
      }
      if ((TOGGLE_KEYS as readonly string[]).includes(key)) {
        const enabled = asBool(value, true);
        ctx.scene.setParams({
          [key]: enabled
        } as Partial<ProjectileComponentsParams>);
        ctx.setControlValue(key, enabled);
        return true;
      }
      return false;
    }
  }
});
