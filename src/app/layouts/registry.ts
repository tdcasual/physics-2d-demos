/**
 * 布局母版注册表
 * 
 * 管理所有可用的布局母版，提供注册和创建功能
 * 
 * @review-date 2026-04-02
 * @version 0.1.0
 */

import type { LayoutMaster, LayoutMasterConstructor } from './types';

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
  supportedSlots: string[];
}

/** 布局注册表 */
class LayoutRegistry {
  private layouts = new Map<string, LayoutMasterConstructor>();
  private metadata = new Map<string, LayoutMetadata>();
  
  /**
   * 注册布局母版
   * @param id - 布局ID
   * @param ctor - 布局类构造函数
   * @param metadata - 布局元数据
   */
  register(
    id: string, 
    ctor: LayoutMasterConstructor,
    metadata: Omit<LayoutMetadata, 'id'>
  ): void {
    if (this.layouts.has(id)) {
      console.warn(`[LayoutRegistry] Layout "${id}" is already registered, overwriting`);
    }
    
    this.layouts.set(id, ctor);
    this.metadata.set(id, { id, ...metadata });
    
    console.log(`[LayoutRegistry] Registered layout: "${id}"`);
  }
  
  /**
   * 创建布局实例
   * @param id - 布局ID
   * @param container - 容器元素
   * @param config - 布局配置
   * @returns 布局实例
   */
  create(id: string, container: HTMLElement, config?: any): LayoutMaster {
    const LayoutClass = this.layouts.get(id);
    
    if (!LayoutClass) {
      const available = this.list().join(', ');
      throw new Error(
        `Layout "${id}" not found. ` +
        `Available layouts: ${available || 'none'}`
      );
    }
    
    return new LayoutClass(container, config);
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
    console.log(`[LayoutRegistry] Unregistered layout: "${id}"`);
  }
  
  /**
   * 根据标签筛选布局
   * @param tag - 标签
   */
  findByTag(tag: string): LayoutMetadata[] {
    return this.getAllMetadata().filter(meta => meta.tags.includes(tag));
  }
  
  /**
   * 清空所有注册
   */
  clear(): void {
    this.layouts.clear();
    this.metadata.clear();
  }
}

// 导出单例实例
export const layoutRegistry = new LayoutRegistry();

// 导出便捷的注册函数
export function registerLayout(
  id: string,
  ctor: LayoutMasterConstructor,
  metadata: Omit<LayoutMetadata, 'id'>
): void {
  layoutRegistry.register(id, ctor, metadata);
}

/**
 * 获取默认布局ID
 * 如果用户有偏好设置，返回偏好布局；否则返回第一个可用布局
 */
export function getDefaultLayoutId(): string {
  // 尝试从 localStorage 读取用户偏好
  try {
    const userPref = localStorage.getItem('physics-demos-preferred-layout');
    if (userPref && layoutRegistry.has(userPref)) {
      return userPref;
    }
  } catch {
    // localStorage 不可用
  }
  
  // 返回第一个可用布局，或 fallback
  const available = layoutRegistry.list();
  return available[0] || 'split-right';
}

/**
 * 保存用户布局偏好
 * @param layoutId - 布局ID
 */
export function saveLayoutPreference(layoutId: string): void {
  try {
    localStorage.setItem('physics-demos-preferred-layout', layoutId);
  } catch {
    // localStorage 不可用，忽略
  }
}
