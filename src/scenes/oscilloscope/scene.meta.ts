import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';
import { oscilloscopeConstants as C } from './scene.sim';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  readoutKeys: [
    'signal-frequency',
    'scan-frequency',
    'cycles-per-scan',
    'stable',
    'screen-y'
  ],
  renderHints: { contentScale: 1.05 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'signalAmplitude',
      'signalFrequency',
      'scanEnabled',
      'scanFrequency',
      'autoRun'
    ]
  }
};

export const oscilloscopeMeta: SceneMeta = {
  id: 'oscilloscope',
  title: '示波管的原理与波形同步',
  path: '/src/pages/oscilloscope.html',
  subject: '电磁',
  concept: '示波管偏转与波形同步',
  subConcepts: ['电子束偏转', '扫描电压'],
  keywords: ['示波管', '示波器', '波形同步', '扫描电压'],
  objective: '观察 X 轴扫描如何展开 Y 轴信号',
  description: '电子束、荧光屏与 fᵧ = n · fₓ 稳定条件',
  difficulty: 3,
  icon: '📺',
  category: 'electromagnetism',
  curriculumDomain: 'experimental',
  curriculumChapter: 'measurement',
  featured: false,
  defaultParams: {
    signalAmplitude: C.signalAmpDefault,
    signalFrequency: C.signalFreqDefault,
    scanEnabled: 1,
    scanAmplitude: C.scanAmpDefault,
    scanFrequency: C.scanFreqDefault,
    autoRun: 1
  },
  urlSyncKeys: [
    'signalAmplitude',
    'signalFrequency',
    'scanEnabled',
    'scanAmplitude',
    'scanFrequency',
    'autoRun'
  ],
  testProfile: {
    hasGraph: true,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
