import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'totalMomentumBefore',
    'totalMomentumAfter',
    'impulse',
    'status'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'scheme',
      'massA',
      'massB',
      'velocityA',
      'velocityB',
      'collision',
      'autoRun'
    ]
  }
};

export const momentumComparisonMeta: SceneMeta = {
  id: 'momentum-conservation-comparison',
  title: '验证动量守恒定律·多方案比较',
  path: '/src/pages/momentum-conservation-comparison.html',
  subject: '力学',
  concept: '动量守恒定律的实验验证',
  subConcepts: ['斜槽平抛法', '气垫导轨法'],
  keywords: ['动量守恒', '碰撞实验', '实验方案', '恢复系数'],
  objective: '切换三种方案，比较碰撞前后的系统动量',
  description: '控制质量、速度与恢复系数，观察守恒关系',
  difficulty: 3,
  icon: 'p',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'momentum',
  featured: false,
  defaultParams: {
    massA: 2,
    massB: 1,
    velocityA: 1.5,
    velocityB: 0,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'scheme',
    'collision',
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
