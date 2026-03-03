export type LegacyAnimationDimension = '2d' | '3d';

export type LegacyAnimationRecord = {
  id: string;
  title: string;
  sourcePath: string;
  keywords: string[];
  objective: string;
  dimension: LegacyAnimationDimension;
};

export type LegacySceneIndexEntry = {
  id: string;
  title: string;
  path: string;
  keywords?: string[];
};

export const LEGACY_2D_HOST_PAGE_PATH = '/src/pages/legacy-2d.html';

export function buildLegacy2DHostPath(sceneId: string): string {
  const query = new URLSearchParams({ scene: sceneId });
  return `${LEGACY_2D_HOST_PAGE_PATH}?${query.toString()}`;
}

export function resolveLegacy2DSceneIdFromSearch(search: string): string | null {
  const query = new URLSearchParams(search);
  const value = query.get('scene');
  if (!value) return null;
  const sceneId = value.trim();
  return sceneId.length > 0 ? sceneId : null;
}

export const legacyAnimationCatalog: LegacyAnimationRecord[] = [
  {
    id: 'legacy-field-lines',
    title: '电场矢量到电场线的演化',
    sourcePath: '/animations/electromagnetism/模拟电场线.html',
    keywords: ['电磁学', '电场线', '2D'],
    objective: '电场线分布与拖拽交互演示',
    dimension: '2d'
  },
  {
    id: 'legacy-emf-analogy',
    title: '电路水流类比模型',
    sourcePath: '/animations/electromagnetism/电动势类比动画.html',
    keywords: ['电磁学', '电路', '2D'],
    objective: '电动势与水流类比演示',
    dimension: '2d'
  },
  {
    id: 'legacy-electrification',
    title: '交互式静电起电演示 (V4 最终修复版)',
    sourcePath: '/animations/electromagnetism/起电方式演示.html',
    keywords: ['电磁学', '静电', '2D'],
    objective: '摩擦/感应/接触起电过程演示',
    dimension: '2d'
  },
  {
    id: 'legacy-vt-integral',
    title: '微元法交互式动画',
    sourcePath: '/animations/mechanics/v-t面积与微元法.html',
    keywords: ['力学', '微元法', '多场景'],
    objective: '微元法中的曲线、曲面与体积演示',
    dimension: '2d'
  },
  {
    id: 'legacy-chase-meet',
    title: '追及相遇演示动画',
    sourcePath: '/animations/mechanics/追击相遇问题.html',
    keywords: ['力学', '追及相遇', '2D'],
    objective: '追及相遇位移与速度图像演示',
    dimension: '2d'
  }
];

export const legacy2DAnimationCatalog = legacyAnimationCatalog.filter((item) => item.dimension === '2d');
export const legacy3DAnimationCatalog = legacyAnimationCatalog.filter((item) => item.dimension === '3d');

export function getLegacy2DAnimationById(sceneId: string): LegacyAnimationRecord | undefined {
  return legacy2DAnimationCatalog.find((item) => item.id === sceneId);
}

export function toLegacySceneIndexEntries(): LegacySceneIndexEntry[] {
  return legacyAnimationCatalog.map((item) => ({
    id: item.id,
    title: item.title,
    path: item.dimension === '2d' ? buildLegacy2DHostPath(item.id) : item.sourcePath,
    keywords: item.keywords
  }));
}
