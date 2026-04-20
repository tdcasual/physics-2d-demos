import type { SceneMeta } from '../types';

export const fieldLinesMeta: SceneMeta = {
  id: 'field-lines',
  title: '电场线演化',
  path: '/src/pages/field-lines.html',
  subject: '电磁学',
  concept: '电场分布',
  subConcepts: ['电荷叠加', '场线疏密'],
  keywords: ['电磁学', '电场线', '2D'],
  objective: '展示点电荷组合下电场矢量分布和拖拽交互反馈',
  description: '可视化看不见的力量，电场线的绘制与理解',
  difficulty: 2,
  icon: '⚡',
  category: 'electromagnetism',
  featured: true,
  defaultParams: {
    density: 10,
    q1: 1,
    q2: -1
  }
};
