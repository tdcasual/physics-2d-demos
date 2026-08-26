/**
 * 高精度干涉测微仪 — 核心物理渲染引擎（逐字搬移自原 instrument.view.ts）
 */

import type {
  MicrometerConfig,
  MicrometerElements,
  MicrometerListeners,
  MicrometerViewState,
  StripeConfig
} from './types';

export function createViewRenderer(options: {
  viewState: MicrometerViewState;
  config: MicrometerConfig;
  stripeConfig: StripeConfig;
  elements: Pick<
    MicrometerElements,
    | 'thimbleGroup'
    | 'thimbleStrip'
    | 'crosshairSystem'
    | 'lensView'
    | 'readoutDisplay'
  >;
  listeners: MicrometerListeners;
  updateThimbleTicks: (currentReading: number) => void;
}): () => void {
  const {
    viewState,
    config,
    stripeConfig,
    elements,
    listeners,
    updateThimbleTicks
  } = options;
  const {
    thimbleGroup,
    thimbleStrip,
    crosshairSystem,
    lensView,
    readoutDisplay
  } = elements;

  let wasAligned = false;
  let wasAtLimit = false;

  function checkAlign(viewOffset: number, spacing: number) {
    const dist = Math.abs(
      ((((viewOffset - spacing / 2) % spacing) + spacing) % spacing) -
        spacing / 2
    );
    return dist < 2;
  }

  function checkLimit(reading: number) {
    return reading <= 0.001 || reading >= config.maxReading - 0.001;
  }

  // ── 核心物理渲染引擎 ──
  function renderView() {
    if (viewState.disposed) return;
    viewState.currentReading = Math.max(
      0,
      Math.min(viewState.currentReading, config.maxReading)
    );

    // A. 测微筒水平位移（transform 避免每帧触发 layout）
    const moveX = (viewState.currentReading / 0.5) * config.tickGapX;
    thimbleGroup.style.transform = `translateX(${moveX}px)`;

    // B. 副尺刻度垂直滚动匹配
    const totalTicksPassed = viewState.currentReading / 0.01;
    const targetYFromBottom = totalTicksPassed * config.tickGapY;
    const translateY = targetYFromBottom - 90;
    thimbleStrip.style.transform = `translateY(${translateY}px)`;

    // B2. 更新对象池中的可见 tick
    updateThimbleTicks(viewState.currentReading);

    // C. 联动干涉视场
    const viewOffset =
      (viewState.currentReading - config.initialReading - stripeConfig.offset) *
      viewState.crosshairSpeed;
    const angle = viewState.simLastCrosshairAngle;
    if (viewState.viewMode === 'fringe') {
      // 准星不动模式：准星固定居中，条纹随读数滚动
      crosshairSystem.style.transform = `translateX(0) rotate(${angle}deg)`;
      // background-repeat:repeat 自动处理周期，无需取模或 round
      lensView.style.backgroundPositionX = `${-viewOffset}px`;
    } else {
      // 准星移动模式：条纹固定，准星用相同 viewOffset 做线性位移
      lensView.style.backgroundPositionX = '0px';
      crosshairSystem.style.transform = `translateX(${Math.round(viewOffset)}px) rotate(${angle}deg)`;
    }

    // D. 高精度数字更新
    const totalReading = viewState.currentReading + viewState.zeroOffset;
    if (readoutDisplay)
      readoutDisplay.innerText = totalReading.toFixed(3) + ' mm';

    // E. 事件检测
    const aligned = checkAlign(viewOffset, stripeConfig.spacing);
    if (aligned && !wasAligned) {
      listeners.align.forEach((cb) => cb());
    }
    wasAligned = aligned;

    const atLimit = checkLimit(viewState.currentReading);
    if (atLimit && !wasAtLimit) {
      listeners.limit.forEach((cb) => cb());
    }
    wasAtLimit = atLimit;
  }

  return renderView;
}
