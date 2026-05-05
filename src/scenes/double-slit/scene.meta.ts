/**
 * 双缝干涉 — 光的双缝干涉公式推导
 *
 * 从几何结构出发，推导 Δx = λL/d
 */

import type { SceneMeta } from '../../platform/scene-contract';

export const doubleSlitMeta: SceneMeta = {
  id: 'double-slit',
  title: '双缝干涉',
  path: '/src/pages/double-slit.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['光程差', '条纹间距'],
  keywords: ['光学', '双缝干涉', '杨氏实验', '波长', '条纹间距'],
  objective: '通过几何推导理解双缝干涉条纹间距公式 Δx = λL/d',
  description: '从双缝干涉的几何结构出发，逐步推导条纹间距公式',
  difficulty: 2,
  icon: '💡',
  category: 'method',
  featured: false,
  defaultParams: {
    lambda: 650,
    L: 1.0,
    d: 0.5
  },
  urlSyncKeys: ['step']
};
