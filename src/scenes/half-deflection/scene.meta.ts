import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  transport: 'visible',
  readoutKeys: ['meterReading', 'halfTarget', 'estimate'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'method',
      'mainSwitch',
      'auxiliarySwitch',
      'rheostat',
      'boxResistance'
    ]
  }
};

export const halfDeflectionMeta: SceneMeta = {
  id: 'half-deflection',
  title: '半偏法测电表内阻',
  path: '/src/pages/half-deflection.html',
  subject: '电磁',
  concept: '电表内阻测量',
  subConcepts: ['半偏法', '欧姆定律'],
  keywords: ['电流表', '电压表', '半偏法', '内阻'],
  objective: '通过满偏与半偏读数估算电表内阻',
  description: '操作开关和电阻，记录满偏、半偏并读出内阻',
  difficulty: 3,
  icon: 'A',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    mainSwitch: 1,
    auxiliarySwitch: 0,
    rheostat: 4000,
    boxResistance: 100,
    autoRun: 1,
    showAnswer: 0
  },
  urlSyncKeys: [
    'method',
    'mainSwitch',
    'auxiliarySwitch',
    'rheostat',
    'boxResistance',
    'autoRun',
    'showAnswer'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
