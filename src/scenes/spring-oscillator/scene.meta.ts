/**
 * 弹簧振子 — 简谐运动的位移、速度与能量变化
 */

import type { SceneMeta } from '../types';

import type { SceneDemoProfile } from '../../platform/demo-profile';

export const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['t', 'count', 'phase-diff'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['preset']
  }
};

export const springOscillatorMeta: SceneMeta = {
  id: 'spring-oscillator',
  title: '弹簧振子',
  path: '/src/pages/spring-oscillator.html',
  subject: '力学',
  concept: '简谐运动',
  subConcepts: ['相位', '同相'],
  keywords: ['力学', '弹簧振子', '简谐运动'],
  objective: '演示弹簧振子的简谐运动，理解相位、同相与反相的概念',
  description: '观察弹簧振子的运动规律，探索相位的奥秘',
  difficulty: 2,
  icon: '🔄',
  category: 'mechanics',
  featured: true,
  defaultParams: {
    k: 10,
    m: 1,
    A: 5
  },
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
