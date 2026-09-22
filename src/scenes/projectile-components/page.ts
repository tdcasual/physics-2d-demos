import { bootScenePage } from '../../app/scene-bootstrapper';
import { createReadoutPanel } from '../../app/layouts/capabilities/readout-panel';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams } from '../../app/url-sync';
import { createControlCard } from '../../ui/components/ControlCard';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import type { CapabilityInstance, ReadoutItem } from '../../app/layouts/types';
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
    let applying = false;
    function syncSliders(): void {
      const params = scene.getParams();
      applying = true;
      renderer.setValue('speed', params.speed);
      renderer.setValue('initialHeight', params.initialHeight);
      renderer.setValue('gravity', params.gravity);
      renderer.setValue('samplePeriod', params.samplePeriod);
      renderer.setValue('showTrajectory', params.showTrajectory);
      renderer.setValue('showVectors', params.showVectors);
      renderer.setValue('showShadows', params.showShadows);
      renderer.setValue('showStrobe', params.showStrobe);
      applying = false;
    }
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
    let labReadout: CapabilityInstance<ReadoutItem[]> | null = null;
    let disposed = false;
    function ensureLabReadout(): void {
      if (disposed) return;
      // lab 的读数挂载点 = 布局创建点打标的 [data-readout-slot]
      // （.lab-readout-slot）；限定 lab scope 保持本函数 lab-only 语义
      const slot = document.querySelector(
        '.lab-stage-layout [data-readout-slot]'
      );
      if (!(slot instanceof HTMLElement)) return;
      if (!slot.querySelector('.readout-panel')) {
        labReadout?.dispose();
        const host = slot.closest('.layout-master');
        labReadout = createReadoutPanel({
          position: 'inline',
          collapsed: false,
          cssPrefix: 'mobile',
          label: ''
        }).mount({ readout: slot, control: slot, animation: slot }, {}, {
          container: host instanceof HTMLElement ? host : document.body
        } as never);
        const mounted = slot.querySelector('.readout-panel');
        if (mounted instanceof HTMLElement) {
          mounted.style.position = 'static';
          mounted.style.right = 'auto';
          mounted.style.top = 'auto';
          mounted.style.width = '100%';
          mounted.style.maxWidth = 'none';
          mounted.style.zIndex = 'auto';
          mounted.style.boxShadow = 'none';
        }
      }
      suppressLabFloatInlineReadoutTitle();
      const dataSlot = document.querySelector('[data-lab-data-slot]');
      if (
        dataSlot instanceof HTMLElement &&
        dataSlot.nextElementSibling === slot
      ) {
        dataSlot.before(slot);
      }
      labReadout?.update?.(scene.getReadoutItems());
    }
    function attachPanel(): void {
      if (disposed) return;
      const host = findProjectileDataHost();
      if (host) {
        if (fallback) {
          fallback.element.remove();
          fallback = null;
        }
        if (panel.element.parentElement !== host) {
          host.appendChild(panel.element);
        }
        panel.update(scene.getState());
        ensureLabReadout();
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
      labReadout?.update?.(scene.getReadoutItems());
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
      setValue: (key: string, value: number | string | boolean) =>
        renderer.setValue(key, value),
      setActive: (key: string, value: string) => renderer.setActive(key, value),
      refresh: () => syncSliders(),
      dispose: () => {
        disposed = true;
        unsubscribe();
        chrome.dispose();
        window.removeEventListener('resize', onChrome);
        panel.dispose();
        labReadout?.dispose();
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
