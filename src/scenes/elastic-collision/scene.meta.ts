import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'momentumA',
    'momentumB',
    'totalMomentum',
    'totalEnergy',
    'collision'
  ],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['massA', 'velocityA', 'massB', 'velocityB']
  }
};
export const collisionMeta: SceneMeta = {
  id: 'elastic-collision',
  title: '一维弹性碰撞',
  path: '/src/pages/elastic-collision.html',
  subject: '力学',
  concept: '动量守恒',
  subConcepts: ['弹性碰撞', '恢复系数'],
  keywords: ['一维碰撞', '弹性碰撞', '动量守恒', '动能守恒'],
  objective: '观察不同质量和初速下的一维弹性碰撞',
  description: '调节两球参数，观察碰撞前后速度与守恒量',
  difficulty: 2,
  icon: '↔',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'momentum',
  featured: false,
  defaultParams: { massA: 5, massB: 4, velocityA: 5, velocityB: -5 },
  urlSyncKeys: ['massA', 'massB', 'velocityA', 'velocityB'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
