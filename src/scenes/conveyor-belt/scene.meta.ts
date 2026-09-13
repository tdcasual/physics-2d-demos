import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'status',
    'acceleration',
    'velocity',
    'relativeVelocity',
    'friction',
    'gravityComponent'
  ],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['angle', 'beltSpeed', 'direction', 'mu']
  }
};

export const conveyorBeltMeta: SceneMeta = {
  id: 'conveyor-belt',
  title: '传送带运动学模型',
  path: '/src/pages/conveyor-belt.html',
  subject: '力学',
  concept: '传送带相对运动',
  subConcepts: ['滑动摩擦', '共速条件'],
  keywords: ['传送带', '斜面', '摩擦力', '相对运动', '临界'],
  objective: '观察传送带方向、倾角和摩擦因数对物块运动的影响',
  description: '拖动参数或点击斜面放置物块，比较滑动与共速状态',
  difficulty: 3,
  icon: '↗',
  category: 'mechanics',
  featured: false,
  defaultParams: { angle: 30, beltSpeed: 4, mu: 0.8 },
  urlSyncKeys: ['angle', 'beltSpeed', 'direction', 'mu', 'blockMass'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
