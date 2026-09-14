import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'photonEnergy',
    'maxKineticEnergy',
    'photoCurrent',
    'relayState'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'material',
      'frequency',
      'intensity',
      'showVectors',
      'autoRun',
      'reset'
    ]
  }
};

export const photoelectricSwitchMeta: SceneMeta = {
  id: 'photoelectric-switch',
  title: '光电效应与光控开关综合实验',
  path: '/src/pages/photoelectric-switch.html',
  subject: '电磁',
  concept: '光电效应与继电器',
  subConcepts: ['爱因斯坦光电效应方程', '光控开关'],
  keywords: ['光电效应', '逸出功', '极限频率', '光电流', '继电器'],
  objective: '调节频率与光强，观察光电流驱动光控开关',
  description: '由光电流比较磁力与弹簧力',
  difficulty: 3,
  icon: 'hν',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    material: 0,
    frequency: 7.6,
    intensity: 1,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: ['material', 'frequency', 'intensity', 'autoRun', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
