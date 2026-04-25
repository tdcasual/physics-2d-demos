/**
 * 场景引导器 - 统一封装 SceneContainer 的创建与配置
 *
 * 将场景 page.ts 从 ~200 行缩减到 ~30 行。
 */

import '../styles/teaching-shell.css';

import { createSceneContainer } from './layouts/container';
import { registerAllLayouts } from './layouts/auto-register';
import { SceneAdapter } from './scene-adapter';
import type { SceneInstance, ScenePageOptions } from './scene-bootstrapper-types';

export type { SceneInstance, ScenePageOptions } from './scene-bootstrapper-types';
export { SceneAdapter } from './scene-adapter';

/**
 * 统一启动场景页面
 *
 * 使用方式：
 * ```ts
 * bootScenePage({
 *   meta: projectileMeta,
 *   createScene: ({ canvas, theme, mode }) => createProjectileScene({ canvas, theme, mode }),
 *   createControls: ({ mount, scene }) => createProjectileControls({ mount, scene }),
 *   preferredLayout: 'split-right',
 *   layoutConfig: { hasGraph: false, defaultLeftRatio: 0.32 }
 * });
 * ```
 */
export function bootScenePage<TScene extends SceneInstance>(
  options: ScenePageOptions<TScene>
): void {
  const mount = document.getElementById('app');
  if (!mount) {
    throw new Error('Missing #app container');
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
  container.setScene(adapter);
}
