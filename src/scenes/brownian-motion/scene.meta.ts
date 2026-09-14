import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['molecularSpeed', 'instantCollisions', 'netForce', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'temperature',
      'particleRadius',
      'showMolecules',
      'showTrail',
      'showForce',
      'slowMode',
      'autoRun',
      'reset'
    ]
  }
};
export const brownianMotionMeta: SceneMeta = {
  id: 'brownian-motion',
  title: '布朗运动的微观解释',
  path: '/src/pages/brownian-motion.html',
  subject: '热学',
  concept: '分子热运动与布朗运动',
  subConcepts: ['碰撞不平衡', '微观与宏观'],
  keywords: ['布朗运动', '分子热运动', '碰撞', '随机运动'],
  objective: '调节温度，观察分子碰撞如何改变悬浮粒子轨迹',
  description: '分子碰撞不平衡导致布朗运动',
  difficulty: 3,
  icon: '⌁',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    temperature: 15,
    particleRadius: 15,
    showMolecules: 1,
    showTrail: 1,
    showForce: 1,
    autoRun: 1,
    slowMode: 0
  },
  urlSyncKeys: [
    'temperature',
    'particleRadius',
    'showMolecules',
    'showTrail',
    'showForce',
    'autoRun',
    'slowMode'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
