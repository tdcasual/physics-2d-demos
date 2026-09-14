import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['target', 'range', 'reading', 'status'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'mode',
      'target',
      'range',
      'autoConnect',
      'calibrateZero',
      'disconnect',
      'autoRun'
    ]
  }
};

export const multimeterMeta: SceneMeta = {
  id: 'multimeter-practice',
  title: '练习使用多用电表',
  path: '/src/pages/multimeter-practice.html',
  subject: '电磁',
  concept: '多用电表读数与测量',
  subConcepts: ['选挡与读数', '二极管判断'],
  keywords: ['多用电表', '欧姆挡', '电压挡', '二极管', '表笔'],
  objective: '选择档位并连接表笔，完成电阻、电压和二极管测量',
  description: '练习选挡、调零与估读',
  difficulty: 3,
  icon: 'Ω',
  category: 'electromagnetism',
  featured: false,
  defaultParams: { mode: 0, target: 0, range: 0, connected: 0, autoRun: 1 },
  urlSyncKeys: ['mode', 'target', 'range', 'connected', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
