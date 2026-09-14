import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['flux', 'emf', 'current', 'force'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'motion',
      'speed',
      'magnetStrength',
      'showVectors',
      'autoRun',
      'reset'
    ]
  }
};

export const lenzLawMeta: SceneMeta = {
  id: 'lenz-law',
  title: '楞次定律：来拒去留模型',
  path: '/src/pages/lenz-law.html',
  subject: '电磁',
  concept: '楞次定律',
  subConcepts: ['增反减同', '来拒去留'],
  keywords: ['楞次定律', '磁通量', '感应电流', '等效磁极', '安培力'],
  objective: '观察磁通量变化与感应磁场方向',
  description: '用等效磁极判断来拒去留',
  difficulty: 2,
  icon: 'L',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    speed: 0.55,
    magnetStrength: 1,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: ['motion', 'speed', 'magnetStrength', 'autoRun', 'showVectors'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
