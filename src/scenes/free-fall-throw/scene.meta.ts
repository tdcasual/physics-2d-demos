import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['time', 'height', 'velocity', 'acceleration'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'initialSpeed',
      'mode',
      'timeProgress',
      'showVelocity',
      'showHeight',
      'autoRun',
      'reset'
    ]
  }
};

export const freeFallMeta: SceneMeta = {
  id: 'free-fall-throw',
  title: '自由落体与竖直上抛分段运动',
  path: '/src/pages/free-fall-throw.html',
  subject: '力学',
  concept: '匀变速直线运动',
  subConcepts: ['竖直上抛', '自由落体'],
  keywords: ['自由落体', '竖直上抛', '分段运动', 'v-t 图象', 'h-t 图象'],
  objective: '观察上升、最高点与下降段的运动学变化',
  description: '分段对照速度、高度与时间',
  difficulty: 2,
  icon: '↑',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'kinematics',
  featured: false,
  defaultParams: {
    initialSpeed: 20,
    timeProgress: 0,
    autoRun: 1,
    showVelocity: 1,
    showHeight: 1
  },
  urlSyncKeys: [
    'initialSpeed',
    'mode',
    'timeProgress',
    'autoRun',
    'showVelocity',
    'showHeight'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
