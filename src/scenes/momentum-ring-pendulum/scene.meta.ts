import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['ringVelocity', 'ballVelocity', 'horizontalMomentum'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'ringMass',
      'ballMass',
      'length',
      'angle',
      'showForces',
      'showTrail',
      'autoRun'
    ]
  }
};
export const ringPendulumMeta: SceneMeta = {
  id: 'momentum-ring-pendulum',
  title: '动量守恒·圆环摆球',
  path: '/src/pages/momentum-ring-pendulum.html',
  subject: '力学',
  concept: '动量与机械能双守恒',
  subConcepts: ['质心运动', '圆环摆球'],
  keywords: ['动量守恒', '圆环', '摆球', '质心'],
  objective: '观察水平动量守恒与能量转化',
  description: '调质量与释放角度，读出速度和动量',
  difficulty: 3,
  icon: 'Pₓ',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'momentum',
  featured: false,
  defaultParams: {
    ringMass: 2,
    ballMass: 1,
    length: 1.5,
    angle: 0.84,
    showForces: 1,
    showTrail: 1,
    autoRun: 1
  },
  urlSyncKeys: [
    'ringMass',
    'ballMass',
    'length',
    'angle',
    'showForces',
    'showTrail',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
