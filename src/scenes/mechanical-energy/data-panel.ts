import { formatFixed, type MechanicalEnergyState } from './scene.sim';

export type DataPanelHandle = {
  element: HTMLElement;
  update(state: MechanicalEnergyState): void;
  dispose(): void;
};

function cell(
  tag: 'th' | 'td',
  text: string,
  align: 'left' | 'right' = 'right'
): HTMLTableCellElement {
  const node = document.createElement(tag);
  node.textContent = text;
  node.style.textAlign = align;
  node.style.padding = '0.2rem 0.35rem';
  node.style.borderBottom = '1px solid var(--border-color)';
  node.style.whiteSpace = 'nowrap';
  node.style.fontVariantNumeric = 'tabular-nums';
  return node;
}

export function createMechanicalEnergyDataPanel(): DataPanelHandle {
  const root = document.createElement('section');
  root.setAttribute('aria-label', '计数点记录');
  root.style.cssText =
    'display:flex;flex-direction:column;min-height:0;width:100%;padding:0.2rem 0.15rem 0.35rem;box-sizing:border-box;color:var(--text-primary);';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow:auto;min-height:0;flex:1;max-width:100%;';
  const table = document.createElement('table');
  table.setAttribute('aria-label', '计数点记录');
  table.style.cssText =
    'width:100%;border-collapse:collapse;font-size:0.75rem;color:var(--text-primary);';
  const caption = document.createElement('caption');
  caption.textContent = '计数点';
  caption.style.captionSide = 'top';
  caption.style.textAlign = 'left';
  caption.style.fontWeight = '700';
  caption.style.padding = '0.15rem 0.35rem 0.25rem';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const title of ['点', 'h (cm)', 'v (m/s)', 'ΔEₚ (J)', 'ΔEₖ (J)']) {
    headRow.appendChild(cell('th', title, title === '点' ? 'left' : 'right'));
  }
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  table.append(caption, thead, tbody);
  wrap.appendChild(table);
  root.appendChild(wrap);

  let lastKey = '';

  function update(state: MechanicalEnergyState): void {
    const key = state.points
      .map(
        (point) =>
          `${point.label}:${point.height}:${point.speed}:${point.potentialLoss}:${point.kineticGain}`
      )
      .join('|');
    if (key === lastKey) return;
    lastKey = key;
    tbody.replaceChildren();
    for (const point of state.points) {
      const row = document.createElement('tr');
      row.append(
        cell('td', point.label, 'left'),
        cell('td', formatFixed(point.height * 100, 2)),
        cell('td', formatFixed(point.speed, 3)),
        cell('td', formatFixed(point.potentialLoss, 3)),
        cell('td', formatFixed(point.kineticGain, 3))
      );
      tbody.appendChild(row);
    }
  }

  return {
    element: root,
    update,
    dispose() {
      root.remove();
    }
  };
}

export function findMechanicalEnergyDataHost(): HTMLElement | null {
  const lab = document.querySelector('[data-lab-data-slot]');
  if (lab instanceof HTMLElement) return lab;
  // 读数挂载点统一走创建点打标的 [data-readout-slot]：mobile 是 readout
  // 能力的 inline panel（.mobile-readout-panel），split/srgb 是其内部 ul
  const readoutSlot = document.querySelector('[data-readout-slot]');
  if (readoutSlot instanceof HTMLElement) return readoutSlot;
  const tab = document.querySelector('#mobile-panel-readout');
  if (tab instanceof HTMLElement) return tab;
  const overlay = document.querySelector(
    '.srgb-readout-panel, .teaching-readout-panel'
  );
  if (overlay instanceof HTMLElement) return overlay;
  return null;
}

export function mountDataPanel(host: HTMLElement, panel: HTMLElement): void {
  const useItem =
    host.tagName === 'UL' ||
    host.tagName === 'OL' ||
    host.classList.contains('readout-slot') ||
    /readout-slot/.test(host.className);
  if (useItem) {
    let item = panel.closest('li');
    if (!(item instanceof HTMLLIElement)) {
      item = document.createElement('li');
      item.dataset.energyTable = 'true';
      item.style.gridColumn = '1 / -1';
      item.style.listStyle = 'none';
      item.style.padding = '0.15rem 0 0';
      item.appendChild(panel);
    }
    if (item.parentElement !== host) host.appendChild(item);
    return;
  }
  if (panel.parentElement !== host) host.appendChild(panel);
}

export function syncDataPanelCollapsed(panel: HTMLElement): void {
  const host = panel.closest(
    '.srgb-readout-panel, .teaching-readout-panel, .readout-panel'
  );
  if (!(host instanceof HTMLElement)) return;
  if (panel.closest('li[data-energy-table]')) return;
  const collapsed = host.classList.contains('is-collapsed');
  panel.style.display = collapsed ? 'none' : '';
}

export function createChromeScheduler(run: () => void): {
  start(): void;
  dispose(): void;
} {
  let disposed = false;
  let raf1 = 0;
  let raf2 = 0;
  const cancelBoth = (): void => {
    if (raf1) window.cancelAnimationFrame(raf1);
    if (raf2) window.cancelAnimationFrame(raf2);
    raf1 = 0;
    raf2 = 0;
  };
  const guarded = (): void => {
    if (disposed) return;
    run();
  };
  return {
    start() {
      if (disposed) return;
      cancelBoth();
      raf1 = window.requestAnimationFrame(() => {
        raf1 = 0;
        if (disposed) return;
        guarded();
        if (disposed) return;
        raf2 = window.requestAnimationFrame(() => {
          raf2 = 0;
          if (disposed) return;
          guarded();
        });
      });
    },
    dispose() {
      disposed = true;
      cancelBoth();
    }
  };
}
