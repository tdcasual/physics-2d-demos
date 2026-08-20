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

/** Validate a layout's declarative test capabilities before registration. */
export function validateLayoutTestProfile(
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
  for (const key of ['minCanvasWidth', 'minCanvasHeight'] as const) {
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

/** 布局注册表 */
class LayoutRegistry {
  private layouts = new Map<string, ILayoutConstructor>();
  private metadata = new Map<string, LayoutMetadata>();
  private pool = new Map<string, ILayout>();

  /**
   * 注册布局母版
   * @param id - 布局ID
   * @param ctor - 布局类构造函数
   * @param metadata - 布局元数据
   */
  register(
    id: string,
    ctor: ILayoutConstructor,
    metadata: Omit<LayoutMetadata, 'id'>
  ): void {
    if (!id || typeof id !== 'string') {
      throw new Error('Layout id must be a non-empty string');
    }
    if (!ctor || typeof ctor !== 'function') {
      throw new Error(
        `Layout constructor for "${id}" must be a valid class/function`
      );
    }
    if (!metadata || typeof metadata !== 'object') {
      throw new Error(`Layout metadata for "${id}" must be a valid object`);
    }
    if (metadata.autoSelectable === true && !metadata.layoutTestProfile) {
      throw new Error(
        `Layout "${id}" must define layoutTestProfile when autoSelectable is true`
      );
    }
    validateLayoutTestProfile(
      id,
      metadata.layoutTestProfile,
      metadata.supportedSlots
    );

    // Overwrite existing layout if same id

    this.layouts.set(id, ctor);
    this.metadata.set(id, { id, ...metadata });

    // layout registered
  }

  /**
   * 创建布局实例（优先从实例池复用）
   * @param id - 布局ID
   * @param container - 容器元素
   * @param config - 布局配置
   * @returns 布局实例
   */
  create(id: string, container: HTMLElement, config?: LayoutConfig): ILayout {
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

    const LayoutClass = this.layouts.get(id);

    if (!LayoutClass || typeof LayoutClass !== 'function') {
      const available = this.list().join(', ');
      throw new Error(
        `Layout "${id}" not found. ` +
          `Available layouts: ${available || 'none'}`
      );
    }

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
