import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['voltage', 'current', 'resistance', 'records', 'fit'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'actions',
      'sourceVoltage',
      'internalResistance',
      'rheostatResistance',
      'systematicError',
      'autoRun'
    ]
  }
};

export const emfInternalMeta: SceneMeta = {
  id: 'emf-internal-resistance',
  title: '测电源电动势和内阻实验',
  path: '/src/pages/emf-internal-resistance.html',
  subject: '电磁',
  concept: '测电源电动势和内阻',
  subConcepts: ['闭合电路欧姆定律', 'U-I 图像'],
  keywords: ['电动势', '内阻', '伏安法', 'U-I 图像', '滑动变阻器'],
  objective: '通过多组 U-I 数据拟合电动势与内阻',
  description: '调节变阻器，记录数据并拟合 U=E−Ir',
  difficulty: 3,
  icon: '🔋',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    sourceVoltage: 1.5,
    internalResistance: 0.5,
    rheostatResistance: 5,
    switchClosed: 1,
    systematicError: 0,
    autoRun: 1
  },
  urlSyncKeys: [
    'sourceVoltage',
    'internalResistance',
    'rheostatResistance',
    'switchClosed',
    'systematicError',
    'autoRun'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
