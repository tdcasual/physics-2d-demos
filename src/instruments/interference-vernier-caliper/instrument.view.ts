/**
 * 干涉读数游标卡尺（双缝干涉测量）— 渲染器（DOM 实现）
 */

import type { TeachingTheme } from '../../platform/standards';
import type {
  InstrumentView,
  InstrumentViewport,
  MeasurableInstrument,
  SerializableInstrument,
  CalibratableInstrument
} from '../_contract/instrument-contract';
import type { InterferenceVernierCaliperState } from './instrument.sim';
import { CSS } from './renderer/styles';
import {
  UNIT_PX,
  LEAST_COUNT_PX,
  MAX_CM,
  MAX_X,
  PATTERN_ABSOLUTE_X,
  LENS_OFFSET_FROM_VERNIER,
  LENS_VISUAL_SCALE
} from './renderer/constants';
import { createInstrumentDom } from './renderer/dom';
import { initMainRuler, initVernier } from './renderer/ticks';
import { buildStripeTile } from './renderer/stripes';
import {
  applyInstrumentTransform,
  attachInteractions,
  createInteractionState,
  CALIPER_VISUAL_SELECTORS,
  DEFAULT_VISUAL_SCALE,
  INSTRUMENT_LAYOUT_WIDTH,
  fitInstrumentRootScale
} from './renderer/interactions';
import {
  ancestorZoomScale,
  applyFitTransform,
  fitTransformToParent,
  unionClientRects
} from '../_utils/fit-visual';
import { caliperFringeAlignment } from './renderer/alignment';
import type { FringeAlignment } from '../_utils/fringe-alignment';

export type InterferenceVernierCaliperView =
  InstrumentView<InterferenceVernierCaliperState> &
    MeasurableInstrument &
    SerializableInstrument &
    CalibratableInstrument & {
      /** 显示/隐藏仪器内部读数浮层（宿主场景统一在外部显示读数时可隐藏） */
      setReadoutVisible(visible: boolean): void;
      getAlignment(): FringeAlignment;
      setReading(readingCm: number): void;
    };

export function createInterferenceVernierCaliperView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showHints?: boolean;
}): InterferenceVernierCaliperView {
  const { canvas, showHints = true } = options;
  const parent = canvas.parentElement;
  if (!parent) {
    throw new Error(
      'InterferenceVernierCaliperView: canvas must have a parent element'
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

  const root = document.createElement('div');
  root.className = 'microscope-root';
  shadow.appendChild(root);

  // ── DOM 结构 ──
  const {
    mainTicksContainer,
    vernierTicksContainer,
    slider,
    stripeLayer,
    crosshairSystem,
    readoutDisplay,
    tipsEl,
    knob,
    instrumentEl,
    mainRuler,
    headerPanel
  } = createInstrumentDom(root, shadow);

  if (!showHints && tipsEl) {
    tipsEl.style.display = 'none';
  }

  // 读数统一显示在场景实验状态区，仪器内部不显示独立读数框
  if (readoutDisplay) {
    readoutDisplay.style.display = 'none';
  }
  if (headerPanel) {
    headerPanel.style.display = 'none';
  }

  // ── 状态 ──
  // currentReadingCm/sysX/sysY 等拖拽相关可变状态由交互模块与视图共享
  const interaction = createInteractionState(parent);
  let zeroOffset = 0;
  let disposed = false;
  let simLastZero = 0;
  let simLastCrosshairAngle = 0;
  let viewMode: 'crosshair' | 'fringe' = 'fringe';
  let simLastViewMode: 'crosshair' | 'fringe' = 'fringe';
  let crosshairRefCm = interaction.currentReadingCm;
  let stripeOffsetMm = 12;

  const listeners = {
    reading: [] as Array<(reading: number) => void>,
    align: [] as Array<() => void>,
    limit: [] as Array<() => void>
  };

  let wasAtLimit = false;
  let wasAligned = false;

  // ── 条纹配置 ──
  const fringeConfig = {
    spacing: 16,
    blur: 1.5,
    opacity: 0.85,
    envelopeWidth: 320,
    color: 'rgba(30,15,0,0.85)'
  };
  let rawSpacing = 0;

  // 条纹瓷砖按 (spacing, color) 缓存：key 未变时 DOM 背景已是目标值，
  // 避免重复 parseRgba + toDataURL
  let stripeTileKey = '';

  function updatePattern() {
    const s = fringeConfig.spacing;
    const key = `${s}|${fringeConfig.color}`;
    if (key === stripeTileKey) return;
    stripeTileKey = key;
    const tileUrl = buildStripeTile(s, fringeConfig.color);
    stripeLayer.style.backgroundImage = `url(${tileUrl})`;
    stripeLayer.style.backgroundRepeat = 'repeat';
  }

  // ── 核心渲染 ──
  function renderView() {
    if (disposed) return;

    // 吸附到精度
    let snappedX =
      Math.round((interaction.currentReadingCm * UNIT_PX) / LEAST_COUNT_PX) *
      LEAST_COUNT_PX;
    if (snappedX < 0) snappedX = 0;
    if (snappedX > MAX_X) snappedX = MAX_X;
    interaction.currentReadingCm = snappedX / UNIT_PX;

    // 1. 移动滑块
    slider.style.transform = `translateX(${snappedX}px)`;

    // 2. 根据视场模式切换分划板/条纹运动
    const patternTranslateX =
      PATTERN_ABSOLUTE_X - (snappedX + LENS_OFFSET_FROM_VERNIER);
    const rawOffset = Math.round(patternTranslateX * LENS_VISUAL_SCALE);

    if (viewMode === 'crosshair') {
      // 准星移动模式：条纹固定，准星从切换位置开始线性移动
      stripeLayer.style.backgroundPositionX = '0px';
      const vo =
        (interaction.currentReadingCm * 10 -
          crosshairRefCm * 10 -
          stripeOffsetMm) *
        ((UNIT_PX * LENS_VISUAL_SCALE) / 10);
      crosshairSystem.style.transform = `translateX(${Math.round(vo)}px) rotate(${simLastCrosshairAngle}deg)`;
    } else {
      // 准星不动模式（默认）：准星固定居中，条纹随滑块逆向移动
      // background-repeat:repeat 自动处理周期，无需取模
      stripeLayer.style.backgroundPositionX = `${rawOffset}px`;
      crosshairSystem.style.transform = `rotate(${simLastCrosshairAngle}deg)`;
    }

    // 3. 更新读数
    const totalReading = interaction.currentReadingCm + zeroOffset;
    readoutDisplay.innerText = `${totalReading.toFixed(3)} cm`;
    slider.setAttribute('role', 'slider');
    slider.setAttribute('aria-label', '游标卡尺读数');
    slider.setAttribute('aria-valuemin', '0');
    slider.setAttribute('aria-valuemax', String(MAX_CM));
    slider.setAttribute('aria-valuenow', totalReading.toFixed(3));
    slider.setAttribute(
      'aria-valuetext',
      `${(totalReading * 10).toFixed(3)} mm`
    );

    const alignment = caliperFringeAlignment({
      readingCm: interaction.currentReadingCm,
      fringeSpacingSimPx:
        rawSpacing || fringeConfig.spacing / LENS_VISUAL_SCALE,
      viewMode,
      crosshairRefCm,
      stripeOffsetMm
    });
    if (alignment.aligned && !wasAligned) {
      listeners.align.forEach((cb) => cb());
    }
    wasAligned = alignment.aligned;

    // 4. 边界检测
    const atLimit =
      interaction.currentReadingCm <= 0.001 ||
      interaction.currentReadingCm >= MAX_CM - 0.001;
    if (atLimit && !wasAtLimit) {
      listeners.limit.forEach((cb) => cb());
    }
    wasAtLimit = atLimit;
  }

  function emitReading() {
    const reading = interaction.currentReadingCm + zeroOffset;
    listeners.reading.forEach((cb) => cb(reading));
  }

  // ── 交互事件（滑块/旋钮拖拽、整尺平移、键盘）──
  const detachInteractions = attachInteractions(
    { slider, knob, mainRuler, instrumentEl },
    interaction,
    () => {
      renderView();
      emitReading();
    }
  );

  // ── 启动 ──
  applyInstrumentTransform(instrumentEl, interaction);
  initMainRuler(mainTicksContainer);
  initVernier(vernierTicksContainer);
  updatePattern();
  renderView();

  return {
    render(state: InterferenceVernierCaliperState) {
      const fringeChanged =
        state.fringeSpacing !== rawSpacing ||
        state.fringeBlur !== fringeConfig.blur ||
        state.fringeOpacity !== fringeConfig.opacity ||
        state.fringeEnvelopeWidth !== fringeConfig.envelopeWidth ||
        state.fringeColor !== fringeConfig.color;
      if (fringeChanged) {
        rawSpacing = state.fringeSpacing;
        fringeConfig.spacing = Math.round(
          state.fringeSpacing * LENS_VISUAL_SCALE
        );
        fringeConfig.blur = state.fringeBlur;
        fringeConfig.opacity = state.fringeOpacity;
        fringeConfig.envelopeWidth = state.fringeEnvelopeWidth;
        fringeConfig.color = state.fringeColor;
        updatePattern();
      }

      const viewModeChanged = state.viewMode !== simLastViewMode;
      if (viewModeChanged) {
        if (state.viewMode === 'crosshair') {
          // 切换到准星移动模式时，快照视图当前读数（非 sim 值）作为参考零点
          crosshairRefCm = interaction.currentReadingCm;
        }
        viewMode = state.viewMode;
        simLastViewMode = state.viewMode;
      }

      // 先比较再赋值，保证 stripeOffset 变化能被检出
      const stripeOffsetChanged =
        state.stripeOffset !== undefined &&
        state.stripeOffset !== stripeOffsetMm;
      const needRender =
        state.zeroOffset !== simLastZero ||
        state.crosshairAngle !== simLastCrosshairAngle ||
        viewModeChanged ||
        stripeOffsetChanged;
      if (needRender) {
        simLastCrosshairAngle = state.crosshairAngle;
        zeroOffset = state.zeroOffset;
        simLastZero = state.zeroOffset;
        if (stripeOffsetChanged && state.stripeOffset !== undefined)
          stripeOffsetMm = state.stripeOffset;
        renderView();
      }
    },
    resize() {
      const applyFit = () => {
        if (disposed) return;
        // Stage panzoom zooms an ancestor; normalize to layout space so the
        // narrow check and fit widths don't change with view zoom.
        const zoomK = ancestorZoomScale(parent);
        const rect = parent.getBoundingClientRect();
        const hostWidth = Math.max(rect.width / zoomK, 1);
        const hostHeight = Math.max(rect.height / zoomK, 1);
        const narrow =
          (typeof window !== 'undefined' && window.innerWidth <= 720) ||
          hostWidth < INSTRUMENT_LAYOUT_WIDTH + 24;
        if (narrow) {
          interaction.sysX = 0;
          interaction.sysY = 0;
          interaction.visualScale = 1;
          applyInstrumentTransform(instrumentEl, interaction);
          wrapper.style.overflowX = 'auto';
          wrapper.style.overflowY = 'hidden';
          wrapper.style.pointerEvents = 'auto';
          wrapper.style.touchAction = 'pan-x';
          mainRuler.style.touchAction = 'pan-x';
          const fitWidth = Math.max(
            wrapper.clientWidth,
            Math.min(
              hostWidth,
              typeof window !== 'undefined' ? window.innerWidth : hostWidth
            )
          );
          const s = Math.min(
            1,
            Math.max(0.3, (fitWidth - 8) / INSTRUMENT_LAYOUT_WIDTH)
          );
          root.style.transform = `scale(${s})`;
          root.style.transformOrigin = 'top left';
          root.classList.add('is-narrow');
          return;
        }
        renderView();
        interaction.visualScale = DEFAULT_VISUAL_SCALE;
        interaction.sysX = 0;
        interaction.sysY = 0;
        applyInstrumentTransform(instrumentEl, interaction);
        wrapper.style.overflow = 'visible';
        wrapper.style.pointerEvents = '';
        wrapper.style.touchAction = '';
        mainRuler.style.touchAction = '';
        root.classList.remove('is-narrow');
        root.style.transform = 'none';
        root.style.transformOrigin = 'top left';
        void root.offsetWidth;
        const union = unionClientRects(root, CALIPER_VISUAL_SELECTORS);
        if (union) {
          applyFitTransform(
            root,
            fitTransformToParent(parent, union, { root })
          );
        } else {
          const s = fitInstrumentRootScale(hostWidth, hostHeight);
          root.style.transform = `scale(${s})`;
        }
      };
      applyFit();
      requestAnimationFrame(() => {
        requestAnimationFrame(applyFit);
      });
    },
    setTheme() {
      // 固定配色
    },
    setViewport() {
      // 内部布局已固定
    },
    dispose() {
      disposed = true;
      detachInteractions();
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
      const raw = interaction.currentReadingCm + zeroOffset;
      const snappedPx =
        Math.round((raw * UNIT_PX) / LEAST_COUNT_PX) * LEAST_COUNT_PX;
      return snappedPx / UNIT_PX;
    },
    getAlignment() {
      return caliperFringeAlignment({
        readingCm: interaction.currentReadingCm,
        fringeSpacingSimPx:
          rawSpacing || fringeConfig.spacing / LENS_VISUAL_SCALE,
        viewMode,
        crosshairRefCm,
        stripeOffsetMm
      });
    },
    setReading(readingCm: number) {
      interaction.currentReadingCm = Math.max(0, Math.min(readingCm, MAX_CM));
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
        currentReading: interaction.currentReadingCm,
        zeroOffset,
        fringeSpacing: fringeConfig.spacing,
        fringeBlur: fringeConfig.blur,
        fringeOpacity: fringeConfig.opacity,
        fringeEnvelopeWidth: fringeConfig.envelopeWidth,
        fringeColor: fringeConfig.color,
        sysX: interaction.sysX,
        sysY: interaction.sysY
      });
    },
    deserialize(json) {
      try {
        const data = JSON.parse(json);
        if (typeof data.currentReading === 'number') {
          interaction.currentReadingCm = Math.max(
            0,
            Math.min(data.currentReading, MAX_CM)
          );
        }
        if (typeof data.zeroOffset === 'number') {
          zeroOffset = Math.max(-0.5, Math.min(data.zeroOffset, 0.5));
        }
        if (typeof data.fringeSpacing === 'number')
          fringeConfig.spacing = Math.max(5, data.fringeSpacing);
        if (typeof data.fringeBlur === 'number')
          fringeConfig.blur = Math.max(0, data.fringeBlur);
        if (typeof data.fringeOpacity === 'number')
          fringeConfig.opacity = Math.max(0, Math.min(data.fringeOpacity, 1));
        if (typeof data.fringeEnvelopeWidth === 'number')
          fringeConfig.envelopeWidth = Math.max(50, data.fringeEnvelopeWidth);
        if (typeof data.fringeColor === 'string')
          fringeConfig.color = data.fringeColor;
        if (typeof data.sysX === 'number') interaction.sysX = data.sysX;
        if (typeof data.sysY === 'number') interaction.sysY = data.sysY;
        applyInstrumentTransform(instrumentEl, interaction);
        updatePattern();
        renderView();
      } catch {
        // 忽略无效序列化数据
      }
    },

    // ── CalibratableInstrument ──
    setZero(val) {
      zeroOffset = val;
      renderView();
    },
    getZero() {
      return zeroOffset;
    },
    getCalibrationOffset() {
      return zeroOffset;
    },

    setReadoutVisible(visible: boolean) {
      readoutDisplay.style.display = visible ? '' : 'none';
    }
  } as InterferenceVernierCaliperView & {
    setReadoutVisible(visible: boolean): void;
  };
}
