import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'model',
    'time',
    'velocity',
    'acceleration',
    'magneticForce',
    'current',
    'heatingPower',
    'terminalVelocity',
    'equivalentMass'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'model',
      'fieldStrength',
      'railGap',
      'externalForce',
      'mass',
      'resistance',
      'capacitance'
    ]
  }
};

export const rodModelMeta: SceneMeta = {
  id: 'rod-model',
  title: '电磁感应：电容棒与电阻棒模型',
  path: '/src/pages/rod-model.html',
  subject: '电磁',
  concept: '导体棒切割磁感线的动力学',
  subConcepts: ['电阻棒收敛运动', '电容棒等效质量'],
  keywords: ['导体棒', '电容棒', '电阻棒', '安培力', 'v-t'],
  objective: '对比纯电阻棒与纯电容棒的速度图象',
  description: '调 B、C，观察加速度与 v-t 斜率',
  difficulty: 3,
  icon: '⊗',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    model: 0,
    fieldStrength: 1,
    railGap: 1,
    externalForce: 2,
    mass: 0.5,
    resistance: 1,
    capacitance: 0.5,
    autoRun: 1
  },
  urlSyncKeys: [
    'model',
    'fieldStrength',
    'railGap',
    'externalForce',
    'mass',
    'resistance',
    'capacitance',
    'autoRun'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
