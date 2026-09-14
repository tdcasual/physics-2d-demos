import type { SceneDemoProfile } from '../../platform/demo-profile';
import type { SceneMeta } from '../../platform/scene-contract';

const demoProfile: SceneDemoProfile = {
  lessonTask: 'process',
  transport: 'visible',
  readoutKeys: ['current', 'stoppingVoltage', 'maxKineticEnergy'],
  renderHints: { contentScale: 1.02 },
  interactionHints: {
    touchTargetMinSize: 48,
    visibleControlKeys: [
      'wavelength',
      'intensity',
      'voltage',
      'cathode',
      'autoRun'
    ]
  }
};
export const photoelectricCutoffMeta: SceneMeta = {
  id: 'photoelectric-cutoff',
  title: '光电效应·遏止电压',
  path: '/src/pages/photoelectric-cutoff.html',
  subject: '近代',
  concept: '遏止电压与初动能',
  subConcepts: ['爱因斯坦方程', '反向电压'],
  keywords: ['光电效应', '遏止电压', '逸出功', '反向电压'],
  objective: '观察反向电压让光电流截止',
  description: '调电压，读出 Uc 与光电流',
  difficulty: 3,
  icon: 'hν',
  category: 'electromagnetism',
  featured: false,
  defaultParams: { wavelength: 500, intensity: 50, voltage: 0, autoRun: 1 },
  urlSyncKeys: ['wavelength', 'intensity', 'voltage', 'cathode', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
