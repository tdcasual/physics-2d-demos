/**
 * Scene Controls - 场景控制组件库
 *
 * 提供一组可复用的 DOM 控件工厂函数，用于构建场景控制面板。
 */

import { createControlCard } from '../ControlCard';
import type { SceneControlsOptions, SceneControlsInstance } from './types';

/**
 * 创建场景控制面板
 *
 * @param options - 控制面板配置（title/icon/fields/defaultCollapsed）
 * @returns 包含 element/setValue/getValue/setActive 方法的控制器
 */
export function createSceneControls(
  options: SceneControlsOptions
): SceneControlsInstance {
  const card = createControlCard(options.title, {
    icon: options.icon,
    headerActions: options.headerActions,
    defaultCollapsed: options.defaultCollapsed ?? false
  });

  const values = new Map<string, number | string>();
  const inputs = new Map<string, HTMLInputElement | HTMLSelectElement>();

  function setValue(key: string, value: number | string): void {
    values.set(key, value);
    const input = inputs.get(key);
    if (input) {
      input.value = String(value);
    }
  }

  function getValue(key: string): number | string | undefined {
    return values.get(key);
  }

  return {
    element: card.element,
    body: card.body,
    setValue,
    getValue
  };
}

/**
 * 创建滑块控制行
 */
