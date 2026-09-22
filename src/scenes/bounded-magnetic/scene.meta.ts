import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['deflection', 'radius', 'position', 'time', 'status'],
  renderHints: { contentScale: 1.03 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'shape',
      'model',
      'entryAngle',
      'orbitRadius',
      'fieldSize',
      'autoRun',
      'showVectors'
    ]
  }
};
export const boundedMagneticMeta: SceneMeta = {
  id: 'bounded-magnetic',
  title: '带电粒子在有界磁场中的运动',
  path: '/src/pages/bounded-magnetic.html',
  subject: '电磁',
  concept: '带电粒子在磁场中的运动',
  subConcepts: ['洛伦兹力', '有界磁场轨迹'],
  keywords: ['带电粒子', '有界磁场', '洛伦兹力', '偏转'],
  objective: '观察磁场边界形状对粒子出射轨迹的影响',
  description: '选择边界和模型，观察圆弧轨迹与偏转角',
  difficulty: 3,
  icon: 'qB',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'magnetic-field',
  featured: false,
  defaultParams: {
    entryAngle: 30,
    orbitRadius: 100,
    fieldSize: 200,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'shape',
    'model',
    'entryAngle',
    'orbitRadius',
    'fieldSize',
    'autoRun',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
