/**
 * 高精度干涉测微仪 — 渲染器（DOM 实现）
 *
 * 使用 Shadow DOM 隔离样式，在宿主 canvas 区域上叠加 DOM 层。
 * 视觉效果与原始 HTML 完全一致。
 */

import type { TeachingTheme } from '../../platform/standards';
import type { InstrumentView, InstrumentViewport } from '../_contract/instrument-contract';
import type { MicrometerEyepieceState } from './instrument.sim';

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
  --tick-gap-x: 22px;
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
}): InstrumentView<MicrometerEyepieceState> {
  const { canvas } = options;
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
      <div class="readout" id="readout-display">0.300 mm</div>
      <div class="hint">↕ 上下拨动或 ↔ 左右推拉右侧测微螺杆，移动左侧准星瞄准干涉条纹</div>
    </div>
  `;

  const qs = <T extends HTMLElement>(id: string) => shadow.getElementById(id) as T;

  const sleeveContainer = root.querySelector('.sleeve-container') as HTMLDivElement;
  const sleeveScales = qs<HTMLDivElement>('sleeve-scales');
  const thimbleStrip = qs<HTMLDivElement>('thimble-strip');
  const thimbleGroup = qs<HTMLDivElement>('thimble-group');
  const crosshairSystem = qs<HTMLDivElement>('crosshair-system');
  const readoutDisplay = qs<HTMLDivElement>('readout-display');
  const lensView = qs<HTMLDivElement>('lens-view');
  const caseEl = root.querySelector('.case') as HTMLDivElement;
  const systemEl = root.querySelector('.micrometer-system') as HTMLDivElement;

  const config = {
    initialReading: 0.30,
    maxReading: 25.00,
    tickGapX: 22,
    tickGapY: 8,
    crosshairSpeed: 40,
  };

  let currentReading = config.initialReading;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startReading = 0;
  let disposed = false;
  let simLastReading = config.initialReading;

  let stripeState = {
    offset: 0,
    spacing: 50,
    color: 'rgba(200, 80, 20, 0.4)',
    angle: 90,
  };

  // 整体仪器拖拽状态
  let sysDragging = false;
  let sysStartX = 0;
  let sysStartY = 0;
  let sysX = 0;
  let sysY = 0;

  // ── 初始化主尺双刻度 ──
  function initSleeve() {
    const totalHalfMm = config.maxReading / 0.5;
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

  // ── 初始化副尺卷轴 ──
  function initThimble() {
    const totalTicks = 3000;
    for (let i = 0; i < totalTicks; i++) {
      const val = i % 50;
      const tick = document.createElement('div');
      tick.className = `thimble-tick ${val % 5 === 0 ? 'major' : 'minor'}`;
      tick.style.bottom = `${i * config.tickGapY}px`;

      if (val % 5 === 0) {
        const num = document.createElement('div');
        num.className = 'thimble-number';
        num.innerText = String(val);
        tick.appendChild(num);
      }
      thimbleStrip.appendChild(tick);
    }
  }

  // ── 更新干涉条纹 ──
  function updateStripes() {
    const s = stripeState;
    const stripeW = s.spacing * 0.3;
    const mid = s.spacing * 0.5;
    lensView.style.backgroundImage = `repeating-linear-gradient(
      ${s.angle}deg,
      transparent 0px,
      transparent ${Math.round(mid - stripeW)}px,
      ${s.color} ${Math.round(mid - stripeW * 0.5)}px,
      ${s.color} ${Math.round(mid)}px,
      ${s.color} ${Math.round(mid + stripeW * 0.5)}px,
      transparent ${Math.round(mid + stripeW)}px,
      transparent ${Math.round(s.spacing)}px
    )`;
    lensView.style.backgroundPositionX = `${s.offset}px`;
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

    // C. 联动干涉视场：平移十字准星
    const viewOffset = (currentReading - config.initialReading) * config.crosshairSpeed;
    crosshairSystem.style.transform = `translateX(${viewOffset}px)`;

    // D. 高精度数字更新（基准读数 + 微调读数）
    const totalReading = stripeState.offset + currentReading;
    readoutDisplay.innerText = totalReading.toFixed(3) + ' mm';
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
    currentReading = startReading + deltaReadingX + deltaReadingY;
    renderView();
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
    currentReading += (e.deltaY > 0 ? 0.01 : -0.01);
    renderView();
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
        state.stripeOffset !== stripeState.offset ||
        state.stripeSpacing !== stripeState.spacing ||
        state.stripeColor !== stripeState.color ||
        state.stripeAngle !== stripeState.angle;
      if (stripeChanged) {
        stripeState = {
          offset: state.stripeOffset,
          spacing: state.stripeSpacing,
          color: state.stripeColor,
          angle: state.stripeAngle,
        };
        updateStripes();
        renderView();
      }
      if (state.currentReading !== simLastReading) {
        simLastReading = state.currentReading;
        currentReading = state.currentReading;
        renderView();
      }
    },
    resize() {
      // 原始 HTML 使用固定 scale(1.1)，不响应容器尺寸变化
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
    },
  };
}
