import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'activeWork',
    'temperatureRise',
    'mechanicalWork',
    'electricWork'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'mass',
      'height',
      'waterMass',
      'voltage',
      'current',
      'duration',
      'autoRun',
      'matchWork',
      'reset'
    ]
  }
};

export const jouleMeta: SceneMeta = {
  id: 'joule-work-heat',
  title: '焦耳的实验：做功与热传递',
  path: '/src/pages/joule-work-heat.html',
  subject: '热学',
  concept: '能量转化与守恒',
  subConcepts: ['机械功与电功', '热力学第一定律'],
  keywords: ['焦耳实验', '机械功', '电功', '内能'],
  objective: '比较机械功与电功对同一绝热系统的等效升温',
  description: '机械搅拌与电热输入同一份内能',
  difficulty: 3,
  icon: 'W→ΔU',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    mode: 0,
    mass: 42,
    height: 15,
    waterMass: 2,
    voltage: 12,
    current: 2,
    duration: 26.3,
    autoRun: 1
  },
  urlSyncKeys: [
    'mode',
    'mass',
    'height',
    'waterMass',
    'voltage',
    'current',
    'duration',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
