import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['temperature', 'pressure', 'volume', 'deltaU'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['experiment', 'compression', 'heatInput', 'autoRun']
  }
};

export const internalEnergyMeta: SceneMeta = {
  id: 'internal-energy',
  title: '改变内能的两种方式',
  path: '/src/pages/internal-energy.html',
  subject: '热学',
  concept: '内能改变',
  subConcepts: ['做功', '热传递'],
  keywords: ['内能', '做功', '热传递', '热力学第一定律'],
  objective: '比较做功与热传递对内能的影响',
  description: '切换实验，观察 ΔU = W + Q',
  difficulty: 2,
  icon: 'ΔU',
  category: 'mechanics',
  featured: false,
  defaultParams: { compression: 0.45, heatInput: 40, autoRun: 0 },
  urlSyncKeys: ['experiment', 'compression', 'heatInput', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
