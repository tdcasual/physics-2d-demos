import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['time', 'voltage', 'velocityY', 'positionY'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'voltageAmplitude',
      'period',
      'plateGap',
      'flightDuration',
      'releasePhase',
      'charge'
    ]
  }
};

export const alternatingElectricDeflectionMeta: SceneMeta = {
  id: 'alternating-electric-deflection',
  title: '带电粒子在交变电场中的偏转',
  path: '/src/pages/alternating-electric-deflection.html',
  subject: '电磁',
  concept: '交变电场中的带电粒子偏转',
  subConcepts: ['方波电压', '分段运动'],
  keywords: ['交变电场', '带电粒子', '偏转', '方波', '分段法'],
  objective: '联动观察方波换向、速度矢量与粒子轨迹',
  description: '拖动时序，比较持续偏转与往复振动',
  difficulty: 3,
  icon: '⇄',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: {
    voltageAmplitude: 1,
    period: 1,
    plateGap: 1,
    flightDuration: 2,
    releasePhase: 0,
    autoRun: 1,
    showVectors: 1,
    showGhosts: 1
  },
  urlSyncKeys: [
    'voltageAmplitude',
    'period',
    'plateGap',
    'flightDuration',
    'releasePhase',
    'charge',
    'autoRun',
    'showVectors',
    'showGhosts'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
