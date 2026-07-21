/**
 * 浮动运输控制条（桌面端）
 *
 * 悬浮在动画区左上角、可拖拽的播放/暂停/重置/速度控制条。
 * 由 transport-bar capability 装配（桌面布局的默认运输控制形态）；
 * 移动端紧凑形态则由 transport-bar 内联渲染，不复用此组件。
 */

import { makeDraggable } from './utils/draggable';

export interface FloatingControls extends HTMLElement {
  dispose(): void;
  setState(state: { isPlaying?: boolean; speed?: number }): void;
}

export function createFloatingControls(options: {
  isPlaying?: () => boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  getSpeed?: () => number;
}): FloatingControls {
  const ac = new AbortController();
  const container = document.createElement(
    'div'
  ) as unknown as FloatingControls;
  container.className =
    'teaching-stage-floating-controls stage-floating-controls';
  container.style.cssText = `
    position: absolute;
    top: var(--transport-top, 12px);
    left: var(--transport-left, 12px);
    display: inline-flex;
    gap: var(--transport-gap, 12px);
    align-items: center;
    z-index: 10;
    padding: var(--transport-padding, 12px 16px);
    background: var(--card-bg);
    border-radius: var(--transport-radius, 10px);
    border: 1px solid var(--border-color);
  `;

  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.title = '播放/暂停';
  playPauseBtn.style.cssText = `
    width: var(--transport-btn-size, 44px);
    height: var(--transport-btn-size, 44px);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--btn-bg);
    color: var(--text-primary);
    font-size: var(--transport-icon-size, 20px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;

  function updatePlayPauseBtn() {
    const isPlaying = options.isPlaying?.() ?? false;
    playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    playPauseBtn.style.borderColor = isPlaying
      ? 'var(--accent-primary)'
      : 'var(--border-color)';
  }

  playPauseBtn.addEventListener(
    'click',
    () => {
      options.onTogglePlay?.();
      updatePlayPauseBtn();
    },
    { signal: ac.signal }
  );

  playPauseBtn.addEventListener(
    'mousedown',
    (e) => {
      e.stopPropagation();
    },
    { signal: ac.signal }
  );

  playPauseBtn.addEventListener(
    'mouseenter',
    () => {
      playPauseBtn.style.background = 'var(--btn-hover-bg)';
      playPauseBtn.style.transform = 'translateY(-1px)';
    },
    { signal: ac.signal }
  );
  playPauseBtn.addEventListener(
    'mouseleave',
    () => {
      playPauseBtn.style.background = 'var(--btn-bg)';
      playPauseBtn.style.transform = 'none';
    },
    { signal: ac.signal }
  );

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.title = '重置';
  resetBtn.textContent = '↺';
  resetBtn.style.cssText = `
    width: var(--transport-btn-size, 44px);
    height: var(--transport-btn-size, 44px);
    border-radius: 8px;
    border: 1px solid var(--border-color);
    background: var(--btn-bg);
    color: var(--text-secondary);
    font-size: var(--transport-icon-size, 20px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;
  resetBtn.addEventListener(
    'click',
    () => {
      options.onReset?.();
      updatePlayPauseBtn();
    },
    { signal: ac.signal }
  );

  resetBtn.addEventListener(
    'mousedown',
    (e) => {
      e.stopPropagation();
    },
    { signal: ac.signal }
  );

  resetBtn.addEventListener(
    'mouseenter',
    () => {
      resetBtn.style.background = 'var(--btn-hover-bg)';
      resetBtn.style.color = 'var(--text-primary)';
      resetBtn.style.transform = 'translateY(-1px)';
    },
    { signal: ac.signal }
  );
  resetBtn.addEventListener(
    'mouseleave',
    () => {
      resetBtn.style.background = 'var(--btn-bg)';
      resetBtn.style.color = 'var(--text-secondary)';
      resetBtn.style.transform = 'none';
    },
    { signal: ac.signal }
  );

  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 1px;
    height: var(--transport-divider-height, 32px);
    background: var(--border-color);
    margin: 0 4px;
  `;

  const speedLabel = document.createElement('span');
  speedLabel.textContent = '速度';
  speedLabel.style.cssText = `
    font-size: var(--transport-font-size, 16px);
    color: var(--text-secondary);
    font-weight: 500;
    white-space: nowrap;
  `;

  const speedSlider = document.createElement('input');
  speedSlider.type = 'range';
  speedSlider.min = '0.05';
  speedSlider.max = '3';
  speedSlider.step = '0.05';
  speedSlider.value = String(options.getSpeed?.() ?? 1);
  speedSlider.style.cssText = `
    width: var(--transport-slider-width, 100px);
    height: var(--transport-slider-height, 6px);
    cursor: pointer;
  `;

  const speedValue = document.createElement('span');
  speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
  speedValue.style.cssText = `
    font-size: var(--transport-font-size, 16px);
    color: var(--text-primary);
    font-weight: 600;
    min-width: var(--transport-speed-width, 50px);
    text-align: right;
  `;

  speedSlider.addEventListener(
    'input',
    () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = `${speed.toFixed(2)}×`;
      options.onSpeedChange?.(speed);
    },
    { signal: ac.signal }
  );

  speedSlider.addEventListener(
    'mousedown',
    (e) => {
      e.stopPropagation();
    },
    { signal: ac.signal }
  );
  speedValue.addEventListener(
    'mousedown',
    (e) => {
      e.stopPropagation();
    },
    { signal: ac.signal }
  );
  speedLabel.addEventListener(
    'mousedown',
    (e) => {
      e.stopPropagation();
    },
    { signal: ac.signal }
  );

  container.appendChild(playPauseBtn);
  container.appendChild(resetBtn);
  container.appendChild(divider);
  container.appendChild(speedLabel);
  container.appendChild(speedSlider);
  container.appendChild(speedValue);

  const cleanupDrag = makeDraggable(container);

  updatePlayPauseBtn();

  container.dispose = () => {
    ac.abort();
    cleanupDrag();
  };

  container.setState = (state: { isPlaying?: boolean; speed?: number }) => {
    if (typeof state.isPlaying === 'boolean') {
      playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
      playPauseBtn.style.borderColor = state.isPlaying
        ? 'var(--accent-primary)'
        : 'var(--border-color)';
    }
    if (typeof state.speed === 'number') {
      speedSlider.value = String(state.speed);
      speedValue.textContent = `${state.speed.toFixed(2)}×`;
    }
  };

  return container;
}
