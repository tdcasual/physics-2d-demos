import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['voltage', 'current', 'resistance', 'power'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'voltage',
      'autoRun',
      'showIdeal',
      'recordPoint',
      'resetCurve'
    ]
  }
};
export const lightbulbMeta: SceneMeta = {
  id: 'lightbulb-iv-curve',
  title: '描绘小灯泡伏安特性曲线',
  path: '/src/pages/lightbulb-iv-curve.html',
  subject: '电磁',
  concept: '小灯泡伏安特性',
  subConcepts: ['分压电路', '非线性元件'],
  keywords: ['小灯泡', '伏安特性', 'I-U曲线', '分压'],
  objective: '调节电压并描绘灯丝的非线性 I-U 曲线',
  description: '观察灯丝升温导致电阻增大',
  difficulty: 3,
  icon: 'I–U',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'circuit',
  featured: false,
  defaultParams: { voltage: 2.9, showIdeal: 1, autoRun: 0 },
  urlSyncKeys: ['voltage', 'showIdeal', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
