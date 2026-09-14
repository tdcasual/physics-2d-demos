import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'criticalSpeed',
    'frictionForce',
    'normalForce',
    'centripetalForce'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'bankAngle',
      'speed',
      'showVectors',
      'autoRun',
      'reset'
    ]
  }
};

export const carBankMeta: SceneMeta = {
  id: 'car-bank',
  title: '汽车过倾斜弯道受力状态',
  path: '/src/pages/car-bank.html',
  subject: '力学',
  concept: '斜面弯道受力与向心力',
  subConcepts: ['正交分解', '静摩擦与临界速度'],
  keywords: ['倾斜弯道', '向心力', '静摩擦', '受力分析'],
  objective: '调节倾角与车速，判断弯道安全状态',
  description: '观察支持力、重力、摩擦力与向心力的正交投影',
  difficulty: 3,
  icon: '↻',
  category: 'mechanics',
  featured: false,
  defaultParams: { bankAngle: 30, speed: 28.5, autoRun: 1, showVectors: 1 },
  urlSyncKeys: ['bankAngle', 'speed', 'autoRun', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
