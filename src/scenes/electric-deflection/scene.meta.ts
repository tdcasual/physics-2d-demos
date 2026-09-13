import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['field', 'deflection', 'screen', 'theta', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'particle',
      'voltage',
      'plateGap',
      'initialSpeed',
      'autoRun'
    ]
  }
};

export const electricDeflectionMeta: SceneMeta = {
  id: 'electric-deflection',
  title: '带电粒子在电场中的偏转',
  path: '/src/pages/electric-deflection.html',
  subject: '电磁',
  concept: '带电粒子在匀强电场中的偏转',
  subConcepts: ['类平抛运动', '电场力做功'],
  keywords: ['带电粒子', '匀强电场', '偏转', '类平抛'],
  objective: '观察电压、间距和粒子种类对偏转的影响',
  description: '调节参数，观察轨迹与偏转读数',
  difficulty: 3,
  icon: '↗',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    voltage: 40,
    plateGap: 30,
    initialSpeed: 3,
    autoRun: 1,
    showField: 1,
    showComponents: 1
  },
  urlSyncKeys: [
    'particle',
    'voltage',
    'plateGap',
    'initialSpeed',
    'autoRun',
    'showField',
    'showComponents'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
