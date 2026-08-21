/**
 * 抛体运动 — 斜抛运动的轨迹、速度分解与射程分析
 */

import type { SceneMeta } from '../types';

import type { SceneDemoProfile } from '../../platform/demo-profile';

export const demoProfile: SceneDemoProfile = {
  controlPanel: 'minimal',
  readoutPanel: 'overlay',
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['v0', 'theta', 'preset']
  }
};

export const projectileMeta: SceneMeta = {
  id: 'projectile',
  title: '抛体运动',
  path: '/src/pages/projectile.html',
  subject: '力学',
  concept: '曲线运动',
  subConcepts: ['初速度', '抛射角'],
  keywords: ['力学', '抛体运动', '2D'],
  objective: '演示初速度与重力对轨迹的影响',
  description: '探索抛体运动的奥秘，理解初速度和角度的影响',
  difficulty: 2,
  icon: '🎯',
  category: 'mechanics',
  featured: true,
  defaultParams: {
    v0: 20,
    theta: 45,
    h0: 0,
    g: 9.8,
    c: 0
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
