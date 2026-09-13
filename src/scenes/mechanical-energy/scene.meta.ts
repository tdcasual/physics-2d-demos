import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['acceleration', 'points', 'graphPoints'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'environment',
      'resistance',
      'mass',
      'gravity',
      'pointPeriod',
      'autoRun'
    ]
  }
};

export const mechanicalEnergyMeta: SceneMeta = {
  id: 'mechanical-energy',
  title: '验证机械能守恒定律实验系统',
  path: '/src/pages/mechanical-energy.html',
  subject: '力学',
  concept: '机械能守恒定律',
  subConcepts: ['重锤自由落体实验', 'v²/2-h 图像'],
  keywords: ['机械能守恒', '打点计时器', '瞬时速度', '误差分析'],
  objective: '用纸带数据比较势能减少量与动能增加量',
  description: '调节阻力，观察机械能守恒与能量耗散',
  difficulty: 3,
  icon: '⚖',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    environment: 1,
    resistance: 0.06,
    mass: 1,
    gravity: 9.8,
    pointPeriod: 0.04,
    autoRun: 0
  },
  urlSyncKeys: [
    'environment',
    'resistance',
    'mass',
    'gravity',
    'pointPeriod',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
