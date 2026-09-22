import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['energy', 'va', 'vb'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['length', 'angle', 'massA', 'massB', 'autoRun']
  }
};
export const mechanicalEnergyTwoBallMeta: SceneMeta = {
  id: 'mechanical-energy-two-ball',
  title: '系统机械能守恒·双球联动',
  path: '/src/pages/mechanical-energy-two-ball.html',
  subject: '力学',
  concept: '系统机械能守恒',
  subConcepts: ['轻杆约束', '能量转化'],
  keywords: ['机械能守恒', '双球联动', '轻杆', '极值'],
  objective: '观察双球位置、速度与机械能的联动',
  description: '拖动参数，看势能与两球动能互相转化',
  difficulty: 3,
  icon: 'E',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'energy',
  featured: false,
  defaultParams: { length: 1, angle: 0.9, massA: 1, massB: 1, autoRun: 1 },
  urlSyncKeys: ['length', 'angle', 'massA', 'massB', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
