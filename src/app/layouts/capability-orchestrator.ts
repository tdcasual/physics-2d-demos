/**
 * Capability 编排器
 *
 * 管理 Capability 实例的创建、绑定、复用和销毁。
 * 从 SceneContainerImpl 中提取，降低 Container 的复杂度。
 */

import type {
  CapabilityContext,
  CapabilityInstance,
  LayoutSlots,
  ILayout,
  Scene
} from './types';

type CapabilitiesModule = typeof import('./capabilities');

/** 场景绑定描述符 */
interface SceneBinding {
  /** 检查场景是否支持此绑定（方法存在性），不满足则跳过整个绑定 */
  isSupported: (scene: Scene) => boolean;
  getData: (scene: Scene) => unknown;
  getCallbacks?: (scene: Scene) => unknown;
}

/** 有场景数据绑定的 capability — 新增绑定只需在此表追加条目 */
const SCENE_BINDINGS: Record<string, SceneBinding> = {
  'transport-bar': {
    isSupported: (scene) => typeof scene.getTransportState === 'function',
    getData: (scene) => scene.getTransportState!(),
    getCallbacks: (scene) => ({
      isPlaying: () => scene.getTransportState?.()?.isPlaying ?? false,
      onTogglePlay: () => {
        const state = scene.getTransportState?.();
        if (state?.isPlaying) {
          scene.pauseAll?.();
        } else {
          scene.startAll?.();
        }
      },
      onReset: () => scene.reset?.(),
      onSpeedChange: (speed: number) => scene.setTimeScale?.(speed),
      getSpeed: () => scene.getTransportState?.()?.speed ?? 1
    })
  },
  'readout-panel': {
    isSupported: (scene) => typeof scene.getReadoutItems === 'function',
    getData: (scene) => scene.getReadoutItems!()
  },
  'data-workspace': {
    isSupported: () => true,
    getData: (scene) => ({ host: scene.getDataWorkspace?.() ?? null })
  }
};

export class CapabilityOrchestrator {
  private _instances = new Map<string, CapabilityInstance[]>();
  private _sceneUnsubscribers: (() => void)[] = [];
  private _disposed = false;
  private _caps: CapabilitiesModule | null = null;
  private _capsReady: Promise<CapabilitiesModule> | null = null;

  /** Start loading capability factories without blocking construction. */
  preload(): Promise<CapabilitiesModule> {
    if (this._caps) return Promise.resolve(this._caps);
    if (!this._capsReady) {
      this._capsReady = import('./capabilities').then((mod) => {
        this._caps = mod;
        return mod;
      });
    }
    return this._capsReady;
  }

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
  wire(
    layout: ILayout,
    scene: Scene | null,
    slots: Partial<LayoutSlots>,
    ctx: CapabilityContext
  ): void {
    if (this._disposed) return;
    const caps = this._caps;
    if (!caps) {
      throw new Error(
        'Capability factories not loaded; await preload() before wire()'
      );
    }

    this.disposeAll();

    const seenIds = new Set<string>();
    const factories = caps.capabilityFactories;

    for (const decl of layout.capabilities) {
      const factory = factories[decl.id];
      if (!factory) {
        console.warn(`[CapabilityOrchestrator] Unknown capability: ${decl.id}`);
        continue;
      }

      if (seenIds.has(decl.id) && decl.id !== 'resizer') {
        console.warn(
          `[CapabilityOrchestrator] Duplicate capability "${decl.id}" — skipping second instance`
        );
        continue;
      }
      seenIds.add(decl.id);

      try {
        const def = caps.createCapabilityDefinition(decl);
        const instance = def.mount(
          slots as LayoutSlots,
          decl.config ?? {},
          ctx
        );
        this._addInstance(decl.id, instance);

        if (scene) {
          this._bindToScene(decl.id, instance, scene);
        }
      } catch (err) {
        console.error(
          `[CapabilityOrchestrator] Failed to mount capability ${decl.id}:`,
          err
        );
        throw err;
      }
    }
  }

  /**
   * Dispose every capability instance and scene binding.
   * Idempotent. Aggregates dispose errors so the switch transaction can roll back.
   */
  disposeAll(): void {
    this.cleanupSceneBindings();
    const errors: unknown[] = [];
    this._instances.forEach((insts) =>
      insts.forEach((inst) => {
        try {
          inst.dispose();
        } catch (err) {
          errors.push(err);
        }
      })
    );
    this._instances.clear();
    if (errors.length === 1) throw errors[0];
    if (errors.length > 1) {
      throw new AggregateError(errors, 'Capability dispose failed');
    }
  }

  /** 将一个 capability 实例绑定到场景的数据/控制方法 */
  private _bindToScene(
    id: string,
    instance: CapabilityInstance,
    scene: Scene
  ): void {
    const binding = SCENE_BINDINGS[id];
    if (!binding) return;

    if (!binding.isSupported(scene)) return;

    const data = binding.getData(scene);
    if (data != null && instance.update) {
      instance.update(data);
    }

    if (scene.subscribe) {
      try {
        const unsub = scene.subscribe(() => {
          // 与 dispose 对称的异常边界：单个 capability 的 update 抛错
          // 只记录不传播（标准 notify 系统按监听器隔离，但自定义
          // subscribe 实现没有该保证），且错误必须可见而非静默丢失。
          try {
            const d = binding.getData(scene);
            if (d != null && instance.update) {
              instance.update(d);
            }
          } catch (err) {
            console.error(
              `[CapabilityOrchestrator] scene update failed for ${id}:`,
              err
            );
          }
        });
        this._sceneUnsubscribers.push(unsub);
      } catch (err) {
        console.error(
          `[CapabilityOrchestrator] subscribe failed for ${id}:`,
          err
        );
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
    try {
      this.disposeAll();
    } catch (err) {
      console.error('[CapabilityOrchestrator] dispose error:', err);
    }
  }
}
