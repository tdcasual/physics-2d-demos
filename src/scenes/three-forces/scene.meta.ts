import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['tab', 'gravity', 'normal', 'friction', 'status'],
  renderHints: { contentScale: 1.2 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['tab', 'mass', 'inclineAngle', 'mu']
  }
};

export const threeForcesMeta: SceneMeta = {
  id: 'three-forces',
  title: '三大性质力交互课件',
  path: '/src/pages/three-forces.html',
  subject: '力学',
  concept: '重力、摩擦力与弹力',
  subConcepts: ['受力分析', '力的分解'],
  keywords: ['重力', '摩擦力', '弹力', '斜面'],
  objective: '切换三种性质力，观察受力与分解结果',
  description: '调节质量、斜面角和摩擦因数，联动查看力的矢量关系',
  difficulty: 2,
  icon: '⚖️',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    tab: 0,
    mass: 3,
    inclineAngle: 30,
    mu: 0.4,
    springX: 0.2,
    autoRun: 1,
    showComponents: 1
  },
  urlSyncKeys: [
    'tab',
    'mass',
    'inclineAngle',
    'mu',
    'autoRun',
    'showComponents'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
