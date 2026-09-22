import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../types';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  transport: 'visible',
  readoutKeys: [
    'timer-period',
    'dot-count',
    'instant-velocity',
    'measured-acceleration',
    'experiment-status'
  ],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'action',
      'model',
      'initialVelocity',
      'acceleration',
      'autoRun'
    ]
  }
};

export const tickerTimerMeta: SceneMeta = {
  id: 'ticker-timer',
  title: '打点计时器原理演示',
  path: '/src/pages/ticker-timer.html',
  subject: '力学',
  concept: '打点计时器与匀变速运动',
  subConcepts: ['等时间打点', '位移差'],
  keywords: ['打点计时器', '纸带', '匀变速', '位移差', '实验步骤'],
  objective: '接通电源后释放纸带，用位移差测加速度',
  description: '观察等时间打点，测量速度与加速度',
  difficulty: 2,
  icon: '📍',
  category: 'mechanics',
  curriculumDomain: 'experimental',
  curriculumChapter: 'measurement',
  featured: false,
  defaultParams: {
    model: 1,
    initialVelocity: 0.5,
    acceleration: 2.5,
    voltageOn: 0,
    autoRun: 1
  },
  urlSyncKeys: ['model', 'initialVelocity', 'acceleration', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
