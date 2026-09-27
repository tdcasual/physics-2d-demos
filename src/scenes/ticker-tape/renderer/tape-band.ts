/**
 * Tape-stage chrome band and theme palette.
 *
 * DOM-dependent: finds the stage frame via STAGE_FRAME_ATTR, then the
 * transport bar (STAGE_FLOATING_CONTROLS_CLASS) and data-workspace
 * layout classes, so the paper-tape drawing can sit clear of the
 * floating toolbar.
 */
import { getThemeColors } from '../../../core/colors';
import { STAGE_FRAME_ATTR } from '../../../platform/stage-chrome';
import type { TeachingTheme } from '../../../platform/standards';

const LAYOUT_MASTER_CLASS = 'layout-master';
const IS_DATA_WORKSPACE_CLASS = 'is-data-workspace';
const IS_DATA_WORKSPACE_CHART_CLASS = 'is-data-workspace-chart';
const STAGE_FLOATING_CONTROLS_CLASS = 'stage-floating-controls';

export function palette(theme: TeachingTheme) {
  const c = getThemeColors(theme);
  const dark = theme === 'dark';
  return {
    bg: c.background,
    text: c.text,
    muted: dark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.9)',
    tape: dark ? '#334155' : '#f8fafc',
    tapeEdge: dark ? '#94a3b8' : '#64748b',
    tick: dark ? '#cbd5e1' : '#334155',
    count: dark ? '#fbbf24' : '#b45309',
    ruler: dark ? '#1e293b' : '#fde68a',
    rulerAlt: dark ? 'rgba(51,65,85,0.55)' : 'rgba(253,230,138,0.55)',
    rulerEdge: dark ? '#cbd5e1' : '#92400e',
    scatter: dark ? '#38bdf8' : '#0369a1',
    outlier: dark ? '#fbbf24' : '#c2410c',
    fit: dark ? '#f87171' : '#b91c1c',
    grid: dark ? 'rgba(148,163,184,0.25)' : 'rgba(100,116,139,0.28)'
  };
}

export type TapePalette = ReturnType<typeof palette>;

/**
 * 数据步里给纸带让出浮动工具条。
 * 贴顶的条（桌面）从它下沿留白，下沿约 82px 时下限仍是 88。
 * 窄屏工具条在舞台中部：下方够放尺就排在它下面，否则留在上方空带。
 */
const TAPE_SCALE_FLOOR = 240;
const TAPE_SCALE_CEIL = 320;

/** Height the data-step stage used before the half split, for glyph size. */
export function tapeScaleCap(
  viewportWidth: number,
  viewportHeight: number
): number {
  if (viewportWidth <= 720) return viewportHeight * 0.4 - 8;
  const fromViewport = viewportHeight * 0.28;
  return Math.min(TAPE_SCALE_CEIL, Math.max(TAPE_SCALE_FLOOR, fromViewport));
}

export function legacyTapeBox(
  canvas: HTMLCanvasElement,
  cssBox: number
): number {
  const root = canvas.closest(`.${LAYOUT_MASTER_CLASS}`);
  if (!(root instanceof HTMLElement)) return cssBox;
  if (!root.classList.contains(IS_DATA_WORKSPACE_CLASS)) return cssBox;
  if (root.classList.contains(IS_DATA_WORKSPACE_CHART_CLASS)) return cssBox;
  if (typeof window === 'undefined' || window.innerHeight < 640) return cssBox;
  return Math.min(cssBox, tapeScaleCap(window.innerWidth, window.innerHeight));
}

/** Transport bar inside the stage frame. The mobile control bar is not one. */
export function findWorkspaceTransportBar(
  canvas: HTMLCanvasElement
): HTMLElement | null {
  const frame = canvas.closest(`[${STAGE_FRAME_ATTR}]`);
  const bar = frame?.querySelector(`.${STAGE_FLOATING_CONTROLS_CLASS}`);
  if (!(bar instanceof HTMLElement) || bar.offsetHeight < 1) return null;
  return bar;
}

export function workspaceTapeBand(
  canvas: HTMLCanvasElement,
  height: number
): { chromeFloor: number; bottom: number } {
  if (!canvas.closest(`.${IS_DATA_WORKSPACE_CLASS}`)) {
    return { chromeFloor: 48, bottom: height };
  }
  const bar = findWorkspaceTransportBar(canvas);
  if (!bar) {
    return { chromeFloor: 88, bottom: height };
  }
  const barTop = bar.offsetTop;
  const barBottom = barTop + bar.offsetHeight;
  if (barTop <= 36) {
    return { chromeFloor: Math.max(88, barBottom + 6), bottom: height };
  }
  // 窄屏工具条在舞台中部。下方放得下尺就排在它下面，否则留在上方空带。
  if (height - (barBottom + 6) >= 88) {
    return { chromeFloor: barBottom + 6, bottom: height };
  }
  return { chromeFloor: 8, bottom: Math.max(48, barTop - 4) };
}
