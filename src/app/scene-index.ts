export type SceneIndexEntry = {
  id: string;
  title: string;
  path: string;
  keywords?: string[];
};

export const legacySceneEntries: SceneIndexEntry[] = [
  { id: 'legacy-potential-3d', title: '交互式点电荷电势能演示', path: 'animations/electromagnetism/3D 生成电势图.html' },
  { id: 'legacy-equipotential-3d', title: '3D Charge Equipotential Surfaces - Debug', path: 'animations/electromagnetism/3D电荷等势面.html' },
  { id: 'legacy-field-lines', title: '电场矢量到电场线的演化', path: 'animations/electromagnetism/模拟电场线.html' },
  { id: 'legacy-emf-analogy', title: '电路水流类比模型', path: 'animations/electromagnetism/电动势类比动画.html' },
  { id: 'legacy-electrification', title: '交互式静电起电演示 (V4 最终修复版)', path: 'animations/electromagnetism/起电方式演示.html' },
  { id: 'legacy-vt-integral', title: '微元法交互式动画', path: 'animations/mechanics/v-t面积与微元法.html' },
  { id: 'legacy-chase-meet', title: '追及相遇演示动画', path: 'animations/mechanics/追击相遇问题.html' }
];

export function isSceneIndexEntry(value: unknown): value is SceneIndexEntry {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.title === 'string' && typeof item.path === 'string';
}

export function normalizeSceneIndex(input: unknown): SceneIndexEntry[] {
  if (!Array.isArray(input)) return [];
  return input.filter(isSceneIndexEntry);
}
