import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['remaining', 'decayed', 'halfLives'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['halfLife', 'autoRun']
  }
};
export const radioactiveMeta: SceneMeta = {
  id: 'radioactive-decay',
  title: '放射性元素衰变规律',
  path: '/src/pages/radioactive-decay.html',
  subject: '近代',
  concept: '半衰期与衰变规律',
  subConcepts: ['随机性', '统计规律'],
  keywords: ['放射性', '半衰期', '衰变', '统计'],
  objective: '观察微观随机与宏观规律',
  description: '调半衰期，看 400 个核素的衰变',
  difficulty: 2,
  icon: 'N(t)',
  category: 'electromagnetism',
  curriculumDomain: 'modern',
  curriculumChapter: 'modern-physics',
  featured: false,
  defaultParams: { halfLife: 2, autoRun: 1 },
  urlSyncKeys: ['halfLife', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
