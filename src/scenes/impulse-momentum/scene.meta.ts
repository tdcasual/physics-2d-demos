import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['time', 'force', 'impulse', 'p0', 'dp', 'p', 'velocity'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'forceModel',
      'mass',
      'initialVelocity',
      'peakForce',
      'showArea'
    ]
  }
};

export const impulseMomentumMeta: SceneMeta = {
  id: 'impulse-momentum',
  title: '冲量动量定理与 F-t 图象',
  path: '/src/pages/impulse-momentum.html',
  subject: '力学',
  concept: '冲量与动量定理',
  subConcepts: ['F-t 图象有向面积', '冲量等于动量变化'],
  keywords: ['冲量', '动量', 'F-t 图象', '动量定理', '有向面积'],
  objective: '用 F-t 图象观察冲量、动量变化与速度的联动',
  description: '切换外力模型，观察面积、动量和速度',
  difficulty: 3,
  icon: '↗',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mass: 2,
    initialVelocity: 0,
    peakForce: 10,
    autoRun: 0,
    showArea: 1
  },
  urlSyncKeys: [
    'forceModel',
    'mass',
    'initialVelocity',
    'peakForce',
    'autoRun',
    'showArea'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
