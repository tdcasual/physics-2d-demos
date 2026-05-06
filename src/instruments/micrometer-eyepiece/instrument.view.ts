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
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #e9ecef;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  user-select: none;
  overflow: hidden;
}

.micrometer-system {
  display: flex;
  align-items: center;
  position: relative;
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
}

.stripe-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
.thimble-tick.minor { width: 8px; }

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
  background: #fff;
  padding: 15px 30px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  border: 2px solid #e0e0e0;
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
    overflow: hidden;
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
            <div class="lens-view" id="lens-view">
              <svg class="stripe-svg" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <g id="stripe-group"></g>
              </svg>
            </div>
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
      <div class="readout" id="readout-display">0.300 mm</div>
      <div class="hint" id="hint-text">↕ 上下拨动或 ↔ 左右推拉右侧测微螺杆，移动左侧准星瞄准干涉条纹</div>
    </div>
  `;

  const qs = <T extends HTMLElement>(id: string) => shadow.getElementById(id) as T;

  const sleeveContainer = root.querySelector('.sleeve-container') as HTMLDivElement;
  const sleeveScales = qs<HTMLDivElement>('sleeve-scales');
  const thimbleStrip = qs<HTMLDivElement>('thimble-strip');
  const thimbleGroup = qs<HTMLDivElement>('thimble-group');
  const crosshairSystem = qs<HTMLDivElement>('crosshair-system');
  const lensView = qs<HTMLDivElement>('lens-view');
  const stripeGroup = qs<SVGGElement>('stripe-group');
  const readoutDisplay = qs<HTMLDivElement>('readout-display');
  const hintEl = qs<HTMLDivElement>('hint-text');
  const caseEl = root.querySelector('.case') as HTMLDivElement;
  const systemEl = root.querySelector('.micrometer-system') as HTMLDivElement;

  if (!showHints && hintEl) {
    hintEl.style.display = 'none';
  }

  const config = {
    initialReading: 0,
    maxReading: 32.00,
    tickGapX: 11,
    tickGapY: 8,
    crosshairSpeed: 100,
  };

  let currentReading = config.initialReading;
  let zeroOffset = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startReading = 0;
  let disposed = false;
  let simLastReading = config.initialReading;
  let simLastZero = 0;

  // 整体仪器拖拽状态
  let sysDragging = false;
  let sysStartX = 0;
  let sysStartY = 0;
  let sysX = 0;
  let sysY = 0;

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
    const spacing = s.spacing;
    const envelopeSpacing = spacing * 8;

    // 清空旧条纹
    while (stripeGroup.firstChild) {
      stripeGroup.removeChild(stripeGroup.firstChild);
    }

    // 解析颜色
    const rgbMatch = s.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    const baseR = rgbMatch ? parseInt(rgbMatch[1]) : 200;
    const baseG = rgbMatch ? parseInt(rgbMatch[2]) : 80;
    const baseB = rgbMatch ? parseInt(rgbMatch[3]) : 20;

    // lens-inner-ring 直径 176px，中心 88px
    const center = 88;
    const maxLines = Math.ceil(center / spacing) + 2;

    for (let m = 0; m <= maxLines; m++) {
      const offset = m * spacing;
      const beta = (Math.PI * offset) / envelopeSpacing;
      const sinc = Math.abs(beta) < 1e-6 ? 1 : Math.sin(beta) / beta;
      const envelope = Math.pow(sinc, 2);
      const alpha = Math.max(0.05, 0.85 * envelope);
      const thickness = Math.max(0.5, 2.5 * envelope);

      // 右侧条纹
      if (center + offset <= 176) {
        const lineR = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineR.setAttribute('x1', String(center + offset));
        lineR.setAttribute('y1', '0');
        lineR.setAttribute('x2', String(center + offset));
        lineR.setAttribute('y2', '176');
        lineR.setAttribute('stroke', `rgba(${baseR},${baseG},${baseB},${alpha})`);
        lineR.setAttribute('stroke-width', String(thickness));
        stripeGroup.appendChild(lineR);
      }

      // 左侧条纹（m=0 跳过中心线避免重复）
      if (m > 0 && center - offset >= 0) {
        const lineL = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        lineL.setAttribute('x1', String(center - offset));
        lineL.setAttribute('y1', '0');
        lineL.setAttribute('x2', String(center - offset));
        lineL.setAttribute('y2', '176');
        lineL.setAttribute('stroke', `rgba(${baseR},${baseG},${baseB},${alpha})`);
        lineL.setAttribute('stroke-width', String(thickness));
        stripeGroup.appendChild(lineL);
      }
    }
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

    // C. 联动干涉视场：平移十字准星（stripeOffset 控制光标偏移）
    const viewOffset = (currentReading - config.initialReading) * config.crosshairSpeed - stripeConfig.offset;
    crosshairSystem.style.transform = `translateX(${viewOffset}px)`;

    // D. 高精度数字更新
    const totalReading = currentReading + zeroOffset;
    readoutDisplay.innerText = totalReading.toFixed(3) + ' mm';

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
    systemEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(1.1)`;
  };

  const handleSysDragEnd = () => {
    sysDragging = false;
    caseEl.style.cursor = 'grab';
  };

  const onMouseDown = (e: MouseEvent) => handleDragStart(e.clientX, e.clientY);
  const onMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX, e.clientY);
    handleSysDragMove(e.clientX, e.clientY);
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
  systemEl.style.transform = 'translate(0px, 0px) scale(1.1)';
  initSleeve();
  initThimble();
  updateStripes();
  renderView();

  return {
    render(state) {
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
        state.stripeOffset !== stripeConfig.offset;
      if (needRender) {
        currentReading = state.currentReading;
        zeroOffset = state.zeroOffset;
        stripeConfig.offset = state.stripeOffset;
        simLastReading = state.currentReading;
        simLastZero = state.zeroOffset;
        updateStripes();
        renderView();
      }
    },
    resize() {
      // 原始 HTML 使用固定 scale(1.1)
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
        if (typeof data.currentReading === 'number') currentReading = data.currentReading;
        if (typeof data.zeroOffset === 'number') zeroOffset = data.zeroOffset;
        if (typeof data.stripeOffset === 'number') stripeConfig.offset = data.stripeOffset;
        if (typeof data.stripeSpacing === 'number') stripeConfig.spacing = data.stripeSpacing;
        if (typeof data.stripeColor === 'string') stripeConfig.color = data.stripeColor;
        if (typeof data.stripeAngle === 'number') stripeConfig.angle = data.stripeAngle;
        if (typeof data.sysX === 'number') sysX = data.sysX;
        if (typeof data.sysY === 'number') sysY = data.sysY;
        systemEl.style.transform = `translate(${sysX}px, ${sysY}px) scale(1.1)`;
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
      readoutDisplay.style.display = visible ? '' : 'none';
    },
  } as MicrometerEyepieceView & { setReadoutVisible(visible: boolean): void };
}
