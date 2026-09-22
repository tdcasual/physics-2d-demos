import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'totalMomentum',
    'totalEnergy',
    'velocityA',
    'velocityB',
    'collision'
  ],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset', 'massA', 'massB', 'velocityA', 'slowMotion']
  }
};
export const energyMeta: SceneMeta = {
  id: 'elastic-energy',
  title: '弹性碰撞与能量转换',
  path: '/src/pages/elastic-energy.html',
  subject: '力学',
  concept: '动量守恒',
  subConcepts: ['弹性碰撞', '能量转换'],
  keywords: ['弹性碰撞', '动量守恒', '动能守恒', '速度交换'],
  objective: '观察碰撞前后速度交换与能量分配',
  description: '调节质量和初速，追踪速度与能量变化',
  difficulty: 2,
  icon: '↔',
  category: 'mechanics',
  featured: false,
  defaultParams: { massA: 1, massB: 1, velocityA: 4, velocityB: 0 },
  urlSyncKeys: ['massA', 'massB', 'velocityA', 'slowMotion'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
