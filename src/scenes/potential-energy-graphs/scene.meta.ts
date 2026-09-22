import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  transport: 'visible',
  readoutKeys: [
    'position',
    'potential',
    'slope',
    'field',
    'energy',
    'force',
    'area'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'scenario',
      'probeCharge',
      'chargeMagnitude',
      'probePosition',
      'showTangent',
      'showArea'
    ]
  }
};

export const potentialGraphMeta: SceneMeta = {
  id: 'potential-energy-graphs',
  title: '电势、电势能与 E-x、φ-x 图象',
  path: '/src/pages/potential-energy-graphs.html',
  subject: '电磁',
  concept: '电势与电场图象',
  subConcepts: ['φ-x 斜率与场强', 'E-x 面积与电势差'],
  keywords: ['电势', '电势能', 'E-x', 'φ-x', '试探电荷'],
  objective: '用探针联动观察 φ-x 斜率、E-x 面积和电势能',
  description: '移动探针，观察电势、场强、电势能与力',
  difficulty: 3,
  icon: '∿',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: {
    probeCharge: 1,
    chargeMagnitude: 1,
    probePosition: 7.58,
    showTangent: 1,
    showArea: 1,
    autoRun: 0
  },
  urlSyncKeys: [
    'scenario',
    'probeCharge',
    'chargeMagnitude',
    'probePosition',
    'showTangent',
    'showArea',
    'autoRun'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
