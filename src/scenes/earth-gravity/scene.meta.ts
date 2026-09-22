import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['gravitationalForce', 'centripetalForce', 'weight', 'angle'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'latitude',
      'mass',
      'showForces',
      'showComponents',
      'autoRun'
    ]
  }
};

export const earthGravityMeta: SceneMeta = {
  id: 'earth-gravity',
  title: '地球上重力、万有引力与向心力的关系',
  path: '/src/pages/earth-gravity.html',
  subject: '力学',
  concept: '万有引力与重力的关系',
  subConcepts: ['向心力', '重力偏角'],
  keywords: ['万有引力', '重力', '向心力', '纬度'],
  objective: '用矢量合成看清重力与万有引力并不共线',
  description: '地球模型同步显示三力与偏角',
  difficulty: 3,
  icon: '⊕',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'gravity',
  featured: false,
  defaultParams: {
    latitude: 35.2,
    mass: 1,
    autoRun: 1,
    showForces: 1,
    showComponents: 1
  },
  urlSyncKeys: ['latitude', 'mass', 'autoRun', 'showForces', 'showComponents'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
