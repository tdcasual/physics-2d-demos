/**
 * 多普勒效应 — 场景元数据
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: ['f-emit', 'f-receive', 'delta-pct'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset', 'sourceSpeed', 'observerSpeed']
  }
};

export const dopplerEffectMeta: SceneMeta = {
  id: 'doppler-effect',
  title: '多普勒效应',
  path: '/src/pages/doppler-effect.html',
  subject: '力学',
  concept: '多普勒效应',
  subConcepts: ['波源运动', '观察者运动'],
  keywords: ['力学', '多普勒效应', '频率变化', '波源', '观察者', '波前'],
  objective: '理解波源和观察者相对运动对接收频率的影响',
  description: '模拟波源和观察者相对运动时的频率变化，可视化波前压缩与拉伸',
  difficulty: 2,
  icon: '🔊',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'oscillation-waves',
  featured: false,
  defaultParams: {
    sourceSpeed: 0,
    observerSpeed: 0,
    emitFrequency: 3
  },
  urlSyncKeys: ['sourceSpeed', 'observerSpeed', 'emitFrequency', 'mode'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
