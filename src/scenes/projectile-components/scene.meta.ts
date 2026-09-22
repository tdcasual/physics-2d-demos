import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['time', 'x', 'vx', 'verticalDisplacement', 'vy', 'speed'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'speed',
      'initialHeight',
      'gravity',
      'samplePeriod',
      'showTrajectory',
      'showVectors',
      'showShadows',
      'showStrobe'
    ]
  }
};

export const projectileComponentsMeta: SceneMeta = {
  id: 'projectile-components',
  title: '平抛运动轨迹与速度分解',
  path: '/src/pages/projectile-components.html',
  subject: '力学',
  concept: '平抛运动',
  subConcepts: ['运动的独立性', '速度正交分解'],
  keywords: ['平抛运动', '匀速直线运动', '自由落体', '速度分解'],
  objective: '观察水平与竖直分运动的独立性',
  description: '用影子球、采样点和速度矢量同步验证平抛规律',
  difficulty: 2,
  icon: '↘',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'kinematics',
  featured: false,
  defaultParams: {
    speed: 15,
    initialHeight: 45,
    gravity: 10,
    samplePeriod: 0.5,
    autoRun: 1,
    showTrajectory: 1,
    showVectors: 1,
    showShadows: 1,
    showStrobe: 1
  },
  urlSyncKeys: [
    'speed',
    'initialHeight',
    'gravity',
    'samplePeriod',
    'autoRun',
    'showTrajectory',
    'showVectors',
    'showShadows',
    'showStrobe'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
