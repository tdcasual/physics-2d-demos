/**
 * 电场线演化 — 试探电荷测 E，加密后连成电场线
 */

import type { SceneMeta } from '../types';

import type { SceneDemoProfile } from '../../platform/demo-profile';
import { PROBE_N_DEFAULT } from './scene.sim';

export const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  transport: 'hidden',
  readoutKeys: ['scene', 'n', 'lines'],
  renderHints: {
    contentScale: 1.6
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['scene', 'n']
  }
};

export const fieldLinesMeta: SceneMeta = {
  id: 'field-lines',
  title: '电场线演化',
  path: '/src/pages/field-lines.html',
  subject: '电磁学',
  concept: '电场分布',
  subConcepts: ['试探电荷', '电场线'],
  keywords: ['电磁学', '电场线', '试探电荷', '场强'],
  objective:
    '用试探电荷测出若干点的 E；加密试探后箭头连成电场线。线条条数由电荷量决定，不随试探次数改变',
  description: '电场线不是画上去的密度，而是足够多次场强测量连成的曲线',
  difficulty: 2,
  icon: '⚡',
  category: 'electromagnetism',
  featured: true,
  defaultParams: {
    n: PROBE_N_DEFAULT,
    q1: 1,
    q2: -1
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
