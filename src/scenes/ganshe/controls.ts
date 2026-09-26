/**
 * ganshe 场景的 imperative 控制面板卡片工厂
 *（与 controls-schema.ts 声明式面板并用。场景非 page 模块不得依赖 ui 层：
 * ui 工厂由 page.ts 注入（结构类型），本文件保持零 ui 导入——debt-ledger A2）
 */
import type { createGansheScene } from './scene.entry';
import { getObserverColor } from './scene.view';

/** page.ts 注入的 ui 工厂（结构类型，避免场景层依赖 ui 模块）。 */
export interface GansheControlsUiDeps {
  createControlCard: (
    title: string,
    options?: { defaultCollapsed?: boolean; span?: 'full' }
  ) => { body: HTMLElement; element: HTMLElement };
  createSliderRow: (
    label: string,
    options: {
      min: number;
      max: number;
      step: number;
      value: number;
      unit?: string;
      onChange?: (value: number) => void;
    }
  ) => HTMLElement;
}

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
  ui: GansheControlsUiDeps,
  title: string,
  accentColor: string,
  sliders: WaveSourceSliderSpec[],
  onChange: (key: string, value: number) => void
): WaveSourceCard {
  const { createControlCard, createSliderRow } = ui;
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
      onChange: (val: number) => onChange(s.key, val)
    });
    row.dataset.controlKey = s.key;
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

  card.element.dataset.controlKey = sliders[0]?.key ?? title;

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
  ui: GansheControlsUiDeps,
  scene: ReturnType<typeof createGansheScene>,
  onChange: () => void
): ObserverManagerCard {
  const { createControlCard } = ui;
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
    primary.style.background = 'var(--bg-secondary, rgba(0,0,0,0.03))';
    primary.innerHTML = `
      <span style="font-size:0.8rem;color:var(--text-primary)"><span style="color:${getObserverColor(0)};">●</span> 观察点1 x=${params.observerX.toFixed(2)}m</span>
      <span style="font-size:0.7rem;color:var(--text-muted)">主观察点</span>
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
      row.style.background = 'var(--bg-secondary, rgba(0,0,0,0.03))';

      const color = getObserverColor(i + 1);
      const label = document.createElement('span');
      label.style.fontSize = '0.8rem';
      label.innerHTML = `<span style="color:${color};">●</span> 观察点${i + 2} x=${x.toFixed(2)}m`;

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '删除';
      removeBtn.style.fontSize = '0.7rem';
      removeBtn.style.padding = '2px 6px';
      removeBtn.style.border = '1px solid var(--border-color)';
      removeBtn.style.borderRadius = '4px';
      removeBtn.style.background = 'var(--btn-bg)';
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
    addBtn.style.border = '1px dashed var(--border-color)';
    addBtn.style.borderRadius = '4px';
    addBtn.style.background = 'transparent';
    addBtn.style.color = 'var(--text-secondary)';
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

  card.element.dataset.controlKey = 'observers';
  refresh();
  return { element: card.element, refresh };
}
