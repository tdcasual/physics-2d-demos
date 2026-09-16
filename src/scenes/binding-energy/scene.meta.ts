import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
import { bindingEnergyConstants as C } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'lecture',
  readoutKeys: ['nuclide', 'A', 'binding', 'total', 'status'],
  renderHints: { contentScale: 1.15 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['A', 'preset']
  }
};

export const bindingEnergyMeta: SceneMeta = {
  id: 'binding-energy',
  title: '原子核比结合能与质量数关系',
  path: '/src/pages/binding-energy.html',
  subject: '近代物理',
  concept: '原子核比结合能',
  subConcepts: ['核素稳定性', '裂变与聚变'],
  keywords: ['比结合能', '质量数', '原子核', '裂变', '聚变', '铁56'],
  objective: '沿 E/A–A 曲线比较核素稳定性，判断聚变与裂变放能方向',
  description: '比结合能随质量数变化，铁附近最稳定',
  difficulty: 3,
  icon: '⚛️',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    A: C.aDefault,
    autoRun: 1,
    showRegions: 1
  },
  urlSyncKeys: ['A', 'autoRun', 'showRegions'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
