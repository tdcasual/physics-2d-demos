/**
 * 机械波 — 场景元数据
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: ['wave-speed', 't', 'p-y'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['wavelength', 'amplitude', 'direction']
  }
};

export const mechanicalWaveMeta: SceneMeta = {
  id: 'mechanical-wave',
  title: '机械波',
  path: '/src/pages/mechanical-wave.html',
  subject: '力学',
  concept: '机械波',
  subConcepts: ['横波', '波速公式'],
  keywords: ['力学', '机械波', '横波', '波速', '波长', '周期', '振幅', 'v=λ/T'],
  objective: '理解横波的传播及波速、波长、周期的约束关系 v = λ/T',
  description: '可视化横波传播，观察质点的振动方向与波传播方向的正交关系',
  difficulty: 2,
  icon: '🌊',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    waveSpeed: 2,
    wavelength: 4,
    period: 2,
    amplitude: 5
  },
  urlSyncKeys: ['waveSpeed', 'wavelength', 'period', 'amplitude', 'direction'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
