/**
 * 双缝干涉公式推导 — 从几何结构推导 Δx = λL/d
 */

import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'derivation',
  readoutKeys: ['lambda', 'delta-x'],
  renderHints: {
    contentScale: 1.5
  },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['step', 'lambda']
  }
};

export const interferenceFormulaMeta: SceneMeta = {
  id: 'interference-formula',
  title: '双缝干涉公式推导',
  path: '/src/pages/interference-formula.html',
  subject: '光学',
  concept: '光的干涉',
  subConcepts: ['光程差', '条纹间距'],
  keywords: ['光学', '双缝干涉', '杨氏实验', '条纹间距', '公式推导'],
  objective: '通过几何推导理解双缝干涉条纹间距公式 Δx = λL/d',
  description: '从双缝干涉的几何结构出发，逐步推导条纹间距公式',
  difficulty: 2,
  icon: '📐',
  category: 'method',
  curriculumDomain: 'optics',
  curriculumChapter: 'physical-optics',
  featured: false,
  defaultParams: {
    lambda: 650,
    L: 1.0,
    d: 0.5
  },
  urlSyncKeys: ['step'],
  testProfile: {
    hasGraph: true,
    hasTransport: false,
    supportsPresentation: true
  },
  demoProfile
};
