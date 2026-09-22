import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'capacitanceRatio',
    'voltageRatio',
    'needleAngle',
    'fieldRatio'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['probe', 'distance', 'area', 'dielectric']
  }
};
export const parallelCapacitorMeta: SceneMeta = {
  id: 'parallel-capacitor',
  title: '探究平行板电容器的电容影响因素',
  path: '/src/pages/parallel-capacitor.html',
  subject: '电磁',
  concept: '电容器',
  subConcepts: ['控制变量法', '电容决定式'],
  keywords: ['平行板电容器', '电容', '静电计', '介电常数'],
  objective: '用控制变量法观察 C 随 S、d、εᵣ 的变化',
  description: '调节几何与介质，比较电容和电压',
  difficulty: 2,
  icon: 'C',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: { distance: 3, area: 0.5, dielectric: 1.7 },
  urlSyncKeys: ['probe', 'distance', 'area', 'dielectric'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
