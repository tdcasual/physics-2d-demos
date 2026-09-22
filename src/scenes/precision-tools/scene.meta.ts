import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'instrument',
  transport: 'visible',
  readoutKeys: ['mode', 'main', 'fine', 'total'],
  renderHints: { contentScale: 1.04 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'adjustment',
      'showGuides',
      'showReading',
      'autoRun'
    ]
  }
};

export const precisionToolMeta: SceneMeta = {
  id: 'precision-tools',
  title: '高精度测量工具读数原理（游标卡尺与螺旋测微器）',
  path: '/src/pages/precision-tools.html',
  subject: '方法',
  concept: '高精度长度测量',
  subConcepts: ['游标卡尺读数', '螺旋测微器读数'],
  keywords: ['游标卡尺', '螺旋测微器', '分度值', '对齐读数', '长度测量'],
  objective: '通过对齐关系掌握两种高精度测量工具的读数',
  description: '主尺与游标或微分筒对齐，合成高精度长度读数',
  difficulty: 2,
  icon: '📏',
  category: 'method',
  curriculumDomain: 'experimental',
  curriculumChapter: 'measurement',
  featured: false,
  // 字符串默认值让 URL 的 mode=micrometer 不被 parseInt 成 NaN。
  defaultParams: {
    mode: 'caliper50',
    adjustment: 0.32,
    autoRun: 1,
    showGuides: 1,
    showReading: 1
  } as unknown as SceneMeta['defaultParams'],
  urlSyncKeys: ['mode', 'adjustment', 'autoRun', 'showGuides', 'showReading'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
