import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['phase', 'acceleration', 'velocity', 'position'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'voltageAmplitude',
      'period',
      'plateGap',
      'phaseOffset',
      'charge'
    ]
  }
};

export const alternatingElectricFieldMeta: SceneMeta = {
  id: 'alternating-electric-field',
  title: '带电粒子在交变电场中的运动',
  path: '/src/pages/alternating-electric-field.html',
  subject: '电磁',
  concept: '交变电场中的带电粒子运动',
  subConcepts: ['方波电场', '分段运动'],
  keywords: ['交变电场', '带电粒子', 'a-t 图像', 'v-t 图像'],
  objective: '观察方波换向时加速度、速度与位置的联动',
  description: '调节相位与电荷符号，同步观察粒子和三张图',
  difficulty: 3,
  icon: '⇄',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'electric-field',
  featured: false,
  defaultParams: {
    voltageAmplitude: 60,
    period: 2,
    plateGap: 10,
    phaseOffset: 0,
    autoRun: 1,
    showFieldLines: 1,
    showVelocityVector: 1
  },
  urlSyncKeys: [
    'voltageAmplitude',
    'period',
    'plateGap',
    'phaseOffset',
    'charge',
    'autoRun',
    'showFieldLines',
    'showVelocityVector'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
