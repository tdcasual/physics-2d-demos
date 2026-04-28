/**
 * Split Layout DOM Factory
 *
 * Builds the common DOM scaffold shared by SplitRightLayoutV2 and
 * SplitRightGraphBottomLayoutV2.  Each layout calls this factory then
 * attaches its own variant-specific sections (graph position, extra resizers).
 */

import type { Theme } from '../core/types';
import {
  type CssPrefix,
  type SplitConfig,
  buildHeader,
  buildControlSection,
  buildGraphSection,
  buildToolbar,
  buildStage,
  buildResizer
} from './split-helpers';

export interface SplitLayoutDOMOpts {
  container: HTMLElement;
  cfg: SplitConfig & { controlColumns?: unknown };
  prefix: CssPrefix;
  leftRatio: number;
  currentTheme: Theme;
  /** Space-separated CSS classes added to the container element */
  containerClass: string;
  /** data-testid value for the container */
  testId: string;
  /** Class name for the left <aside> panel */
  leftPanelClass: string;
  /** Class name for the right <section> panel */
  rightPanelClass: string;
  /** Class name for the vertical resizer element */
  resizerVClass: string;
  /** Whether to append a graph section inside the left panel */
  hasGraphInLeft?: boolean;
  /** Optional inline style string for the right panel */
  rightPanelStyle?: string;
  /** Existing canvas to reuse instead of creating a new one */
  existingCanvas?: HTMLCanvasElement | null;
}

export interface SplitLayoutDOMResult {
  slots: {
    header?: HTMLElement;
    control: HTMLElement;
    animation: HTMLElement;
    graph?: HTMLElement;
  };
  leftPanel: HTMLElement;
  rightPanel: HTMLElement;
  stageSlot: HTMLElement;
}

/**
 * Build the shared split-layout DOM scaffold.
 *
 * Returns the common slots and panel elements so the caller can attach
 * layout-specific sections (e.g. graph below animation, horizontal resizer).
 */
export function buildSplitLayoutDOM(opts: SplitLayoutDOMOpts): SplitLayoutDOMResult {
  const {
    container, cfg, prefix, leftRatio, currentTheme,
    containerClass, testId, leftPanelClass, rightPanelClass,
    resizerVClass, hasGraphInLeft, rightPanelStyle
  } = opts;

  const leftMinWidth = Number.isFinite(cfg.leftMinWidth) ? cfg.leftMinWidth! : 260;
  const leftMaxWidth = Number.isFinite(cfg.leftMaxWidth) ? cfg.leftMaxWidth! : 960;
  const containerWidth = container.clientWidth || window.innerWidth || 1024;
  const validRatio = Number.isFinite(leftRatio) ? leftRatio : 0.35;
  const leftWidth = Math.max(leftMinWidth, Math.min(leftMaxWidth, containerWidth * validRatio));

  // --- Container ---
  container.classList.add(...containerClass.split(/\s+/));
  container.dataset.testid = testId;
  container.dataset.theme = currentTheme;
  container.dataset.mode = 'normal';
  // Set individual properties to avoid wiping container-level inline styles
  // (position, width, height) set by SceneContainerImpl constructor.
  container.style.display = 'grid';
  container.style.height = '100dvh';
  container.style.overflow = 'hidden';
  container.style.gridTemplateColumns = `minmax(${leftMinWidth}px, ${leftWidth}px) 8px 1fr`;

  // --- Left panel: header + control + optional graph ---
  const leftPanel = document.createElement('aside');
  leftPanel.className = leftPanelClass;
  leftPanel.dataset.testid = 'left-panel';

  const { element: headerEl, slot: headerSlot } = buildHeader(prefix, cfg);
  if (headerEl) leftPanel.appendChild(headerEl);

  const ctrl = buildControlSection(prefix);
  leftPanel.appendChild(ctrl.section);
  const controlSlot = ctrl.slot;
  if (cfg.controlColumns !== undefined) {
    controlSlot.setAttribute('data-control-columns', String(cfg.controlColumns));
  }

  let graphSlot: HTMLElement | undefined;
  if (hasGraphInLeft) {
    const graph = buildGraphSection(prefix);
    leftPanel.appendChild(graph.section);
    graphSlot = graph.slot;
  }

  container.appendChild(leftPanel);

  // --- Vertical resizer ---
  container.appendChild(
    buildResizer(resizerVClass, 'vertical', '调整左侧面板宽度')
  );

  // --- Right panel: toolbar + stage ---
  const rightPanel = document.createElement('section');
  rightPanel.className = rightPanelClass;
  rightPanel.dataset.testid = 'right-panel';
  if (rightPanelStyle) rightPanel.style.cssText = rightPanelStyle;

  const { toolbar } = buildToolbar(prefix);
  rightPanel.appendChild(toolbar);

  const { stageFrame: stageFrameEl, stageSlot } = buildStage(prefix, opts.existingCanvas);
  rightPanel.appendChild(stageFrameEl);

  container.appendChild(rightPanel);

  return {
    slots: { header: headerSlot, control: controlSlot, animation: stageSlot, graph: graphSlot },
    leftPanel,
    rightPanel,
    stageSlot
  };
}
