import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['voltage', 'current', 'resistance', 'error'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'circuitMode',
      'meterMode',
      'targetResistance',
      'rheostatPosition',
      'supplyVoltage',
      'ammeterResistance',
      'voltmeterResistance',
      'autoRun'
    ]
  }
};

export const resistorMeta: SceneMeta = {
  id: 'resistor-measurement',
  title: '电阻测量法设计（限流、分压与电表接法）',
  path: '/src/pages/resistor-measurement.html',
  subject: '电磁',
  concept: '伏安法测电阻',
  subConcepts: ['限流与分压', '电流表内外接'],
  keywords: ['伏安法', '电阻测量', '限流接法', '分压接法', '内接法', '外接法'],
  objective: '比较两种变阻器接法与电表接法的测量误差',
  description: '调节滑片和 Rx，观察电压、电流与系统误差',
  difficulty: 3,
  icon: '⚡',
  category: 'electromagnetism',
  curriculumDomain: 'experimental',
  curriculumChapter: 'measurement',
  featured: false,
  defaultParams: {
    circuitMode: 0,
    meterMode: 0,
    targetResistance: 25,
    ammeterResistance: 1,
    voltmeterResistance: 250,
    supplyVoltage: 6,
    rheostatPosition: 0.9,
    autoRun: 1
  },
  urlSyncKeys: [
    'circuitMode',
    'meterMode',
    'targetResistance',
    'ammeterResistance',
    'voltmeterResistance',
    'supplyVoltage',
    'rheostatPosition',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
