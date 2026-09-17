import {
  formatFixed,
  projectileComponentsConstants as C,
  type ProjectileComponentsState
} from './scene.sim';

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

export function findProjectileDataHost(): HTMLElement | null {
  const lab = document.querySelector('[data-lab-data-slot]');
  if (lab instanceof HTMLElement) return lab;
  // Do not use .mobile-readout-slot: layout slot clear wipes it after createControls.
  const mobilePanel = document.querySelector(
    '.mobile-stack-layout .mobile-readout-panel'
  );
  if (mobilePanel instanceof HTMLElement) return mobilePanel;
  const tab = document.querySelector('#mobile-panel-readout');
  if (tab instanceof HTMLElement) return tab;
  return null;
}

const LAB_INLINE_TITLE_SELECTOR =
  '.readout-inline-title, .mobile-readout-inline-title, .teaching-readout-inline-title';

/** Lab-stage already titles `.lab-float-data`; drop the nested ReadoutPanel heading. */
export function suppressLabFloatInlineReadoutTitle(
  root: ParentNode = document
): void {
  const lab = root.querySelector('.lab-stage-layout .lab-float-data');
  if (!(lab instanceof HTMLElement)) return;
  for (const node of lab.querySelectorAll(LAB_INLINE_TITLE_SELECTOR)) {
    node.remove();
  }
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

export function hideLabGraphFloat(): void {
  const graph = document.querySelector('.lab-stage-layout .lab-float-graph');
  if (!(graph instanceof HTMLElement)) return;
  graph.hidden = true;
  graph.style.display = 'none';
  graph.setAttribute('aria-hidden', 'true');
}

export function placeLabDataFloat(): void {
  const layout = document.querySelector('.lab-stage-layout');
  const panel = layout?.querySelector('.lab-float-data');
  const canvas = layout?.querySelector('canvas');
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
