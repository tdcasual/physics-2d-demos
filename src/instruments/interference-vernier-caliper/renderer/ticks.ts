/**
 * 干涉读数游标卡尺 — 主尺/游标刻度生成
 */

import {
  MAIN_SUB_TICK_PX,
  VERNIER_DIVISIONS,
  VERNIER_SUB_TICK_PX
} from './constants';

// ── 生成主尺刻度 ──
export function initMainRuler(mainTicksContainer: HTMLDivElement): void {
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
export function initVernier(vernierTicksContainer: HTMLDivElement): void {
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
