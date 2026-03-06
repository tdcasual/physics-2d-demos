import { getTeachingStandards, type TeachingMode } from './teaching-standards';
import { clampSidebarWidth, getDefaultSidebarWidth } from './sidebar-layout';
import { getResponsiveViewport } from './responsive-stage';
import { applyTouchInteractionMode } from './touch-interaction';

export type ReadoutItem = {
  label: string;
  value: string;
  layout?: 'half' | 'full';
};

export type TeachingDemoShell = {
  root: HTMLElement;
  controlSlot: HTMLElement;
  readoutSlot: HTMLElement;
  stageSlot: HTMLElement;
  stageCanvas: HTMLCanvasElement;
  modeButton: HTMLButtonElement;
  themeButton: HTMLButtonElement;
  setStatus: (text: string, level?: StatusLevel) => void;
  setReadout: (items: ReadoutItem[]) => void;
  setMode: (mode: TeachingMode) => void;
  setTheme: (theme: TeachingTheme) => void;
  getMode: () => TeachingMode;
  getTheme: () => TeachingTheme;
  dispose: () => void;
};

export type TeachingTheme = 'dark' | 'light';
export type StatusLevel = 'ready' | 'running' | 'paused' | 'success' | 'error' | 'info';

export type CreateTeachingDemoShellOptions = {
  mount: HTMLElement;
  title: string;
  subtitle: string;
  defaultMode?: TeachingMode;
  defaultTheme?: TeachingTheme;
  desktopReadoutCollapsible?: boolean;
  desktopReadoutDefaultCollapsed?: boolean;
  desktopReadoutDraggable?: boolean;
  readoutLabel?: string;
};

const COMPACT_BREAKPOINT_PX = 1024;

function modeToggleLabel(mode: TeachingMode): string {
  return mode === 'presentation' ? '切换到标准模式' : '切换到演示模式';
}

function themeToggleLabel(theme: TeachingTheme): string {
  return theme === 'dark' ? '切换到春日主题' : '切换到月夜主题';
}

function modeToggleText(mode: TeachingMode): string {
  return mode === 'presentation' ? '标准' : '演示';
}

function themeToggleText(theme: TeachingTheme): string {
  return theme === 'dark' ? '春日' : '月夜';
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

function isCompactViewport(): boolean {
  return getResponsiveViewport(COMPACT_BREAKPOINT_PX).isNarrow;
}

function inferStatusLevel(text: string): StatusLevel {
  if (/错误|失败|异常|无效|非法/.test(text)) return 'error';
  if (/播放|运行|开始/.test(text)) return 'running';
  if (/暂停/.test(text)) return 'paused';
  if (/就绪/.test(text)) return 'ready';
  if (/单步|推进/.test(text)) return 'success';
  if (/已|完成|更新|重置|应用|开启|切换/.test(text)) return 'success';
  return 'info';
}

function statusLevelLabel(level: StatusLevel): string {
  if (level === 'ready') return '就绪';
  if (level === 'running') return '运行中';
  if (level === 'paused') return '已暂停';
  if (level === 'success') return '已完成';
  if (level === 'error') return '异常';
  return '提示';
}

function nowTimeLabel(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function resolveReadoutLayout(item: ReadoutItem): 'half' | 'full' {
  if (item.layout) return item.layout;
  const labelLength = item.label.trim().length;
  const valueLength = item.value.trim().length;
  if (/[\n\r]/.test(item.value)) return 'full';
  if (valueLength > 14) return 'full';
  return labelLength + valueLength <= 18 ? 'half' : 'full';
}

export function createTeachingDemoShell(options: CreateTeachingDemoShellOptions): TeachingDemoShell {
  const modeState: { value: TeachingMode } = {
    value: options.defaultMode ?? 'normal'
  };
  const themeState: { value: TeachingTheme } = {
    value: options.defaultTheme ?? 'dark'
  };
  const desktopReadoutCollapsible = options.desktopReadoutCollapsible ?? true;
  const desktopReadoutDefaultCollapsed = desktopReadoutCollapsible && (options.desktopReadoutDefaultCollapsed ?? true);
  const desktopReadoutDraggable = options.desktopReadoutDraggable ?? true;
  const readoutHeaderEnabled = desktopReadoutCollapsible || desktopReadoutDraggable;
  const readoutLabel = options.readoutLabel ?? '数据区';

  options.mount.innerHTML = `
    <section class="teaching-demo" data-mode="${modeState.value}" data-theme="${themeState.value}">
      <aside class="teaching-sidebar">
        <header class="teaching-header">
          <h1 class="teaching-title">${options.title}</h1>
          <p class="teaching-subtitle">${options.subtitle}</p>
          <button type="button" class="sidebar-toggle sidebar-toggle-inline">隐藏控制面板</button>
        </header>
        <section class="teaching-card control-card">
          <h2 class="teaching-card-title">控制区</h2>
          <div class="control-slot"></div>
        </section>
        <section class="teaching-card status-card">
          <h2 class="teaching-card-title">状态</h2>
          <div class="status-row">
            <span class="status-pill">就绪</span>
            <span class="status-time">--:--:--</span>
          </div>
          <p class="status-text">就绪</p>
        </section>
      </aside>
      <div class="sidebar-resizer" role="separator" aria-orientation="vertical" aria-label="调整控制面板宽度"></div>
      <section class="teaching-stage-panel">
        <div class="stage-topbar">
          <button type="button" class="sidebar-toggle sidebar-toggle-float">隐藏控制面板</button>
          <div class="stage-toolbar" role="group" aria-label="演示区设置">
            <button type="button" class="mode-toggle" aria-label="${modeToggleLabel(modeState.value)}">${modeToggleText(modeState.value)}</button>
            <button type="button" class="shell-theme-toggle" aria-label="${themeToggleLabel(themeState.value)}">${themeToggleText(themeState.value)}</button>
          </div>
        </div>
        <button type="button" class="readout-drawer-toggle">显示数据区</button>
        <button type="button" class="readout-desktop-toggle" hidden>显示状态面板</button>
        <div class="stage-frame">
          <div class="stage-slot">
            <canvas class="stage-canvas" aria-label="2D 教学动画演示区域"></canvas>
          </div>
        </div>
        <div class="stage-readout${desktopReadoutDraggable ? ' is-desktop-draggable' : ''}">
          <div class="readout-header${readoutHeaderEnabled ? '' : ' is-hidden'}">
            <span class="readout-header-title">${readoutLabel}</span>
            <div class="readout-header-actions">
              <button type="button" class="readout-inline-toggle" hidden>折叠</button>
              <button type="button" class="readout-drag-handle" aria-label="拖动数据区" hidden>拖动</button>
            </div>
          </div>
          <ul class="readout-slot"></ul>
        </div>
      </section>
    </section>
  `;

  const root = options.mount.querySelector('.teaching-demo');
  const controlSlot = options.mount.querySelector('.control-slot');
  const readoutSlot = options.mount.querySelector('.readout-slot');
  const stageReadout = options.mount.querySelector('.stage-readout');
  const stagePanel = options.mount.querySelector('.teaching-stage-panel');
  const drawerToggle = options.mount.querySelector('.readout-drawer-toggle');
  const desktopToggle = options.mount.querySelector('.readout-desktop-toggle');
  const inlineReadoutToggle = options.mount.querySelector('.readout-inline-toggle');
  const dragHandle = options.mount.querySelector('.readout-drag-handle');
  const statusCard = options.mount.querySelector('.status-card');
  const statusPill = options.mount.querySelector('.status-pill');
  const statusTime = options.mount.querySelector('.status-time');
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
    !(stagePanel instanceof HTMLElement) ||
    !(drawerToggle instanceof HTMLButtonElement) ||
    !(desktopToggle instanceof HTMLButtonElement) ||
    !(inlineReadoutToggle instanceof HTMLButtonElement) ||
    !(dragHandle instanceof HTMLButtonElement) ||
    !(statusCard instanceof HTMLElement) ||
    !(statusPill instanceof HTMLElement) ||
    !(statusTime instanceof HTMLElement) ||
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

  const sidebarMinPx = 240;
  const sidebarMaxPx = 520;
  const stageMinPx = 700;
  const dividerPx = 12;
  let collapsed = false;
  let dragging = false;
  let compactViewport = isCompactViewport();
  let readoutCollapsed = compactViewport ? true : desktopReadoutDefaultCollapsed;
  let readoutOffsetX = 0;
  let readoutOffsetY = 0;
  let readoutDragging = false;
  let hasReadoutItems = false;

  const getSidebarMaxForViewport = (): number => {
    const hardLimit = getResponsiveViewport().width - stageMinPx - dividerPx;
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
    if (collapsed || isCompactViewport()) return;
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

  const updateReadoutOffset = (): void => {
    stageReadout.style.setProperty('--readout-offset-x', `${readoutOffsetX}px`);
    stageReadout.style.setProperty('--readout-offset-y', `${readoutOffsetY}px`);
  };

  const resetReadoutOffset = (): void => {
    readoutOffsetX = 0;
    readoutOffsetY = 0;
    updateReadoutOffset();
  };

  const updateReadoutDrawer = (): void => {
    root.classList.toggle('is-compact-viewport', compactViewport);
    const drawerEnabled = compactViewport && hasReadoutItems;
    const desktopToggleEnabled = !compactViewport && desktopReadoutCollapsible && hasReadoutItems;
    const toggleEnabled = drawerEnabled || desktopToggleEnabled;
    const expanded = !(toggleEnabled && readoutCollapsed);
    drawerToggle.hidden = !drawerEnabled;
    desktopToggle.hidden = !desktopToggleEnabled || expanded;
    inlineReadoutToggle.hidden = !desktopToggleEnabled || !expanded;
    dragHandle.hidden = !(desktopReadoutDraggable && !compactViewport && hasReadoutItems && expanded);
    stageReadout.classList.toggle('is-empty', !hasReadoutItems);
    stageReadout.classList.toggle('is-collapsed', toggleEnabled && readoutCollapsed);
    stageReadout.classList.toggle('has-header', readoutHeaderEnabled && !compactViewport && hasReadoutItems);
    const openLabel = readoutLabel === '数据区' ? '显示数据区' : `显示${readoutLabel}`;
    const closeLabel = readoutLabel === '数据区' ? '隐藏数据区' : `隐藏${readoutLabel}`;
    drawerToggle.textContent = expanded ? closeLabel : openLabel;
    drawerToggle.setAttribute('aria-expanded', String(expanded));
    desktopToggle.textContent = openLabel;
    desktopToggle.setAttribute('aria-expanded', String(expanded));
    inlineReadoutToggle.textContent = '折叠';
    inlineReadoutToggle.setAttribute('aria-expanded', String(expanded));
  };

  const onViewportResize = (): void => {
    const nextCompact = isCompactViewport();
    if (nextCompact !== compactViewport) {
      if (nextCompact) {
        readoutCollapsed = true;
        resetReadoutOffset();
      } else {
        readoutCollapsed = desktopReadoutCollapsible ? desktopReadoutDefaultCollapsed : false;
      }
    }
    compactViewport = nextCompact;

    if (compactViewport) {
      setSidebarCollapsed(false);
      root.style.removeProperty('--sidebar-width');
    } else {
      const widthToken = root.style.getPropertyValue('--sidebar-width');
      if (!widthToken) {
        setSidebarWidth(getDefaultSidebarWidth(window.innerWidth, sidebarMinPx, getSidebarMaxForViewport()));
      } else {
        const current = parseFloat(widthToken);
        if (Number.isFinite(current)) {
          setSidebarWidth(current);
        }
      }
    }
    updateReadoutDrawer();
  };

  const onToggleReadoutDrawer = (): void => {
    if (!hasReadoutItems) return;
    if (!compactViewport && !desktopReadoutCollapsible) return;
    readoutCollapsed = !readoutCollapsed;
    updateReadoutDrawer();
  };

  const onReadoutDragStart = (event: PointerEvent): void => {
    if (!desktopReadoutDraggable || compactViewport || !hasReadoutItems) return;
    if (desktopReadoutCollapsible && readoutCollapsed) return;
    readoutDragging = true;
    event.preventDefault();
    const pointerId = event.pointerId;
    const panelRect = stagePanel.getBoundingClientRect();
    const readoutRect = stageReadout.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const baseOffsetX = readoutOffsetX;
    const baseOffsetY = readoutOffsetY;
    const minOffsetX = baseOffsetX + (panelRect.left - readoutRect.left);
    const maxOffsetX = baseOffsetX + (panelRect.right - readoutRect.right);
    const minOffsetY = baseOffsetY + (panelRect.top - readoutRect.top);
    const maxOffsetY = baseOffsetY + (panelRect.bottom - readoutRect.bottom);

    const onPointerMove = (moveEvent: PointerEvent): void => {
      if (!readoutDragging) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      readoutOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, baseOffsetX + deltaX));
      readoutOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, baseOffsetY + deltaY));
      updateReadoutOffset();
    };

    const onPointerUp = (): void => {
      readoutDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      try {
        dragHandle.releasePointerCapture(pointerId);
      } catch {
        // Ignore if pointer capture wasn't acquired.
      }
    };

    try {
      dragHandle.setPointerCapture(pointerId);
    } catch {
      // Ignore unsupported pointer capture.
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const setMode = (mode: TeachingMode): void => {
    modeState.value = mode;
    applyModeTokens(root, modeState.value);
    modeButton.textContent = modeToggleText(modeState.value);
    modeButton.setAttribute('aria-label', modeToggleLabel(modeState.value));
    modeButton.title = modeToggleLabel(modeState.value);
    modeButton.setAttribute('aria-pressed', String(modeState.value === 'presentation'));
  };

  const setTheme = (theme: TeachingTheme): void => {
    themeState.value = theme;
    applyThemeTokens(root, themeState.value);
    themeButton.textContent = themeToggleText(themeState.value);
    themeButton.setAttribute('aria-label', themeToggleLabel(themeState.value));
    themeButton.title = themeToggleLabel(themeState.value);
    themeButton.setAttribute('aria-pressed', String(themeState.value === 'dark'));
  };

  const setStatus = (text: string, level?: StatusLevel): void => {
    const resolvedLevel = level ?? inferStatusLevel(text);
    statusCard.dataset.statusLevel = resolvedLevel;
    statusPill.textContent = statusLevelLabel(resolvedLevel);
    statusTime.textContent = nowTimeLabel();
    statusText.textContent = text;
  };

  applyModeTokens(root, modeState.value);
  applyThemeTokens(root, themeState.value);
  applyTouchInteractionMode(stageCanvas, 'default');
  modeButton.setAttribute('aria-pressed', String(modeState.value === 'presentation'));
  modeButton.setAttribute('aria-label', modeToggleLabel(modeState.value));
  modeButton.title = modeToggleLabel(modeState.value);
  modeButton.textContent = modeToggleText(modeState.value);
  themeButton.setAttribute('aria-pressed', String(themeState.value === 'dark'));
  themeButton.setAttribute('aria-label', themeToggleLabel(themeState.value));
  themeButton.title = themeToggleLabel(themeState.value);
  themeButton.textContent = themeToggleText(themeState.value);
  setSidebarWidth(getDefaultSidebarWidth(window.innerWidth, sidebarMinPx, getSidebarMaxForViewport()));
  updateSidebarToggleLabel();
  updateReadoutOffset();
  setStatus('就绪', 'ready');
  updateReadoutDrawer();

  inlineToggle.addEventListener('click', onToggleSidebar);
  floatToggle.addEventListener('click', onToggleSidebar);
  drawerToggle.addEventListener('click', onToggleReadoutDrawer);
  desktopToggle.addEventListener('click', onToggleReadoutDrawer);
  inlineReadoutToggle.addEventListener('click', onToggleReadoutDrawer);
  dragHandle.addEventListener('pointerdown', onReadoutDragStart);
  resizer.addEventListener('pointerdown', onResizerPointerDown);
  window.addEventListener('resize', onViewportResize);
  window.visualViewport?.addEventListener('resize', onViewportResize);

  return {
    root,
    controlSlot,
    readoutSlot,
    stageSlot,
    stageCanvas,
    modeButton,
    themeButton,
    setStatus,
    setReadout(items: ReadoutItem[]) {
      readoutSlot.innerHTML = '';
      hasReadoutItems = items.length > 0;
      for (const item of items) {
        const layout = resolveReadoutLayout(item);
        const line = document.createElement('li');
        line.className = `readout-item readout-item--${layout}`;
        line.innerHTML = `<span class="readout-label">${item.label}</span><strong class="readout-value">${item.value}</strong>`;
        line.title = `${item.label}：${item.value}`;
        readoutSlot.appendChild(line);
      }
      updateReadoutDrawer();
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
      drawerToggle.removeEventListener('click', onToggleReadoutDrawer);
      desktopToggle.removeEventListener('click', onToggleReadoutDrawer);
      inlineReadoutToggle.removeEventListener('click', onToggleReadoutDrawer);
      dragHandle.removeEventListener('pointerdown', onReadoutDragStart);
      resizer.removeEventListener('pointerdown', onResizerPointerDown);
      window.removeEventListener('resize', onViewportResize);
      window.visualViewport?.removeEventListener('resize', onViewportResize);
    }
  };
}
