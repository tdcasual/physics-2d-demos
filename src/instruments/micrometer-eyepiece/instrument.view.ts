/**
 * 高精度干涉测微仪 — 渲染器（DOM 实现）
 *
 * 扩展接口：MeasurableInstrument + SerializableInstrument + CalibratableInstrument
 */

import type { TeachingTheme } from '../../platform/standards';
import type {
  InstrumentView,
  InstrumentViewport,
  MeasurableInstrument,
  SerializableInstrument,
  CalibratableInstrument,
} from '../_contract/instrument-contract';
import type { MicrometerEyepieceState } from './instrument.sim';

export type MicrometerEyepieceView = InstrumentView<MicrometerEyepieceState> &
  MeasurableInstrument &
  SerializableInstrument &
  CalibratableInstrument;

const CSS = `
:host {
  --border-dark: #2c3338;
  --case-bg: #b5bcc2;
  --ring-outer: #848d94;
  --ring-inner: #545c62;
  --sleeve-bg: #d7dadd;
  --thimble-bevel: #e2e5e7;
  --thimble-body: #cfd3d6;
  --scale-color: #1a1c1e;
  --tick-gap-x: 11px;
  --tick-gap-y: 8px;
}

.micrometer-root {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  height: 100%;
  padding-top: 15px;
  box-sizing: border-box;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  overflow: visible;
}

.micrometer-system {
  display: flex;
  align-items: center;
  position: relative;
  transform-origin: top left;
}

.case {
  width: 240px;
  height: 240px;
  background-color: var(--case-bg);
  border: 4px solid var(--border-dark);
  border-radius: 45px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 10;
  box-shadow: 10px 10px 20px rgba(0,0,0,0.15);
  cursor: grab;
}

.case:active {
  cursor: grabbing;
}

.lens-outer-ring {
  width: 200px;
  height: 200px;
  background-color: var(--ring-outer);
  border: 4px solid var(--border-dark);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.lens-inner-ring {
  width: 176px;
  height: 176px;
  background-color: var(--ring-inner);
  border: 4px solid var(--border-dark);
  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.lens-view {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 40% 40%, #ffffff 0%, #fbd1a6 60%, #e09854 100%);
  position: absolute;
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0px,
    transparent 15px,
    rgba(200, 80, 20, 0.2) 22px,
    rgba(200, 80, 20, 0.4) 25px,
    rgba(200, 80, 20, 0.2) 28px,
    transparent 35px,
    transparent 50px
  );
}

.crosshair-system {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
}

.crosshair-v {
  position: absolute;
  width: 2px;
  height: 100%;
  background-color: rgba(20, 20, 20, 0.85);
  left: 50%;
  transform: translateX(-50%);
}

.crosshair-h {
  position: absolute;
  height: 2px;
  width: 100%;
  background-color: rgba(20, 20, 20, 0.85);
  top: 50%;
  transform: translateY(-50%);
}

.sleeve-container {
  position: absolute;
  left: 215px;
  height: 110px;
  width: 250px;
  background: linear-gradient(to bottom, #e8eaec 0%, var(--sleeve-bg) 30%, var(--sleeve-bg) 70%, #b8bcbf 100%);
  border-top: 4px solid var(--border-dark);
  border-bottom: 4px solid var(--border-dark);
  z-index: 5;
}

.baseline {
  position: absolute;
  top: 50%;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--scale-color);
  transform: translateY(-50%);
}

.sleeve-scales {
  position: absolute;
  top: 0;
  left: 30px;
  width: 100%;
  height: 100%;
}

.sleeve-tick {
  position: absolute;
  width: 2px;
  background-color: var(--scale-color);
}

.sleeve-tick.major {
  bottom: 50%;
  height: 12px;
}

.sleeve-tick.major.numbered {
  height: 18px;
}

.sleeve-tick.minor {
  top: 50%;
  height: 10px;
}

.sleeve-number {
  position: absolute;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  font-family: "Times New Roman", Times, serif;
  font-size: 14px;
  font-weight: bold;
  color: var(--scale-color);
}

/* 反转模式：mm 刻度在基准线下方，0.5mm 刻度在上方 */
.sleeve-container.scale-inverted .sleeve-tick.major {
  top: 50%;
  bottom: auto;
}

.sleeve-container.scale-inverted .sleeve-tick.minor {
  bottom: 50%;
  top: auto;
}

.sleeve-container.scale-inverted .sleeve-number {
  top: 22px;
  bottom: auto;
}

.thimble-group {
  position: absolute;
  left: 280px;
  display: flex;
  align-items: center;
  z-index: 8;
  cursor: grab;
  filter: drop-shadow(-4px 0px 6px rgba(0,0,0,0.2));
}

.thimble-group:active {
  cursor: grabbing;
}

.thimble-bevel {
  width: 35px;
  height: 136px;
  background: linear-gradient(to bottom, #f0f2f3 0%, var(--thimble-bevel) 20%, var(--thimble-bevel) 80%, #c4c8cb 100%);
  border: 4px solid var(--border-dark);
  border-right: none;
  border-radius: 6px 0 0 6px;
  position: relative;
  overflow: hidden;
}

.thimble-bevel::after {
  content: '';
  position: absolute;
  right: 0;
  top: 0;
  width: 6px;
  height: 100%;
  background: linear-gradient(to right, transparent, rgba(0,0,0,0.15));
}

.thimble-scales-strip {
  position: absolute;
  width: 100%;
  left: 0;
  bottom: 0;
}

.thimble-tick {
  position: absolute;
  height: 2px;
  background-color: var(--scale-color);
  left: 0;
}

.thimble-tick.major { width: 15px; }
.thimble-tick.minor { width: 10px; }

.thimble-number {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  font-family: "Times New Roman", Times, serif;
  font-size: 14px;
  font-weight: bold;
  color: var(--scale-color);
  line-height: 1;
}

.thimble-body {
  width: 100px;
  height: 136px;
  background: linear-gradient(to bottom, #f4f5f6 0%, var(--thimble-body) 20%, var(--thimble-body) 80%, #b5b9bc 100%);
  border: 4px solid var(--border-dark);
  border-left: 1px solid rgba(0,0,0,0.3);
}

.ratchet {
  width: 45px;
  height: 90px;
  background: linear-gradient(to bottom, #eff1f2 0%, #c8cccf 20%, #c8cccf 80%, #a2a6a9 100%);
  border: 4px solid var(--border-dark);
  border-left: none;
  border-radius: 0 8px 8px 0;
}

.dashboard {
  margin-top: 50px;
  background: transparent;
  padding: 15px 30px;
  text-align: center;
  z-index: 20;
}

.readout {
  font-family: "Courier New", Courier, monospace;
  font-size: 32px;
  font-weight: bold;
  color: #1565c0;
  letter-spacing: 2px;
}

.hint {
  font-size: 13px;
  color: #555;
  margin-top: 8px;
}
`;

export function createMicrometerEyepieceView(options: {
  canvas: HTMLCanvasElement;
  theme: TeachingTheme;
  viewport?: InstrumentViewport;
  showHints?: boolean;
}): MicrometerEyepieceView {
  const { canvas, showHints = true } = options;
  const parent = canvas.parentElement;
  if (!parent) {
    throw new Error('MicrometerEyepieceView: canvas must have a parent element');
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
  root.className = 'micrometer-root';
  shadow.appendChild(root);

  // ── DOM 结构（与原始 HTML 完全一致）──
  root.innerHTML = `
    <div class="micrometer-system">
      <div class="case">
        <div class="lens-outer-ring">
          <div class="lens-inner-ring">
            <div class="lens-view" id="lens-view"></div>
            <div class="crosshair-system" id="crosshair-system">
              <div class="crosshair-v"></div>
              <div class="crosshair-h"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="sleeve-container">
        <div class="baseline"></div>
        <div class="sleeve-scales" id="sleeve-scales"></div>
      </div>
      <div class="thimble-group" id="thimble-group">
        <div class="thimble-bevel">
          <div class="thimble-scales-strip" id="thimble-strip"></div>
        </div>
        <div class="thimble-body"></div>
        <div class="ratchet"></div>
      </div>
    </div>
    <div class="dashboard">
      <div class="hint" id="hint-text"></div>
    </div>
  `;

  const qs = <T extends HTMLElement>(id: string) => shadow.getElementById(id) as T;

  const sleeveContainer = root.querySelector('.sleeve-container') as HTMLDivElement;
  const sleeveScales = qs<HTMLDivElement>('sleeve-scales');
  const thimbleStrip = qs<HTMLDivElement>('thimble-strip');
  const thimbleGroup = qs<HTMLDivElement>('thimble-group');
  const crosshairSystem = qs<HTMLDivElement>('crosshair-system');
  const lensView = qs<HTMLDivElement>('lens-view');
  const readoutDisplay = shadow.getElementById('readout-display') as HTMLDivElement | null;
  const hintEl = qs<HTMLDivElement>('hint-text');
  const caseEl = root.querySelector('.case') as HTMLDivElement;
  const systemEl = root.querySelector('.micrometer-system') as HTMLDivElement;

  function updateHint() {
    if (!hintEl) return;
    hintEl.textContent = viewMode === 'crosshair'
      ? '↕ 上下拨动或 ↔ 左右推拉右侧测微螺杆，移动准星瞄准条纹'
      : '↕ 上下拨动或 ↔ 左右推拉右侧测微螺杆，移动条纹对准准星';
  }

  if (!showHints && hintEl) {
    hintEl.style.display = 'none';
  }

  const config = {
    initialReading: 0,
    maxReading: 32.00,
    tickGapX: 10,
    tickGapY: 8,
  };

  let crosshairSpeed = 100;

  let currentReading = config.initialReading;
  let zeroOffset = 0;
  let viewMode: 'crosshair' | 'fringe' = 'crosshair';
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startReading = 0;
  let disposed = false;
  let simLastReading = config.initialReading;
  let simLastZero = 0;
  let simLastViewMode: 'crosshair' | 'fringe' = 'crosshair';
  let simLastSpeed = 100;
  let simLastScaleInverted = false;

  // 整体仪器拖拽状态
  let sysDragging = false;
  let sysStartX = 0;
  let sysStartY = 0;
  const parentRect = parent.getBoundingClientRect();
  const scaledW = 915 * 1.5;
  const scaledH = 450 * 1.5;
  let sysX = parentRect.width > 100 ? Math.round((parentRect.width - scaledW) / 2) : -100;
  let sysY = parentRect.height > 100 ? Math.max(0, Math.round((parentRect.height - scaledH) / 2)) : 0;

  // 事件监听器
  const listeners = {
    reading: [] as Array<(reading: number) => void>,
    align: [] as Array<() => void>,
    limit: [] as Array<() => void>,
  };

  let wasAligned = false;
  let wasAtLimit = false;

  // ── 条纹配置 ──
  const stripeConfig = {
    offset: 1200,
    spacing: 50,
    color: 'rgba(200, 80, 20, 0.4)',
    angle: 90,
  };

  function emitReading() {
    const reading = currentReading + zeroOffset;
    listeners.reading.forEach((cb) => cb(reading));
  }

  function checkAlign(viewOffset: number, spacing: number) {
    const dist = Math.abs(((viewOffset - spacing / 2) % spacing + spacing) % spacing - spacing / 2);
    return dist < 2;
  }

  function checkLimit(reading: number) {
    return reading <= 0.001 || reading >= config.maxReading - 0.001;
  }

  // ── 更新干涉条纹 ──
  function updateStripes() {
    const s = stripeConfig;
    const gap = Math.round(s.spacing * 0.3);
    const fadeInEnd = Math.round(s.spacing * 0.4);
    const fadeOutStart = Math.round(s.spacing * 0.6);
    const fadeOutEnd = Math.round(s.spacing * 0.7);
    const fadeColor = `color-mix(in srgb, transparent 50%, ${s.color})`;
    // 间隙 → 渐变淡入 → 实心 → 渐变淡出 → 间隙（循环边界无缝）
    lensView.style.backgroundImage = `repeating-linear-gradient(
      ${s.angle}deg,
      transparent 0px,
      transparent ${gap}px,
      ${fadeColor} ${fadeInEnd}px,
      ${s.color} ${Math.round(s.spacing * 0.5)}px,
      ${s.color} ${fadeOutStart}px,
      ${fadeColor} ${fadeOutEnd}px,
      transparent ${s.spacing}px
    )`;
  }

  // ── 初始化主尺双刻度 ──
  function initSleeve() {
    const totalHalfMm = Math.floor(config.maxReading / 0.5);
    const sleeveWidth = totalHalfMm * config.tickGapX + 60;
    sleeveContainer.style.width = `${sleeveWidth}px`;

    for (let i = 0; i <= totalHalfMm; i++) {
      const isIntegerMm = (i % 2 === 0);
      const mmValue = i * 0.5;
      const tick = document.createElement('div');
      tick.style.left = `${i * config.tickGapX}px`;

      if (isIntegerMm) {
        const isNumbered = (mmValue % 5 === 0);
        tick.className = `sleeve-tick major ${isNumbered ? 'numbered' : ''}`;
        if (isNumbered) {
          const num = document.createElement('div');
          num.className = 'sleeve-number';
          num.innerText = String(mmValue);
          tick.appendChild(num);
        }
      } else {
        tick.className = 'sleeve-tick minor';
      }
      sleeveScales.appendChild(tick);
    }
  }

  // ── 副尺卷轴对象池 ──
  const TICK_POOL_SIZE = 40;
  const thimbleTickPool: Array<{ tick: HTMLDivElement; num: HTMLDivElement }> = [];

  // ── 初始化副尺卷轴（对象池，仅创建可视区域需要的 tick）──
  function initThimble() {
    for (let i = 0; i < TICK_POOL_SIZE; i++) {
      const tick = document.createElement('div');
      tick.className = 'thimble-tick';
      tick.style.position = 'absolute';
      tick.style.left = '0';

      const num = document.createElement('div');
      num.className = 'thimble-number';
      tick.appendChild(num);

      thimbleStrip.appendChild(tick);
      thimbleTickPool.push({ tick, num });
    }
  }

  function updateThimbleTicks() {
    const totalTicksPassed = currentReading / 0.01;
    const centerTick = Math.round(totalTicksPassed);
    const halfPool = Math.floor(TICK_POOL_SIZE / 2);

    for (let i = 0; i < TICK_POOL_SIZE; i++) {
      const tickIndex = centerTick - halfPool + i;
      const { tick, num } = thimbleTickPool[i];

      if (tickIndex < 0 || tickIndex >= 3000) {
        tick.style.display = 'none';
        continue;
      }

      const val = tickIndex % 50;
      const isMajor = val % 5 === 0;

      tick.className = `thimble-tick ${isMajor ? 'major' : 'minor'}`;
      tick.style.bottom = `${tickIndex * config.tickGapY}px`;
      tick.style.display = 'block';

      if (isMajor) {
        num.style.display = 'block';
        num.innerText = String(val);
      } else {
        num.style.display = 'none';
      }
    }
  }

  // ── 核心物理渲染引擎 ──
  function renderView() {
    if (disposed) return;
    currentReading = Math.max(0, Math.min(currentReading, config.maxReading));

    // A. 测微筒水平位移
    const baseLeftX = 215 + 30;
    const moveX = (currentReading / 0.5) * config.tickGapX;
    thimbleGroup.style.left = `${baseLeftX + moveX}px`;

    // B. 副尺刻度垂直滚动匹配
    const totalTicksPassed = currentReading / 0.01;
    const targetYFromBottom = totalTicksPassed * config.tickGapY;
    const translateY = targetYFromBottom - 68;
    thimbleStrip.style.transform = `translateY(${translateY}px)`;

    // B2. 更新对象池中的可见 tick
    updateThimbleTicks();

    // C. 联动干涉视场
    const viewOffset = (currentReading - config.initialReading - stripeConfig.offset) * crosshairSpeed;
    if (viewMode === 'fringe') {
      // 条纹移动模式：准星固定，条纹随样品台移动
      crosshairSystem.style.transform = 'translateX(0)';
      lensView.style.backgroundPositionX = `${Math.round(-viewOffset)}px`;
    } else {
      // 准星移动模式（默认）：条纹固定，准星随螺杆移动
      lensView.style.backgroundPositionX = '0px';
      crosshairSystem.style.transform = `translateX(${Math.round(viewOffset)}px)`;
    }

    // D. 高精度数字更新
    const totalReading = currentReading + zeroOffset;
    if (readoutDisplay) readoutDisplay.innerText = totalReading.toFixed(3) + ' mm';

    // E. 事件检测
    const aligned = checkAlign(viewOffset, stripeConfig.spacing);
    if (aligned && !wasAligned) {
      listeners.align.forEach((cb) => cb());
    }
    wasAligned = aligned;

    const atLimit = checkLimit(currentReading);
    if (atLimit && !wasAtLimit) {
      listeners.limit.forEach((cb) => cb());
    }
    wasAtLimit = atLimit;
  }

  // ── 统一交互事件处理 ──
  const handleDragStart = (clientX: number, clientY: number) => {
    isDragging = true;
    startX = clientX;
    startY = clientY;
    startReading = currentReading;
    thimbleGroup.style.cursor = 'grabbing';
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const deltaX = clientX - startX;
    const deltaY = clientY - startY;
    const deltaReadingX = (deltaX / config.tickGapX) * 0.5;
    const deltaReadingY = (deltaY / config.tickGapY) * 0.01;
    const newReading = Math.max(0, Math.min(startReading + deltaReadingX + deltaReadingY, config.maxReading));
    if (newReading !== currentReading) {
      currentReading = newReading;
      renderView();
      emitReading();
    }
  };

  const handleDragEnd = () => {
    isDragging = false;
    thimbleGroup.style.cursor = 'grab';
  };

  // ── 整体仪器拖拽（拖动目镜）──
  const handleSysDragStart = (clientX: number, clientY: number) => {
    sysDragging = true;
    sysStartX = clientX;
    sysStartY = clientY;
    caseEl.style.cursor = 'grabbing';
  };

  const handleSysDragMove = (clientX: number, clientY: number) => {
    if (!sysDragging) return;
    sysX += clientX - sysStartX;
    sysY += clientY - sysStartY;
    sysStartX = clientX;
    sysStartY = clientY;
    systemEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(1.5)`;
  };

  const handleSysDragEnd = () => {
    sysDragging = false;
    caseEl.style.cursor = 'grab';
  };

  const onMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    handleDragStart(e.clientX, e.clientY);
  };
  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) handleDragMove(e.clientX, e.clientY);
    if (sysDragging) handleSysDragMove(e.clientX, e.clientY);
  };
  const onMouseUp = () => {
    handleDragEnd();
    handleSysDragEnd();
  };

  const onCaseMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    handleSysDragStart(e.clientX, e.clientY);
  };
  const onCaseTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    handleSysDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchStart = (e: TouchEvent) => {
    e.stopPropagation();
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };
  const onTouchMove = (e: TouchEvent) => {
    if (isDragging) {
      e.preventDefault();
      handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
    if (sysDragging) {
      e.preventDefault();
      handleSysDragMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  };
  const onTouchEnd = () => {
    handleDragEnd();
    handleSysDragEnd();
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const newReading = Math.max(0, Math.min(currentReading + (e.deltaY > 0 ? 0.01 : -0.01), config.maxReading));
    if (newReading !== currentReading) {
      currentReading = newReading;
      renderView();
      emitReading();
    }
  };

  thimbleGroup.addEventListener('mousedown', onMouseDown);
  caseEl.addEventListener('mousedown', onCaseMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
  thimbleGroup.addEventListener('touchstart', onTouchStart, { passive: false });
  caseEl.addEventListener('touchstart', onCaseTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
  thimbleGroup.addEventListener('wheel', onWheel, { passive: false });

  // ── 启动引擎 ──
  caseEl.style.cursor = 'grab';
  caseEl.setAttribute('role', 'button');
  caseEl.setAttribute('aria-label', '目镜壳体，拖动可移动整个仪器');
  caseEl.tabIndex = 0;
  systemEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(1.5)`;

  // ── 副尺键盘操作 ──
  thimbleGroup.tabIndex = 0;
  thimbleGroup.setAttribute('role', 'slider');
  thimbleGroup.setAttribute('aria-label', '测微螺杆');
  thimbleGroup.setAttribute('aria-valuemin', '0');
  thimbleGroup.setAttribute('aria-valuemax', String(config.maxReading));
  thimbleGroup.setAttribute('aria-valuenow', currentReading.toFixed(3));
  thimbleGroup.setAttribute('aria-valuetext', `${currentReading.toFixed(3)} mm`);

  const onThimbleKeyDown = (e: KeyboardEvent) => {
    let delta = 0;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowUp': delta = 0.01; break;
      case 'ArrowLeft':  case 'ArrowDown': delta = -0.01; break;
      case 'PageUp':   delta = 0.1; break;
      case 'PageDown': delta = -0.1; break;
      case 'Home': delta = -currentReading; break;
      case 'End':  delta = config.maxReading - currentReading; break;
      default: return;
    }
    e.preventDefault();
    const next = Math.max(0, Math.min(currentReading + delta, config.maxReading));
    if (next !== currentReading) {
      currentReading = next;
      renderView();
      emitReading();
      thimbleGroup.setAttribute('aria-valuenow', currentReading.toFixed(3));
      thimbleGroup.setAttribute('aria-valuetext', `${currentReading.toFixed(3)} mm`);
    }
  };

  const onCaseKeyDown = (e: KeyboardEvent) => {
    const step2 = 30;
    switch (e.key) {
      case 'ArrowRight': sysX += step2; break;
      case 'ArrowLeft':  sysX -= step2; break;
      case 'ArrowUp':    sysY -= step2; break;
      case 'ArrowDown':  sysY += step2; break;
      default: return;
    }
    e.preventDefault();
    systemEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(1.5)`;
  };

  thimbleGroup.addEventListener('keydown', onThimbleKeyDown);
  caseEl.addEventListener('keydown', onCaseKeyDown);
  initSleeve();
  initThimble();
  updateStripes();
  updateHint();
  renderView();

  return {
    render(state) {
      crosshairSpeed = state.crosshairSpeed;

      if (state.scaleInverted !== simLastScaleInverted) {
        simLastScaleInverted = state.scaleInverted;
        sleeveContainer.classList.toggle('scale-inverted', state.scaleInverted);
      }

      const stripeChanged =
        state.stripeSpacing !== stripeConfig.spacing ||
        state.stripeColor !== stripeConfig.color ||
        state.stripeAngle !== stripeConfig.angle;
      if (stripeChanged) {
        stripeConfig.spacing = state.stripeSpacing;
        stripeConfig.color = state.stripeColor;
        stripeConfig.angle = state.stripeAngle;
        updateStripes();
      }

      const needRender =
        state.currentReading !== simLastReading ||
        state.zeroOffset !== simLastZero ||
        state.stripeOffset !== stripeConfig.offset ||
        state.viewMode !== simLastViewMode ||
        state.crosshairSpeed !== simLastSpeed;
      if (needRender) {
        currentReading = state.currentReading;
        zeroOffset = state.zeroOffset;
        stripeConfig.offset = state.stripeOffset;
        viewMode = state.viewMode;
        simLastReading = state.currentReading;
        simLastZero = state.zeroOffset;
        simLastViewMode = state.viewMode;
        simLastSpeed = state.crosshairSpeed;
        updateStripes();
        updateHint();
        renderView();
      }
    },
    resize() {
      const rect = parent.getBoundingClientRect();
      const scaleX = rect.width / 700;
      const scaleY = rect.height / 450;
      const s = Math.min(scaleX, scaleY, 2.0);
      root.style.transform = `scale(${s})`;
      root.style.transformOrigin = 'top center';
    },
    setTheme(_theme: TeachingTheme) {
      // 固定工业配色
    },
    setViewport(_viewport: InstrumentViewport) {
      // DOM 层已占满 canvas 父容器
    },
    dispose() {
      disposed = true;
      thimbleGroup.removeEventListener('mousedown', onMouseDown);
      caseEl.removeEventListener('mousedown', onCaseMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      thimbleGroup.removeEventListener('touchstart', onTouchStart);
      caseEl.removeEventListener('touchstart', onCaseTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      thimbleGroup.removeEventListener('wheel', onWheel);
      thimbleGroup.removeEventListener('keydown', onThimbleKeyDown);
      caseEl.removeEventListener('keydown', onCaseKeyDown);
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
      return currentReading + zeroOffset;
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
        currentReading,
        zeroOffset,
        stripeOffset: stripeConfig.offset,
        stripeSpacing: stripeConfig.spacing,
        stripeColor: stripeConfig.color,
        stripeAngle: stripeConfig.angle,
        sysX,
        sysY,
      });
    },
    deserialize(json) {
      try {
        const data = JSON.parse(json);
        if (typeof data.currentReading === 'number') {
          currentReading = Math.max(0, Math.min(data.currentReading, config.maxReading));
        }
        if (typeof data.zeroOffset === 'number') {
          zeroOffset = Math.max(-0.5, Math.min(data.zeroOffset, 0.5));
        }
        if (typeof data.stripeOffset === 'number') {
          stripeConfig.offset = Math.max(0, Math.min(data.stripeOffset, 2000));
        }
        if (typeof data.stripeSpacing === 'number') {
          stripeConfig.spacing = Math.max(20, Math.min(data.stripeSpacing, 100));
        }
        if (typeof data.stripeColor === 'string') {
          stripeConfig.color = data.stripeColor;
        }
        if (typeof data.stripeAngle === 'number') {
          stripeConfig.angle = Math.max(0, Math.min(data.stripeAngle, 180));
        }
        if (typeof data.sysX === 'number') sysX = data.sysX;
        if (typeof data.sysY === 'number') sysY = data.sysY;
        systemEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(1.5)`;
        updateStripes();
        renderView();
      } catch {
        // 忽略无效的序列化数据
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
      if (readoutDisplay) readoutDisplay.style.display = visible ? '' : 'none';
    },
  } as MicrometerEyepieceView & { setReadoutVisible(visible: boolean): void };
}
