import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['region', 'position', 'velocity', 'current'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'initialVelocity',
      'fieldStrength',
      'mass',
      'resistance'
    ]
  }
};

export const singleLoopMeta: SceneMeta = {
  id: 'single-loop',
  title: '单匝线框穿过有界匀强磁场',
  path: '/src/pages/single-loop.html',
  subject: '电磁',
  concept: '电磁感应中的动力学',
  subConcepts: ['进入与穿出区感应电流', 'v-x 与 i-x 图象'],
  keywords: ['单匝线框', '有界磁场', '感应电流', 'v-x', 'i-x'],
  objective: '观察线框进入、穿出磁场时的速度与电流图象',
  description: '改变 B、m、R，比较 v-x 斜率',
  difficulty: 3,
  icon: '⊗',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    initialVelocity: 10,
    fieldStrength: 1.5,
    mass: 2,
    resistance: 2,
    autoRun: 0
  },
  urlSyncKeys: [
    'initialVelocity',
    'fieldStrength',
    'mass',
    'resistance',
    'autoRun'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
