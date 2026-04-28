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
      const mountSlot = merged.mountSlot ?? 'animation';
      const targetSlot = slots[mountSlot];
      if (!targetSlot) return { dispose() {} };

      // Mutable callback references — set via setCallbacks after mount
      let _onTogglePlay: (() => void) | undefined;
      let _onReset: (() => void) | undefined;
      let _onSpeedChange: ((speed: number) => void) | undefined;
      let _isPlaying: (() => boolean) | undefined;
      let _getSpeed: (() => number) | undefined;

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
