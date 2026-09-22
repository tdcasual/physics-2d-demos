import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'current',
    'terminalVoltage',
    'outputPower',
    'internalPower',
    'efficiency'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'emf',
      'internalResistance',
      'externalResistance',
      'showPowerArea'
    ]
  }
};

export const closedPowerMeta: SceneMeta = {
  id: 'closed-power',
  title: '闭合电路功率与最大输出功率',
  path: '/src/pages/closed-power.html',
  subject: '电磁',
  concept: '闭合电路功率',
  subConcepts: ['功率分配', '最大输出功率'],
  keywords: ['电动势', '内阻', '外电阻', '输出功率'],
  objective: '观察外电阻变化时的功率分配与最大值',
  description: '调节 E、r、R，观察 P—R 曲线',
  difficulty: 2,
  icon: 'P',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'circuit',
  featured: false,
  defaultParams: {
    emf: 8,
    internalResistance: 3,
    externalResistance: 20,
    autoRun: 1,
    showPowerArea: 1
  },
  urlSyncKeys: [
    'emf',
    'internalResistance',
    'externalResistance',
    'autoRun',
    'showPowerArea'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
