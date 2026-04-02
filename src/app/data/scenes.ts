/**
 * 场景元数据
 * Scene Metadata
 * 
 * 与 src/scenes 目录下的 scene.meta.ts 保持一致
 */

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

export const sceneRegistry: SceneMeta[] = [
  {
    id: 'projectile',
    title: '抛体运动',
    description: '探索抛物线轨迹的奥秘，理解水平与竖直运动的独立性',
    category: 'mechanics',
    categoryLabel: '力学',
    icon: '🎯',
    difficulty: 2,
    path: '/src/pages/projectile.html',
  },
  {
    id: 'chase-meet',
    title: '追及相遇',
    description: '速度的较量，相对运动的魅力，v-t图像实战',
    category: 'mechanics',
    categoryLabel: '力学',
    icon: '🏃',
    difficulty: 2,
    path: '/src/pages/chase-meet.html',
  },
  {
    id: 'field-lines',
    title: '电场分布',
    description: '可视化看不见的力量，电场线的绘制与理解',
    category: 'electromagnetism',
    categoryLabel: '电磁学',
    icon: '⚡',
    difficulty: 2,
    path: '/src/pages/field-lines.html',
  },
  {
    id: 'emf-analogy',
    title: '电磁类比',
    description: '用熟悉理解陌生，将电磁现象与日常生活类比',
    category: 'electromagnetism',
    categoryLabel: '电磁学',
    icon: '🔗',
    difficulty: 3,
    path: '/src/pages/emf-analogy.html',
  },
  {
    id: 'electrification',
    title: '静电感应',
    description: '摩擦起电与静电感应的原理演示',
    category: 'electromagnetism',
    categoryLabel: '电磁学',
    icon: '🔋',
    difficulty: 1,
    path: '/src/pages/electrification.html',
  },
  {
    id: 'vt-integral',
    title: '微元法演示',
    description: '微积分与物理的交汇，图像法求解运动学问题',
    category: 'method',
    categoryLabel: '方法',
    icon: '📊',
    difficulty: 3,
    path: '/src/pages/vt-integral.html',
  },
  {
    id: 'spring-oscillator',
    title: '弹簧振子',
    description: '探索简谐运动的韵律，周期与频率的美妙关系',
    category: 'mechanics',
    categoryLabel: '力学',
    icon: '🌀',
    difficulty: 2,
    path: '/src/pages/spring-oscillator.html',
  },
];

// 按分类分组
export const scenesByCategory = sceneRegistry.reduce((acc, scene) => {
  if (!acc[scene.category]) {
    acc[scene.category] = [];
  }
  acc[scene.category].push(scene);
  return acc;
}, {} as Record<string, SceneMeta[]>);

// 获取分类信息
export const categoryInfo: Record<string, { label: string; color: string; icon: string }> = {
  mechanics: { label: '力学', color: '#74b9ff', icon: '⚙️' },
  electromagnetism: { label: '电磁学', color: '#fdcb6e', icon: '⚡' },
  method: { label: '方法', color: '#a29bfe', icon: '📐' },
};

// 按ID查找场景
export const getSceneById = (id: string): SceneMeta | undefined => {
  return sceneRegistry.find(scene => scene.id === id);
};

// 获取难度标签
export const getDifficultyLabel = (difficulty: number): string => {
  const labels = ['入门', '进阶', '挑战'];
  return labels[difficulty - 1] || '未知';
};
