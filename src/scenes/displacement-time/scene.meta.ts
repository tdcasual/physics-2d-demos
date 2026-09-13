import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['time', 'velocity', 'displacement'],
  renderHints: { contentScale: 1.15 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['v0', 'acceleration', 'showArea', 'autoRun']
  }
};

export const displacementTimeMeta: SceneMeta = {
  id: 'displacement-time',
  title: '匀变速直线运动位移与时间关系',
  path: '/src/pages/displacement-time.html',
  subject: '力学',
  concept: '匀变速直线运动的位移与时间关系',
  subConcepts: ['v-t 图像面积', '位移公式'],
  keywords: ['匀变速', '位移', '时间', 'v-t 图像'],
  objective: '用 v-t 图像面积理解位移公式',
  description: '同步观察小车、v-t 面积和 x-t 曲线',
  difficulty: 2,
  icon: '📈',
  category: 'mechanics',
  featured: false,
  defaultParams: { v0: 5, acceleration: 4, showArea: 1, autoRun: 1 },
  urlSyncKeys: ['v0', 'acceleration', 'showArea', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
