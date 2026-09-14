import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['photonEnergy', 'workFunction', 'maxKineticEnergy'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['wavelength', 'intensity', 'chargeState', 'autoRun']
  }
};
export const zincPhotoelectricMeta: SceneMeta = {
  id: 'zinc-photoelectric-energy',
  title: '锌板光电效应·能量演变',
  path: '/src/pages/zinc-photoelectric-energy.html',
  subject: '近代',
  concept: '光电效应能量守恒',
  subConcepts: ['逸出功', '最大初动能'],
  keywords: ['锌板', '光电效应', '光子能量', '逸出功'],
  objective: '观察光子能量如何分配',
  description: '调波长和光强，比较 W₀ 与 Eₖ',
  difficulty: 2,
  icon: 'hν',
  category: 'electromagnetism',
  featured: false,
  defaultParams: { wavelength: 247, intensity: 80, autoRun: 1 },
  urlSyncKeys: ['wavelength', 'intensity', 'chargeState', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
