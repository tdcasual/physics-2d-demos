import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['mostProbable', 'meanSpeed', 'rmsSpeed'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['temperature', 'molarMass', 'autoRun']
  }
};
export const maxwellMeta: SceneMeta = {
  id: 'maxwell-speed-distribution',
  title: '气体分子速率分布·麦克斯韦曲线',
  path: '/src/pages/maxwell-speed-distribution.html',
  subject: '热学',
  concept: '气体分子速率分布',
  subConcepts: ['三种特征速率', '温度与分子量'],
  keywords: ['麦克斯韦', '速率分布', '最可几速率', '方均根速率'],
  objective: '比较温度与分子量对分布的影响',
  description: '调温度和摩尔质量，看曲线展宽',
  difficulty: 3,
  icon: 'f(v)',
  category: 'mechanics',
  featured: false,
  defaultParams: { temperature: 600, molarMass: 28, autoRun: 1 },
  urlSyncKeys: ['temperature', 'molarMass', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
