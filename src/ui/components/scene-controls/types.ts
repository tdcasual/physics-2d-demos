/**
 * 场景控制组件类型定义
 */

/**
 * 带清理方法的 DOM 元素。
 *
 * 控件工厂创建元素并注册事件监听后，通过 `withDispose` 挂上 `dispose()`
 * 用于解绑监听；SchemaRenderer 在销毁时统一回收。
 */
export type DisposableElement<T extends HTMLElement = HTMLElement> = T & {
  dispose(): void;
};

/** 给元素挂上 dispose 清理方法（把必要的类型断言集中于此） */
export function withDispose<T extends HTMLElement>(
  el: T,
  dispose: () => void
): DisposableElement<T> {
  const target = el as unknown as DisposableElement<T>;
  target.dispose = dispose;
  return target;
}

export interface SceneControlsOptions {
  title: string;
  icon?: string;
  headerActions?: HTMLElement[];
  defaultCollapsed?: boolean;
  onChange?: (key: string, value: number | string) => void;
}

export interface SceneControlsInstance {
  element: HTMLElement;
  body: HTMLElement;
  setValue: (key: string, value: number | string) => void;
  getValue: (key: string) => number | string | undefined;
}
