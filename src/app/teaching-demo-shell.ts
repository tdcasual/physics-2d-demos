import { getTeachingStandards, type TeachingMode } from './teaching-standards';
import { clampSidebarWidth, getDefaultSidebarWidth } from './sidebar-layout';

export type ReadoutItem = {
  label: string;
  value: string;
};

export type TeachingDemoShell = {
  root: HTMLElement;
  controlSlot: HTMLElement;
  readoutSlot: HTMLElement;
  stageSlot: HTMLElement;
  stageCanvas: HTMLCanvasElement;
  modeButton: HTMLButtonElement;
  themeButton: HTMLButtonElement;
  setStatus: (text: string) => void;
  setReadout: (items: ReadoutItem[]) => void;
  setMode: (mode: TeachingMode) => void;
  setTheme: (theme: TeachingTheme) => void;
  getMode: () => TeachingMode;
  getTheme: () => TeachingTheme;
  dispose: () => void;
};

export type TeachingTheme = 'dark' | 'light';

export type CreateTeachingDemoShellOptions = {
  mount: HTMLElement;
  title: string;
  subtitle: string;
  defaultMode?: TeachingMode;
  defaultTheme?: TeachingTheme;
};

function modeToggleLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '切换到标准模式' : '切换到演示模式';
}

function themeToggleLabel(theme: TeachingTheme): string {
  return theme === 'dark' ? '切换到白天主题' : '切换到夜间主题';
}

function applyModeTokens(root: HTMLElement, mode: TeachingMode): void {
  const standards = getTeachingStandards(mode);
  root.dataset.mode = mode;
  root.style.setProperty('--body-font-px', `${standards.bodyFontPx}px`);
  root.style.setProperty('--control-font-px', `${standards.controlFontPx}px`);
  root.style.setProperty('--heading-font-px', `${standards.headingFontPx}px`);
  root.style.setProperty('--stroke-px', `${standards.strokePx}px`);
  root.style.setProperty('--point-radius-px', `${standards.pointRadiusPx}px`);
}

function applyThemeTokens(root: HTMLElement, theme: TeachingTheme): void {
  root.dataset.theme = theme;
}

export function createTeachingDemoShell(options: CreateTeachingDemoShellOptions): TeachingDemoShell {
  const modeState: { value: TeachingMode } = {
    value: options.defaultMode ?? 'normal'
  };
  const themeState: { value: TeachingTheme } = {
    value: options.defaultTheme ?? 'dark'
  };

  options.mount.innerHTML = `
    <section class="teaching-demo" data-mode="${modeState.value}" data-theme="${themeState.value}">
      <aside class="teaching-sidebar">
        <header class="teaching-header">
          <h1 class="teaching-title">${options.title}</h1>
          <p class="teaching-subtitle">${options.subtitle}</p>
          <button type="button" class="sidebar-toggle sidebar-toggle-inline">隐藏控制面板</button>
        </header>
        <section class="teaching-card">
          <h2 class="teaching-card-title">控制区</h2>
          <div class="control-slot"></div>
        </section>
        <section class="teaching-card status-card">
          <h2 class="teaching-card-title">状态</h2>
          <p class="status-text">就绪</p>
        </section>
      </aside>
      <div class="sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="调整控制面板宽度"></div>
      <section class="teaching-stage-panel">
        <button type="button" class="sidebar-toggle sidebar-toggle-float">隐藏控制面板</button>
        <div class="stage-toolbar" role="group" aria-label="演示区设置">
          <button type="button" class="mode-toggle">${modeToggleLabel(modeState.value)}</button>
          <button type="button" class="shell-theme-toggle">${themeToggleLabel(themeState.value)}</button>
        </div>
        <div class="stage-frame">
          <div class="stage-slot">
            <canvas class="stage-canvas" aria-label="2D 教学动画演示区域"></canvas>
          </div>
        </div>
        <div class="stage-readout">
          <ul class="readout-slot"></ul>
        </div>
      </section>
    </section>
  `;

  const root = options.mount.querySelector('.teaching-demo');
  const controlSlot = options.mount.querySelector('.control-slot');
  const readoutSlot = options.mount.querySelector('.readout-slot');
  const stageReadout = options.mount.querySelector('.stage-readout');
  const statusText = options.mount.querySelector('.status-text');
  const stageSlot = options.mount.querySelector('.stage-slot');
  const stageCanvas = options.mount.querySelector('.stage-canvas');
  const modeButton = options.mount.querySelector('.mode-toggle');
  const themeButton = options.mount.querySelector('.shell-theme-toggle');
  const sidebar = options.mount.querySelector('.teaching-sidebar');
  const resizer = options.mount.querySelector('.sidebar-resizer');
  const inlineToggle = options.mount.querySelector('.sidebar-toggle-inline');
  const floatToggle = options.mount.querySelector('.sidebar-toggle-float');

  if (
    !(root instanceof HTMLElement) ||
    !(controlSlot instanceof HTMLElement) ||
    !(readoutSlot instanceof HTMLElement) ||
    !(stageReadout instanceof HTMLElement) ||
    !(statusText instanceof HTMLElement) ||
    !(stageSlot instanceof HTMLElement) ||
    !(stageCanvas instanceof HTMLCanvasElement) ||
    !(modeButton instanceof HTMLButtonElement) ||
    !(themeButton instanceof HTMLButtonElement) ||
    !(sidebar instanceof HTMLElement) ||
    !(resizer instanceof HTMLElement) ||
    !(inlineToggle instanceof HTMLButtonElement) ||
    !(floatToggle instanceof HTMLButtonElement)
  ) {
    throw new Error('Failed to mount teaching demo shell');
  }

  const sidebarMinPx = 260;
  const sidebarMaxPx = 560;
  const stageMinPx = 960;
  const dividerPx = 12;
  let collapsed = false;
  let dragging = false;

  const getSidebarMaxForViewport = (): number => {
    const hardLimit = window.innerWidth - stageMinPx - dividerPx;
    return Math.max(sidebarMinPx, Math.min(sidebarMaxPx, hardLimit));
  };

  const setSidebarWidth = (widthPx: number): void => {
    const dynamicMax = getSidebarMaxForViewport();
    const clamped = clampSidebarWidth(widthPx, sidebarMinPx, dynamicMax);
    root.style.setProperty('--sidebar-width', `${clamped}px`);
  };

  const updateSidebarToggleLabel = (): void => {
    const label = collapsed ? '显示控制面板' : '隐藏控制面板';
    inlineToggle.textContent = label;
    floatToggle.textContent = label;
    inlineToggle.setAttribute('aria-pressed', String(collapsed));
    floatToggle.setAttribute('aria-pressed', String(collapsed));
  };

  const setSidebarCollapsed = (next: boolean): void => {
    collapsed = next;
    root.classList.toggle('is-sidebar-collapsed', collapsed);
    updateSidebarToggleLabel();
  };

  const onToggleSidebar = (): void => {
    setSidebarCollapsed(!collapsed);
  };

  const onResizerPointerDown = (event: PointerEvent): void => {
    if (collapsed || window.matchMedia('(max-width: 1180px)').matches) return;
    dragging = true;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startWidth = sidebar.getBoundingClientRect().width;

    const onPointerMove = (moveEvent: PointerEvent): void => {
      if (!dragging) return;
      const delta = moveEvent.clientX - startX;
      setSidebarWidth(startWidth + delta);
    };

    const onPointerUp = (): void => {
      dragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      try {
        resizer.releasePointerCapture(pointerId);
      } catch {
        // Ignore if pointer capture wasn't acquired.
      }
    };

    try {
      resizer.setPointerCapture(pointerId);
    } catch {
      // Ignore unsupported pointer capture.
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onViewportResize = (): void => {
    if (window.matchMedia('(max-width: 1180px)').matches) {
      setSidebarCollapsed(false);
      root.style.removeProperty('--sidebar-width');
      return;
    }
    const widthToken = root.style.getPropertyValue('--sidebar-width');
    if (!widthToken) {
      setSidebarWidth(getDefaultSidebarWidth(window.innerWidth, sidebarMinPx, getSidebarMaxForViewport()));
      return;
    }
    const current = parseFloat(widthToken);
    if (Number.isFinite(current)) {
      setSidebarWidth(current);
    }
  };

  const setMode = (mode: TeachingMode): void => {
    modeState.value = mode;
    applyModeTokens(root, modeState.value);
    modeButton.textContent = modeToggleLabel(modeState.value);
    modeButton.setAttribute('aria-pressed', String(modeState.value === 'presentation'));
  };

  const setTheme = (theme: TeachingTheme): void => {
    themeState.value = theme;
    applyThemeTokens(root, themeState.value);
    themeButton.textContent = themeToggleLabel(themeState.value);
    themeButton.setAttribute('aria-pressed', String(themeState.value === 'dark'));
  };

  applyModeTokens(root, modeState.value);
  applyThemeTokens(root, themeState.value);
  stageReadout.classList.add('is-empty');
  modeButton.setAttribute('aria-pressed', String(modeState.value === 'presentation'));
  themeButton.setAttribute('aria-pressed', String(themeState.value === 'dark'));
  themeButton.textContent = themeToggleLabel(themeState.value);
  setSidebarWidth(getDefaultSidebarWidth(window.innerWidth, sidebarMinPx, getSidebarMaxForViewport()));
  updateSidebarToggleLabel();

  inlineToggle.addEventListener('click', onToggleSidebar);
  floatToggle.addEventListener('click', onToggleSidebar);
  resizer.addEventListener('pointerdown', onResizerPointerDown);
  window.addEventListener('resize', onViewportResize);

  return {
    root,
    controlSlot,
    readoutSlot,
    stageSlot,
    stageCanvas,
    modeButton,
    themeButton,
    setStatus(text: string) {
      statusText.textContent = text;
    },
    setReadout(items: ReadoutItem[]) {
      readoutSlot.innerHTML = '';
      stageReadout.classList.toggle('is-empty', items.length === 0);
      for (const item of items) {
        const line = document.createElement('li');
        line.className = 'readout-item';
        line.innerHTML = `<span class="readout-label">${item.label}</span><strong class="readout-value">${item.value}</strong>`;
        readoutSlot.appendChild(line);
      }
    },
    setMode,
    setTheme,
    getMode() {
      return modeState.value;
    },
    getTheme() {
      return themeState.value;
    },
    dispose() {
      inlineToggle.removeEventListener('click', onToggleSidebar);
      floatToggle.removeEventListener('click', onToggleSidebar);
      resizer.removeEventListener('pointerdown', onResizerPointerDown);
      window.removeEventListener('resize', onViewportResize);
    }
  };
}
