import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['delta-x', 'delta-y2', 'restored-v0', 'current'],
  renderHints: { contentScale: 1.35 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'v0', 'gravity', 'period']
  }
};

export const projectileDataMeta: SceneMeta = {
  id: 'projectile-data-analysis',
  title: '平抛实验数据还原与轨迹分析',
  path: '/src/pages/projectile-data-analysis.html',
  subject: '力学',
  concept: '平抛运动',
  subConcepts: ['频闪数据', '分运动'],
  keywords: ['平抛实验', '频闪', '数据还原', '竖直二阶差分'],
  objective: '用频闪数据还原平抛轨迹并验证分运动规律',
  description: '调节 v₀、g、T，观察轨迹、位移差分与速度分解',
  difficulty: 3,
  icon: '📈',
  category: 'mechanics',
  featured: false,
  defaultParams: { v0: 2, gravity: 10, period: 0.15, showVectors: 1 },
  urlSyncKeys: ['v0', 'gravity', 'period', 'mode', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
