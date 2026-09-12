/**
 * 电路水流类比 — 用液压模型理解电压、电流与电阻
 */

import type { SceneMeta } from '../types';

import type { SceneDemoProfile } from '../../platform/demo-profile';

export const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['I', 'U', 'R'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['switch', 'view']
  }
};

export const emfAnalogyMeta: SceneMeta = {
  id: 'emf-analogy',
  title: '电磁感应-水路类比',
  path: '/src/pages/emf-analogy.html',
  subject: '电磁学',
  concept: '电磁感应',
  subConcepts: ['电路', '水路类比'],
  keywords: ['电磁学', '电磁感应', '类比'],
  objective: '通过水路类比理解电磁感应的基本原理',
  description: '用水路系统类比电路，直观理解电磁感应',
  difficulty: 2,
  icon: '💧',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {},
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
