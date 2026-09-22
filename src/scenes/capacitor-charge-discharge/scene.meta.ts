import type { SceneMeta } from '../../platform/scene-contract';
import type { SceneDemoProfile } from '../../platform/demo-profile';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: [
    'voltageAcross',
    'currentMilliamp',
    'chargeMicrocoulomb',
    'tau'
  ],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'voltage',
      'resistance',
      'capacitance',
      'showCurrent',
      'autoRun',
      'reset'
    ]
  }
};

export const capacitorMeta: SceneMeta = {
  id: 'capacitor-charge-discharge',
  title: '电容器充放电实验',
  path: '/src/pages/capacitor-charge-discharge.html',
  subject: '电磁学',
  concept: '电容器充放电规律',
  subConcepts: ['时间常数', '电荷与电压'],
  keywords: ['电容器', '充电', '放电', '时间常数', 'RC'],
  objective: '用曲线观察 Uc、I 与时间常数 τ 的变化',
  description: '电路动画与 U-t、I-t 曲线同步',
  difficulty: 3,
  icon: 'RC',
  category: 'electromagnetism',
  curriculumDomain: 'electromagnetism',
  curriculumChapter: 'circuit',
  featured: false,
  defaultParams: {
    mode: 1,
    voltage: 6,
    resistance: 20,
    capacitance: 200,
    autoRun: 1,
    showCurrent: 1
  },
  urlSyncKeys: [
    'mode',
    'voltage',
    'resistance',
    'capacitance',
    'autoRun',
    'showCurrent'
  ],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
