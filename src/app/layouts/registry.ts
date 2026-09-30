/**
 * 布局母版注册表
 *
 * 管理所有可用的布局母版，提供注册和创建功能
 *
 * @review-date 2026-04-02
 * @version 0.1.0
 */

import type {
  ILayout,
  ILayoutConstructor,
  LayoutConfig,
  LayoutCreateOptions,
  LayoutLoader,
  LayoutTestProfile,
  SlotName
} from './types';
import { createAbortError, raceAbort } from './switch-errors';
import { layoutReuseKey } from './layout-reuse-key';

/** 布局元数据 */
export interface LayoutMetadata {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  /** 适用场景标签 */
  tags: string[];
  /** 是否支持移动端 */
  supportsMobile: boolean;
  /** 支持的区域 */
  supportedSlots: SlotName[];

  /** 视口约束：满足这些约束时布局才可被自动选中 */
  constraints?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    orientation?: 'portrait' | 'landscape' | 'any';
  };

  /** 自动选择优先级（数字越大越优先） */
  priority?: number;

  /** 是否允许自动选择（false 则只能用户手动切换或场景主动指定） */
  autoSelectable?: boolean;
  /** Layout-agnostic and interaction-model-specific test capabilities. */
  layoutTestProfile?: LayoutTestProfile;

  /** 工作区收养图区的目标层级：'section'（缺省默认）= 收养 [data-graph-section]；'slot' = 收养 slots.graph 本身 */
  graphAdoptTarget?: 'section' | 'slot';
  /** 是否消费 LayoutConfig.graphInitiallyHidden。false = 显式忽略（须注释理由）。缺省 true */
  honorsGraphInitiallyHidden?: boolean;
  /** 演示模式是否应用几何改造（侧栏折叠/图过继/读数放大）。缺省 false */
  demoCapable?: boolean;
}

const LAYOUT_INTERACTION_MODELS = new Set([
  'tabs',
  'split',
  'stack',
  'fullscreen',
  'custom'
]);

/**
 * Custom layout interaction adapters are registered alongside the layout.
 * Keeping this registry explicit prevents a misspelled adapter id from
 * silently reducing a layout to a mount-only smoke test.
 */
const layoutTestAdapters = new Set<string>();

export function registerLayoutTestAdapter(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new Error('Layout test adapter id must be a non-empty string');
  }
  layoutTestAdapters.add(id);
}

function hasLayoutTestAdapter(id: string): boolean {
  return layoutTestAdapters.has(id);
}

/** Validate a layout's declarative test capabilities before registration. */
function validateLayoutTestProfile(
  id: string,
  profile: LayoutTestProfile | undefined,
  supportedSlots: SlotName[]
): void {
  if (!profile) return;
  if (!Array.isArray(profile.viewports) || profile.viewports.length === 0) {
    throw new Error(`Layout test profile for "${id}" must define viewports`);
  }
  if (!LAYOUT_INTERACTION_MODELS.has(profile.interactionModel)) {
    throw new Error(
      `Layout test profile for "${id}" has an invalid interactionModel`
    );
  }
  if (profile.interactionModel === 'custom') {
    if (!profile.adapter) {
      throw new Error(
        `Layout test profile for "${id}" must define adapter for custom interactionModel`
      );
    }
    if (!hasLayoutTestAdapter(profile.adapter)) {
      throw new Error(
        `Layout test adapter "${profile.adapter}" for "${id}" is not registered`
      );
    }
  }
  for (const viewport of profile.viewports) {
    if (
      !Number.isFinite(viewport.width) ||
      !Number.isFinite(viewport.height) ||
      viewport.width <= 0 ||
      viewport.height <= 0
    ) {
      throw new Error(
        `Layout test profile for "${id}" contains an invalid viewport`
      );
    }
  }
  for (const key of [
    'minStageWidth',
    'minStageHeight',
    'minGraphWidth',
    'minGraphHeight'
  ] as const) {
    const value = profile[key];
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new Error(`Layout test profile for "${id}" has an invalid ${key}`);
    }
  }
  if (
    !supportedSlots.includes('control') ||
    !supportedSlots.includes('animation')
  ) {
    throw new Error(
      `Layout "${id}" must support control and animation slots before it can be tested`
    );
  }
}

/** 注册条目：eager 构造器或惰性加载器（元数据始终同步可用） */
type LayoutEntry =
  | { kind: 'eager'; ctor: ILayoutConstructor }
  | { kind: 'lazy'; loader: LayoutLoader };

type PooledLayoutEntry = {
  instance: ILayout;
  registrationToken: number;
  reuseKey: string;
};

/** 布局注册表 */
class LayoutRegistry {
  private layouts = new Map<string, LayoutEntry>();
  private metadata = new Map<string, LayoutMetadata>();
  /**
   * 实例池按容器隔离：布局实例持有创建时容器引用，跨容器复用会拿到
   * 绑定他容器 DOM 的实例。键 = container → layoutId。WeakMap 使容器
   * 被 GC 时其池条目（连同布局 DOM 引用）一并回收。
   */
  private pool = new WeakMap<HTMLElement, Map<string, PooledLayoutEntry>>();
  /** 同一 id 的并发加载共享同一个 import promise */
  private loadPromises = new Map<string, Promise<ILayoutConstructor>>();
  /** Per-id registration generation; unregister/re-register invalidates pooled entries. */
  private registrationTokens = new Map<string, number>();
  /**
   * Monotonic epoch for registration tokens. `clear()` bumps every known id
   * instead of resetting the map to 1, so an in-flight `create` cannot pass
   * the token check after clear + re-register.
   */
  private nextRegistrationToken = 1;
  /** Create-time structural key, keyed by instance so GC still follows the pool WeakMap. */
  private instanceReuseKeys = new WeakMap<ILayout, string>();

  /**
   * 注册布局母版（eager 构造器）
   * @param id - 布局ID
   * @param ctor - 布局类构造函数
   * @param metadata - 布局元数据
   */
  register(
    id: string,
    ctor: ILayoutConstructor,
    metadata: Omit<LayoutMetadata, 'id'>
  ): void {
    if (!ctor || typeof ctor !== 'function') {
      throw new Error(
        `Layout constructor for "${id}" must be a valid class/function`
      );
    }
    this.registerEntry(id, { kind: 'eager', ctor }, metadata);
  }

  /**
   * 注册布局母版（惰性加载器）
   * 元数据立即可用；loader 在首次 create 时才执行并缓存结果。
   * @param id - 布局ID
   * @param loader - 返回布局构造器的 thunk（通常包装动态 import）
   * @param metadata - 布局元数据
   */
  registerLazy(
    id: string,
    loader: LayoutLoader,
    metadata: Omit<LayoutMetadata, 'id'>
  ): void {
    if (!loader || typeof loader !== 'function') {
      throw new Error(`Layout loader for "${id}" must be a valid function`);
    }
    this.registerEntry(id, { kind: 'lazy', loader }, metadata);
  }

  private registerEntry(
    id: string,
    entry: LayoutEntry,
    metadata: Omit<LayoutMetadata, 'id'>
  ): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Layout id must be a non-empty string');
    }
    if (!metadata || typeof metadata !== 'object') {
      throw new Error(`Layout metadata for "${id}" must be a valid object`);
    }
    if (!metadata.layoutTestProfile) {
      throw new Error(`Layout "${id}" must define layoutTestProfile`);
    }
    validateLayoutTestProfile(
      id,
      metadata.layoutTestProfile,
      metadata.supportedSlots
    );

    // Overwrite existing layout if same id

    this.layouts.set(id, entry);
    this.metadata.set(id, { id, ...metadata });
    this.loadPromises.delete(id);
    this.bumpToken(id);
  }

  private bumpToken(id: string): number {
    const token = this.nextRegistrationToken++;
    this.registrationTokens.set(id, token);
    return token;
  }

  private currentToken(id: string): number {
    return this.registrationTokens.get(id) ?? 0;
  }

  private disposePooled(entry: PooledLayoutEntry): void {
    try {
      void Promise.resolve(entry.instance.unmount()).catch((err: unknown) => {
        console.error('[LayoutRegistry] pooled layout unmount rejected:', err);
      });
    } catch (err) {
      console.error('[LayoutRegistry] pooled layout unmount threw:', err);
    }
  }

  /** 解析布局构造器；惰性条目只触发一次加载并共享 promise */
  private resolveConstructor(id: string): Promise<ILayoutConstructor> {
    const entry = this.layouts.get(id);

    if (!entry) {
      const available = this.list().join(', ');
      throw new Error(
        `Layout "${id}" not found. ` +
          `Available layouts: ${available || 'none'}`
      );
    }

    if (entry.kind === 'eager') {
      return Promise.resolve(entry.ctor);
    }

    let pending = this.loadPromises.get(id);
    if (!pending) {
      pending = Promise.resolve()
        .then(() => entry.loader())
        .then((ctor) => {
          if (!ctor || typeof ctor !== 'function') {
            throw new Error(
              `Layout loader for "${id}" did not resolve to a valid constructor`
            );
          }
          return ctor;
        });
      // 加载失败不缓存，允许下次 create 重试
      pending.catch(() => this.loadPromises.delete(id));
      this.loadPromises.set(id, pending);
    }
    return pending;
  }

  /**
   * 创建布局实例（优先从本容器的实例池复用；惰性布局首次创建时动态加载）
   *
   * Abort: `options.signal` 使调用方立即停止等待惰性 import。迟到
   * continuation 在 `new LayoutClass` 与任何 pool 写入前核对 signal /
   * 当前 registration token，不得构造或发布实例。布局切换 generation
   * 不是 create 选项；注册 token 是唯一 epoch。
   */
  async create(
    id: string,
    container: HTMLElement,
    config?: LayoutConfig,
    options?: LayoutCreateOptions
  ): Promise<ILayout> {
    if (!id || typeof id !== 'string') {
      throw new Error('Layout id must be a non-empty string');
    }
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Layout container must be a valid HTMLElement');
    }

    const signal = options?.signal;
    const throwIfAborted = (): void => {
      if (signal?.aborted) {
        throw signal.reason ?? createAbortError();
      }
    };
    throwIfAborted();

    const inputKey = layoutReuseKey(id, config);
    const tokenAtStart = this.currentToken(id);
    const perContainer = this.pool.get(container);
    const cached = perContainer?.get(id);
    if (cached) {
      perContainer?.delete(id);
      const tokenOk = cached.registrationToken === tokenAtStart;
      const requestedKey = cached.instance.getReuseKey?.(config) ?? inputKey;
      const keyOk = cached.reuseKey === requestedKey;
      if (tokenOk && keyOk) {
        cached.instance._updateConfig?.(config);
        this.instanceReuseKeys.set(cached.instance, cached.reuseKey);
        return cached.instance;
      }
      this.disposePooled(cached);
    }

    const LayoutClass = signal
      ? await raceAbort(this.resolveConstructor(id), signal)
      : await this.resolveConstructor(id);
    throwIfAborted();
    if (this.currentToken(id) !== tokenAtStart) {
      throw createAbortError('Layout registration superseded');
    }

    const instance = new LayoutClass(container, config);
    this.instanceReuseKeys.set(instance, instance.getReuseKey?.() ?? inputKey);
    return instance;
  }

  /**
   * 将布局实例放回池中以备复用（按容器隔离）。
   * 调用方负责确保实例已 unmount。失效 registration token 的条目
   * 在下次 create/returnInstance 时 dispose，不建强引用 side index。
   */
  returnInstance(container: HTMLElement, id: string, instance: ILayout): void {
    const token = this.currentToken(id);
    if (token === 0 || !this.layouts.has(id)) {
      this.disposePooled({
        instance,
        registrationToken: token,
        reuseKey: ''
      });
      return;
    }
    let perContainer = this.pool.get(container);
    if (!perContainer) {
      perContainer = new Map();
      this.pool.set(container, perContainer);
    }
    const existing = perContainer.get(id);
    if (existing && existing.instance !== instance) {
      this.disposePooled(existing);
    }
    perContainer.set(id, {
      instance,
      registrationToken: token,
      reuseKey:
        this.instanceReuseKeys.get(instance) ??
        instance.getReuseKey?.() ??
        layoutReuseKey(id, {})
    });
  }

  /**
   * 清空实例池（dispose 时使用）——整体替换 WeakMap。
   */
  clearPool(): void {
    this.pool = new WeakMap();
  }

  /**
   * 获取布局元数据
   * @param id - 布局ID
   */
  getMetadata(id: string): LayoutMetadata | undefined {
    return this.metadata.get(id);
  }

  /**
   * 获取所有布局元数据
   */
  getAllMetadata(): LayoutMetadata[] {
    return Array.from(this.metadata.values());
  }

  /**
   * 列出所有布局ID
   */
  list(): string[] {
    return Array.from(this.layouts.keys());
  }

  /**
   * 检查布局是否存在
   * @param id - 布局ID
   */
  has(id: string): boolean {
    return this.layouts.has(id);
  }

  /**
   * 注销布局
   * @param id - 布局ID
   */
  unregister(id: string): void {
    this.layouts.delete(id);
    this.metadata.delete(id);
    this.loadPromises.delete(id);
    this.bumpToken(id);
  }

  /**
   * 根据标签筛选布局
   * @param tag - 标签
   */
  findByTag(tag: string): LayoutMetadata[] {
    return this.getAllMetadata().filter((meta) => meta.tags.includes(tag));
  }

  /**
   * 清空所有注册。Registration tokens stay monotonic: each known id is
   * bumped so a deferred `create` that started before clear cannot pass
   * with a recycled token after re-register.
   */
  clear(): void {
    this.layouts.clear();
    this.metadata.clear();
    this.pool = new WeakMap();
    this.loadPromises.clear();
    for (const id of this.registrationTokens.keys()) {
      this.bumpToken(id);
    }
  }
}

// 导出单例实例
export const layoutRegistry = new LayoutRegistry();

// 导出便捷的注册函数
export function registerLayout(
  id: string,
  ctor: ILayoutConstructor,
  metadata: Omit<LayoutMetadata, 'id'>
): void {
  layoutRegistry.register(id, ctor, metadata);
}

/**
 * 惰性注册布局：元数据同步可用，构造器首次使用时才加载。
 * 用于把布局实现从首屏 chunk 中拆出（动态 import）。
 */
export function registerLazyLayout(
  id: string,
  loader: LayoutLoader,
  metadata: Omit<LayoutMetadata, 'id'>
): void {
  layoutRegistry.registerLazy(id, loader, metadata);
}
