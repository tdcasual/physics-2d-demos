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

export const scenes = _sceneRegistry as unknown as SceneMeta[];

export const featuredScenes = _sceneRegistry.filter((s) => s.featured);

export const scenesByCategory = _sceneRegistry.reduce(
  (acc, scene) => {
    if (!acc[scene.category]) {
      acc[scene.category] = [];
    }
    acc[scene.category].push(scene as unknown as SceneMeta);
    return acc;
  },
  {} as Record<string, SceneMeta[]>
);

export const categoryInfo: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  mechanics: { label: '力学', color: '#74b9ff', icon: '⚙️' },
  electromagnetism: { label: '电磁学', color: '#fdcb6e', icon: '⚡' },
  method: { label: '方法', color: '#a29bfe', icon: '📐' }
};

export const getSceneById = (id: string): SceneMeta | undefined => {
  return _sceneRegistry.find((scene) => scene.id === id) as unknown as
    | SceneMeta
    | undefined;
};

export const getDifficultyLabel = (difficulty: number): string => {
  const labels = ['入门', '进阶', '挑战'];
  return labels[difficulty - 1] || '未知';
};
