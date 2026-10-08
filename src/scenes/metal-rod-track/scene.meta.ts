import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  // 电荷量模式只给三行：ΣIΔt、BLx/R、x（讲授模式 ≤3 个读数）
  readoutKeys: [
    'emf',
    'current',
    'force',
    'velocity',
    'status',
    'charge-sum',
    'charge-formula',
    'charge-x'
  ],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'magneticField',
      'resistance',
      'mass',
      'initialVelocity',
      'autoRun',
      'profile',
      'strips'
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
  keywords: ['金属棒', '切割磁感线', '安培力', '电磁阻尼', '电荷量', '微元法'],
  objective:
    '观察速度变化引起的电动势、电流与安培力变化，并用微元法得出 q = BLx/R',
  description:
    '调节 B、R、m 与初速度，比较阻尼滑行和恒力加速；微元法模式下比较不同 v 变化方式的电荷量',
  difficulty: 2,
  icon: 'Bv',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electromagnetic-induction',
  featured: false,
  defaultParams: {
    magneticField: 1,
    resistance: 2,
    mass: 1,
    initialVelocity: 20,
    autoRun: 1,
    profile: 0,
    strips: 20
  },
  urlSyncKeys: [
    'mode',
    'magneticField',
    'resistance',
    'mass',
    'initialVelocity',
    'autoRun',
    'profile',
    'strips'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
