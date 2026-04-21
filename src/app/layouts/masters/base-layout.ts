/**
 * 布局母版基类
 *
 * 所有布局母版的抽象基类，提供通用功能
 *
 * @review-date 2026-04-02
 * @version 0.1.0
 */

import type {
  LayoutMaster,
  LayoutSlots,
  LayoutConfig,
  LayoutTransition,
  Theme,
  SlotName,
  SlotConfig
} from '../types';

/** 布局基类 */
export abstract class BaseLayout implements LayoutMaster {
  /** 布局ID */
  abstract readonly id: string;

  /** 布局显示名称 */
  abstract readonly name: string;

  /** 布局描述 */
  abstract readonly description: string;

  /** 支持的区域 */
  abstract readonly supportedSlots: SlotName[];

  /** 容器元素 */
  readonly container: HTMLElement;

  /** 布局配置 */
  protected config: LayoutConfig;

  /** 区域槽位映射 */
  protected slots: Partial<LayoutSlots> = {};

  /** 当前主题 */
  protected currentTheme: Theme = 'light';

  /** 是否已挂载 */
  protected isMounted = false;

  /** 是否正在进行动画 */
  private isAnimating = false;

  /** 动画中断控制器 */
  private animationAbortController: AbortController | null = null;

  constructor(container: HTMLElement, config: LayoutConfig = {}) {
    this.container = container;
    this.config = {
      theme: 'light',
      mobileBreakpoint: 768,
      tabletBreakpoint: 1024,
      ...config
    };
    this.currentTheme = this.config.theme || 'light';
  }

  /**
   * 渲染布局结构
   * 子类必须实现此方法
   */
  abstract render(container: HTMLElement): LayoutSlots;

  /**
   * 挂载布局
   * 初始化事件监听、ResizeObserver 等
   */
  async mount(): Promise<void> {
    if (this.isMounted) {
      return;
    }

    // 先渲染布局结构
    this.slots = this.render(this.container);

    // 添加根类名
    this.container.classList.add('layout-master', `layout-${this.id}`);

    // 设置初始主题
    this.setTheme(this.currentTheme);

    this.isMounted = true;
  }

  /**
   * 卸载布局
   * 清理资源
   */
  async unmount(): Promise<void> {
    if (!this.isMounted) return;

    // 中断进行中的动画
    this.animationAbortController?.abort();
    this.animationAbortController = null;

    // 清空容器
    this.container.replaceChildren();
    this.container.classList.remove('layout-master', `layout-${this.id}`);
    this.container.removeAttribute('data-theme');

    // 清空槽位引用
    this.slots = {};

    this.isMounted = false;
  }

  /**
   * 处理尺寸变化
   * 子类可覆盖以实现响应式逻辑
   */
  handleResize(width: number, height: number): void {
    // 子类实现
    void width;
    void height;
  }

  /**
   * 设置主题
   */
  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.container.setAttribute('data-theme', theme);
  }

  /**
   * 进入动画
   * 默认淡入效果，子类可覆盖
   */
  async enter(
    transition: LayoutTransition = {
      type: 'fade',
      duration: 250,
      easing: 'ease-out'
    }
  ): Promise<void> {
    if (this.isAnimating) {
      this.animationAbortController?.abort();
    }
    this.isAnimating = true;
    this.animationAbortController = new AbortController();
    const signal = this.animationAbortController.signal;

    const { duration, easing } = transition;

    this.container.style.opacity = '0';
    this.container.style.transition = `opacity ${duration}ms ${easing}`;

    // 强制重绘
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.container.offsetHeight;

    this.container.style.opacity = '1';

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.container.style.transition = '';
          this.isAnimating = false;
          resolve();
        }, duration);

        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            this.container.style.transition = '';
            this.isAnimating = false;
            reject(new Error('Animation aborted'));
          },
          { once: true }
        );
      });
    } catch {
      // 动画被中断，transition 和 isAnimating 已在 abort handler 中清理
    }
  }

  /**
   * 退出动画
   * 默认淡出效果，子类可覆盖
   */
  async exit(
    transition: LayoutTransition = {
      type: 'fade',
      duration: 250,
      easing: 'ease-in'
    }
  ): Promise<void> {
    if (this.isAnimating) {
      this.animationAbortController?.abort();
    }
    this.isAnimating = true;
    this.animationAbortController = new AbortController();
    const signal = this.animationAbortController.signal;

    const { duration, easing } = transition;

    this.container.style.transition = `opacity ${duration}ms ${easing}`;
    this.container.style.opacity = '0';

    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.isAnimating = false;
          resolve();
        }, duration);

        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            this.isAnimating = false;
            reject(new Error('Animation aborted'));
          },
          { once: true }
        );
      });
    } catch {
      // 动画被中断，isAnimating 已在 abort handler 中清理
    }
  }

  /**
   * 获取区域配置
   * 子类可覆盖以提供默认配置
   */
  getSlotConfig(slot: SlotName): SlotConfig | undefined {
    return this.config.slots?.[slot];
  }

  /**
   * 设置区域折叠状态
   * 子类应覆盖此方法
   */
  setSlotCollapsed(slot: SlotName, collapsed: boolean): void {
    const element = this.slots[slot];
    if (element) {
      element.classList.toggle('is-collapsed', collapsed);
      element.setAttribute('data-collapsed', String(collapsed));
    }
  }

  /**
   * 获取区域元素
   */
  getSlot(name: SlotName): HTMLElement | undefined {
    return this.slots[name];
  }

  /**
   * 获取所有已渲染的区域槽位
   */
  getSlots(): Partial<LayoutSlots> {
    return this.slots;
  }

  /**
   * 检查是否支持某区域
   */
  supportsSlot(name: SlotName): boolean {
    return this.supportedSlots.includes(name);
  }

  // ResizeObserver 已由 SceneContainerImpl 统一管理，基类不再重复监听
  // 子类仍可通过 handleResize() 接收尺寸变化通知

  /**
   * 创建区域元素
   * @param name - 区域名称
   * @param className - 附加类名
   */
  protected createSlot(name: SlotName, className?: string): HTMLElement {
    const element = document.createElement('div');
    element.className = `layout-region ${className || ''}`.trim();
    element.setAttribute('data-region', name);
    return element;
  }

  /**
   * 检查是否为移动端
   */
  protected isMobile(width?: number): boolean {
    const w = width ?? this.container.clientWidth;
    return w < (this.config.mobileBreakpoint || 768);
  }

  /**
   * 检查是否为平板
   */
  protected isTablet(width?: number): boolean {
    const w = width ?? this.container.clientWidth;
    const mobileBreakpoint = this.config.mobileBreakpoint || 768;
    const tabletBreakpoint = this.config.tabletBreakpoint || 1024;
    return w >= mobileBreakpoint && w < tabletBreakpoint;
  }

  /**
   * 检查是否为桌面端
   */
  protected isDesktop(width?: number): boolean {
    const w = width ?? this.container.clientWidth;
    return w >= (this.config.tabletBreakpoint || 1024);
  }
}
