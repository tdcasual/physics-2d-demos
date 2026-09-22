import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'speed',
    'centripetalAcceleration',
    'centripetalForce',
    'period'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mass', 'radius', 'angularVelocity']
  }
};

export const centripetalMeta: SceneMeta = {
  id: 'centripetal-motion',
  title: '匀速圆周运动与向心力模型',
  path: '/src/pages/centripetal-motion.html',
  subject: '力学',
  concept: '向心力与圆周运动',
  subConcepts: ['切线速度', '向心加速度与向心力'],
  keywords: ['匀速圆周运动', '向心力', '角速度', '速度方向'],
  objective: '观察 v∝ω、Fₙ∝ω² 的关系',
  description: '调 ω，比较速度与向心力变化',
  difficulty: 3,
  icon: '↻',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'forces',
  featured: false,
  defaultParams: {
    mass: 2,
    radius: 2.5,
    angularVelocity: 1.5,
    autoRun: 1
  },
  urlSyncKeys: ['mass', 'radius', 'angularVelocity', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
