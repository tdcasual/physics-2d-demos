/**
 * 场景引导器 - 统一封装 SceneContainer 的创建与配置
 *
 * 将场景 page.ts 从 ~200 行缩减到 ~30 行。
 */

import '../styles/index.css';

import { createSceneContainer } from './layouts/container';
import { registerAllLayouts } from './layouts/auto-register';
import { SceneAdapter } from './scene-adapter';
import type { SceneInstance, ScenePageOptions } from './scene-bootstrapper-types';

export type { SceneInstance, ScenePageOptions } from './scene-bootstrapper-types';
export { SceneAdapter } from './scene-adapter';

/**
 * 统一启动场景页面
 *
 * @param options - 场景配置
 * @param mountSelector - 挂载目标选择器，默认 '#app'
 */
export function bootScenePage<TScene extends SceneInstance>(
  options: ScenePageOptions<TScene>,
  mountSelector: string = '#app'
): void {
  const mount = document.querySelector(mountSelector) as HTMLElement | null;
  if (!mount) {
    throw new Error(`Missing mount container: ${mountSelector}`);
  }

  // 统一注册所有布局（幂等）
  registerAllLayouts();

  // 创建场景容器
  const container = createSceneContainer({
    mount,
    defaultLayout: options.preferredLayout ?? 'split-right',
    defaultTheme: 'light',
    layoutConfig: {
      ...options.layoutConfig,
      title: options.meta.title
    }
  });

  // 创建场景适配器
  const adapter = new SceneAdapter<TScene>(options, (text) =>
    container.currentLayout?.updateStatus?.(text)
  );

  // 设置场景
  container.setScene(adapter).catch((err) => {
    console.error('[bootScenePage] setScene failed:', err);
  });
}
