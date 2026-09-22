import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['speed', 'radius', 'calculatedMass', 'separation'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'voltage',
      'fieldStrength',
      'showProtium',
      'showDeuterium',
      'showTritium',
      'autoRun',
      'showVectors',
      'reset'
    ]
  }
};

export const massSpectrometerMeta: SceneMeta = {
  id: 'mass-spectrometer',
  title: '质谱仪核心结构与原理',
  path: '/src/pages/mass-spectrometer.html',
  subject: '电磁',
  concept: '带电粒子在复合场中的运动',
  subConcepts: ['电场加速', '磁场偏转'],
  keywords: ['质谱仪', '同位素', '加速电压', '磁场', '质量分析'],
  objective: '观察加速电压、磁场与偏转半径的关系',
  description: '用轨迹分离同位素并读出质量',
  difficulty: 2,
  icon: 'm',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'magnetic-field',
  featured: false,
  defaultParams: {
    voltage: 31,
    fieldStrength: 0.1,
    showProtium: 1,
    showDeuterium: 1,
    showTritium: 1,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'voltage',
    'fieldStrength',
    'showProtium',
    'showDeuterium',
    'showTritium',
    'autoRun',
    'showVectors'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
