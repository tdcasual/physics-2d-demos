import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['force', 'velocity', 'power', 'work'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'mass', 'k', 'microsteps', 'autoRun']
  }
};
export const variableWorkMeta: SceneMeta = {
  id: 'variable-work',
  title: '变力做功与功率图象',
  path: '/src/pages/variable-work.html',
  subject: '力学',
  concept: '功与功率',
  subConcepts: ['变力做功', '功率图象'],
  keywords: ['功', '功率', '力-位移图象', '微元'],
  objective: '用图象面积理解变力做功',
  description: '调节模型与微元数，观察功和功率变化',
  difficulty: 2,
  icon: '∫',
  category: 'mechanics',
  featured: false,
  defaultParams: { mass: 2, k: 2, microsteps: 0, autoRun: 1 },
  urlSyncKeys: ['mode', 'mass', 'k', 'microsteps', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
