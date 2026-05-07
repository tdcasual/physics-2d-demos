/**
 * 场景元数据 — 从 catalog/scene-registry 派生
 */

import { sceneRegistry as _sceneRegistry } from '../../catalog/scene-registry';

// 重新导出以保持兼容
export { _sceneRegistry as sceneRegistry };

export interface SceneMeta {
  id: string;
  title: string;
  description: string;
  category: 'mechanics' | 'electromagnetism' | 'method';
  categoryLabel: string;
  icon: string;
  difficulty: 1 | 2 | 3;
  path: string;
  thumbnail?: string;
}

export const featuredScenes = _sceneRegistry.filter((s) => s.featured);

export const categoryInfo: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  mechanics: {
    label: '力学',
    color: 'var(--category-mechanics)',
    icon: '⚙️'
  },
  electromagnetism: {
    label: '电磁学',
    color: 'var(--category-electromagnetism)',
    icon: '⚡'
  },
  method: { label: '方法', color: 'var(--category-method)', icon: '📐' }
};

export const getDifficultyLabel = (difficulty: number): string => {
  const labels = ['入门', '进阶', '挑战'];
  return labels[difficulty - 1] || '未知';
};
