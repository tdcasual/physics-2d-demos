import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['v0', 'y', 'tanTheta', 'screenY'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'particle',
      'accelVoltage',
      'deflectVoltage',
      'plateGap',
      'showComponents'
    ]
  }
};

export const chargedParticleElectricMeta: SceneMeta = {
  id: 'charged-particle-electric',
  title: '带电粒子在电场中的运动',
  path: '/src/pages/charged-particle-electric.html',
  subject: '电磁',
  concept: '带电粒子的加速与偏转',
  subConcepts: ['动能定理', '匀强电场与类平抛'],
  keywords: ['带电粒子', '加速电压', '偏转电压', '电场'],
  objective: '观察加速与偏转电场中的速度和位移',
  description: '调节电压、极板间距和粒子类型，联动观察轨迹与定量读数',
  difficulty: 3,
  icon: '⊕',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: {
    accelVoltage: 200,
    deflectVoltage: 60,
    plateGap: 12,
    autoRun: 1,
    showComponents: 1,
    showReverse: 1
  },
  urlSyncKeys: [
    'particle',
    'accelVoltage',
    'deflectVoltage',
    'plateGap',
    'autoRun',
    'showComponents',
    'showReverse'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
