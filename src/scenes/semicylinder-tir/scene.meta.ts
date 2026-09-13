import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'critical-angle',
    'incident-angle',
    'refracted-angle',
    'critical-height',
    'status'
  ],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['refractiveIndex', 'height', 'autoRun']
  }
};
export const tirMeta: SceneMeta = {
  id: 'semicylinder-tir',
  title: '半圆柱体全反射光路分析',
  path: '/src/pages/semicylinder-tir.html',
  subject: '光学',
  concept: '全反射',
  subConcepts: ['临界角', '折射定律'],
  keywords: ['半圆柱', '全反射', '临界角', '斯涅尔定律'],
  objective: '比较入射角与临界角，观察折射或全反射',
  description: '调节折射率和入射高度，定位全反射临界点',
  difficulty: 2,
  icon: '⌒',
  category: 'method',
  featured: false,
  defaultParams: { refractiveIndex: 1.5, height: 5.24 },
  urlSyncKeys: ['refractiveIndex', 'height', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
