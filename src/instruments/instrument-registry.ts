/**
 * 仪器组件库 — 注册表（支持懒加载）
 *
 * 设计用于支持上百个组件：
 * - 元数据从 manifest.ts 读取（纯数据，体积极小）
 * - 工厂代码通过 import.meta.glob 按需动态加载
 * - 每个仪器独立成一个 chunk，互不影响
 */

import { instrumentManifest } from './_manifest/manifest';
import type { InstrumentManifestEntry } from './_manifest/manifest';
import type {
  InstrumentFactory,
  InstrumentParams,
  InstrumentState
} from './_contract/instrument-contract';

// Vite 编译时收集所有可能的仪器模块，但不立即加载
// 每个模块会生成独立的代码分割点
const factoryModules = import.meta.glob(
  '/src/instruments/*/index.ts'
) as Record<string, () => Promise<Record<string, unknown>>>;

/** kebab-case → camelCase */
function toCamelCase(s: string): string {
  return s.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
}

export type RegistryEntry = {
  id: string;
  title: string;
  category: string;
  description: string;
  unit?: string;
  precision?: number;
  defaultParams: Record<string, unknown>;
  /** 按需加载工厂 — 首次调用时才会加载对应的 chunk */
  loadFactory: () => Promise<
    InstrumentFactory<InstrumentState, InstrumentParams>
  >;
};

/**
 * 构建注册表。
 *
 * 此函数只同步读取轻量级 manifest，不涉及任何网络请求或代码加载。
 * 工厂代码在调用 loadFactory() 时才按需加载。
 */
export function buildInstrumentRegistry(): RegistryEntry[] {
  const entries: RegistryEntry[] = [];

  for (const m of instrumentManifest) {
    const loader = factoryModules[m.modulePath];
    if (!loader) {
      console.warn(
        `[InstrumentRegistry] 模块未找到: ${m.modulePath} (仪器: ${m.id})`
      );
      continue;
    }

    entries.push({
      id: m.id,
      title: m.title,
      category: m.category,
      description: m.description,
      unit: m.unit,
      precision: m.precision,
      defaultParams: m.defaultParams,
      loadFactory: async () => {
        const mod = await loader();
        const exportName = toCamelCase(m.id);
        const factory = (mod[exportName] || mod[m.id]) as
          | InstrumentFactory<InstrumentState, InstrumentParams>
          | undefined;
        if (!factory) {
          throw new Error(
            `仪器 "${m.id}" 的工厂未在 ${m.modulePath} 中找到。` +
              `请确保 export const ${exportName} = { meta, createSim, createView };`
          );
        }
        return factory;
      }
    });
  }

  // 按分类分组，同一分类内按标题排序
  const categoryOrder = [
    'measurement',
    'timing',
    'optical',
    'electrical',
    'mechanical'
  ];
  return entries.sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.category);
    const bIndex = categoryOrder.indexOf(b.category);
    const normalizedAIndex = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const normalizedBIndex = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    const catDiff = normalizedAIndex - normalizedBIndex;
    if (catDiff !== 0) return catDiff;
    return a.title.localeCompare(b.title, 'zh-CN');
  });
}

/** 按分类分组后的注册表 */
export function buildRegistryByCategory(): Record<string, RegistryEntry[]> {
  const entries = buildInstrumentRegistry();
  const grouped: Record<string, RegistryEntry[]> = {};
  for (const entry of entries) {
    const cat = entry.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(entry);
  }
  return grouped;
}

const categoryLabels: Record<string, string> = {
  measurement: '测量仪器',
  timing: '计时仪器',
  optical: '光学仪器',
  electrical: '电子仪器',
  mechanical: '力学仪器'
};

export function getCategoryLabel(category: string): string {
  return categoryLabels[category] || category;
}

/** 获取 manifest 中的原始条目（用于构建时校验） */
export function getManifest(): InstrumentManifestEntry[] {
  return instrumentManifest;
}

/** 校验 manifest 与文件系统是否同步 */
export function validateManifest(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const m of instrumentManifest) {
    if (!factoryModules[m.modulePath]) {
      errors.push(
        `manifest 中注册的 "${m.id}" (${m.modulePath}) 在文件系统中不存在`
      );
    }
  }
  return { ok: errors.length === 0, errors };
}
