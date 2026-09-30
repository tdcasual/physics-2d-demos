/**
 * Split layout DOM builder helpers
 *
 * Shared between SplitRightLayout and SplitRightGraphBottomLayout.
 * CSS class prefix ('teaching' | 'srgb') is the only config difference.
 */

import type { Theme } from '../types';
import {
  GRAPH_BODY_ATTR,
  GRAPH_SECTION_ATTR,
  STAGE_FRAME_ATTR
} from '../../../platform/stage-chrome';
import { buildStageToolbar } from '../../../ui/stage-toolbar';

export type CssPrefix = 'teaching' | 'srgb';

export interface SplitConfig {
  hideHeader?: boolean;
  title?: string;
  subtitle?: string;
  hasGraph?: boolean;
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  leftMinWidth?: number;
  leftMaxWidth?: number;
  defaultLeftRatio?: number;
  controlColumns?: string | number;
}

// === Section builders ===

export function buildHeader(
  prefix: CssPrefix,
  cfg: SplitConfig
): { element: HTMLElement | null; slot: HTMLElement | undefined } {
  if (cfg.hideHeader) return { element: null, slot: undefined };
  const header = document.createElement('header');
  header.className = `${prefix}-header`;
  const h1 = document.createElement('h1');
  h1.className = `${prefix}-title`;
  h1.textContent = cfg.title ?? '标题';
  header.appendChild(h1);
  if (cfg.subtitle) {
    const p = document.createElement('p');
    p.className = `${prefix}-subtitle`;
    p.textContent = cfg.subtitle;
    header.appendChild(p);
  }
  return { element: header, slot: header };
}

export interface ControlSectionResult {
  section: HTMLElement;
  slot: HTMLElement;
}

export function buildControlSection(prefix: CssPrefix): ControlSectionResult {
  const section = document.createElement('section');
  section.className = `${prefix}-control-section control-section`;
  section.setAttribute('data-collapsed', 'false');

  const header = document.createElement('div');
  header.className = `${prefix}-section-header`;
  const h2 = document.createElement('h2');
  h2.className = `${prefix}-section-title section-title`;
  h2.textContent = '控制区';
  header.appendChild(h2);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `${prefix}-section-toggle`;
  toggle.setAttribute('aria-label', '折叠控制区');
  toggle.textContent = '−';
  toggle.addEventListener('click', () => {
    const collapsed = section.getAttribute('data-collapsed') === 'true';
    section.setAttribute('data-collapsed', String(!collapsed));
    toggle.textContent = collapsed ? '−' : '+';
    toggle.setAttribute('aria-label', collapsed ? '折叠控制区' : '展开控制区');
  });
  header.appendChild(toggle);
  section.appendChild(header);

  const slot = document.createElement('div');
  slot.className = `${prefix}-control-slot control-slot`;
  section.appendChild(slot);
  return { section, slot };
}

export interface GraphSectionResult {
  section: HTMLElement;
  slot: HTMLElement;
}

export function buildGraphSection(
  prefix: CssPrefix,
  label?: string
): GraphSectionResult {
  const section = document.createElement('section');
  section.className = `${prefix}-graph-section graph-section`;
  section.setAttribute(GRAPH_SECTION_ATTR, '');
  section.setAttribute('data-collapsed', 'false');

  const header = document.createElement('div');
  header.className = `${prefix}-section-header`;
  const h2 = document.createElement('h2');
  h2.className = `${prefix}-section-title section-title`;
  h2.textContent = label ?? '图表';
  header.appendChild(h2);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = `${prefix}-section-toggle`;
  toggle.setAttribute('aria-label', '折叠图表区');
  toggle.textContent = '−';
  toggle.addEventListener('click', () => {
    const collapsed = section.getAttribute('data-collapsed') === 'true';
    section.setAttribute('data-collapsed', String(!collapsed));
    toggle.textContent = collapsed ? '−' : '+';
    toggle.setAttribute('aria-label', collapsed ? '折叠图表区' : '展开图表区');
  });
  header.appendChild(toggle);
  section.appendChild(header);

  const slot = document.createElement('div');
  slot.className = `${prefix}-graph-slot graph-slot`;
  // 图区内容体（data-graph-body）：包住 slot、不含 header 的中间层。
  // 自身必须是 section 的 flex 填充子；slot 的 flex:1 相对这一层。
  // 禁止把该属性打在 slot 上（scene-adapter 会 replaceChildren 清空 slot）。
  const body = document.createElement('div');
  body.setAttribute(GRAPH_BODY_ATTR, '');
  body.style.cssText =
    'flex: 1; min-height: 0; display: flex; flex-direction: column;';
  body.appendChild(slot);
  section.appendChild(body);
  return { section, slot };
}

export interface ToolbarElements {
  toolbar: HTMLElement;
  sidebarBtn: HTMLElement;
  themeBtn: HTMLElement;
  modeBtn: HTMLElement;
  layoutBtn: HTMLElement;
}

export function buildToolbar(prefix: CssPrefix): ToolbarElements {
  const { toolbar, buttons } = buildStageToolbar({
    className: `${prefix}-stage-toolbar stage-toolbar`,
    leadingButtons: [
      {
        key: 'sidebar',
        className: `${prefix}-sidebar-toggle sidebar-toggle sidebar-toggle-btn`,
        ariaLabel: '隐藏控制面板',
        text: '隐藏控制面板'
      }
    ],
    actionsClassName: `${prefix}-toolbar-actions`,
    buttons: [
      {
        key: 'theme',
        className: 'shell-theme-toggle theme-toggle-btn',
        ariaLabel: '切换到夜间主题',
        text: '夜间'
      },
      {
        key: 'mode',
        className: `${prefix}-mode-toggle mode-toggle mode-toggle-btn`,
        ariaLabel: '切换到演示模式',
        text: '演示'
      },
      {
        key: 'layout',
        className: 'layout-switch-btn',
        ariaLabel: '切换布局'
      }
    ]
  });
  return {
    toolbar,
    sidebarBtn: buttons.sidebar,
    themeBtn: buttons.theme,
    modeBtn: buttons.mode,
    layoutBtn: buttons.layout
  };
}

export interface StageElements {
  stageFrame: HTMLElement;
  stageSlot: HTMLElement;
  canvas: HTMLCanvasElement;
}

export function buildStage(
  prefix: CssPrefix,
  existingCanvas?: HTMLCanvasElement | null,
  sceneTitle?: string
): StageElements {
  const stageFrame = document.createElement('div');
  stageFrame.className = `${prefix}-stage-frame`;
  stageFrame.setAttribute(STAGE_FRAME_ATTR, '');

  const stageSlot = document.createElement('div');
  stageSlot.className = `${prefix}-stage-slot`;

  const canvas = existingCanvas ?? document.createElement('canvas');
  canvas.className = `${prefix}-stage-canvas stage-canvas`;
  canvas.setAttribute(
    'aria-label',
    sceneTitle ? `动画演示区域：${sceneTitle}` : '动画演示区域'
  );
  stageSlot.appendChild(canvas);
  stageFrame.appendChild(stageSlot);

  return { stageFrame, stageSlot, canvas };
}

export function buildResizer(
  className: string,
  orientation: 'vertical' | 'horizontal',
  label: string
): HTMLElement {
  const el = document.createElement('div');
  el.className = `${className} panel-resizer`;
  el.setAttribute('role', 'separator');
  el.setAttribute('aria-orientation', orientation);
  el.setAttribute('aria-label', label);
  el.setAttribute('tabindex', '0');
  return el;
}

// === Shared ILayout methods ===

export function applySplitTheme(container: HTMLElement, theme: Theme): void {
  // document.documentElement 的主题由 container.ts 统一写，布局只标容器
  container.setAttribute('data-theme', theme);
}

export function getSplitLayoutState(
  leftRatio: number,
  extra?: Record<string, unknown>
): Record<string, unknown> {
  return { leftRatio, ...extra };
}

export function restoreSplitLayoutState(
  state: Record<string, unknown>,
  setLeftRatio: (r: number) => void,
  extra?: (s: Record<string, unknown>) => void
): void {
  if (typeof state.leftRatio === 'number') {
    setLeftRatio(Math.max(0.15, Math.min(0.5, state.leftRatio)));
  }
  extra?.(state);
}

export function applyResponsiveColumns(
  container: HTMLElement,
  width: number,
  cfg: SplitConfig,
  leftRatio: number
): void {
  const mobileBreakpoint = cfg.mobileBreakpoint ?? 768;
  const tabletBreakpoint = cfg.tabletBreakpoint ?? 1024;

  const leftPanel = container.querySelector('aside') as HTMLElement | null;

  // Consumer-only projection: owner writes dataset.sidebarHidden.
  // Style sniffing is a fallback when the projection has not been written yet.
  const currentColumns = container.style.gridTemplateColumns;
  const hiddenFlag = container.dataset.sidebarHidden;
  const isSidebarHidden =
    hiddenFlag != null
      ? hiddenFlag === 'true'
      : currentColumns.startsWith('0px');
  const isDataWorkspace = container.classList.contains('is-data-workspace');

  if (width < mobileBreakpoint) {
    container.style.gridTemplateColumns = '1fr';
    container.style.gridTemplateRows = 'auto 1fr';
    if (leftPanel) {
      leftPanel.style.maxHeight = '50vh';
      leftPanel.style.borderRight = 'none';
      leftPanel.style.borderBottom = '1px solid var(--border-color)';
    }
  } else if (width < tabletBreakpoint) {
    if (!isDataWorkspace) {
      const sidebarWidth = width < 900 ? 240 : 280;
      container.style.gridTemplateColumns = isSidebarHidden
        ? '0px 0px 1fr'
        : `${sidebarWidth}px 8px 1fr`;
    }
    container.style.gridTemplateRows = '';
    if (leftPanel) {
      leftPanel.style.maxHeight = '';
      leftPanel.style.borderRight = '1px solid var(--border-color)';
      leftPanel.style.borderBottom = 'none';
    }
  } else {
    if (!isDataWorkspace) {
      if (isSidebarHidden) {
        container.style.gridTemplateColumns = '0px 0px 1fr';
      } else {
        const leftMinWidth = cfg.leftMinWidth ?? 260;
        const leftMaxWidth = Math.min(cfg.leftMaxWidth ?? 960, width * 0.5);
        const leftWidth = Math.max(
          leftMinWidth,
          Math.min(leftMaxWidth, width * leftRatio)
        );
        container.style.gridTemplateColumns = `${leftWidth}px 8px 1fr`;
      }
    }
    container.style.gridTemplateRows = '';
    if (leftPanel) {
      leftPanel.style.maxHeight = '';
      leftPanel.style.borderRight = '1px solid var(--border-color)';
      leftPanel.style.borderBottom = 'none';
    }
  }
}
