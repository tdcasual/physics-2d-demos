/**
 * 双缝干涉 — 杨氏双缝干涉实验演示
 *
 * 6 步骤渐进式演示：光源→透镜→单缝衍射→双缝波前分裂→空间干涉→毛玻璃条纹→目镜观察
 */

import type { SceneMeta } from '../../platform/scene-contract';

export const doubleSlitMeta: SceneMeta = {
  id: 'double-slit',
  title: '双缝干涉',
  path: '/src/pages/double-slit.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['杨氏实验', '条纹间距'],
  keywords: ['光学', '双缝干涉', '杨氏实验', '波长', '衍射', '相干光'],
  objective: '通过 6 步骤动画演示双缝干涉实验全过程，理解光的波动性与条纹形成机制',
  description: '从光源发出单色光开始，经透镜汇聚、单缝衍射、双缝分裂、空间干涉叠加，最终在毛玻璃上形成明暗相间条纹',
  difficulty: 2,
  icon: '💡',
  category: 'method',
  featured: false,
  defaultParams: {
    step: 1,
    lambda: 532,
    slitDistance: 40,
  },
  urlSyncKeys: ['step', 'activeInstrument']
};
