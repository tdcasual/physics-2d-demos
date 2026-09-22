import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'region',
    'measuredField',
    'innerInducedCharge',
    'outerNetCharge',
    'status'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'externalField',
      'cavityCharge',
      'cavityChargeValue',
      'grounded',
      'showGaussian',
      'slowMode',
      'autoRun',
      'reset'
    ]
  }
};

export const electrostaticShieldingMeta: SceneMeta = {
  id: 'electrostatic-shielding',
  title: '静电平衡与屏蔽原理',
  path: '/src/pages/electrostatic-shielding.html',
  subject: '电磁学',
  concept: '静电平衡、静电屏蔽与高斯定理',
  subConcepts: ['导体内部场强为零', '感应电荷与接地屏蔽'],
  keywords: ['静电平衡', '静电屏蔽', '高斯定理', '导体', '感应电荷'],
  objective: '拖动探针，观察导体、空腔与外部的场强差异',
  description: '外场极化、空腔感应与接地屏蔽',
  difficulty: 3,
  icon: 'E₀',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: {
    externalField: 1,
    cavityCharge: 1,
    cavityChargeValue: 3,
    grounded: 1,
    showGaussian: 1,
    showProbe: 1,
    autoRun: 1,
    slowMode: 0,
    probeX: 760,
    probeY: 174
  },
  urlSyncKeys: [
    'externalField',
    'cavityCharge',
    'cavityChargeValue',
    'grounded',
    'showGaussian',
    'showProbe',
    'autoRun',
    'slowMode',
    'probeX',
    'probeY'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
