import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['force', 'deflection', 'screenShift', 'magnification'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'material',
      'loadKg',
      'mirrorGap',
      'screenDistance',
      'deformationMode',
      'showOpticalPath',
      'autoRun'
    ]
  }
};

export const microDeformationMeta: SceneMeta = {
  id: 'micro-deformation',
  title: '观察微小形变',
  path: '/src/pages/micro-deformation.html',
  subject: '力学',
  concept: '弹力的产生与微小形变',
  subConcepts: ['光杠杆放大', '原子间距变化'],
  keywords: ['微小形变', '弹力', '光杠杆', '胡克定律', '光学放大'],
  objective: '改变材料和载荷，比较桌面形变与光斑偏移',
  description: '用光杠杆把肉眼不可见的形变放大',
  difficulty: 3,
  icon: 'Δ',
  category: 'mechanics',
  featured: false,
  defaultParams: {
    loadKg: 0,
    mirrorGap: 0.1,
    screenDistance: 4.5,
    showOpticalPath: 1,
    autoRun: 1
  },
  urlSyncKeys: [
    'material',
    'loadKg',
    'mirrorGap',
    'screenDistance',
    'deformationMode',
    'showOpticalPath',
    'autoRun'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
