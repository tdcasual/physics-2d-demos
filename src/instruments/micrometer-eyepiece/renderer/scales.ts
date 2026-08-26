/**
 * 高精度干涉测微仪 — 主尺/副尺刻度（逐字搬移自原 instrument.view.ts）
 */

import type { MicrometerConfig } from './types';

// ── 初始化主尺双刻度 ──
export function initSleeve(
  config: MicrometerConfig,
  sleeveContainer: HTMLDivElement,
  sleeveScales: HTMLDivElement
): void {
  const totalHalfMm = Math.floor(config.maxReading / 0.5);
  const sleeveWidth = totalHalfMm * config.tickGapX + 60;
  sleeveContainer.style.width = `${sleeveWidth}px`;

  for (let i = 0; i <= totalHalfMm; i++) {
    const isIntegerMm = i % 2 === 0;
    const mmValue = i * 0.5;
    const tick = document.createElement('div');
    tick.style.left = `${i * config.tickGapX}px`;

    if (isIntegerMm) {
      const isNumbered = mmValue % 5 === 0;
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

/**
 * 创建副尺卷轴刻度管理器。
 * 对象池与 `_lastTickReading` 脏检查标记为每实例状态（与原闭包变量一致）。
 */
export function createThimbleTicks(options: {
  thimbleStrip: HTMLDivElement;
  config: MicrometerConfig;
}): {
  initThimble(): void;
  updateThimbleTicks(currentReading: number): void;
} {
  const { thimbleStrip, config } = options;

  const thimbleTickPool: Array<{ tick: HTMLDivElement; num: HTMLDivElement }> =
    [];

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

  let _lastTickReading = -1;

  function updateThimbleTicks(currentReading: number) {
    // 脏检查：变化小于半个最小刻度（0.005 mm）时跳过
    if (Math.abs(currentReading - _lastTickReading) < 0.005) return;
    _lastTickReading = currentReading;

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

  return { initThimble, updateThimbleTicks };
}
