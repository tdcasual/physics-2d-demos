import type { SceneMeta } from '../types';

export const vtIntegralMeta: SceneMeta = {
  id: 'vt-integral',
  title: '微元法演示',
  path: '/src/pages/vt-integral.html',
  subject: '力学',
  concept: '积分思想',
  subConcepts: ['面积法', '微元累积'],
  keywords: ['力学', '微元法', '多场景', '2D'],
  objective: '展示积分逼近、曲线逼近与体积逼近的多场景演示',
  defaultParams: {
    scene: 1
  }
};
