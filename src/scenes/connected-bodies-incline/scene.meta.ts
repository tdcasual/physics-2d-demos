import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['status', 'acceleration', 'tension', 'friction', 'normal'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'massA',
      'massB',
      'angle',
      'mu',
      'showForces',
      'autoRun',
      'reset'
    ]
  }
};

export const connectedBodiesInclineMeta: SceneMeta = {
  id: 'connected-bodies-incline',
  title: '连接体受力分析（定滑轮与斜面）',
  path: '/src/pages/connected-bodies-incline.html',
  subject: '力学',
  concept: '连接体受力与摩擦方向',
  subConcepts: ['斜面模型', '定滑轮'],
  keywords: ['连接体', '摩擦力', '斜面', '定滑轮', '牛顿第二定律'],
  objective: '判断连接体的运动趋势并写出受力方程',
  description: '调节质量、斜角和摩擦因数，观察静止与加速状态',
  difficulty: 3,
  icon: 'Σ',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mode: 0,
    massA: 5,
    massB: 4,
    angle: 37,
    mu: 0.2,
    showForces: 1,
    autoRun: 0
  },
  urlSyncKeys: [
    'mode',
    'massA',
    'massB',
    'angle',
    'mu',
    'showForces',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
