import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'incident-angle',
    'refracted-angle',
    'exit-angle',
    'lateral-shift'
  ],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'incidentAngle',
      'refractiveIndex',
      'thickness',
      'autoRun'
    ]
  }
};

export const glassMeta: SceneMeta = {
  id: 'parallel-glass-refraction',
  title: '平行玻璃砖光线侧移折射光路',
  path: '/src/pages/parallel-glass-refraction.html',
  subject: '光学',
  concept: '平行玻璃砖折射与侧移',
  subConcepts: ['折射定律', '侧移量'],
  keywords: ['玻璃砖', '折射', '侧移', '斯涅尔定律'],
  objective: '调节入射角、折射率和厚度，观察光路侧移',
  description: '用实时角度与侧移量验证平行界面规律',
  difficulty: 2,
  icon: '◇',
  category: 'method',
  featured: false,
  defaultParams: { incidentAngle: 48, refractiveIndex: 1.5, thickness: 5 },
  urlSyncKeys: ['incidentAngle', 'refractiveIndex', 'thickness', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
