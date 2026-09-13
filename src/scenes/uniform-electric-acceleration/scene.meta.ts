import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['electricField', 'force', 'speed', 'finalSpeed', 'work'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['voltage', 'plateGap', 'charge', 'mass', 'showVectors']
  }
};

export const uniformElectricAccelerationMeta: SceneMeta = {
  id: 'uniform-electric-acceleration',
  title: '带电粒子在匀强电场中的加速',
  path: '/src/pages/uniform-electric-acceleration.html',
  subject: '电磁',
  concept: '匀强电场中的带电粒子加速',
  subConcepts: ['动能定理', '电场强度与电场力'],
  keywords: ['带电粒子', '匀强电场', '动能定理', '电势差'],
  objective: '观察极板间距改变时的受力、做功与速度变化',
  description: '调节 U、d、q、m，联动观察轨迹与能量转化',
  difficulty: 2,
  icon: '⊕',
  category: 'electromagnetism',
  featured: false,
  defaultParams: {
    voltage: 50,
    plateGap: 10,
    charge: 1,
    mass: 1,
    autoRun: 1,
    showVectors: 1
  },
  urlSyncKeys: [
    'voltage',
    'plateGap',
    'charge',
    'mass',
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
