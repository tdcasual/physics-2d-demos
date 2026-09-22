import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: ['wave-speed', 'time', 'point-y', 'velocity', 'acceleration'],
  renderHints: { contentScale: 1.2 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'amplitude',
      'wavelength',
      'period',
      'direction',
      'pointX'
    ]
  }
};

export const harmonicWaveMeta: SceneMeta = {
  id: 'harmonic-wave',
  title: '简谐横波传播状态模型',
  path: '/src/pages/harmonic-wave.html',
  subject: '力学',
  concept: '机械波',
  subConcepts: ['传播方向', '质点振动'],
  keywords: ['简谐横波', '机械波', '波速', '波长', '周期', '质点振动'],
  objective: '区分波的传播与质点振动，验证 v = λ/T',
  description: '拖动 P 点，观察波形、速度和加速度的瞬时关系',
  difficulty: 2,
  icon: '🌊',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'oscillation-waves',
  featured: false,
  defaultParams: {
    amplitude: 10,
    wavelength: 4,
    period: 2,
    pointX: 2,
    showGhost: 0,
    showVelocity: 1,
    showAcceleration: 1
  },
  urlSyncKeys: [
    'amplitude',
    'wavelength',
    'period',
    'direction',
    'pointX',
    'showGhost',
    'showVelocity',
    'showAcceleration'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
