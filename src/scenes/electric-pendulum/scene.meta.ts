import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['theta', 'speed', 'electricForce', 'tension'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'voltage', 'showForces', 'showVelocity']
  }
};
export const electricPendulumMeta: SceneMeta = {
  id: 'electric-pendulum',
  title: '电场中的双绳悬球摆动',
  path: '/src/pages/electric-pendulum.html',
  subject: '电磁',
  concept: '电场力与圆周运动',
  subConcepts: ['电场力做功', '往复摆动'],
  keywords: ['电场', '带电小球', '双绳', '电势差'],
  objective: '观察电压对带电小球摆角与速度的影响',
  description: '调节电压，观察摆角、速度和受力',
  difficulty: 3,
  icon: 'qE',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: { voltage: 0.5, showForces: 1, showVelocity: 1 },
  urlSyncKeys: ['mode', 'voltage', 'showForces', 'showVelocity'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
