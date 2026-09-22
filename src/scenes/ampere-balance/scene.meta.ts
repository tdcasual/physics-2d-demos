import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'hidden',
  readoutKeys: [
    'ampereForce',
    'normalForce',
    'frictionRequired',
    'acceleration',
    'trend'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'fieldDirection',
      'currentDirection',
      'inclineAngle',
      'magneticField',
      'current',
      'mass'
    ]
  }
};

export const ampereBalanceMeta: SceneMeta = {
  id: 'ampere-balance',
  title: '安培力方向与导体平衡',
  path: '/src/pages/ampere-balance.html',
  subject: '电磁',
  concept: '安培力与导体平衡',
  subConcepts: ['左手定则', '斜面受力分析'],
  keywords: ['安培力', '左手定则', '导体棒', '斜面', '平衡'],
  objective: '改变 B、I 与斜面角，判断安培力方向和运动趋势',
  description: '用矢量和数值同步判断导体棒是否平衡',
  difficulty: 3,
  icon: '⊗',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'magnetic-field',
  featured: false,
  defaultParams: {
    inclineAngle: 30,
    magneticField: 1,
    current: 4.6,
    mass: 0.8,
    fieldDirection: 1,
    currentDirection: 0,
    autoRun: 1
  },
  urlSyncKeys: [
    'inclineAngle',
    'magneticField',
    'current',
    'mass',
    'fieldDirection',
    'currentDirection',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: false,
    supportsPresentation: true
  },
  demoProfile
};
