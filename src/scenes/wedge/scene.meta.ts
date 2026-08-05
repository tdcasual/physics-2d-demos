/**
 * 劈尖干涉 — 空气劈尖的等厚干涉
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  controlPanel: 'minimal',
  readoutPanel: 'overlay',
  graphPanel: 'visible',
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['step', 'lambda', 'theta']
  }
};

export const wedgeMeta: SceneMeta = {
  id: 'wedge',
  title: '劈尖干涉',
  path: '/src/pages/wedge.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['等厚干涉', '光程差'],
  keywords: ['光学', '劈尖干涉', '等厚干涉', '光程差', '薄膜'],
  objective: '理解空气劈尖的等厚干涉原理及条纹间距公式',
  description: '通过几何推导理解劈尖干涉条纹的形成机制',
  difficulty: 2,
  icon: '🔺',
  category: 'method',
  featured: false,
  defaultParams: {
    lambda: 650,
    theta: 0.05,
    L: 5.0
  },
  urlSyncKeys: ['step'],
  demoProfile
};
