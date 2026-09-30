/**
 * SchemaRenderer 句柄薄包装：静默四件套 + setVisible + dispose + 字段类型表。
 *
 * fieldTypes 透传同一 Map 引用，禁止拷贝。
 */

import type { SchemaRendererInstance } from './SchemaRenderer';

export type ExposedSchemaHandle = Pick<
  SchemaRendererInstance,
  | 'setValue'
  | 'setValueSilently'
  | 'setActive'
  | 'setActiveSilently'
  | 'setVisible'
  | 'dispose'
  | 'fieldTypes'
>;

export function exposeSchemaHandle(
  renderer: SchemaRendererInstance
): ExposedSchemaHandle {
  return {
    setValue: (key, value) => renderer.setValue(key, value),
    setValueSilently: (key, value) => renderer.setValueSilently(key, value),
    setActive: (key, id) => renderer.setActive(key, id),
    setActiveSilently: (key, id) => renderer.setActiveSilently(key, id),
    setVisible: (key, visible) => renderer.setVisible(key, visible),
    dispose: () => renderer.dispose(),
    fieldTypes: renderer.fieldTypes
  };
}
