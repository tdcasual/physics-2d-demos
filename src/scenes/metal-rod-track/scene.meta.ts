import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['emf', 'current', 'force', 'velocity', 'status'],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'magneticField',
      'resistance',
      'mass',
      'initialVelocity',
      'autoRun'
    ]
  }
};

export const metalRodMeta: SceneMeta = {
  id: 'metal-rod-track',
  title: '单轨道金属棒切割磁感线模型',
  path: '/src/pages/metal-rod-track.html',
  subject: '电磁',
  concept: '电磁感应与安培力',
  subConcepts: ['导体棒切割磁感线', '电磁阻尼'],
  keywords: ['金属棒', '切割磁感线', '安培力', '电磁阻尼'],
  objective: '观察速度变化引起的电动势、电流与安培力变化',
  description: '调节 B、R、m 与初速度，比较阻尼滑行和恒力加速',
  difficulty: 2,
  icon: 'Bv',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    magneticField: 1,
    resistance: 2,
    mass: 1,
    initialVelocity: 20,
    autoRun: 1
  },
  urlSyncKeys: [
    'mode',
    'magneticField',
    'resistance',
    'mass',
    'initialVelocity',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
