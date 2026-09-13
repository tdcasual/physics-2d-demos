import type { SceneMeta } from '../types';
import type { SceneDemoProfile } from '../../platform/demo-profile';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: ['A', 'binding', 'total', 'status'],
  renderHints: { contentScale: 1.15 },
  interactionHints: { touchTargetMinSize: 48, visibleControlKeys: ['A'] }
};
export const bindingEnergyMeta: SceneMeta = {
  id: 'binding-energy',
  title: '原子核比结合能与质量数关系',
  path: '/src/pages/binding-energy.html',
  subject: '力学',
  concept: '原子核比结合能',
  subConcepts: ['核素稳定性', '裂变与聚变'],
  keywords: ['比结合能', '质量数', '原子核'],
  objective: '沿曲线巡游，比较不同核素的稳定性',
  description: '比结合能—质量数曲线与总结合能联动',
  difficulty: 3,
  icon: '⚛️',
  category: 'mechanics',
  featured: false,
  defaultParams: { A: 238, autoRun: 1, showRegions: 1 },
  urlSyncKeys: ['A', 'autoRun', 'showRegions'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
