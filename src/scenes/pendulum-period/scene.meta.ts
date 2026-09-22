import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
import { pendulumConstants } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['angle', 'period', 'speed', 'tension', 'measuredGravity'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'length',
      'gravity',
      'environment',
      'mass',
      'amplitude',
      'showForces',
      'showComponents',
      'startPhotogate',
      'resetMeasurement',
      'autoRun'
    ]
  }
};

export const pendulumPeriodMeta: SceneMeta = {
  id: 'pendulum-period',
  title: '单摆周期与测重力加速度',
  path: '/src/pages/pendulum-period.html',
  subject: '力学',
  concept: '单摆周期与实验测 g',
  subConcepts: ['简谐运动', '实验测量'],
  keywords: ['单摆', '周期', '重力加速度', '光电门'],
  objective: '测量单摆周期并用实验数据求 g',
  description: '调节摆长和环境，记录多次过门时间',
  difficulty: 3,
  icon: 'T',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'oscillation-waves',
  featured: false,
  defaultParams: {
    length: pendulumConstants.defaultLength,
    gravity: pendulumConstants.defaultGravity,
    mass: pendulumConstants.defaultMass,
    amplitude: pendulumConstants.defaultAmplitude,
    showForces: 1,
    showComponents: 0,
    autoRun: 1
  },
  urlSyncKeys: [
    'length',
    'gravity',
    'mass',
    'amplitude',
    'showForces',
    'showComponents',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
