/**
 * Capability 编排器
 *
 * 管理 Capability 实例的创建、绑定、复用和销毁。
 * 从 SceneContainerImpl 中提取，降低 Container 的复杂度。
 */

import { capabilityFactories } from './capabilities';
import type { CapabilityContext, CapabilityInstance, CapabilityId, LayoutSlots } from './core/types';
import type { ILayout, Scene } from './types';

/** 场景绑定描述符 — 新增需要场景数据的 capability 只需在此追加条目 */
const SCENE_BINDINGS: Partial<Record<CapabilityId, {
  /** 检查场景是否支持此绑定（方法存在性），不满足则跳过整个绑定 */
  isSupported: (scene: Scene) => boolean;
  getData: (scene: Scene) => unknown;
  getCallbacks?: (scene: Scene) => unknown;
}>> = {
  'transport-bar': {
    isSupported: (scene) => typeof scene.getTransportState === 'function',
    getData: (scene) => scene.getTransportState!(),
    getCallbacks: (scene) => ({
      isPlaying: () => scene.getTransportState?.()?.isPlaying ?? false,
      onTogglePlay: () => {
        const state = scene.getTransportState?.();
        if (state?.isPlaying) { scene.pauseAll?.(); }
        else { scene.startAll?.(); }
      },
      onReset: () => scene.reset?.(),
      onSpeedChange: (speed: number) => scene.setTimeScale?.(speed),
      getSpeed: () => scene.getTransportState?.()?.speed ?? 1
    })
  },
  'readout-panel': {
    isSupported: (scene) => typeof scene.getReadoutItems === 'function',
    getData: (scene) => scene.getReadoutItems!()
  }
};

export class CapabilityOrchestrator {
  private _instances = new Map<string, CapabilityInstance[]>();
  private _sceneUnsubscribers: (() => void)[] = [];
  private _disposed = false;

  getInstances(id: string): CapabilityInstance[] {
    return this._instances.get(id) || [];
  }

  cleanupSceneBindings(): void {
    this._sceneUnsubscribers.forEach((fn) => fn());
    this._sceneUnsubscribers = [];
  }

  private _addInstance(id: string, inst: CapabilityInstance): void {
    const existing = this._instances.get(id) || [];
    existing.push(inst);
    this._instances.set(id, existing);
  }

  /**
   * 为 ILayout 自动装配 Capability。
   * 布局切换时所有 capability 实例一律销毁重建，
   * 因为 container.replaceChildren() 会清除容器级 capability 的 DOM 元素，
   * 保留引用脱离文档的旧实例无意义。
   */
  wire(layout: ILayout, scene: Scene | null, slots: Partial<LayoutSlots>, ctx: CapabilityContext): void {
    if (this._disposed) return;

    // 清理旧场景绑定
    this.cleanupSceneBindings();

    // Dispose all existing instances
    this._instances.forEach((insts) => insts.forEach((inst) => {
      try { inst.dispose(); } catch { /* best-effort */ }
    }));
    this._instances.clear();

    const seenIds = new Set<string>();

    for (const decl of layout.capabilities ?? []) {
      const factory = capabilityFactories[decl.id];
      if (!factory) {
        console.warn(`[CapabilityOrchestrator] Unknown capability: ${decl.id}`);
        continue;
      }

      if (seenIds.has(decl.id) && decl.id !== 'resizer') {
        console.warn(`[CapabilityOrchestrator] Duplicate capability "${decl.id}" — skipping second instance`);
        continue;
      }
      seenIds.add(decl.id);

      try {
        const def = factory(decl.config);
        const instance = def.mount(slots as LayoutSlots, decl.config ?? {}, ctx);
        this._addInstance(decl.id, instance);

        if (scene) {
          this._bindToScene(decl.id, instance, scene);
        }
      } catch (err) {
        console.error(`[CapabilityOrchestrator] Failed to mount capability ${decl.id}:`, err);
      }
    }
  }

  /** 将一个 capability 实例绑定到场景的数据/控制方法 */
  private _bindToScene(id: string, instance: CapabilityInstance, scene: Scene): void {
    const binding = SCENE_BINDINGS[id as CapabilityId];
    if (!binding) return;

    if (!binding.isSupported(scene)) return;

    const data = binding.getData(scene);
    if (data != null && instance.update) {
      instance.update(data);
    }

    if (scene.subscribe) {
      try {
        const unsub = scene.subscribe(() => {
          const d = binding.getData(scene);
          if (d != null && instance.update) {
            instance.update(d);
          }
        });
        this._sceneUnsubscribers.push(unsub);
      } catch (err) {
        console.error(`[CapabilityOrchestrator] subscribe failed for ${id}:`, err);
      }
    }

    if (binding.getCallbacks && instance.setCallbacks) {
      instance.setCallbacks(binding.getCallbacks(scene));
    }
  }

  /** 销毁所有 capability 实例并清理场景绑定 */
  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;

    this._instances.forEach((insts) => insts.forEach((inst) => {
      try { inst.dispose(); } catch (err) { console.error('[CapabilityOrchestrator] dispose error:', err); }
    }));
    this._instances.clear();
    this.cleanupSceneBindings();
  }
}
