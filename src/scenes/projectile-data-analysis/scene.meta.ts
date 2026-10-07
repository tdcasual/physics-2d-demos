import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  transport: 'hidden',
  readoutKeys: ['release', 'plate', 'marks', 'status'],
  renderHints: { contentScale: 1.3 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: ['release', 'lowerPlate', 'trace', 'releaseH', 'plateY']
  }
};

export const projectileLabMeta: SceneMeta = {
  id: 'projectile-data-analysis',
  title: '平抛运动实验',
  path: '/src/pages/projectile-data-analysis.html',
  subject: '力学',
  concept: '平抛运动',
  subConcepts: ['描迹法', '求初速度'],
  keywords: [
    '平抛运动实验',
    '描迹法',
    '斜槽',
    '铅垂线',
    '倾斜挡板',
    '落点',
    '初速度'
  ],
  objective:
    '用斜槽、定位板和倾斜挡板记录小球平抛的落点，描出轨迹，并由轨迹上各点的坐标求初速度',
  description:
    '每次从斜槽同一位置由静止释放小球，逐次下移挡板留下落点；描出轨迹后读取各点坐标求初速度。可演示不用定位卡、斜槽末端不水平带来的误差，以及未记录抛出点时用 Δy = gT² 求解',
  difficulty: 2,
  icon: '🎯',
  category: 'mechanics',
  curriculumDomain: 'experimental',
  curriculumChapter: 'data-analysis',
  featured: false,
  defaultParams: {
    releaseH: 8,
    plateY: 6,
    chuteTilt: 0,
    useLocator: 1,
    recordOrigin: 1,
    showLabels: 1
  },
  urlSyncKeys: [
    'releaseH',
    'plateY',
    'chuteTilt',
    'useLocator',
    'recordOrigin',
    'showLabels'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: false,
    supportsPresentation: true
  },
  demoProfile
};
