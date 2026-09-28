import {
  formatFixed,
  projectileComponentsConstants as C,
  type ProjectileComponentsState
} from './scene.sim';
import {
  GRAPH_SECTION_ATTR,
  LAB_DATA_SLOT_ATTR,
  READOUT_SLOT_ATTR,
  STAGE_FRAME_ATTR
} from '../../platform/stage-chrome';

export type DataPanelHandle = {
  element: HTMLElement;
  update(state: ProjectileComponentsState): void;
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
  node.style.padding = '0.2rem 0.4rem';
  node.style.borderBottom = '1px solid var(--border-color)';
  node.style.whiteSpace = 'nowrap';
  node.style.fontVariantNumeric = 'tabular-nums';
  return node;
}

export function createProjectileDataPanel(): DataPanelHandle {
  const root = document.createElement('section');
  root.setAttribute('aria-label', '频闪采样');
  root.style.cssText =
    'display:flex;flex-direction:column;min-height:0;height:100%;padding:0.35rem 0.5rem 0.5rem;box-sizing:border-box;color:var(--text-primary);';

  const wrap = document.createElement('div');
  wrap.style.cssText = 'overflow:auto;min-height:0;flex:1;';
  wrap.tabIndex = 0;
  wrap.setAttribute('role', 'region');
  wrap.setAttribute('aria-label', '频闪采样滚动区');
  const table = document.createElement('table');
  table.setAttribute('aria-label', '频闪采样记录');
  table.style.cssText =
    'width:100%;border-collapse:collapse;font-size:0.78rem;color:var(--text-primary);';
  const caption = document.createElement('caption');
  caption.textContent = '频闪采样';
  caption.style.captionSide = 'top';
  caption.style.textAlign = 'left';
  caption.style.fontWeight = '700';
  caption.style.padding = '0.2rem 0.4rem 0.35rem';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const title of ['t (s)', 'x (m)', 'y (m)', 'vᵧ (m/s)']) {
    headRow.appendChild(
      cell('th', title, title === 't (s)' ? 'left' : 'right')
    );
  }
  thead.appendChild(headRow);
  const tbody = document.createElement('tbody');
  table.append(caption, thead, tbody);
  wrap.appendChild(table);
  root.appendChild(wrap);

  let lastKey = '';

  function update(state: ProjectileComponentsState): void {
    const key = `${formatFixed(state.time, 2)}|${state.points
      .map((point) => `${point.time}:${point.x}:${point.verticalDisplacement}`)
      .join('|')}`;
    if (key === lastKey) return;
    lastKey = key;
    tbody.replaceChildren();
    for (const point of state.points) {
      const row = document.createElement('tr');
      const active = Math.abs(point.time - state.time) < 1e-3;
      if (active) {
        row.style.background =
          'color-mix(in srgb, var(--accent-color) 14%, transparent)';
      }
      row.append(
        cell('td', formatFixed(point.time, 2), 'left'),
        cell('td', formatFixed(point.x)),
        cell('td', formatFixed(point.verticalDisplacement)),
        cell('td', formatFixed(point.vy))
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

export function findProjectileDataHost(scope?: ParentNode): HTMLElement | null {
  const root = scope ?? document;
  const lab = root.querySelector(`[${LAB_DATA_SLOT_ATTR}]`);
  if (lab instanceof HTMLElement) return lab;
  // mobile / split 读数挂载点由 readout 能力创建点打标
  const readout = root.querySelector(`[${READOUT_SLOT_ATTR}]`);
  if (readout instanceof HTMLElement) return readout;
  return null;
}

const LAB_INLINE_TITLE_SELECTOR =
  '.readout-inline-title, .mobile-readout-inline-title, .teaching-readout-inline-title';

/** Lab-stage already titles `.lab-float-data`; drop the nested ReadoutPanel heading. */
export function suppressLabFloatInlineReadoutTitle(
  root: ParentNode = document
): void {
  const slot = root.querySelector(`[${LAB_DATA_SLOT_ATTR}]`);
  const lab = slot?.parentElement ?? slot;
  if (!(lab instanceof HTMLElement)) return;
  for (const node of lab.querySelectorAll(LAB_INLINE_TITLE_SELECTOR)) {
    node.remove();
  }
}

export function hideLabGraphFloat(): void {
  const graph = document.querySelector(`[${GRAPH_SECTION_ATTR}]`);
  if (!(graph instanceof HTMLElement)) return;
  graph.hidden = true;
  graph.style.display = 'none';
  graph.setAttribute('aria-hidden', 'true');
}

export function placeLabDataFloat(): void {
  const slot = document.querySelector(`[${LAB_DATA_SLOT_ATTR}]`);
  const panel = slot?.parentElement;
  const canvas = document.querySelector(`[${STAGE_FRAME_ATTR}] canvas`);
  const layout =
    canvas?.closest('.layout-master') ?? panel?.closest('.layout-master');
  if (
    !(layout instanceof HTMLElement) ||
    !(panel instanceof HTMLElement) ||
    !(canvas instanceof HTMLElement)
  ) {
    return;
  }
  if (window.innerWidth <= 720) {
    panel.style.left = '';
    panel.style.top = '';
    panel.style.right = '';
    panel.style.bottom = '';
    panel.style.width = '';
    panel.style.height = '';
    return;
  }
  const lr = layout.getBoundingClientRect();
  const cr = canvas.getBoundingClientRect();
  const fieldRatio = C.fieldWidth / C.baseWidth;
  const left = cr.left - lr.left + cr.width * fieldRatio + 8;
  const top = cr.top - lr.top + 8;
  const width = cr.right - lr.left - left - 8;
  const height = cr.bottom - lr.top - top - 8;
  if (width < 200 || height < 120) return;
  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.width = `${width}px`;
  panel.style.height = `${height}px`;
  panel.style.maxHeight = 'none';
}
