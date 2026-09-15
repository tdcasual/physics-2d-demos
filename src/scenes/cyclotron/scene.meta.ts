import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';
import { cyclotronConstants as C } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: [
    'particle',
    'crossings',
    'energy',
    'maxEnergy',
    'radius',
    'period'
  ],
  renderHints: { contentScale: 1.5 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['particle', 'B', 'U']
  }
};

export const cyclotronMeta: SceneMeta = {
  id: 'cyclotron',
  title: '回旋加速器核心结构与原理',
  path: '/src/pages/cyclotron.html',
  subject: '电磁学',
  concept: '回旋加速器',
  subConcepts: ['带电粒子加速', '同步回旋运动'],
  keywords: ['回旋加速器', '洛伦兹力', '磁场', '电场', '最大动能', '同步'],
  objective: '观察交变电场加速与磁场偏转，理解周期同步及最大动能',
  description: '调节粒子、磁场和电压，观察逐圈加速',
  difficulty: 3,
  icon: '⚛️',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    B: C.bDefault,
    U: C.uDefault,
    autoRun: 1,
    showField: 1
  },
  urlSyncKeys: ['B', 'U', 'particle', 'autoRun', 'showField'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
