import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
import { blockBoardConstants as C } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: [
    'block-velocity',
    'board-velocity',
    'common-velocity',
    'relative-displacement',
    'sync-time',
    'time',
    'status'
  ],
  renderHints: { contentScale: 1.15 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'blockMass',
      'boardMass',
      'initialVelocity',
      'friction',
      'autoRun'
    ]
  }
};

export const blockBoardMeta: SceneMeta = {
  id: 'block-board',
  title: '木块与木板相对滑动物理模型',
  path: '/src/pages/block-board.html',
  subject: '力学',
  concept: '板块模型与相对运动',
  subConcepts: ['滑动摩擦', '共速与相对位移'],
  keywords: ['木块', '木板', '摩擦力', '相对位移', '共速'],
  objective: '观察摩擦力如何让木块与木板达到共速',
  description: '木块以 v₀ 滑上光滑地面上的木板，v-t 图像给出共速与相对位移',
  difficulty: 3,
  icon: '🧱',
  category: 'mechanics',
  curriculumDomain: 'mechanics',
  curriculumChapter: 'forces',
  featured: false,
  defaultParams: {
    blockMass: C.blockMassDefault,
    boardMass: C.boardMassDefault,
    initialVelocity: C.v0Default,
    friction: C.frictionDefault,
    autoRun: 1,
    showArea: 1,
    showForces: 0
  },
  urlSyncKeys: [
    'blockMass',
    'boardMass',
    'initialVelocity',
    'friction',
    'autoRun',
    'showArea',
    'showForces'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
