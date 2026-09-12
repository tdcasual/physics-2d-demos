import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'derivation',
  readoutKeys: ['tab', 'result', 'angle'],
  renderHints: { contentScale: 1.5 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['tab', 'f1', 'f2', 'angle']
  }
};

export const forceCompositionMeta: SceneMeta = {
  id: 'force-composition',
  title: '力的合成与分解',
  path: '/src/pages/force-composition.html',
  subject: '力学',
  concept: '力的合成与分解',
  subConcepts: ['平行四边形定则', '正交分解'],
  keywords: ['力学', '合力', '分力', '矢量', '斜面'],
  objective: '用矢量图理解合力、分力及按效果分解',
  description: '拖动矢量端点或调整参数，观察几何关系与数值联动',
  difficulty: 2,
  icon: '📐',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    f1: 40,
    f2: 30,
    angle: 60,
    orthogonalF: 55,
    orthogonalAngle: 60,
    gravity: 40,
    inclineAngle: 30,
    rangeSweep: 1
  },
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
