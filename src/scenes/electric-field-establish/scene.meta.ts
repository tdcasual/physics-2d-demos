import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['field', 'drift', 'current', 'status'],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'closed',
      'voltage',
      'showSurfaceCharge',
      'showDrift',
      'autoRun'
    ]
  }
};
export const electricFieldMeta: SceneMeta = {
  id: 'electric-field-establish',
  title: '电路中恒定电场的建立微观机制',
  path: '/src/pages/electric-field-establish.html',
  subject: '电磁',
  concept: '恒定电流',
  subConcepts: ['电场建立', '电子定向移动'],
  keywords: ['恒定电场', '表面电荷', '漂移速率', '电路'],
  objective: '观察闭合电路后表面电荷与电子漂移的建立',
  description: '闭合开关，观察 E、v 与微观电荷分布',
  difficulty: 2,
  icon: 'E',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    voltage: 3,
    closed: 1,
    showSurfaceCharge: 1,
    showDrift: 1,
    autoRun: 1
  },
  urlSyncKeys: [
    'voltage',
    'closed',
    'showSurfaceCharge',
    'showDrift',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
