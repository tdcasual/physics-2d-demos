import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'water-depth',
    'buoyant-force',
    'spring-force',
    'sensor-resistance',
    'meter-voltage'
  ],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'waterDepth',
      'springConst',
      'sensorGain',
      'supplyVoltage',
      'autoRun'
    ]
  }
};

export const feederMeta: SceneMeta = {
  id: 'auto-water-feeder',
  title: '自动喂水器力电综合模型',
  path: '/src/pages/auto-water-feeder.html',
  subject: '力学',
  concept: '力电综合与传感器',
  subConcepts: ['浮力平衡', '电阻传感'],
  keywords: ['自动喂水器', '浮力', '弹簧', '传感器', '闭合电路'],
  objective: '调节水深，观察浮力、弹力与电压读数联动',
  description: '把机械位移转换为电阻和电压读数',
  difficulty: 3,
  icon: '♒',
  category: 'mechanics',
  curriculumDomain: 'experimental',
  curriculumChapter: 'data-analysis',
  featured: false,
  defaultParams: {
    waterDepth: 0.9,
    springConst: 16,
    sensorGain: 3,
    supplyVoltage: 12
  },
  urlSyncKeys: [
    'waterDepth',
    'springConst',
    'sensorGain',
    'supplyVoltage',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
