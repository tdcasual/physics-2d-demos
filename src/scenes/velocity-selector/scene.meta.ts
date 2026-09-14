import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['balanceSpeed', 'electricForce', 'magneticForce', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'electricField',
      'magneticField',
      'initialSpeed',
      'charge',
      'autoRun'
    ]
  }
};

export const velocitySelectorMeta: SceneMeta = {
  id: 'velocity-selector',
  title: '速度选择器（正交电磁场）',
  path: '/src/pages/velocity-selector.html',
  subject: '电磁',
  concept: '带电粒子在正交电磁场中的运动',
  subConcepts: ['速度选择器', '受力平衡'],
  keywords: ['速度选择器', '正交电磁场', '洛伦兹力', 'v=E/B'],
  objective: '比较电场力与洛伦兹力，找到直穿通道的速度',
  description: '调节 E、B、v₀，观察超速下偏与龟速上偏',
  difficulty: 3,
  icon: '⊥',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    electricField: 1,
    magneticField: 1,
    initialSpeed: 1,
    plateGap: 1,
    autoRun: 1,
    showField: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'electricField',
    'magneticField',
    'initialSpeed',
    'plateGap',
    'charge',
    'autoRun',
    'showField',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
