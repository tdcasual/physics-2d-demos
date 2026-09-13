import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['current', 'terminalVoltage', 'outputPower', 'internalDrop'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'emf',
      'internalResistance',
      'externalResistance',
      'showPowerArea'
    ]
  }
};

export const closedCircuitMeta: SceneMeta = {
  id: 'closed-circuit',
  title: '闭合电路欧姆定律：U-I 与功率',
  path: '/src/pages/closed-circuit.html',
  subject: '电磁',
  concept: '闭合电路欧姆定律',
  subConcepts: ['U-I 特性', '最大输出功率'],
  keywords: ['电动势', '内阻', '路端电压', '输出功率'],
  objective: '观察 U-I 直线和外阻变化下的功率',
  description: '调节外阻，联动观察电流、端电压和输出功率',
  difficulty: 2,
  icon: 'E',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    emf: 12,
    internalResistance: 4,
    externalResistance: 4,
    autoRun: 1,
    showPowerArea: 1
  },
  urlSyncKeys: [
    'emf',
    'internalResistance',
    'externalResistance',
    'autoRun',
    'showPowerArea'
  ],
  // U-I 图嵌入主动画画布；不启用独立 graph slot，避免重复渲染。
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
