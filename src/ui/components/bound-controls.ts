/**
 * 绑定式控制面板：schema 渲染 + 默认参数路由。
 *
 * 控件提交时默认执行 `scene.setParams(controlChangeToParams(...))`（键名、单位、
 * 枚举编码均按 schema `bind` 换算）→ 调度重绘 → `writeParam` 写回 URL。
 * URL 恢复、remount 投影与 reset 回写由平台按同一份 `bind` 完成，page 无需
 * 再写 applyParam / syncFromScene。
 *
 * 只有真正特殊的键才需要 `onChange` 拦截：返回 true 表示已自行处理参数
 * （仍会重绘并写回 URL）；返回 'skip' 表示完全接管（不重绘、不写回）。
 */

import { resetSceneAndControls } from '../../platform/control-projection';
import {
  controlChangeToParams,
  lookupBoundAction,
  type ControlValue
} from '../../platform/param-binding';
import type { ControlsSchema } from '../../platform/controls-schema';
import { renderSchema, type SchemaRendererInstance } from './SchemaRenderer';
import {
  exposeSchemaHandle,
  type ExposedSchemaHandle
} from './expose-schema-handle';

export type BoundScene = {
  setParams(params: Record<string, ControlValue>): unknown;
  render(): void;
  reset?(): void;
  getParams?(): object;
};

export type BoundChangeResult = boolean | 'skip' | void;

export type CreateBoundControlsOptions<TScene extends BoundScene> = {
  mount: HTMLElement;
  schema: ControlsSchema;
  scene: TScene;
  scheduleRender?: () => void;
  writeParam?: (key: string, value: ControlValue) => void;
  /** 特殊键拦截；未拦截的键走默认参数路由 */
  onChange?: (
    key: string,
    value: ControlValue,
    renderer: SchemaRendererInstance
  ) => BoundChangeResult;
  onAction?: (
    key: string,
    renderer: SchemaRendererInstance
  ) => BoundChangeResult;
};

export function createBoundControls<TScene extends BoundScene>(
  options: CreateBoundControlsOptions<TScene>
): ExposedSchemaHandle {
  const { mount, schema, scene, writeParam } = options;
  const render = options.scheduleRender ?? (() => scene.render());

  const renderer: SchemaRendererInstance = renderSchema({
    mount,
    schema,
    onChange: (key, value) => {
      const handled = options.onChange?.(key, value, renderer);
      if (handled === 'skip') return;
      if (handled !== true) {
        scene.setParams(controlChangeToParams(key, value, renderer.bindings));
      }
      render();
      writeParam?.(key, value);
    },
    onAction: (key) => {
      const intercepted = options.onAction?.(key, renderer);
      if (intercepted === 'skip') return;
      if (intercepted !== true) {
        dispatchBoundAction(schema, key, scene, renderer, writeParam);
      }
      render();
    }
  });

  return exposeSchemaHandle(renderer);
}

function sceneMethod(
  scene: object,
  name: string
): ((this: object) => unknown) | undefined {
  const value = (scene as Record<string, unknown>)[name];
  return typeof value === 'function'
    ? (value as (this: object) => unknown)
    : undefined;
}

function dispatchBoundAction<TScene extends BoundScene>(
  schema: ControlsSchema,
  key: string,
  scene: TScene,
  renderer: SchemaRendererInstance,
  writeParam?: (key: string, value: ControlValue) => void
): void {
  const action = lookupBoundAction(schema, key);
  if (!action) return;
  if (action === 'reset') {
    if (
      typeof scene.reset !== 'function' ||
      typeof scene.getParams !== 'function'
    ) {
      throwMissingAction(action);
      return;
    }
    resetSceneAndControls(
      { reset: () => scene.reset!(), getParams: () => scene.getParams!() },
      renderer,
      writeParam
    );
    return;
  }
  const method = sceneMethod(scene, action);
  if (!method) {
    throwMissingAction(action);
    return;
  }
  method.call(scene);
}

function throwMissingAction(action: string): void {
  const message = `[bound-controls] bind.action "${action}" is not a function on the scene`;
  if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
    throw new Error(message);
  }
  console.error(message);
}
