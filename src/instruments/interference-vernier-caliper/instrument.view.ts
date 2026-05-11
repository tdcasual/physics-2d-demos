/**
 * 干涉读数游标卡尺（双缝干涉测量）— 渲染器（DOM 实现）
 */

import type { TeachingTheme } from '../../platform/standards';
import type {
  InstrumentView,
  InstrumentViewport,
  MeasurableInstrument,
  SerializableInstrument,
  CalibratableInstrument,
} from '../_contract/instrument-contract';
import type { InterferenceVernierCaliperState } from './instrument.sim';

export type InterferenceVernierCaliperView = InstrumentView<InterferenceVernierCaliperState> &
  MeasurableInstrument &
  SerializableInstrument &
  CalibratableInstrument;

const CSS = `
:host {
  --bg-color: #e8eaec;
  --main-ruler-bg: #c5c7cb;
  --main-ruler-dark: #a0a2a6;
  --vernier-bg-top: #f8f9fa;
  --vernier-bg-bottom: #dce0e3;
  --slider-bg: #5f6267;
  --lens-border-outer: #3d4044;
  --lens-border-inner: #808489;
  --lens-orange-center: #ffce99;
  --lens-orange-edge: #f58f29;
  --tick-color: #222;
}

.microscope-root {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  background: transparent;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  user-select: none;
  overflow: visible;
  position: relative;
}

.header-panel {
  position: absolute;
  top: 6px;
  right: 10px;
  z-index: 20;
  padding: 0;
  text-align: right;
}

.readout-display {
  font-size: 18px;
  font-weight: bold;
  font-family: monospace;
  background: #fff;
  color: #1565c0;
  border: 2px solid #ddd;
  padding: 5px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08), inset 0 0 10px rgba(21,101,192,0.08);
  letter-spacing: 1px;
  display: inline-block;
}

.tips {
  font-size: 14px;
  color: #555;
  margin-top: 10px;
  line-height: 1.5;
}

.scroll-wrapper {
  flex: 1;
  width: 100%;
  overflow: visible;
  display: flex;
  justify-content: var(--instrument-justify, center);
  align-items: flex-start;
  padding: 10px;
  box-sizing: border-box;
}

@media (max-width: 860px) {
  .scroll-wrapper {
    justify-content: flex-start;
  }
}

.instrument-container {
  position: relative;
  width: 695px;
  height: 250px;
  background-color: transparent;
  margin-left: var(--instrument-offset, 0px);
  overflow: visible;
  flex-shrink: 0;
  transform-origin: top left;
}

.main-ruler {
  position: absolute;
  top: 5px;
  left: 0;
  width: 100%;
  height: 55px;
  background: linear-gradient(to bottom, var(--main-ruler-bg) 0%, var(--main-ruler-bg) 80%, var(--main-ruler-dark) 100%);
  border-bottom: 2px solid #111;
  box-shadow: inset 0 2px 5px rgba(255,255,255,0.8);
  cursor: grab;
}
.main-ruler:active {
  cursor: grabbing;
}

.ticks-container {
  position: absolute;
  bottom: 0;
  left: 29px;
  width: 672px;
  height: 100%;
}

.tick {
  position: absolute;
  bottom: 0;
  width: 1px;
  background-color: var(--tick-color);
  transform: translateX(-50%);
}

.tick-label {
  position: absolute;
  bottom: 20px;
  transform: translateX(-50%);
  font-size: 18px;
  color: #111;
  font-weight: 500;
}

.slider-assembly {
  position: absolute;
  top: 60px;
  left: 0;
  width: 566px;
  height: 189px;
  will-change: transform;
  cursor: grab;
  touch-action: none;
}
.slider-assembly:active {
  cursor: grabbing;
}

.vernier-ruler {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 25px;
  background: linear-gradient(to bottom, var(--vernier-bg-top), var(--vernier-bg-bottom));
  clip-path: polygon(14px 0, 552px 0, 100% 100%, 0 100%);
  border-bottom: 1px solid #999;
}

.vernier-ticks-container {
  position: absolute;
  top: 0;
  left: 29px;
  width: 470px;
  height: 100%;
}

.vernier-tick {
  position: absolute;
  top: 0;
  width: 1px;
  background-color: var(--tick-color);
  transform: translateX(-50%);
}

.vernier-tick-label {
  position: absolute;
  top: 10px;
  transform: translateX(-50%);
  font-size: 11px;
  color: #222;
  font-weight: 500;
}

.slider-body {
  position: absolute;
  top: 25px;
  left: 0;
  width: 100%;
  height: 164px;
  background: linear-gradient(to bottom, #696c71, var(--slider-bg));
  box-shadow: 5px 10px 15px rgba(0,0,0,0.6), inset 0 1px 2px rgba(255,255,255,0.2);
  border-top: 1px solid #444;
}

.lens-assembly {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 163px;
  height: 163px;
  border-radius: 50%;
  background-color: var(--lens-border-outer);
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 5px 15px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1);
  border: 1px solid #222;
}

.lens-glass {
  width: 134px;
  height: 134px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #ffffff 0%, #fbd1a6 60%, #e09854 100%);
  border: 4px solid var(--lens-border-inner);
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.6);
}

.stripe-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  will-change: transform;
}

.crosshair-system {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  will-change: transform;
}

.crosshair-v {
  position: absolute;
  top: 0;
  left: calc(50% - 1px);
  width: 2px;
  height: 100%;
  background-color: rgba(20, 20, 20, 0.9);
  box-shadow: 1px 0 1px rgba(255,255,255,0.3);
}

.crosshair-h {
  position: absolute;
  top: calc(50% - 1px);
  left: 0;
  width: 100%;
  height: 2px;
  background-color: rgba(20, 20, 20, 0.9);
  box-shadow: 0 1px 1px rgba(255,255,255,0.3);
}

.screw-assembly {
  position: absolute;
  top: 82px;
  right: -88px;
  width: 88px;
  height: 50px;
  display: flex;
  align-items: center;
}

.screw-thread {
  width: 56px;
  height: 16px;
  background: repeating-linear-gradient(to right, #999 0px, #999 2px, #ccc 3px, #777 4px);
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  border-top: 1px solid #fff;
  border-bottom: 1px solid #333;
}

.knob {
  width: 24px;
  height: 37px;
  background: linear-gradient(to bottom, #666, #aaa, #444);
  border-radius: 3px;
  position: relative;
  cursor: ew-resize;
  box-shadow: 2px 5px 8px rgba(0,0,0,0.6), inset 1px 0 2px rgba(255,255,255,0.5);
  border: 1px solid #222;
  touch-action: none;
}

.knob::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.4) 4px, rgba(0,0,0,0.4) 5px);
  border-radius: 3px;
}

.knob:hover {
  filter: brightness(1.1);
}
`;

// ── 物理与像素常量 ──
const UNIT_PX = 96;               // 1 cm = 96 px
const MAIN_SUB_TICK_PX = 9.6;     // 0.1 cm = 9.6 px
const VERNIER_DIVISIONS = 50;     // 50 分度游标
const VERNIER_LENGTH_UNITS = 4.9; // 游标尺总长 4.9 cm
const VERNIER_LENGTH_PX = VERNIER_LENGTH_UNITS * UNIT_PX; // 470.4 px
const VERNIER_SUB_TICK_PX = VERNIER_LENGTH_PX / VERNIER_DIVISIONS; // 9.408 px
const LEAST_COUNT_PX = 0.192;     // 最小移动像素步长
const MAX_CM = 2.1;               // 量程上限 2.1 cm
const MAX_X = MAX_CM * UNIT_PX;   // 201.6 px
const PATTERN_CENTER_CM = 1.5;    // 干涉图样中心固定位置
const PATTERN_ABSOLUTE_X = PATTERN_CENTER_CM * UNIT_PX; // 144 px
const LENS_OFFSET_FROM_VERNIER = 235; // 视场中心相对游标 0 刻度
const LENS_VISUAL_SCALE = 1.2;    // 目镜内容视觉放大系数

export function createInterferenceVernierCaliperView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showHints?: boolean;
}): InterferenceVernierCaliperView {
  const { canvas, showHints = true } = options;
  const parent = canvas.parentElement;
  if (!parent) {
    throw new Error('InterferenceVernierCaliperView: canvas must have a parent element');
  }

  canvas.style.display = 'none';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute;
    left: 0; top: 0;
    width: 100%; height: 100%;
    overflow: visible;
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
  root.innerHTML = `
    <div class="header-panel">
      <div class="readout-display" id="readout">0.840 cm</div>
      <div class="tips" id="tips-text">
        <strong>操作说明：</strong> 拖动中间滑块进行粗调，横向拖动右侧旋钮进行精确微调。<br>
        <i>*若屏幕较窄导致两侧不可见，可在黑色背景处滑动平移。</i>
      </div>
    </div>
    <div class="scroll-wrapper">
      <div class="instrument-container" id="instrument">
        <div class="main-ruler">
          <div class="ticks-container" id="main-ticks"></div>
        </div>
        <div class="slider-assembly" id="slider">
          <div class="vernier-ruler">
            <div class="vernier-ticks-container" id="vernier-ticks"></div>
          </div>
          <div class="slider-body">
            <div class="lens-assembly">
              <div class="lens-glass">
                <div class="stripe-layer" id="stripe-layer"></div>
                <div class="crosshair-system" id="crosshair-system">
                  <div class="crosshair-v"></div>
                  <div class="crosshair-h"></div>
                </div>
              </div>
            </div>
          </div>
          <div class="screw-assembly">
            <div class="screw-thread"></div>
            <div class="knob" id="knob" title="水平拖动旋钮以微调"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const qs = <T extends Element>(id: string) => shadow.getElementById(id) as unknown as T;

  const mainTicksContainer = qs<HTMLDivElement>('main-ticks');
  const vernierTicksContainer = qs<HTMLDivElement>('vernier-ticks');
  const slider = qs<HTMLDivElement>('slider');
  const stripeLayer = qs<HTMLDivElement>('stripe-layer');
  const crosshairSystem = qs<HTMLDivElement>('crosshair-system');
  const readoutDisplay = qs<HTMLDivElement>('readout');
  const tipsEl = qs<HTMLDivElement>('tips-text');
  const knob = qs<HTMLDivElement>('knob');
  const instrumentEl = qs<HTMLDivElement>('instrument');
  const mainRuler = root.querySelector('.main-ruler') as HTMLElement;
  const headerPanel = root.querySelector('.header-panel') as HTMLElement;

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
  let currentReadingCm = 1.400;
  let zeroOffset = 0;
  let disposed = false;
  let simLastZero = 0;
  let simLastCrosshairAngle = 0;
  let viewMode: 'crosshair' | 'fringe' = 'fringe';
  let simLastViewMode: 'crosshair' | 'fringe' = 'fringe';
  let crosshairRefCm = currentReadingCm;
  let stripeOffsetMm = 12;

  const listeners = {
    reading: [] as Array<(reading: number) => void>,
    align: [] as Array<() => void>,
    limit: [] as Array<() => void>,
  };

  let wasAtLimit = false;

  // ── 条纹配置 ──
  const fringeConfig = {
    spacing: 16,
    blur: 1.5,
    opacity: 0.85,
    envelopeWidth: 320,
    color: 'rgba(30,15,0,0.85)',
  };
  let rawSpacing = 0;

  // ── 生成主尺刻度 ──
  function initMainRuler() {
    for (let i = 0; i <= 70; i++) {
      const tick = document.createElement('div');
      tick.className = 'tick';
      tick.style.left = `${i * MAIN_SUB_TICK_PX}px`;
      if (i % 10 === 0) {
        tick.style.height = '18px';
        const label = document.createElement('div');
        label.className = 'tick-label';
        label.style.left = `${i * MAIN_SUB_TICK_PX}px`;
        label.innerText = String(i / 10);
        mainTicksContainer.appendChild(label);
      } else if (i % 5 === 0) {
        tick.style.height = '12px';
      } else {
        tick.style.height = '7px';
      }
      mainTicksContainer.appendChild(tick);
    }
  }

  // ── 生成游标刻度 ──
  function initVernier() {
    for (let i = 0; i <= VERNIER_DIVISIONS; i++) {
      const tick = document.createElement('div');
      tick.className = 'vernier-tick';
      tick.style.left = `${i * VERNIER_SUB_TICK_PX}px`;
      if (i % 5 === 0) {
        tick.style.height = '12px';
        const label = document.createElement('div');
        label.className = 'vernier-tick-label';
        label.style.left = `${i * VERNIER_SUB_TICK_PX}px`;
        let num = i / 5;
        if (num === 10) num = 0;
        label.innerText = String(num);
        vernierTicksContainer.appendChild(label);
      } else {
        tick.style.height = '6px';
      }
      vernierTicksContainer.appendChild(tick);
    }
  }

  // ── 生成干涉条纹（CSS gradient，与螺旋测微仪一致）──
  function updatePattern() {
    const s = fringeConfig.spacing;
    const { color } = fringeConfig;
    const gap = Math.round(s * 0.3);
    const fadeInEnd = Math.round(s * 0.4);
    const fadeOutStart = Math.round(s * 0.6);
    const fadeOutEnd = Math.round(s * 0.7);
    const fadeColor = `color-mix(in srgb, transparent 50%, ${color})`;
    stripeLayer.style.backgroundImage = `repeating-linear-gradient(
      90deg,
      transparent 0px,
      transparent ${gap}px,
      ${fadeColor} ${fadeInEnd}px,
      ${color} ${Math.round(s * 0.5)}px,
      ${color} ${fadeOutStart}px,
      ${fadeColor} ${fadeOutEnd}px,
      transparent ${s}px
    )`;
  }

  // ── 核心渲染 ──
  function renderView() {
    if (disposed) return;

    // 吸附到精度
    let snappedX = Math.round((currentReadingCm * UNIT_PX) / LEAST_COUNT_PX) * LEAST_COUNT_PX;
    if (snappedX < 0) snappedX = 0;
    if (snappedX > MAX_X) snappedX = MAX_X;
    currentReadingCm = snappedX / UNIT_PX;

    // 1. 移动滑块
    slider.style.transform = `translateX(${snappedX}px)`;

    // 2. 根据视场模式切换分划板/条纹运动
    const patternTranslateX = PATTERN_ABSOLUTE_X - (snappedX + LENS_OFFSET_FROM_VERNIER);
    const rawOffset = patternTranslateX * LENS_VISUAL_SCALE;
    const period = fringeConfig.spacing;
    const normOffset = ((Math.round(rawOffset) % period) + period) % period;

    if (viewMode === 'crosshair') {
      // 准星移动模式：条纹固定，准星从切换位置开始线性移动
      stripeLayer.style.backgroundPositionX = '0px';
      const vo = (currentReadingCm * 10 - crosshairRefCm * 10 - stripeOffsetMm) * (UNIT_PX * LENS_VISUAL_SCALE / 10);
      crosshairSystem.style.transform = `translateX(${Math.round(vo)}px) rotate(${simLastCrosshairAngle}deg)`;
    } else {
      // 准星不动模式（默认）：准星固定居中，条纹随滑块逆向移动
      stripeLayer.style.backgroundPositionX = `${normOffset}px`;
      crosshairSystem.style.transform = `rotate(${simLastCrosshairAngle}deg)`;
    }

    // 3. 更新读数
    const totalReading = currentReadingCm + zeroOffset;
    readoutDisplay.innerText = `${totalReading.toFixed(3)} cm`;

    // 4. 边界检测
    const atLimit = currentReadingCm <= 0.001 || currentReadingCm >= MAX_CM - 0.001;
    if (atLimit && !wasAtLimit) {
      listeners.limit.forEach((cb) => cb());
    }
    wasAtLimit = atLimit;
  }

  // ── 交互事件 ──
  let isDragging = false;
  let dragMode: 'slider' | 'knob' | null = null;
  let startPointerX = 0;
  let startReadingCm = 0;

  // ── 整体仪器拖拽（拖动主刻度尺）──
  let sysDragging = false;
  let sysStartX = 0;
  let sysStartY = 0;
  const parentRect = parent.getBoundingClientRect();
  const scaledW = 695 * 2;
  const scaledH = 250 * 2;
  let sysX = parentRect.width > 100 ? Math.round((parentRect.width - scaledW) / 2) : -100;
  let sysY = parentRect.height > 100 ? Math.max(0, Math.round((parentRect.height - scaledH) / 2)) : 0;

  function getPointerX(e: MouseEvent | TouchEvent): number {
    if ('touches' in e && e.touches.length > 0) {
      return e.touches[0].clientX;
    }
    return (e as MouseEvent).clientX;
  }

  function handleDragStart(e: MouseEvent | TouchEvent, mode: 'slider' | 'knob') {
    if (mode === 'slider') {
      const target = e.target as HTMLElement;
      if (target.id === 'knob' || target.closest('#knob')) return;
    }
    isDragging = true;
    dragMode = mode;
    startPointerX = getPointerX(e);
    startReadingCm = currentReadingCm;
  }

  function handleDragMove(e: MouseEvent | TouchEvent) {
    if (!isDragging) return;
    if ('touches' in e && e.cancelable) {
      e.preventDefault();
    }
    const deltaX = getPointerX(e) - startPointerX;
    if (dragMode === 'slider') {
      currentReadingCm = startReadingCm + (deltaX / 2) / UNIT_PX;
    } else if (dragMode === 'knob') {
      currentReadingCm = startReadingCm + (deltaX / 2 / UNIT_PX) * 0.1;
    }
    renderView();
    emitReading();
  }

  function handleDragEnd() {
    isDragging = false;
    dragMode = null;
  }

  function emitReading() {
    const reading = currentReadingCm + zeroOffset;
    listeners.reading.forEach((cb) => cb(reading));
  }

  const onSliderMouseDown = (e: MouseEvent) => handleDragStart(e, 'slider');
  const onSliderTouchStart = (e: TouchEvent) => handleDragStart(e, 'slider');
  const onKnobMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    handleDragStart(e, 'knob');
  };
  const onKnobTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    handleDragStart(e, 'knob');
  };

  const handleSysDragStart = (clientX: number, clientY: number) => {
    sysDragging = true;
    sysStartX = clientX;
    sysStartY = clientY;
  };
  const handleSysDragMove = (clientX: number, clientY: number) => {
    if (!sysDragging) return;
    sysX += clientX - sysStartX;
    sysY += clientY - sysStartY;
    sysStartX = clientX;
    sysStartY = clientY;
    instrumentEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(2)`;
  };
  const handleSysDragEnd = () => {
    sysDragging = false;
  };

  const onRulerMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    handleSysDragStart(e.clientX, e.clientY);
  };
  const onRulerTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    handleSysDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onDocMouseMove = (e: MouseEvent) => {
    if (isDragging) handleDragMove(e);
    if (sysDragging) handleSysDragMove(e.clientX, e.clientY);
  };
  const onDocTouchMove = (e: TouchEvent) => {
    if (isDragging) handleDragMove(e);
    if (sysDragging) {
      if (e.cancelable) e.preventDefault();
      handleSysDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onDocMouseUp = () => {
    handleDragEnd();
    handleSysDragEnd();
  };
  const onDocTouchEnd = () => {
    handleDragEnd();
    handleSysDragEnd();
  };
  const onDocTouchCancel = () => {
    handleDragEnd();
    handleSysDragEnd();
  };

  slider.addEventListener('mousedown', onSliderMouseDown);
  slider.addEventListener('touchstart', onSliderTouchStart, { passive: false });
  knob.addEventListener('mousedown', onKnobMouseDown);
  knob.addEventListener('touchstart', onKnobTouchStart, { passive: false });
  mainRuler.addEventListener('mousedown', onRulerMouseDown);
  mainRuler.addEventListener('touchstart', onRulerTouchStart, { passive: false });
  document.addEventListener('mousemove', onDocMouseMove);
  document.addEventListener('touchmove', onDocTouchMove, { passive: false });
  document.addEventListener('mouseup', onDocMouseUp);
  document.addEventListener('touchend', onDocTouchEnd);
  document.addEventListener('touchcancel', onDocTouchCancel);

  // ── 键盘可访问性 ──
  mainRuler.tabIndex = 0;
  mainRuler.setAttribute('role', 'button');
  mainRuler.setAttribute('aria-label', '主刻度尺，拖动可移动整个仪器');
  const onRulerKeyDown = (e: KeyboardEvent) => {
    const step = 30;
    switch (e.key) {
      case 'ArrowRight': sysX += step; break;
      case 'ArrowLeft':  sysX -= step; break;
      case 'ArrowUp':    sysY -= step; break;
      case 'ArrowDown':  sysY += step; break;
      default: return;
    }
    e.preventDefault();
    instrumentEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(2)`;
  };
  mainRuler.addEventListener('keydown', onRulerKeyDown);

  // ── 启动 ──
  instrumentEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(2)`;
  initMainRuler();
  initVernier();
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
        fringeConfig.spacing = Math.round(state.fringeSpacing * LENS_VISUAL_SCALE);
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
          crosshairRefCm = currentReadingCm;
        }
        viewMode = state.viewMode;
        simLastViewMode = state.viewMode;
      }

      if (state.stripeOffset !== undefined) {
        stripeOffsetMm = state.stripeOffset;
      }

      const stripeOffsetChanged = state.stripeOffset !== undefined && state.stripeOffset !== stripeOffsetMm;
      const needRender =
        state.zeroOffset !== simLastZero ||
        state.crosshairAngle !== simLastCrosshairAngle ||
        viewModeChanged ||
        stripeOffsetChanged;
      if (needRender) {
        simLastCrosshairAngle = state.crosshairAngle;
        zeroOffset = state.zeroOffset;
        simLastZero = state.zeroOffset;
        if (stripeOffsetChanged && state.stripeOffset !== undefined) stripeOffsetMm = state.stripeOffset;
        renderView();
      }
    },
    resize() {
      // 固定 820×420 尺寸，内部使用 overflow-x: auto 处理窄屏
    },
    setTheme() {
      // 固定配色
    },
    setViewport() {
      // 内部布局已固定
    },
    dispose() {
      disposed = true;
      slider.removeEventListener('mousedown', onSliderMouseDown);
      slider.removeEventListener('touchstart', onSliderTouchStart);
      knob.removeEventListener('mousedown', onKnobMouseDown);
      knob.removeEventListener('touchstart', onKnobTouchStart);
      mainRuler.removeEventListener('mousedown', onRulerMouseDown);
      mainRuler.removeEventListener('touchstart', onRulerTouchStart);
      mainRuler.removeEventListener('keydown', onRulerKeyDown);
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('touchmove', onDocTouchMove);
      document.removeEventListener('mouseup', onDocMouseUp);
      document.removeEventListener('touchend', onDocTouchEnd);
      document.removeEventListener('touchcancel', onDocTouchCancel);
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
      return currentReadingCm + zeroOffset;
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
        currentReading: currentReadingCm,
        zeroOffset,
        fringeSpacing: fringeConfig.spacing,
        fringeBlur: fringeConfig.blur,
        fringeOpacity: fringeConfig.opacity,
        fringeEnvelopeWidth: fringeConfig.envelopeWidth,
        fringeColor: fringeConfig.color,
        sysX,
        sysY,
      });
    },
    deserialize(json) {
      try {
        const data = JSON.parse(json);
        if (typeof data.currentReading === 'number') {
          currentReadingCm = Math.max(0, Math.min(data.currentReading, MAX_CM));
        }
        if (typeof data.zeroOffset === 'number') {
          zeroOffset = Math.max(-0.5, Math.min(data.zeroOffset, 0.5));
        }
        if (typeof data.fringeSpacing === 'number') fringeConfig.spacing = Math.max(5, data.fringeSpacing);
        if (typeof data.fringeBlur === 'number') fringeConfig.blur = Math.max(0, data.fringeBlur);
        if (typeof data.fringeOpacity === 'number') fringeConfig.opacity = Math.max(0, Math.min(data.fringeOpacity, 1));
        if (typeof data.fringeEnvelopeWidth === 'number') fringeConfig.envelopeWidth = Math.max(50, data.fringeEnvelopeWidth);
        if (typeof data.fringeColor === 'string') fringeConfig.color = data.fringeColor;
        if (typeof data.sysX === 'number') sysX = data.sysX;
        if (typeof data.sysY === 'number') sysY = data.sysY;
        instrumentEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(2)`;
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
    },
  } as InterferenceVernierCaliperView & { setReadoutVisible(visible: boolean): void };
}
