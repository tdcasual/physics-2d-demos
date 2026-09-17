import { bootScenePage } from '../../app/scene-bootstrapper';
import { createRenderScheduler } from '../../app/render-scheduler';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { internalEnergyControlsSchema } from './controls-schema';
import { createInternalEnergyScene } from './scene.entry';
import { internalEnergyMeta } from './scene.meta';
import {
  asBool,
  asMode,
  overlayControlKeySet,
  overlayControlKeys,
  restoredUrlParams,
  shouldShowExpand,
  shouldShowHeat,
  shouldShowRatio,
  type InternalEnergyParams
} from './scene.sim';

const rawInitial = readSceneParams(internalEnergyMeta);
const NUMBER_KEYS = [
  'ratio',
  'dewPoint',
  'tHot',
  'tCold',
  'cHot',
  'cCold'
] as const;

function ensureCompactReadoutStyle(): void {
  if (document.getElementById('internal-energy-readout-compact')) return;
  const style = document.createElement('style');
  style.id = 'internal-energy-readout-compact';
  style.textContent = `
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      ) {
      min-width: 24rem;
      max-width: 26rem;
      max-height: calc(100% - 1.25rem);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      )
      :is(.srgb-readout-slot, .teaching-readout-slot) {
      max-height: none;
      overflow: visible;
      flex: 0 1 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      )
      :is(.srgb-readout-item, .teaching-readout-item)
      :is(
        .srgb-readout-label,
        .teaching-readout-label,
        .srgb-readout-value,
        .teaching-readout-value
      ) {
      white-space: nowrap;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      )
      :is(.srgb-readout-item, .teaching-readout-item) {
      white-space: nowrap;
      overflow: hidden;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      )
      :is(.srgb-readout-label, .teaching-readout-label) {
      font-size: 0.95rem;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      )
      :is(.srgb-readout-value, .teaching-readout-value) {
      font-size: 1.05rem;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel) .demo-chip-slot {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
      overscroll-behavior: contain;
      padding: 0.35rem 0.5rem 0.55rem;
    }
    :is(.srgb-readout-panel, .teaching-readout-panel):is(
        .srgb-is-overlay,
        .teaching-is-overlay
      )
      .readout-resize-handle {
      display: none;
    }
  `;
  document.head.appendChild(style);
}

function decorateChipSlot(): HTMLElement | null {
  const slot = document.querySelector('.demo-chip-slot');
  if (!(slot instanceof HTMLElement)) return null;
  slot.setAttribute('tabindex', '0');
  slot.setAttribute('role', 'region');
  slot.setAttribute('aria-label', '演示控件');
  return slot;
}

function applyChipVisibility(mode: InternalEnergyParams['mode']): void {
  const allowed = new Set(overlayControlKeys(mode));
  const slot = decorateChipSlot();
  const roots: ParentNode[] = [document];
  if (slot) roots.push(slot);
  for (const key of overlayControlKeySet) {
    const show = allowed.has(key);
    for (const root of roots) {
      root.querySelectorAll(`[data-control-key="${key}"]`).forEach((node) => {
        if (node instanceof HTMLElement) {
          node.style.display = show ? '' : 'none';
        }
      });
    }
  }
}

function applyVisibility(
  renderer: ReturnType<typeof renderSchema>,
  mode: InternalEnergyParams['mode']
): void {
  renderer.setVisible('气体', shouldShowRatio(mode));
  renderer.setVisible('热容', shouldShowHeat(mode));
  renderer.setVisible('ratio', shouldShowRatio(mode));
  renderer.setVisible('dewPoint', shouldShowExpand(mode));
  renderer.setVisible('wet', shouldShowExpand(mode));
  renderer.setVisible('tHot', shouldShowHeat(mode));
  renderer.setVisible('tCold', shouldShowHeat(mode));
  renderer.setVisible('cHot', shouldShowHeat(mode));
  renderer.setVisible('cCold', shouldShowHeat(mode));
  applyChipVisibility(mode);
}

bootScenePage({
  meta: internalEnergyMeta,
  demoProfile: internalEnergyMeta.demoProfile,
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
    graphHeight: 240,
    graphMinHeight: 170,
    graphMaxHeight: 360,
    graphColumns: 1
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    if (!canvas) throw new Error('internal-energy requires a canvas');
    const scene = createInternalEnergyScene({
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
      writeSceneParams(
        restoredUrlParams(
          scene.getParams(),
          scene.getTransportState().isPlaying
        )
      );
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
    ensureCompactReadoutStyle();
    const render = scheduleRender ?? (() => scene.render());
    const energyScene = scene as ReturnType<typeof createInternalEnergyScene>;
    let applying = false;

    const renderer = renderSchema({
      mount,
      schema: internalEnergyControlsSchema,
      onChange: (key, value) => {
        if (applying) return;
        if (key === 'mode') {
          const nextMode = asMode(value);
          energyScene.setParams({ mode: nextMode });
          renderer.setActive(key, nextMode);
          applyVisibility(renderer, nextMode);
          writeParam?.(
            key,
            nextMode === 'expand' ? 1 : nextMode === 'heat' ? 2 : 0
          );
        } else if (key === 'wet') {
          energyScene.setParams({ wet: Boolean(value) });
          writeParam?.(key, value ? 1 : 0);
        } else if ((NUMBER_KEYS as readonly string[]).includes(key)) {
          energyScene.setParams({
            [key]: Number(value)
          } as Partial<InternalEnergyParams>);
          writeParam?.(key, value);
        }
        render();
      },
      onAction: () => undefined
    });
    applyVisibility(renderer, energyScene.getParams().mode);
    const syncOverlay = () => {
      applyVisibility(renderer, energyScene.getParams().mode);
    };
    const onLayoutMode = () => {
      syncOverlay();
      requestAnimationFrame(syncOverlay);
      window.setTimeout(syncOverlay, 0);
    };
    document.addEventListener('layout:modechange', onLayoutMode);

    return {
      setValue: (key: string, value: number | string | boolean) => {
        applying = true;
        renderer.setValue(key, value);
        applying = false;
      },
      setActive: (key: string, value: string) => {
        applying = true;
        renderer.setActive(key, value);
        if (key === 'mode') applyVisibility(renderer, asMode(value));
        applying = false;
      },
      refresh: () => {
        applying = true;
        const params = energyScene.getParams();
        renderer.setActive('mode', params.mode);
        renderer.setValue('ratio', params.ratio);
        renderer.setValue('dewPoint', params.dewPoint);
        renderer.setValue('wet', params.wet);
        renderer.setValue('tHot', params.tHot);
        renderer.setValue('tCold', params.tCold);
        renderer.setValue('cHot', params.cHot);
        renderer.setValue('cCold', params.cCold);
        applyVisibility(renderer, params.mode);
        applying = false;
      },
      dispose: () => {
        document.removeEventListener('layout:modechange', onLayoutMode);
        renderer.dispose();
      }
    };
  },
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'mode') {
        const nextMode = asMode(value);
        ctx.scene.setParams({
          mode: nextMode
        } as Partial<InternalEnergyParams>);
        ctx.setControlActive?.('mode', nextMode);
        ctx.setControlValue(key, nextMode);
        return true;
      }
      if (key === 'wet') {
        const wet = asBool(value, true);
        ctx.scene.setParams({ wet } as Partial<InternalEnergyParams>);
        ctx.setControlValue(key, wet);
        return true;
      }
      if (key === 'autoRun') return true;
      const n = Number(value);
      if (!Number.isFinite(n)) return false;
      ctx.scene.setParams({ [key]: n } as Partial<InternalEnergyParams>);
      ctx.setControlValue(key, n);
      return true;
    }
  }
});
