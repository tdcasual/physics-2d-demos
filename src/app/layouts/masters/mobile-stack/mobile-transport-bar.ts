import { ICONS } from './mobile-icons';
import type { ControlButtonConfig } from './mobile-stack-config';

export interface TransportCallbacks {
  onTogglePlay?: () => void;
  onPlayPause?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  getSpeed?: () => number;
  isPlaying?: () => boolean;
}

export class TransportBarManager {
  private bar: HTMLElement;
  private playBtn: HTMLButtonElement | null = null;
  private speedValueEl: HTMLElement | null = null;
  private fullscreenBtn: HTMLButtonElement | null = null;
  private isFullscreen = false;
  private eventCleanups: (() => void)[] = [];

  constructor(parent: HTMLElement) {
    this.bar = document.createElement('div');
    this.bar.className = 'mobile-controls-bar';
    parent.appendChild(this.bar);

    const fsHandler = () => {
      this.isFullscreen = !!document.fullscreenElement;
      if (this.fullscreenBtn) {
        this.fullscreenBtn.innerHTML = this.isFullscreen
          ? ICONS.fullscreenExit
          : ICONS.fullscreen;
        this.fullscreenBtn.setAttribute(
          'aria-label',
          this.isFullscreen ? '退出全屏' : '全屏'
        );
      }
    };
    document.addEventListener('fullscreenchange', fsHandler);
    this.eventCleanups.push(() =>
      document.removeEventListener('fullscreenchange', fsHandler)
    );
  }

  render(config: ControlButtonConfig, callbacks: TransportCallbacks): void {
    this.bar.innerHTML = '';
    this.playBtn = null;
    this.fullscreenBtn = null;

    const togglePlay = callbacks.onTogglePlay ?? callbacks.onPlayPause;
    const isPlaying = callbacks.isPlaying?.() ?? false;
    const speed = callbacks.getSpeed?.() ?? 1;

    if (config.showPlayPause) {
      this.playBtn = this._createButton({
        className: 'play-pause',
        html: isPlaying ? ICONS.pause : ICONS.play,
        ariaLabel: isPlaying ? '暂停动画' : '播放动画',
        onClick: () => {
          togglePlay?.();
          const nowPlaying = callbacks.isPlaying?.() ?? false;
          if (this.playBtn) {
            this.playBtn.innerHTML = nowPlaying ? ICONS.pause : ICONS.play;
            this.playBtn.setAttribute(
              'aria-label',
              nowPlaying ? '暂停动画' : '播放动画'
            );
          }
        }
      });
      this.bar.appendChild(this.playBtn);
    }

    if (config.showReset) {
      this.bar.appendChild(
        this._createButton({
          className: 'reset',
          html: ICONS.reset,
          ariaLabel: '重置动画',
          onClick: () => callbacks.onReset?.()
        })
      );
    }

    if (config.showSpeed) {
      this.bar.appendChild(this._createSpeedControl(speed, config, callbacks));
    }

    if (config.showFullscreen) {
      this.fullscreenBtn = this._createButton({
        className: 'fullscreen',
        html: ICONS.fullscreen,
        ariaLabel: '全屏',
        onClick: () => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
        }
      });
      this.bar.appendChild(this.fullscreenBtn);
    }
  }

  updatePlayState(isPlaying: boolean): void {
    if (!this.playBtn) return;
    this.playBtn.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
    this.playBtn.setAttribute(
      'aria-label',
      isPlaying ? '暂停动画' : '播放动画'
    );
  }

  private _createButton(options: {
    className: string;
    html: string;
    ariaLabel: string;
    onClick: () => void;
  }): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `mobile-control-btn ${options.className}`;
    btn.innerHTML = options.html;
    btn.setAttribute('aria-label', options.ariaLabel);
    btn.addEventListener('click', options.onClick);
    return btn;
  }

  private _createSpeedControl(
    speed: number,
    config: ControlButtonConfig,
    callbacks: TransportCallbacks
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'mobile-speed-control';

    const label = document.createElement('span');
    label.className = 'speed-label';
    label.textContent = '速度';
    container.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'speed-slider';
    slider.min = String(config.speedMin ?? 0.05);
    slider.max = String(config.speedMax ?? 3);
    slider.step = String(config.speedStep ?? 0.05);
    slider.value = String(speed);
    slider.setAttribute('aria-label', '播放速度');
    slider.setAttribute('aria-valuemin', String(config.speedMin ?? 0.05));
    slider.setAttribute('aria-valuemax', String(config.speedMax ?? 3));
    slider.setAttribute('aria-valuenow', String(speed));

    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      callbacks.onSpeedChange?.(val);
      slider.setAttribute('aria-valuenow', String(val));
      if (this.speedValueEl) {
        this.speedValueEl.textContent = `${val.toFixed(2)}×`;
      }
    });

    container.appendChild(slider);

    this.speedValueEl = document.createElement('span');
    this.speedValueEl.className = 'speed-value';
    this.speedValueEl.textContent = `${speed.toFixed(2)}×`;
    container.appendChild(this.speedValueEl);

    return container;
  }

  destroy(): void {
    this.eventCleanups.forEach((c) => c());
    this.eventCleanups = [];
    this.bar.remove();
  }
}
