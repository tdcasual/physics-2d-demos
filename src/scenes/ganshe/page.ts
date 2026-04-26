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

/** 创建波源参数控制面板（2列紧凑布局） */
function createWaveParamCard(
  initial: WaveParams,
  onChange: (key: string, value: number) => void
): { element: HTMLElement; setValue: (key: string, value: number) => void } {
  const card = createControlCard('波源参数', { defaultCollapsed: false });
  const body = card.body;

  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = '1fr 1fr';
  grid.style.gap = '4px';
  body.appendChild(grid);

  const valueSetters = new Map<string, (value: number) => void>();

  function makeSlider(
    key: string,
    label: string,
    min: number,
    max: number,
    step: number,
    value: number,
    unit: string,
    accentColor?: string
  ): HTMLElement {
    const row = createSliderRow(label, {
      min,
      max,
      step,
      value,
      unit,
      onChange: (val) => onChange(key, val)
    });
    if (accentColor) {
      const input = row.querySelector('input');
      if (input) {
        input.style.accentColor = accentColor;
      }
    }
    const input = row.querySelector('input');
    valueSetters.set(key, (v) => {
      if (input) {
        input.value = String(v);
        input.dispatchEvent(new Event('input'));
      }
    });
    return row;
  }

  // Row 1: freq1 | freq2
  grid.appendChild(
    makeSlider('freq1', 'f₁ 频率', 0.5, 10, 0.5, initial.freq1, 'Hz', '#3b82f6')
  );
  grid.appendChild(
    makeSlider('freq2', 'f₂ 频率', 0.5, 10, 0.5, initial.freq2, 'Hz', '#ef4444')
  );

  // Row 2: amp1 | amp2
  grid.appendChild(
    makeSlider('amp1', 'A₁ 振幅', 0.5, 10, 0.5, initial.amp1, 'cm', '#3b82f6')
  );
  grid.appendChild(
    makeSlider('amp2', 'A₂ 振幅', 0.5, 10, 0.5, initial.amp2, 'cm', '#ef4444')
  );

  // Row 3: phaseDiff (full width)
  const phaseRow = makeSlider('phaseDiff', 'Δφ 相位差', 0, 360, 5, initial.phaseDiff, '°', '#8b5cf6');
  phaseRow.style.gridColumn = '1 / -1';
  grid.appendChild(phaseRow);

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

  function refresh(): void {
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
      <span style="font-size:0.8rem"><span style="color:${getObserverColor(0)};">●</span> 观察点1 x=${params.observerX.toFixed(2)}m</span>
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
      removeBtn.addEventListener('click', () => {
        scene.removeObserver(i);
        refresh();
        onChange();
      });

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

    addBtn.addEventListener('click', () => {
      if (count >= 6) return;
      const newX = Math.round((Math.random() * 20 + 5) * 10) / 10;
      scene.addObserver(newX);
      refresh();
      onChange();
    });

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
    const applyParam = createParamMapper<WaveParams>(
      paramMapping,
      (params) => {
        scene.setParams(params);
      }
    );

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

    // Insert custom wave param card after "观察点" section (before 干涉预设)
    const initialParams = scene.getParams();
    const waveCard = createWaveParamCard(initialParams, (key, value) => {
      applyParam(key, value);
      scene.render();
    });

    // Observer manager card
    const observerManager = createObserverManager(scene as ReturnType<typeof createGansheScene>, () => {
      scene.render();
    });

    // Insert cards before the last card (干涉预设)
    const lastCard = mount.lastElementChild;
    if (lastCard) {
      mount.insertBefore(waveCard.element, lastCard);
      mount.insertBefore(observerManager.element, lastCard);
    } else {
      mount.appendChild(waveCard.element);
      mount.appendChild(observerManager.element);
    }

    return {
      setParam(key: string, value: number) {
        if (paramMapping[key]) {
          waveCard.setValue(key, value);
        } else {
          renderer.setValue(key, value);
        }
      },
      updatePreset(preset: string) {
        renderer.setActive('preset', preset);
      },
      refreshObservers: observerManager.refresh
    };
  }
});
