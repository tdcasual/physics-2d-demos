/**
 * 场景元数据 — 从 catalog/scene-registry 派生
 */

import { sceneRegistry as _sceneRegistry } from '../../catalog/scene-registry';
import {
  CURRICULUM_DOMAIN_INFO,
  CURRICULUM_DOMAINS
} from '../../platform/curriculum';

// 重新导出以保持兼容
export { _sceneRegistry as sceneRegistry };

// SceneMeta 唯一定义在 platform/scene-contract.ts，这里仅做别名转发，避免双类型定义
export type { SceneMeta } from '../../platform/scene-contract';

export const featuredScenes = _sceneRegistry.filter((s) => s.featured);

/**
 * 首页分类信息由课程体系集中定义。保留旧的 `method` 别名，避免外部
 * 集成在迁移期间读取 categoryInfo.method 时出现运行时断裂。
 */
export const categoryInfo = {
  ...CURRICULUM_DOMAIN_INFO,
  // Legacy alias kept for integrations compiled against the former three-way
  // taxonomy. New UI filters use `experimental`.
  method: {
    label: '方法',
    color: 'var(--category-method)',
    icon: '📐'
  }
};

export { CURRICULUM_DOMAINS };

export const getDifficultyLabel = (difficulty: number): string => {
  const labels = ['入门', '进阶', '挑战'];
  return labels[difficulty - 1] || '未知';
};
