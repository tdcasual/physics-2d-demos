/**
 * Transport Bridge
 *
 * 封装 Scene → Layout 的运输控制状态同步逻辑，
 * 供 SceneContainer 统一使用，避免在容器实现中内联重复代码。
 */

import type { Scene, LayoutMaster } from './types';

export interface TransportCallbacks {
  isPlaying?: () => boolean;
  onTogglePlay?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  getSpeed?: () => number;
}

export class TransportBridge {
  private unsubscribe: (() => void) | null = null;

  /**
   * 将场景的运输控制绑定到布局的浮动控制条
   */
  bindFloatingControls(layout: LayoutMaster, callbacks: TransportCallbacks): void {
    if (!layout.setFloatingControls) return;
    layout.setFloatingControls(callbacks);
  }

  /**
   * 同步场景状态到布局（读数面板 + 运输控制）
   */
  syncSceneStateToLayout(scene: Scene, layout?: LayoutMaster | null): void {
    if (!layout) return;

    if (layout.updateReadout && scene.getReadoutItems) {
      layout.updateReadout(scene.getReadoutItems());
    }

    if (layout.updateTransportState && scene.getTransportState) {
      layout.updateTransportState(scene.getTransportState());
    }
  }

  /**
   * 订阅场景状态变化并自动同步到布局
   * @returns 取消订阅函数
   */
  subscribeSceneChanges(scene: Scene, layout: LayoutMaster | null): () => void {
    if (!scene.subscribe || !layout) {
      return () => {};
    }

    const unsubscribe = scene.subscribe(() => {
      this.syncSceneStateToLayout(scene, layout);
    });

    this.unsubscribe = unsubscribe;
    return unsubscribe;
  }

  /**
   * 清理所有绑定
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
