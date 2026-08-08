import { bootScenePage } from '../../app/scene-bootstrapper';
import { createGansheScene } from './scene.entry';
import { gansheMeta } from './scene.meta';
import { gansheControlsSchema } from './controls-schema';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { createSliderRow } from '../../ui/components/scene-controls/slider-row';
import { createControlCard } from '../../ui/components/ControlCard';
import { createParamMapper, createPresetApplier } from '../page-utils';
import type { WaveParams } from './scene.sim';
import { getObserverColor } from './scene.view';

const paramMapping: Record<string, string> = {
  freq1: 'freq1',
  freq2: 'freq2',
  amp1: 'amp1',
  amp2: 'amp2',
  phaseDiff: 'phaseDiff',
  observerX: 'observerX'
};

const presets: Record<string, Partial<WaveParams>> = {
  constructive: {
    isPulseMode: false,
    freq1: 4,
    freq2: 4,
    phaseDiff: 0,
    amp1: 5,
    amp2: 5
  },
  destructive: {
    isPulseMode: false,
    freq1: 4,
    freq2: 4,
    phaseDiff: 180,
    amp1: 5,
    amp2: 5
  },
  beat: {
    isPulseMode: false,
    freq1: 4,
    freq2: 5,
    phaseDiff: 0,
    amp1: 5,
    amp2: 5
  },
  standing: {
    isPulseMode: false,
    freq1: 4,
    freq2: 4,
    phaseDiff: 0,
    amp1: 5,
    amp2: 5,
    mode: 'head-on',
    observerX: 15
  },
  pulse: {
    isPulseMode: true,
    freq1: 3,
    freq2: 5,
    phaseDiff: 0,
    amp1: 8,
    amp2: 5,
    mode: 'head-on',
    observerX: 15
  }
};

/**
 * 创建实体参数控制卡片
 *
 * 设计原则：按逻辑实体分组，不按参数类型分组。
 * 内部自适应布局：≥2 个滑块时两列并排，单滑块占满整行。
 * 当未来有其他"多实体控制"场景时，遵循同样的实体-卡片映射。
 */
function createWaveSourceCard(
  title: string,
  accentColor: string,
  sliders: Array<{
    key: string;
    label: string;
    min: number;
    max: number;
    step: number;
    value: number;
    unit: string;
  }>,
  onChange: (key: string, value: number) => void
): { element: HTMLElement; setValue: (key: string, value: number) => void } {
  const card = createControlCard(title, {
    defaultCollapsed: false,
    span: 'full'
  });
  const body = card.body;
  body.style.display = 'grid';
  body.style.gridTemplateColumns = sliders.length >= 2 ? '1fr 1fr' : '1fr';
  body.style.gap = '4px';

  const valueSetters = new Map<string, (value: number) => void>();

  for (const s of sliders) {
    const row = createSliderRow(s.label, {
      min: s.min,
      max: s.max,
      step: s.step,
      value: s.value,
      unit: s.unit,
      onChange: (val) => onChange(s.key, val)
    });
    const input = row.querySelector('input');
    if (input) {
      input.style.accentColor = accentColor;
      valueSetters.set(s.key, (v) => {
        input.value = String(v);
        input.dispatchEvent(new Event('input'));
      });
    }
    body.appendChild(row);
  }

  return {
    element: card.element,
    setValue(key: string, value: number) {
      valueSetters.get(key)?.(value);
    }
  };
}

/** 创建观察点管理卡片 */
function createObserverManager(
  scene: ReturnType<typeof createGansheScene>,
  onChange: () => void
): { element: HTMLElement; refresh: () => void } {
  const card = createControlCard('观察点管理', { defaultCollapsed: false });
  const body = card.body;

  const listEl = document.createElement('div');
  listEl.style.display = 'flex';
  listEl.style.flexDirection = 'column';
  listEl.style.gap = '4px';
  body.appendChild(listEl);

  let refreshAbort: AbortController | null = null;

  function refresh(): void {
    refreshAbort?.abort();
    refreshAbort = new AbortController();
    const signal = refreshAbort.signal;
    listEl.innerHTML = '';
    const params = scene.getParams();
    const count = 1 + params.observers.length;

    // Primary observer (non-removable)
    const primary = document.createElement('div');
    primary.style.display = 'flex';
    primary.style.alignItems = 'center';
    primary.style.justifyContent = 'space-between';
    primary.style.padding = '4px 6px';
    primary.style.borderRadius = '4px';
    primary.style.background = 'var(--color-bg-secondary, rgba(0,0,0,0.03))';
    primary.innerHTML = `
      <span style="font-size:0.8rem;color:var(--text-primary)"><span style="color:${getObserverColor(0)};">●</span> 观察点1 x=${params.observerX.toFixed(2)}m</span>
      <span style="font-size:0.7rem;color:var(--color-text-muted)">主观察点</span>
    `;
    listEl.appendChild(primary);

    // Additional observers
    params.observers.forEach((x, i) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '4px 6px';
      row.style.borderRadius = '4px';
      row.style.background = 'var(--color-bg-secondary, rgba(0,0,0,0.03))';

      const color = getObserverColor(i + 1);
      const label = document.createElement('span');
      label.style.fontSize = '0.8rem';
      label.innerHTML = `<span style="color:${color};">●</span> 观察点${i + 2} x=${x.toFixed(2)}m`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '删除';
      removeBtn.style.fontSize = '0.7rem';
      removeBtn.style.padding = '2px 6px';
      removeBtn.style.border = '1px solid var(--color-border-color)';
      removeBtn.style.borderRadius = '4px';
      removeBtn.style.background = 'var(--color-btn-bg)';
      removeBtn.style.cursor = 'pointer';
      removeBtn.addEventListener(
        'click',
        () => {
          scene.removeObserver(i);
          refresh();
          onChange();
        },
        { signal }
      );

      row.appendChild(label);
      row.appendChild(removeBtn);
      listEl.appendChild(row);
    });

    // Add button
    const addRow = document.createElement('div');
    addRow.style.display = 'flex';
    addRow.style.gap = '6px';
    addRow.style.marginTop = '4px';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+ 添加观察点';
    addBtn.style.flex = '1';
    addBtn.style.padding = '6px';
    addBtn.style.border = '1px dashed var(--color-border-color)';
    addBtn.style.borderRadius = '4px';
    addBtn.style.background = 'transparent';
    addBtn.style.color = 'var(--color-text-secondary)';
    addBtn.style.fontSize = '0.8rem';
    addBtn.style.cursor = 'pointer';
    addBtn.disabled = count >= 6;
    addBtn.style.opacity = count >= 6 ? '0.5' : '1';

    addBtn.addEventListener(
      'click',
      () => {
        if (count >= 6) return;
        const newX = Math.round((Math.random() * 20 + 5) * 10) / 10;
        scene.addObserver(newX);
        refresh();
        onChange();
      },
      { signal }
    );

    addRow.appendChild(addBtn);
    listEl.appendChild(addRow);
  }

  refresh();
  return { element: card.element, refresh };
}

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
  createControls: ({ mount, scene }) => {
    const applyParam = createParamMapper<WaveParams>(paramMapping, (params) => {
      scene.setParams(params);
    });

    const applyPreset = createPresetApplier<WaveParams>(
      presets,
      (params) => {
        scene.setParams(params);
        scene.reset?.();
        scene.render();
      },
      () => {
        scene.reset?.();
        scene.render();
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
          scene.render();
          renderer.setActive(key, modeValue);
        } else {
          applyParam(key, value);
          scene.render();
        }
      },
      onAction: () => {
        // No action buttons in this schema
      }
    });

    // Observer manager card (narrow — can share rows)
    const observerManager = createObserverManager(
      scene as ReturnType<typeof createGansheScene>,
      () => {
        scene.render();
      }
    );

    // Wave source cards: one per logical entity, vertically stacked
    // Design: entity-grouped, not parameter-type-grouped
    const initialParams = scene.getParams();
    const sourceACard = createWaveSourceCard(
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
        scene.render();
      }
    );

    const sourceBCard = createWaveSourceCard(
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
        scene.render();
      }
    );

    const phaseCard = createWaveSourceCard(
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
        scene.render();
      }
    );

    // Narrow cards first, full-width cards last
    mount.appendChild(observerManager.element);
    mount.appendChild(sourceACard.element);
    mount.appendChild(sourceBCard.element);
    mount.appendChild(phaseCard.element);

    const sourceCards = [sourceACard, sourceBCard, phaseCard];

    return {
      setParam(key: string, value: number) {
        if (paramMapping[key]) {
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
