import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'status',
    'velocity',
    'acceleration',
    'spring-force',
    'total-energy'
  ],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['mode', 'friction', 'stiffness', 'mass', 'autoRun']
  }
};
export const inclineSpringMeta: SceneMeta = {
  id: 'incline-spring',
  title: '斜面弹簧动力学',
  path: '/src/pages/incline-spring.html',
  subject: '力学',
  concept: '机械能与能量转换',
  subConcepts: ['斜面受力', '弹簧势能与摩擦生热'],
  keywords: ['斜面', '弹簧', '摩擦力', '机械能'],
  objective: '观察斜面上弹簧滑块的受力与能量变化',
  description: '调节摩擦、劲度和质量，追踪能量转换',
  difficulty: 2,
  icon: '⌁',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    friction: 0.2,
    stiffness: 120,
    mass: 2,
    position: 1.8,
    autoRun: 1
  },
  urlSyncKeys: ['mode', 'friction', 'stiffness', 'mass', 'position', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
