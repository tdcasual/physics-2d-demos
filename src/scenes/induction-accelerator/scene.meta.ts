import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'innerB',
    'orbitB',
    'speed',
    'centripetalForce',
    'lorentzForce'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'dBdt',
      'showVectors',
      'slowMode',
      'autoRun',
      'relaunch',
      'reset'
    ]
  }
};
export const inductionAcceleratorMeta: SceneMeta = {
  id: 'induction-accelerator',
  title: '电子感应加速器核心原理',
  path: '/src/pages/induction-accelerator.html',
  subject: '电磁学',
  concept: '感生电场与电子感应加速器',
  subConcepts: ['涡旋电场', '1∶2 磁场约束'],
  keywords: ['电子感应加速器', '法拉第定律', '洛伦兹力', '感生电场'],
  objective: '调节磁场变化率，观察电子切向加速与轨道约束',
  description: '感生电场加速电子，轨道磁场维持圆周运动',
  difficulty: 3,
  icon: 'B',
  category: 'electromagnetism',
  featured: false,
  defaultParams: { dBdt: 3, showVectors: 1, autoRun: 1, slowMode: 0 },
  urlSyncKeys: ['dBdt', 'showVectors', 'autoRun', 'slowMode'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
