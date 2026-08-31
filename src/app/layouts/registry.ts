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
  LayoutLoader,
  LayoutTestProfile,
  SlotName
} from './types';

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

/** 布局注册表 */
class LayoutRegistry {
  private layouts = new Map<string, LayoutEntry>();
  private metadata = new Map<string, LayoutMetadata>();
  private pool = new Map<string, ILayout>();
  /** 同一 id 的并发加载共享同一个 import promise */
  private loadPromises = new Map<string, Promise<ILayoutConstructor>>();

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

    // layout registered
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
   * 创建布局实例（优先从实例池复用；惰性布局首次创建时动态加载）
   * @param id - 布局ID
   * @param container - 容器元素
   * @param config - 布局配置
   * @returns 布局实例
   */
  async create(
    id: string,
    container: HTMLElement,
    config?: LayoutConfig
  ): Promise<ILayout> {
    if (!id || typeof id !== 'string') {
      throw new Error('Layout id must be a non-empty string');
    }
    if (!container || !(container instanceof HTMLElement)) {
      throw new Error('Layout container must be a valid HTMLElement');
    }

    // Check instance pool first
    const cached = this.pool.get(id);
    if (cached) {
      this.pool.delete(id);
      cached._updateConfig?.(config);
      return cached;
    }

    const LayoutClass = await this.resolveConstructor(id);

    return new LayoutClass(container, config);
  }

  /**
   * 将布局实例放回池中以备复用。
   * 调用方负责确保实例已 unmount。
   */
  returnInstance(id: string, instance: ILayout): void {
    this.pool.set(id, instance);
  }

  /**
   * 清空实例池（dispose 时使用）
   */
  clearPool(): void {
    this.pool.clear();
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
    // layout unregistered
  }

  /**
   * 根据标签筛选布局
   * @param tag - 标签
   */
  findByTag(tag: string): LayoutMetadata[] {
    return this.getAllMetadata().filter((meta) => meta.tags.includes(tag));
  }

  /**
   * 清空所有注册
   */
  clear(): void {
    this.layouts.clear();
    this.metadata.clear();
    this.pool.clear();
    this.loadPromises.clear();
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

/**
 * 获取默认布局ID
 * 如果用户有偏好设置，返回偏好布局；否则返回第一个可用布局
 */
const LAYOUT_PREF_KEY = 'physics-demos-preferred-layout';
const LAYOUT_SCHEMA_VERSION = 1;

interface LayoutPrefSchema {
  v: number;
  layoutId: string;
}

function migrateLayoutPref(raw: string | null): string | null {
  if (!raw) return null;
  // 兼容旧版：直接存储的 layoutId 字符串
  if (layoutRegistry.has(raw)) {
    return raw;
  }
  try {
    const parsed = JSON.parse(raw) as LayoutPrefSchema;
    if (parsed.v === LAYOUT_SCHEMA_VERSION && parsed.layoutId) {
      if (layoutRegistry.has(parsed.layoutId)) {
        return parsed.layoutId;
      }
    }
  } catch {
    // 数据损坏，忽略
  }
  return null;
}

export function getDefaultLayoutId(): string | null {
  // 尝试从 localStorage 读取用户偏好
  try {
    const userPref = migrateLayoutPref(localStorage.getItem(LAYOUT_PREF_KEY));
    if (userPref) {
      return userPref;
    }
  } catch {
    // localStorage 不可用
  }

  // 返回第一个可用布局，若注册表为空则返回 null
  const available = layoutRegistry.list();
  return available[0] || null;
}

/**
 * 保存用户布局偏好
 * @param layoutId - 布局ID
 */
export function saveLayoutPreference(layoutId: string): void {
  try {
    const payload: LayoutPrefSchema = {
      v: LAYOUT_SCHEMA_VERSION,
      layoutId
    };
    localStorage.setItem(LAYOUT_PREF_KEY, JSON.stringify(payload));
  } catch {
    // localStorage 不可用，忽略
  }
}
