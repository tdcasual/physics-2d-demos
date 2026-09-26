import { bootScenePage } from '../../app/scene-bootstrapper';
import { createGansheScene } from './scene.entry';
import { gansheMeta } from './scene.meta';
import { gansheControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createParamMapper, createPresetApplier } from '../page-utils';
import type { WaveParams } from './scene.sim';
import { gansheParamMapping, ganshePresets } from './presets';
import {
  createWaveSourceCard,
  createObserverManager,
  type GansheControlsUiDeps
} from './controls';
import { createControlCard } from '../../ui/components/ControlCard';
import { createSliderRow } from '../../ui/components/scene-controls/slider-row';

// ui 工厂注入：场景非 page 模块不得依赖 ui 层（debt-ledger A2）。
const controlsUi: GansheControlsUiDeps = { createControlCard, createSliderRow };

bootScenePage({
  meta: gansheMeta,
  preferredLayout: 'split-right-graph-bottom',
  layoutConfig: {
    defaultLeftRatio: 0.32,
    leftMinWidth: 300,
    leftMaxWidth: 960,
    graphHeight: 220,
    graphMinHeight: 140,
    graphMaxHeight: 400,
    graphColumns: 3,
    controlColumns: 'auto',
    readoutCollapsed: false,
    readoutLabel: '干涉分析'
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createGansheScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({ mount, scene, scheduleRender = () => scene.render() }) => {
    const applyParam = createParamMapper<WaveParams>(
      gansheParamMapping,
      (params) => {
        scene.setParams(params);
      }
    );

    const applyPreset = createPresetApplier<WaveParams>(
      ganshePresets,
      (params) => {
        scene.setParams(params);
        scene.reset?.();
        scheduleRender();
      },
      () => {
        scene.reset?.();
        scheduleRender();
      }
    );

    // Create schema controls first
    const renderer = renderSchema({
      mount,
      schema: gansheControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          if (applyPreset(String(value))) {
            renderer.setActive(key, String(value));
          }
        } else if (key === 'mode') {
          const modeValue = String(value) as 'head-on' | 'single';
          scene.setParams({ mode: modeValue });
          scene.reset?.();
          scheduleRender();
          renderer.setActive(key, modeValue);
        } else {
          applyParam(key, value);
          scheduleRender();
        }
      },
      onAction: () => {
        // No action buttons in this schema
      }
    });

    // Observer manager card (narrow — can share rows)
    const observerManager = createObserverManager(
      controlsUi,
      scene as ReturnType<typeof createGansheScene>,
      () => {
        scheduleRender();
      }
    );

    // Wave source cards: one per logical entity, vertically stacked
    // Design: entity-grouped, not parameter-type-grouped
    const initialParams = scene.getParams();
    const sourceACard = createWaveSourceCard(
      controlsUi,
      '波源 A (左)',
      '#3b82f6',
      [
        {
          key: 'freq1',
          label: 'f₁ 频率',
          min: 0.5,
          max: 10,
          step: 0.5,
          value: initialParams.freq1,
          unit: 'Hz'
        },
        {
          key: 'amp1',
          label: 'A₁ 振幅',
          min: 0.5,
          max: 10,
          step: 0.5,
          value: initialParams.amp1,
          unit: 'cm'
        }
      ],
      (key, value) => {
        applyParam(key, value);
        scheduleRender();
      }
    );

    const sourceBCard = createWaveSourceCard(
      controlsUi,
      '波源 B (右)',
      '#ef4444',
      [
        {
          key: 'freq2',
          label: 'f₂ 频率',
          min: 0.5,
          max: 10,
          step: 0.5,
          value: initialParams.freq2,
          unit: 'Hz'
        },
        {
          key: 'amp2',
          label: 'A₂ 振幅',
          min: 0.5,
          max: 10,
          step: 0.5,
          value: initialParams.amp2,
          unit: 'cm'
        }
      ],
      (key, value) => {
        applyParam(key, value);
        scheduleRender();
      }
    );

    const phaseCard = createWaveSourceCard(
      controlsUi,
      '相位差',
      '#8b5cf6',
      [
        {
          key: 'phaseDiff',
          label: 'Δφ',
          min: 0,
          max: 360,
          step: 5,
          value: initialParams.phaseDiff,
          unit: '°'
        }
      ],
      (key, value) => {
        applyParam(key, value);
        scheduleRender();
      }
    );

    // Narrow cards first, full-width cards last
    mount.appendChild(observerManager.element);
    mount.appendChild(sourceACard.element);
    mount.appendChild(sourceBCard.element);
    mount.appendChild(phaseCard.element);

    const sourceCards = [sourceACard, sourceBCard, phaseCard];

    return {
      setValue(key: string, value: number | string | boolean) {
        if (key === 'preset' || key === 'mode') {
          renderer.setActive(key, String(value));
          return;
        }
        if (gansheParamMapping[key]) {
          const num = typeof value === 'number' ? value : Number(value);
          if (Number.isFinite(num)) {
            for (const card of sourceCards) card.setValue(key, num);
          }
          return;
        }
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      setParam(key: string, value: number) {
        if (gansheParamMapping[key]) {
          for (const card of sourceCards) card.setValue(key, value);
        } else {
          renderer.setValue(key, value);
        }
      },
      updatePreset(preset: string) {
        renderer.setActive('preset', preset);
      },
      refreshObservers: observerManager.refresh,
      dispose() {
        renderer.dispose();
        observerManager.element.remove();
        for (const card of sourceCards) card.element.remove();
      }
    };
  }
});
