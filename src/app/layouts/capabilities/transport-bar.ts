/**
 * Transport Bar Capability — 浮动控制条（播放/暂停/重置/速度）
 *
 * 封装现有 createFloatingControls 为可装配的能力模块。
 * 支持 mount 后通过 setCallbacks 注入场景控制方法。
 */

import type {
  CapabilityDefinition,
  CapabilityInstance,
  CapabilityContext,
  LayoutSlots,
  TransportState
} from '../core/types';
import {
  createFloatingControls,
  type FloatingControls
} from '../../../ui/floating-controls-legacy';

export interface TransportBarConfig {
  /** 挂载目标 slot（默认 animation） */
  mountSlot?: 'animation' | 'control';
  /** 紧凑模式：直接渲染到指定容器（由布局预创建），不使用浮动控件 */
  container?: HTMLElement;
}

export interface TransportBarCallbacks {
  isPlaying(): boolean;
  onTogglePlay(): void;
  onReset(): void;
  onSpeedChange(speed: number): void;
  getSpeed(): number;
}

export function createTransportBar(
  cfg: TransportBarConfig = {}
): CapabilityDefinition<TransportBarConfig, TransportState, TransportBarCallbacks> {
  return {
    id: 'transport-bar',

    mount(
      slots: LayoutSlots,
      config: TransportBarConfig,
      _ctx: CapabilityContext
    ): CapabilityInstance<TransportState, TransportBarCallbacks> {
      const merged = { ...cfg, ...config };

      // Mutable callback references — set via setCallbacks after mount
      let _onTogglePlay: (() => void) | undefined;
      let _onReset: (() => void) | undefined;
      let _onSpeedChange: ((speed: number) => void) | undefined;
      let _isPlaying: (() => boolean) | undefined;
      let _getSpeed: (() => number) | undefined;

      // ---- Compact mode: create transport controls into provided container ----
      if (merged.container) {
        const ac = new AbortController();
        const container = merged.container;

        // Build transport controls DOM
        const controls = document.createElement('div');
        controls.className = 'mobile-transport-controls mobile-speed-control';

        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'mobile-transport-btn mobile-control-btn play-pause';
        playBtn.setAttribute('aria-label', '播放/暂停');
        playBtn.textContent = '▶';

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.className = 'mobile-transport-btn mobile-control-btn reset';
        resetBtn.setAttribute('aria-label', '重置');
        resetBtn.textContent = '↺';

        const speedLabel = document.createElement('span');
        speedLabel.className = 'mobile-transport-speed-label';
        speedLabel.textContent = '速度';

        const speedSlider = document.createElement('input');
        speedSlider.type = 'range';
        speedSlider.className = 'mobile-transport-speed-slider';
        speedSlider.min = '0.05';
        speedSlider.max = '3';
        speedSlider.step = '0.05';
        speedSlider.value = '1';

        const speedValue = document.createElement('span');
        speedValue.className = 'mobile-transport-speed-value speed-value';
        speedValue.textContent = '1.00×';

        controls.append(playBtn, resetBtn, speedLabel, speedSlider, speedValue);
        container.prepend(controls);

        // Wire events
        playBtn.addEventListener('click', () => _onTogglePlay?.(), { signal: ac.signal });
        playBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal: ac.signal });
        resetBtn.addEventListener('click', () => _onReset?.(), { signal: ac.signal });
        resetBtn.addEventListener('mousedown', (e) => e.stopPropagation(), { signal: ac.signal });
        speedSlider.addEventListener('input', () => {
          const speed = parseFloat(speedSlider.value);
          speedValue.textContent = `${speed.toFixed(2)}×`;
          _onSpeedChange?.(speed);
        }, { signal: ac.signal });
        speedSlider.addEventListener('mousedown', (e) => e.stopPropagation(), { signal: ac.signal });

        const updatePlayBtn = (isPlaying: boolean) => {
          playBtn.textContent = isPlaying ? '⏸' : '▶';
          playBtn.classList.toggle('is-playing', isPlaying);
        };

        return {
          update(data: TransportState) {
            if (!data) return;
            if (typeof data.isPlaying === 'boolean') updatePlayBtn(data.isPlaying);
            if (typeof data.speed === 'number') {
              speedSlider.value = String(data.speed);
              speedValue.textContent = `${data.speed.toFixed(2)}×`;
            }
          },
          setCallbacks(cbs: TransportBarCallbacks) {
            _isPlaying = cbs.isPlaying;
            _onTogglePlay = cbs.onTogglePlay;
            _onReset = cbs.onReset;
            _onSpeedChange = cbs.onSpeedChange;
            _getSpeed = cbs.getSpeed;
          },
          dispose() {
            ac.abort();
          }
        };
      }

      // ---- Floating mode (desktop default) ----
      const mountSlot = merged.mountSlot ?? 'animation';
      const targetSlot = slots[mountSlot];
      if (!targetSlot) return { dispose() {} };

      const controls: FloatingControls = createFloatingControls({
        isPlaying: () => _isPlaying?.() ?? false,
        onTogglePlay: () => _onTogglePlay?.(),
        onReset: () => _onReset?.(),
        onSpeedChange: (speed) => _onSpeedChange?.(speed),
        getSpeed: () => _getSpeed?.() ?? 1
      });

      targetSlot.appendChild(controls);

      return {
        update(data: TransportState) {
          if (data && controls.setState) {
            controls.setState(data);
          }
        },

        setCallbacks(cbs: TransportBarCallbacks) {
          _isPlaying = cbs.isPlaying;
          _onTogglePlay = cbs.onTogglePlay;
          _onReset = cbs.onReset;
          _onSpeedChange = cbs.onSpeedChange;
          _getSpeed = cbs.getSpeed;
        },

        dispose() {
          controls.dispose?.();
          controls.remove();
        }
      };
    }
  };
}
