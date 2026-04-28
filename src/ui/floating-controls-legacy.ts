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
  const container = document.createElement(
    'div'
  ) as unknown as FloatingControls;
  container.className = 'teaching-stage-floating-controls';
  container.style.cssText = `
    position: absolute;
    top: 12px;
    left: 12px;
    display: inline-flex;
    gap: 12px;
    align-items: center;
    z-index: 10;
    padding: 12px 16px;
    background: var(--card-bg, rgba(0,0,0,0.3));
    border-radius: 10px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    backdrop-filter: blur(8px);
  `;

  const playPauseBtn = document.createElement('button');
  playPauseBtn.type = 'button';
  playPauseBtn.title = '播放/暂停';
  playPauseBtn.style.cssText = `
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.15));
    background: var(--btn-bg, rgba(255,255,255,0.1));
    color: var(--text-primary, #fff);
    font-size: 20px;
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
      ? 'var(--accent-color, #4db0ff)'
      : 'var(--border-color, rgba(255,255,255,0.15))';
  }

  playPauseBtn.addEventListener('click', () => {
    options.onTogglePlay?.();
    updatePlayPauseBtn();
  });

  playPauseBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  playPauseBtn.addEventListener('mouseenter', () => {
    playPauseBtn.style.background =
      'var(--btn-hover-bg, rgba(255,255,255,0.2))';
    playPauseBtn.style.transform = 'translateY(-1px)';
  });
  playPauseBtn.addEventListener('mouseleave', () => {
    playPauseBtn.style.background = 'var(--btn-bg, rgba(255,255,255,0.1))';
    playPauseBtn.style.transform = 'none';
  });

  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.title = '重置';
  resetBtn.textContent = '↺';
  resetBtn.style.cssText = `
    width: 44px;
    height: 44px;
    border-radius: 8px;
    border: 1px solid var(--border-color, rgba(255,255,255,0.15));
    background: var(--btn-bg, rgba(255,255,255,0.1));
    color: var(--text-secondary, #aaa);
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  `;
  resetBtn.addEventListener('click', () => {
    options.onReset?.();
    updatePlayPauseBtn();
  });

  resetBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  resetBtn.addEventListener('mouseenter', () => {
    resetBtn.style.background = 'var(--btn-hover-bg, rgba(255,255,255,0.2))';
    resetBtn.style.color = 'var(--text-primary, #fff)';
    resetBtn.style.transform = 'translateY(-1px)';
  });
  resetBtn.addEventListener('mouseleave', () => {
    resetBtn.style.background = 'var(--btn-bg, rgba(255,255,255,0.1))';
    resetBtn.style.color = 'var(--text-secondary, #aaa)';
    resetBtn.style.transform = 'none';
  });

  const divider = document.createElement('div');
  divider.style.cssText = `
    width: 1px;
    height: 32px;
    background: var(--border-color, rgba(255,255,255,0.15));
    margin: 0 4px;
  `;

  const speedLabel = document.createElement('span');
  speedLabel.textContent = '速度';
  speedLabel.style.cssText = `
    font-size: 16px;
    color: var(--text-secondary, #aaa);
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
    width: 100px;
    height: 6px;
    cursor: pointer;
  `;

  const speedValue = document.createElement('span');
  speedValue.textContent = `${parseFloat(speedSlider.value).toFixed(2)}×`;
  speedValue.style.cssText = `
    font-size: 16px;
    color: var(--text-primary, #fff);
    font-weight: 600;
    min-width: 50px;
    text-align: right;
  `;

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    speedValue.textContent = `${speed.toFixed(2)}×`;
    options.onSpeedChange?.(speed);
  });

  speedSlider.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  speedValue.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  speedLabel.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  container.appendChild(playPauseBtn);
  container.appendChild(resetBtn);
  container.appendChild(divider);
  container.appendChild(speedLabel);
  container.appendChild(speedSlider);
  container.appendChild(speedValue);

  const cleanupDrag = makeDraggable(container);

  updatePlayPauseBtn();

  container.dispose = () => {
    cleanupDrag();
  };

  container.setState = (state: { isPlaying?: boolean; speed?: number }) => {
    if (typeof state.isPlaying === 'boolean') {
      playPauseBtn.textContent = state.isPlaying ? '⏸' : '▶';
      playPauseBtn.style.borderColor = state.isPlaying
        ? 'var(--accent-color, #4db0ff)'
        : 'var(--border-color, rgba(255,255,255,0.15))';
    }
    if (typeof state.speed === 'number') {
      speedSlider.value = String(state.speed);
      speedValue.textContent = `${state.speed.toFixed(2)}×`;
    }
  };

  return container;
}
