/**
 * 静电起电 — 摩擦起电、接触起电和感应起电
 */

import type { SceneMeta } from '../types';

import type { SceneDemoProfile } from '../../platform/demo-profile';

export const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'hidden',
  readoutKeys: ['scene', 'next'],
  renderHints: {
    contentScale: 1.6
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['scene', 'step']
  }
};

export const electrificationMeta: SceneMeta = {
  id: 'electrification',
  title: '静电起电',
  path: '/src/pages/electrification.html',
  subject: '电磁学',
  concept: '静电现象',
  subConcepts: ['摩擦起电', '感应起电'],
  keywords: ['电磁学', '静电', '起电'],
  objective: '演示摩擦、感应、接触起电的步骤与结果',
  description: '摩擦起电与静电感应的原理演示',
  difficulty: 1,
  icon: '⚡',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    step: 0
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
