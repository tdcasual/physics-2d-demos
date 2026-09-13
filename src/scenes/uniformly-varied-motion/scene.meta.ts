import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: ['time', 'velocity', 'displacement'],
  renderHints: { contentScale: 1.2 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['v0', 'acceleration']
  }
};
export const uvtMeta: SceneMeta = {
  id: 'uniformly-varied-motion',
  title: '匀变速直线运动 - 速度与时间关系',
  path: '/src/pages/uniformly-varied-motion.html',
  subject: '力学',
  concept: '匀变速直线运动',
  subConcepts: ['速度—时间关系', '位移—时间关系'],
  keywords: ['匀变速直线运动', '速度时间图像', '加速度', '位移'],
  objective: '调节初速度和加速度，观察 v-t 图线斜率与面积',
  description: '调节 v₀、a，联动观察小车和 v-t 图像',
  difficulty: 2,
  icon: '↗️',
  category: 'mechanics',
  featured: false,
  defaultParams: { v0: 10, acceleration: -3, autoRun: 1, showArea: 1 },
  urlSyncKeys: ['v0', 'acceleration', 'autoRun', 'showArea'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
