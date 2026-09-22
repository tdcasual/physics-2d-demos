import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['pulse1', 'pulse2', 'distance', 'velocity'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'velocity',
      'interval',
      'showPulses',
      'showVectors',
      'autoRun',
      'reset'
    ]
  }
};

export const laserSpeedMeta: SceneMeta = {
  id: 'laser-speed',
  title: '激光测速原理演示',
  path: '/src/pages/laser-speed.html',
  subject: '力学',
  concept: '位移—时间图象与激光测速',
  subConcepts: ['直线运动', 'x-t 图像'],
  keywords: ['激光测速', '光脉冲', '位移时间图像', '速度'],
  objective: '用两次光脉冲的位置快照测出汽车速度',
  description: '实景与 x-t 图像同步显示两次脉冲测量',
  difficulty: 2,
  icon: '↗',
  category: 'mechanics',
  curriculumDomain: 'experimental',
  curriculumChapter: 'data-analysis',
  featured: false,
  defaultParams: {
    velocity: 20,
    interval: 1,
    initialDistance: 100,
    autoRun: 1,
    showPulses: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'velocity',
    'interval',
    'initialDistance',
    'autoRun',
    'showPulses',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
