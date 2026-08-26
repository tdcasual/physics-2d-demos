/**
 * ganshe 场景的 imperative 控制面板卡片工厂
 *（与 controls-schema.ts 声明式面板并用；本文件命名 controls.ts 以符合
 * 场景非 page 模块不得依赖 ui 层的架构约束，与 spring-oscillator 同例）
 */
// eslint-disable-next-line no-restricted-imports -- 既有豁免：imperative controls 观察点管理依赖 ui 组件（见 AGENTS.md「已知限制」）
import { createControlCard } from '../../ui/components/ControlCard';
// eslint-disable-next-line no-restricted-imports -- 同上
import { createSliderRow } from '../../ui/components/scene-controls/slider-row';
import type { createGansheScene } from './scene.entry';
import { getObserverColor } from './scene.view';

export interface WaveSourceSliderSpec {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
}

export interface WaveSourceCard {
  element: HTMLElement;
  setValue: (key: string, value: number) => void;
}

/**
 * 创建实体参数控制卡片
 *
 * 设计原则：按逻辑实体分组，不按参数类型分组。
 * 内部自适应布局：≥2 个滑块时两列并排，单滑块占满整行。
 * 当未来有其他"多实体控制"场景时，遵循同样的实体-卡片映射。
 */
export function createWaveSourceCard(
  title: string,
  accentColor: string,
  sliders: WaveSourceSliderSpec[],
  onChange: (key: string, value: number) => void
): WaveSourceCard {
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

export interface ObserverManagerCard {
  element: HTMLElement;
  refresh: () => void;
}

/** 创建观察点管理卡片 */
export function createObserverManager(
  scene: ReturnType<typeof createGansheScene>,
  onChange: () => void
): ObserverManagerCard {
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
