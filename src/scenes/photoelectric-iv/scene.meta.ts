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
export const photoelectricMeta: SceneMeta = {
  id: 'photoelectric-iv',
  title: '光电效应 I–U 关系',
  path: '/src/pages/photoelectric-iv.html',
  subject: '近代',
  concept: '光电效应与光电流',
  subConcepts: ['阈频与逸出功', '遏止电压与光强'],
  keywords: ['光电效应', '光电流', '遏止电压', '逸出功', 'I-U'],
  objective: '联动观察光照参数、电子运动与 I–U 曲线',
  description: '调波长、光强和电压，读出光电流',
  difficulty: 3,
  icon: 'hν',
  category: 'electromagnetism',
  curriculumDomain: 'modern',
  curriculumChapter: 'modern-physics',
  featured: false,
  defaultParams: { wavelength: 411, intensity: 80, voltage: 0, autoRun: 1 },
  urlSyncKeys: ['wavelength', 'intensity', 'voltage', 'cathode', 'autoRun'],
  testProfile: {
    hasGraph: false,
    hasTransport: true,
    supportsPresentation: true
  },
  demoProfile
};
