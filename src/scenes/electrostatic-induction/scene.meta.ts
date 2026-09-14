import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'chargeA',
    'chargeB',
    'internalField',
    'potential',
    'electronShift'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'rodPolarity',
      'actions',
      'showCharges',
      'autoRun',
      'reset'
    ]
  }
};

export const electrostaticInductionMeta: SceneMeta = {
  id: 'electrostatic-induction',
  title: '静电感应',
  path: '/src/pages/electrostatic-induction.html',
  subject: '电磁学',
  concept: '静电感应与静电平衡',
  subConcepts: ['自由电子重排', '感应起电'],
  keywords: ['静电感应', '静电平衡', '感应起电', '自由电子'],
  objective: '观察带电棒靠近时导体内自由电子的重排',
  description: '切换棒极性与实验方式，观察感应电荷分布',
  difficulty: 3,
  icon: '±',
  category: 'electromagnetism',
  featured: false,
  defaultParams: { mode: 0, rodPolarity: 0, showCharges: 1, autoRun: 1 },
  urlSyncKeys: ['mode', 'rodPolarity', 'showCharges', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
