import type { SceneMeta } from '../types';

export const fieldLinesMeta: SceneMeta = {
  id: 'field-lines',
  title: '电场矢量到电场线的演化（2D）',
  path: '/src/pages/field-lines.html',
  keywords: ['电磁学', '电场线', '2D'],
  objective: '展示点电荷组合下电场矢量分布和拖拽交互反馈',
  defaultParams: {
    density: 10,
    q1: 1,
    q2: -1
  }
};
