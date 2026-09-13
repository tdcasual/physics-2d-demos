import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['sum', 'y1', 'y2', 'speed', 'status'],
  renderHints: { contentScale: 1.03 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'direction1',
      'amplitude1',
      'wavelength1',
      'direction2',
      'amplitude2',
      'wavelength2',
      'observationX',
      'autoRun'
    ]
  }
};

export const waveSuperposeMeta: SceneMeta = {
  id: 'wave-superpose',
  title: '机械波的相遇与叠加',
  path: '/src/pages/wave-superpose.html',
  subject: '力学',
  concept: '机械波的叠加',
  subConcepts: ['波的相遇', '矢量叠加'],
  keywords: ['机械波', '相遇', '叠加', '波源'],
  objective: '观察两列机械波相遇时的合成位移',
  description: '调节两列波，观察分量与合成波',
  difficulty: 2,
  icon: '∿',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    amplitude1: 1.5,
    wavelength1: 2,
    amplitude2: 1.5,
    wavelength2: 2,
    observationX: 0,
    autoRun: 1
  },
  urlSyncKeys: [
    'direction1',
    'amplitude1',
    'wavelength1',
    'direction2',
    'amplitude2',
    'wavelength2',
    'observationX',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
