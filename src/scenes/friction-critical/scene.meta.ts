import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['status', 'friction', 'maxStatic', 'acceleration'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'force', 'mass', 'muK']
  }
};
export const frictionMeta: SceneMeta = {
  id: 'friction-critical',
  title: '摩擦力的分析与临界问题',
  path: '/src/pages/friction-critical.html',
  subject: '力学',
  concept: '摩擦力与临界状态',
  subConcepts: ['静摩擦与滑动摩擦', '叠加体临界'],
  keywords: ['摩擦力', '最大静摩擦力', '临界', '叠加体'],
  objective: '观察静摩擦力调节、滑动突变与临界条件',
  description: '调节外力，比较静止、整体滑动与相对滑动',
  difficulty: 3,
  icon: 'f',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    force: 21.5,
    mass: 2,
    upperMass: 1,
    lowerMass: 2,
    muK: 0.4,
    autoRun: 0
  },
  urlSyncKeys: [
    'mode',
    'force',
    'mass',
    'upperMass',
    'lowerMass',
    'muK',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
