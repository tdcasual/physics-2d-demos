import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['totalCount', 'largeAngle', 'backscatter'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'model',
      'aim',
      'beamEnergy',
      'autoRun',
      'showForces',
      'fireBeam',
      'toggleModel',
      'reset'
    ]
  }
};

export const rutherfordMeta: SceneMeta = {
  id: 'rutherford-alpha-scattering',
  title: '卢瑟福 α 粒子散射实验',
  path: '/src/pages/rutherford-alpha-scattering.html',
  subject: '近代物理',
  concept: '原子核式结构',
  subConcepts: ['α 粒子散射', '库仑力场'],
  keywords: ['卢瑟福', 'α 粒子', '原子核', '散射'],
  objective: '比较枣糕与核式结构，观察 α 粒子散射',
  description: '用散射轨迹看见原子核的致密正电荷',
  difficulty: 3,
  icon: 'α',
  category: 'mechanics',
  featured: false,
  defaultParams: { model: 1, aim: 0, beamEnergy: 1, autoRun: 1, showForces: 1 },
  urlSyncKeys: ['model', 'aim', 'beamEnergy', 'autoRun', 'showForces'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
