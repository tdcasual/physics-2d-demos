/**
 * 高精度干涉测微仪 — 渲染器（DOM 实现）
 *
 * 扩展接口：MeasurableInstrument + SerializableInstrument + CalibratableInstrument
 *
 * 本文件仅保留工厂装配逻辑；样式、DOM 结构、条纹、刻度、渲染引擎与交互
 * 分别位于 renderer/ 子目录（styles/dom/stripes/scales/render-view/interactions）。
 */

import type { TeachingTheme } from '../../platform/standards';
import type {
  InstrumentView,
  InstrumentViewport,
  MeasurableInstrument,
  SerializableInstrument,
  CalibratableInstrument
} from '../_contract/instrument-contract';
import type { MicrometerEyepieceState } from './instrument.sim';
import { micrometerEyepieceMeta } from './instrument.meta';
import type { MicrometerViewState } from './renderer/types';
import { CSS } from './renderer/styles';
import { buildMicrometerDom } from './renderer/dom';
import { createStripeUpdater } from './renderer/stripes';
import { createThimbleTicks, initSleeve } from './renderer/scales';
import { createViewRenderer } from './renderer/render-view';
import { bindInteractions } from './renderer/interactions';
import { micrometerFringeAlignment } from './renderer/alignment';
import type { FringeAlignment } from '../_utils/fringe-alignment';
import {
  ancestorZoomScale,
  applyFitTransform,
  fitTransformToParent,
  narrowInstrumentScale,
  unionClientRects
} from '../_utils/fit-visual';

const MICROMETER_SYSTEM_SCALE = 1.5;
/** Sleeve left (215) + initSleeve width (700) at layout scale 1. */
const MICROMETER_LAYOUT_WIDTH = 915;
/** Case (240) + thimble/ratchet (~185) — student workflow, not the unused far sleeve. */
const MICROMETER_FUNCTIONAL_WIDTH = 425;
const MICROMETER_VISUAL_SELECTORS = [
  '.case',
  '.lens-outer-ring',
  '.sleeve-container',
  '.thimble-group',
  '.thimble-body',
  '.ratchet'
] as const;

export type MicrometerEyepieceView = InstrumentView<MicrometerEyepieceState> &
  MeasurableInstrument &
  SerializableInstrument &
  CalibratableInstrument & {
    /** 显示/隐藏仪器内部读数浮层（宿主场景统一在外部显示读数时可隐藏） */
    setReadoutVisible(visible: boolean): void;
    getAlignment(): FringeAlignment;
    setReading(readingMm: number): void;
  };

export function createMicrometerEyepieceView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showHints?: boolean;
}): MicrometerEyepieceView {
  const { canvas, showHints = true } = options;
  const parent = canvas.parentElement;
  if (!parent) {
    throw new Error(
      'MicrometerEyepieceView: canvas must have a parent element'
    );
  }

  canvas.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.dataset.instrumentScroll = 'true';
  wrapper.style.cssText = `
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    overflow: visible;
    box-sizing: border-box;
  `;
  parent.style.position = 'relative';
  parent.appendChild(wrapper);

  const shadow = wrapper.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  shadow.appendChild(styleEl);

  const {
    root,
    sleeveContainer,
    sleeveScales,
    thimbleStrip,
    thimbleGroup,
    crosshairSystem,
    lensView,
    readoutDisplay,
    hintEl,
    caseEl,
    systemEl
  } = buildMicrometerDom(shadow);

  function updateHint() {
    if (!hintEl) return;
    hintEl.textContent =
      viewState.viewMode === 'crosshair'
        ? '↕ 上下拨动或 ↔ 左右推拉右侧测微螺杆，移动准星瞄准条纹'
        : '↕ 上下拨动或 ↔ 左右推拉右侧测微螺杆，移动条纹对准准星';
  }

  if (!showHints && hintEl) {
    hintEl.style.display = 'none';
  }

  // 读数统一显示在场景实验状态区，仪器内部默认隐藏（宿主可用 setReadoutVisible 打开）
  if (readoutDisplay) {
    readoutDisplay.style.display = 'none';
  }

  const config = {
    initialReading: micrometerEyepieceMeta.defaultParams.initialReading,
    maxReading: 32.0,
    tickGapX: 10,
    tickGapY: 12
  };

  // 整体仪器初始位置：宽屏居中；窄屏从目镜/读数端起，避免把镜头推出视口
  // （rect 归一化到布局空间，防止舞台 panzoom 缩放逐层污染）
  const parentRect = parent.getBoundingClientRect();
  const parentZoomK = ancestorZoomScale(parent);
  const parentW = parentRect.width / parentZoomK;
  const parentH = parentRect.height / parentZoomK;
  const scaledW = MICROMETER_LAYOUT_WIDTH * MICROMETER_SYSTEM_SCALE;
  const scaledH = 270 * MICROMETER_SYSTEM_SCALE;

  // 跨渲染子模块共享的可变视图状态（原为工厂闭包 let 变量，语义不变）
  const viewState: MicrometerViewState = {
    crosshairSpeed: 100,
    currentReading: config.initialReading,
    zeroOffset: 0,
    viewMode: 'fringe',
    disposed: false,
    simLastCrosshairAngle: 0,
    sysX:
      parentW >= scaledW
        ? Math.round((parentW - scaledW) / 2)
        : parentW > 100
          ? 0
          : -100,
    sysY: parentH > 100 ? Math.max(0, Math.round((parentH - scaledH) / 2)) : 0,
    systemScale: MICROMETER_SYSTEM_SCALE
  };

  let simLastZero = 0;
  let simLastViewMode: 'crosshair' | 'fringe' = 'fringe';
  let simLastSpeed = 100;
  let simLastScaleInverted = false;

  // 事件监听器
  const listeners = {
    reading: [] as Array<(reading: number) => void>,
    align: [] as Array<() => void>,
    limit: [] as Array<() => void>
  };

  // ── 条纹配置 ──
  const stripeConfig = {
    offset: 12,
    spacing: 50,
    color: 'rgba(200, 80, 20, 0.4)',
    angle: 90
  };

  function emitReading() {
    const reading = viewState.currentReading + viewState.zeroOffset;
    listeners.reading.forEach((cb) => cb(reading));
  }

  const updateStripes = createStripeUpdater(lensView);
  const { initThimble, updateThimbleTicks } = createThimbleTicks({
    thimbleStrip,
    config
  });
  const renderView = createViewRenderer({
    viewState,
    config,
    stripeConfig,
    elements: {
      thimbleGroup,
      thimbleStrip,
      crosshairSystem,
      lensView,
      readoutDisplay
    },
    listeners,
    updateThimbleTicks
  });
  const unbindInteractions = bindInteractions({
    viewState,
    config,
    elements: { thimbleGroup, caseEl, systemEl },
    renderView,
    emitReading
  });

  // ── 启动引擎 ──
  caseEl.style.cursor = 'grab';
  caseEl.setAttribute('role', 'button');
  caseEl.setAttribute('aria-label', '目镜壳体，拖动可移动整个仪器');
  caseEl.tabIndex = 0;
  systemEl.style.transform = `translate(${viewState.sysX}px, ${viewState.sysY}px) scale(${viewState.systemScale})`;

  // ── 副尺键盘操作 ──
  thimbleGroup.tabIndex = 0;
  thimbleGroup.setAttribute('role', 'slider');
  thimbleGroup.setAttribute('aria-label', '测微螺杆');
  thimbleGroup.setAttribute('aria-valuemin', '0');
  thimbleGroup.setAttribute('aria-valuemax', String(config.maxReading));
  thimbleGroup.setAttribute(
    'aria-valuenow',
    viewState.currentReading.toFixed(3)
  );
  thimbleGroup.setAttribute(
    'aria-valuetext',
    `${viewState.currentReading.toFixed(3)} mm`
  );

  initSleeve(config, sleeveContainer, sleeveScales);
  initThimble();
  updateStripes(stripeConfig);
  updateHint();
  renderView();

  return {
    render(state) {
      viewState.crosshairSpeed = state.crosshairSpeed;

      if (state.scaleInverted !== simLastScaleInverted) {
        simLastScaleInverted = state.scaleInverted;
        sleeveContainer.classList.toggle('scale-inverted', state.scaleInverted);
      }

      const stripeChanged =
        state.stripeSpacing !== stripeConfig.spacing ||
        state.stripeColor !== stripeConfig.color ||
        state.stripeAngle !== stripeConfig.angle;
      if (stripeChanged) {
        stripeConfig.spacing = Math.round(state.stripeSpacing);
        stripeConfig.color = state.stripeColor;
        stripeConfig.angle = state.stripeAngle;
        updateStripes(stripeConfig);
      }

      const needRender =
        state.zeroOffset !== simLastZero ||
        state.stripeOffset !== stripeConfig.offset ||
        state.viewMode !== simLastViewMode ||
        state.crosshairSpeed !== simLastSpeed ||
        state.crosshairAngle !== viewState.simLastCrosshairAngle;
      if (needRender) {
        viewState.zeroOffset = state.zeroOffset;
        stripeConfig.offset = state.stripeOffset;
        viewState.viewMode = state.viewMode;
        simLastZero = state.zeroOffset;
        simLastViewMode = state.viewMode;
        simLastSpeed = state.crosshairSpeed;
        viewState.simLastCrosshairAngle = state.crosshairAngle;
        updateStripes(stripeConfig);
        updateHint();
        renderView();
      }
    },
    resize() {
      const applyFit = () => {
        if (viewState.disposed) return;
        // Stage panzoom zooms an ancestor; normalize to layout space so the
        // narrow check and fit widths don't change with view zoom.
        const zoomK = ancestorZoomScale(parent);
        const rect = parent.getBoundingClientRect();
        const rectW = rect.width / zoomK;
        const rectH = rect.height / zoomK;
        const systemScale = MICROMETER_SYSTEM_SCALE;
        const narrow =
          (typeof window !== 'undefined' && window.innerWidth <= 720) ||
          rectW < 400;
        viewState.sysY = 0;
        if (narrow) {
          viewState.sysX = 0;
          viewState.systemScale = 1;
          systemEl.style.transform = 'translate(0px, 0px) scale(1)';
          wrapper.style.overflowX = 'auto';
          wrapper.style.overflowY = 'hidden';
          wrapper.style.pointerEvents = 'auto';
          wrapper.style.touchAction = 'pan-x';
          root.classList.add('is-narrow');
          root.style.minWidth = `${MICROMETER_LAYOUT_WIDTH}px`;
          systemEl.style.minWidth = `${MICROMETER_LAYOUT_WIDTH}px`;
          const fitWidth = Math.max(
            wrapper.clientWidth,
            Math.min(
              Math.max(rectW, 1),
              typeof window !== 'undefined' ? window.innerWidth : rectW
            )
          );
          wrapper.style.setProperty(
            '--instrument-viewport',
            `${Math.max(fitWidth, 1)}px`
          );
          const s = narrowInstrumentScale(
            fitWidth,
            MICROMETER_FUNCTIONAL_WIDTH
          );
          root.style.transform = `scale(${s})`;
          root.style.transformOrigin = 'top left';
          return;
        }
        viewState.sysX = 0;
        viewState.systemScale = systemScale;
        systemEl.style.transform = `translate(0px, 0px) scale(${systemScale})`;
        wrapper.style.overflow = 'visible';
        wrapper.style.pointerEvents = '';
        wrapper.style.touchAction = '';
        root.classList.remove('is-narrow');
        root.style.minWidth = '';
        systemEl.style.minWidth = '';
        wrapper.style.removeProperty('--instrument-viewport');
        renderView();
        root.style.transform = 'none';
        root.style.transformOrigin = 'top left';
        void root.offsetWidth;
        const union = unionClientRects(root, MICROMETER_VISUAL_SELECTORS);
        if (union) {
          applyFitTransform(
            root,
            fitTransformToParent(parent, union, { root })
          );
        } else {
          const visualW = MICROMETER_LAYOUT_WIDTH * systemScale;
          const visualH = 270 * systemScale;
          const s = Math.min(rectW / visualW, rectH / visualH, 1.25);
          root.style.transform = `scale(${s})`;
        }
      };
      applyFit();
      requestAnimationFrame(() => {
        requestAnimationFrame(applyFit);
      });
    },
    setTheme(_theme: TeachingTheme) {
      // 固定工业配色
    },
    setViewport(_viewport: InstrumentViewport) {
      // DOM 层已占满 canvas 父容器
    },
    dispose() {
      viewState.disposed = true;
      unbindInteractions();
      if (wrapper.parentElement) {
        wrapper.parentElement.removeChild(wrapper);
      }
      canvas.style.display = '';
      listeners.reading.length = 0;
      listeners.align.length = 0;
      listeners.limit.length = 0;
    },

    // ── MeasurableInstrument ──
    getReading() {
      return viewState.currentReading + viewState.zeroOffset;
    },
    getAlignment() {
      return micrometerFringeAlignment({
        readingMm: viewState.currentReading,
        initialReading: config.initialReading,
        stripeOffsetMm: stripeConfig.offset,
        crosshairSpeed: viewState.crosshairSpeed,
        stripeSpacingPx: stripeConfig.spacing
      });
    },
    setReading(readingMm: number) {
      viewState.currentReading = Math.max(
        0,
        Math.min(readingMm, config.maxReading)
      );
      renderView();
      emitReading();
    },
    onReadingChange(callback) {
      listeners.reading.push(callback);
      return () => {
        const idx = listeners.reading.indexOf(callback);
        if (idx >= 0) listeners.reading.splice(idx, 1);
      };
    },
    onAlign(callback) {
      listeners.align.push(callback);
      return () => {
        const idx = listeners.align.indexOf(callback);
        if (idx >= 0) listeners.align.splice(idx, 1);
      };
    },
    onLimit(callback) {
      listeners.limit.push(callback);
      return () => {
        const idx = listeners.limit.indexOf(callback);
        if (idx >= 0) listeners.limit.splice(idx, 1);
      };
    },

    // ── SerializableInstrument ──
    serialize() {
      return JSON.stringify({
        currentReading: viewState.currentReading,
        zeroOffset: viewState.zeroOffset,
        stripeOffset: stripeConfig.offset,
        stripeSpacing: stripeConfig.spacing,
        stripeColor: stripeConfig.color,
        stripeAngle: stripeConfig.angle,
        sysX: viewState.sysX,
        sysY: viewState.sysY
      });
    },
    deserialize(json) {
      try {
        const data = JSON.parse(json);
        if (typeof data.currentReading === 'number') {
          viewState.currentReading = Math.max(
            0,
            Math.min(data.currentReading, config.maxReading)
          );
        }
        if (typeof data.zeroOffset === 'number') {
          viewState.zeroOffset = Math.max(-0.5, Math.min(data.zeroOffset, 0.5));
        }
        if (typeof data.stripeOffset === 'number') {
          // stripeOffset 单位为 mm，与 config.maxReading 同量纲
          stripeConfig.offset = Math.max(
            0,
            Math.min(data.stripeOffset, config.maxReading)
          );
        }
        if (typeof data.stripeSpacing === 'number') {
          stripeConfig.spacing = Math.max(
            20,
            Math.min(data.stripeSpacing, 100)
          );
        }
        if (typeof data.stripeColor === 'string') {
          stripeConfig.color = data.stripeColor;
        }
        if (typeof data.stripeAngle === 'number') {
          stripeConfig.angle = Math.max(0, Math.min(data.stripeAngle, 180));
        }
        if (typeof data.sysX === 'number') viewState.sysX = data.sysX;
        if (typeof data.sysY === 'number') viewState.sysY = data.sysY;
        systemEl.style.transform = `translate(${viewState.sysX}px, ${viewState.sysY}px) scale(${viewState.systemScale})`;
        updateStripes(stripeConfig);
        renderView();
      } catch {
        // 忽略无效的序列化数据
      }
    },

    // ── CalibratableInstrument ──
    setZero(val) {
      viewState.zeroOffset = val;
      renderView();
    },
    getZero() {
      return viewState.zeroOffset;
    },
    getCalibrationOffset() {
      return viewState.zeroOffset;
    },

    setReadoutVisible(visible: boolean) {
      if (readoutDisplay) readoutDisplay.style.display = visible ? '' : 'none';
    }
  } as MicrometerEyepieceView & { setReadoutVisible(visible: boolean): void };
}
