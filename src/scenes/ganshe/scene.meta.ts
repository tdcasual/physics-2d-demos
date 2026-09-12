/**
 * 波的干涉 — 双源对撞与时空分析
 */

import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

export const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  graphPanel: 'visible',
  readoutKeys: ['t', 'dphase', 'intensity'],
  renderHints: {
    contentScale: 1.2
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'preset']
  }
};

export const gansheMeta: SceneMeta = {
  id: 'ganshe',
  title: '波的干涉',
  path: '/src/pages/ganshe.html',
  subject: '力学',
  concept: '波动',
  subConcepts: ['干涉', '叠加'],
  keywords: ['力学', '波的干涉', '双源对撞', '2D'],
  objective: '演示双波源干涉现象，理解相长与相消干涉',
  description: '探索波的干涉奥秘，理解频率、振幅与相位差对合成波的影响',
  difficulty: 2,
  icon: '〰️',
  category: 'mechanics',
  featured: true,
  defaultParams: {
    freq1: 4,
    freq2: 4,
    amp1: 5,
    amp2: 5,
    phaseDiff: 0,
    observerX: 15
  },
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
