import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'speed',
    'potentialEnergy',
    'kineticEnergy',
    'mechanicalEnergy'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'amplitude',
      'length',
      'gravity',
      'mass',
      'airDrag',
      'autoRun',
      'reset'
    ]
  }
};

export const pendulumEnergyMeta: SceneMeta = {
  id: 'pendulum-energy',
  title: '单摆动能与重力势能相互转化/机械能',
  path: '/src/pages/pendulum-energy.html',
  subject: '力学',
  concept: '机械能守恒与能量转化',
  subConcepts: ['单摆', '动能与重力势能'],
  keywords: ['单摆', '动能', '重力势能', '机械能', '能量守恒'],
  objective: '观察摆动中动能与重力势能的相互转化',
  description: '实时对比 Eₚ、Eₖ 与机械能',
  difficulty: 2,
  icon: 'E',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'energy',
  featured: false,
  defaultParams: {
    amplitude: 45,
    length: 2.5,
    gravity: 9.8,
    mass: 0.1,
    airDrag: 0,
    autoRun: 1
  },
  urlSyncKeys: ['amplitude', 'length', 'gravity', 'mass', 'airDrag', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
