import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  // process master docks readout at the bottom; overlay keeps numbers in the
  // independent right data band already reserved by stageField.
  readoutPanel: 'overlay',
  transport: 'visible',
  readoutKeys: [
    'temperature',
    'pressure',
    'volume',
    'work',
    'heat',
    'deltaU',
    'phenomenon',
    'tHot',
    'tCold',
    'tEq',
    'heatHot',
    'heatCold',
    'heatSum'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    // Scene exception vs stuffing sliders into overlay: presentation chips
    // are only the three process presets. Parameter sliders stay in the
    // normal sidebar (overlayControlKeys documents compress/expand/heat).
    visibleControlKeys: ['mode']
  }
};

export const internalEnergyMeta: SceneMeta = {
  id: 'internal-energy',
  title: '改变内能的两种方式',
  path: '/src/pages/internal-energy.html',
  subject: '热学',
  concept: '内能改变',
  subConcepts: ['做功', '热传递'],
  keywords: ['内能', '做功', '热传递', '热力学第一定律', '绝热'],
  objective: '比较做功与热传递对内能的影响，并用 ΔU = W + Q 读过程',
  description: '压缩引火、绝热膨胀与热平衡三种过程',
  difficulty: 2,
  icon: 'ΔU',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mode: 0,
    ratio: 3,
    dewPoint: 5,
    wet: 1,
    tHot: 80,
    tCold: 20,
    cHot: 200,
    cCold: 200,
    autoRun: 0
  },
  urlSyncKeys: [
    'mode',
    'ratio',
    'dewPoint',
    'wet',
    'tHot',
    'tCold',
    'cHot',
    'cCold',
    'autoRun'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
