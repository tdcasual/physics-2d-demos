/**
 * 双缝干涉 — 杨氏双缝干涉实验演示
 *
 * 6 步骤渐进式演示：光源→透镜→单缝衍射→双缝波前分裂→空间干涉→毛玻璃条纹→目镜观察
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'derivation',
  transport: 'hidden',
  readoutKeys: ['step', 'light', 'd'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['step', 'lightMode', 'lambda']
  }
};

export const doubleSlitMeta: SceneMeta = {
  id: 'double-slit',
  title: '双缝干涉',
  path: '/src/pages/double-slit.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['杨氏实验', '条纹间距'],
  keywords: [
    '光学',
    '双缝干涉',
    '杨氏实验',
    '波长',
    '衍射',
    '相干光',
    '白光',
    '滤光片'
  ],
  objective:
    '通过 6 步骤动画演示双缝干涉实验全过程，支持单色光和白光模式，理解光的波动性与条纹形成机制',
  description:
    '从光源发出单色光或白光开始，经透镜汇聚、单缝衍射、双缝分裂、空间干涉叠加，最终在毛玻璃上形成干涉条纹。白光模式下中央为白色条纹，两侧呈彩虹色分布',
  difficulty: 2,
  icon: '💡',
  category: 'method',
  featured: false,
  defaultParams: {
    step: 1,
    lambda: 532,
    slitDistance: 20
  },
  urlSyncKeys: ['step', 'activeInstrument'],
  testProfile: {
    hasGraph: false,
    hasTransport: false,
    supportsPresentation: true
  },
  demoProfile
};
