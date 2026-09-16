import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  transport: 'visible',
  readoutKeys: ['radius', 'period', 'force', 'period-hint'],
  renderHints: { contentScale: 1.1 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mass',
      'charge',
      'velocity',
      'magneticField',
      'fieldDirection'
    ]
  }
};

export const chargedParticleMeta: SceneMeta = {
  id: 'charged-particle-circle',
  title: '带电粒子在匀强磁场中的圆周运动',
  path: '/src/pages/charged-particle-circle.html',
  subject: '电磁学',
  concept: '带电粒子在磁场中的运动',
  subConcepts: ['洛伦兹力', '半径与周期'],
  keywords: ['带电粒子', '匀强磁场', '洛伦兹力', '圆周运动', '半径', '周期'],
  objective: '观察洛伦兹力充当向心力，比较速度、半径和周期的关系',
  description: '调节 m、q、v、B，观察 R = mv / |q|B 与 T = 2πm / |q|B',
  difficulty: 2,
  icon: '⊕',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    mass: 4,
    charge: 1,
    velocity: 40,
    magneticField: 1,
    fieldDirection: 0,
    autoRun: 1,
    showVelocity: 1,
    showForce: 1
  },
  urlSyncKeys: [
    'mass',
    'charge',
    'velocity',
    'magneticField',
    'fieldDirection',
    'autoRun',
    'showVelocity',
    'showForce'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
