import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['lambda', 'angle', 'first-minimum', 'central-width'],
  renderHints: { contentScale: 1.15 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['lambda', 'slitWidth', 'distance', 'detectorX']
  }
};

export const singleSlitMeta: SceneMeta = {
  id: 'single-slit',
  title: '单缝衍射条纹分布',
  path: '/src/pages/single-slit.html',
  subject: '光学',
  concept: '光的衍射',
  subConcepts: ['单缝衍射', '衍射条纹'],
  keywords: ['光学', '单缝衍射', '波长', '狭缝宽度', '条纹宽度'],
  objective: '观察波长、缝宽与衍射条纹宽度的关系',
  description: '实时追踪衍射角 θ 与光强分布，验证 x₁ = λL/a',
  difficulty: 2,
  icon: '🌈',
  category: 'method',
  featured: false,
  defaultParams: {
    lambda: 670,
    slitWidth: 0.22,
    distance: 2.4,
    detectorX: 7.31,
    autoScan: 1
  },
  urlSyncKeys: ['lambda', 'slitWidth', 'distance', 'detectorX', 'autoScan'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
