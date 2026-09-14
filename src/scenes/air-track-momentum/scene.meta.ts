import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'totalMomentum',
    'totalMomentumAfter',
    'impulse',
    'force',
    'vA',
    'vB'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'preset',
      'massA',
      'velocityA',
      'massB',
      'velocityB',
      'showVectors',
      'autoRun',
      'relaunch',
      'reset'
    ]
  }
};

export const airTrackMomentumMeta: SceneMeta = {
  id: 'air-track-momentum',
  title: '气垫导轨动量实验',
  path: '/src/pages/air-track-momentum.html',
  subject: '力学',
  concept: '动量守恒与动量定理',
  subConcepts: ['碰撞模型', '冲量'],
  keywords: ['气垫导轨', '动量守恒', '动量定理', '光电门'],
  objective: '用光电门与滑块碰撞检验动量关系',
  description: '调节质量和速度，观察碰撞前后的动量与冲量',
  difficulty: 3,
  icon: 'p',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mode: 0,
    preset: 0,
    massA: 1,
    massB: 1,
    velocityA: 1.5,
    velocityB: 0,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'mode',
    'preset',
    'massA',
    'massB',
    'velocityA',
    'velocityB',
    'autoRun',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
