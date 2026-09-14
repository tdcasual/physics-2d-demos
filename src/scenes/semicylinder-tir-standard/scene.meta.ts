import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['criticalAngle', 'incidentAngle', 'refractedAngle', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'refractiveIndex',
      'incidentAngle',
      'showNormal',
      'autoRun',
      'reset'
    ]
  }
};

export const semicylinderStandardMeta: SceneMeta = {
  id: 'semicylinder-tir-standard',
  title: '半圆柱体全反射与折射光路分析（标准法线版）',
  path: '/src/pages/semicylinder-tir-standard.html',
  subject: '光学',
  concept: '折射定律与全反射',
  subConcepts: ['临界角', '标准法线'],
  keywords: ['半圆柱', '折射', '全反射', '临界角', '法线'],
  objective: '比较入射角与临界角，观察折射与全反射',
  description: '调节介质与入射角，追踪法线两侧光路',
  difficulty: 3,
  icon: '⌒',
  category: 'method',
  featured: false,
  defaultParams: {
    refractiveIndex: 1.5,
    incidentAngle: 27,
    showNormal: 1,
    autoRun: 1
  },
  urlSyncKeys: ['refractiveIndex', 'incidentAngle', 'showNormal', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
