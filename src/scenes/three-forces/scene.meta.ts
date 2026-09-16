import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
import { threeForcesConstants as C } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['tab', 'gravity', 'g1', 'g2', 'normal', 'friction', 'status'],
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
  keywords: ['重力', '摩擦力', '弹力', '斜面', '胡克定律'],
  objective: '切换重力、摩擦、弹力，观察斜面分解与胡克恢复力',
  description: '调节质量、斜面角、摩擦因数和弹簧参数，联动查看力的矢量关系',
  difficulty: 2,
  icon: '⚖️',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mass: C.massDefault,
    inclineAngle: C.angleDefault,
    mu: C.muDefault,
    springK: C.springKDefault,
    springX: C.springXDefault,
    autoRun: 1,
    showComponents: 1
  },
  urlSyncKeys: [
    'tab',
    'mass',
    'inclineAngle',
    'mu',
    'springK',
    'springX',
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
