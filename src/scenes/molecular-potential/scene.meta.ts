import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['distance', 'netForce', 'potentialEnergy', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'distanceRatio',
      'showRepulsive',
      'showAttractive',
      'autoRun'
    ]
  }
};

export const molecularMeta: SceneMeta = {
  id: 'molecular-potential',
  title: '分子势能与分子间距离关系',
  path: '/src/pages/molecular-potential.html',
  subject: '热学',
  concept: '分子势能与分子间距离',
  subConcepts: ['平衡距离', '分子势能'],
  keywords: ['分子力', '势能', 'Lennard-Jones', '平衡距离', '热振动'],
  objective: '联动观察分子力与势能随距离的变化',
  description: '拖动 r，观察 F 与 Eₚ 曲线',
  difficulty: 3,
  icon: 'r₀',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    distanceRatio: 1.55,
    epsilon: 1,
    showRepulsive: 1,
    showAttractive: 1,
    autoRun: 0
  },
  urlSyncKeys: [
    'distanceRatio',
    'epsilon',
    'showRepulsive',
    'showAttractive',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
