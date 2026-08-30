/**
 * 双缝干涉 — 页面启动
 *
 * 支持步骤切换时动态更换控制区 schema
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { doubleSlitMeta } from './scene.meta';
import { createDoubleSlitScene } from './scene.entry';
import {
  doubleSlitControlsSchema,
  doubleSlitStep6ControlsSchema
} from './controls-schema';
import {
  renderSchema,
  type SchemaRendererInstance
} from '../../ui/components/SchemaRenderer';
import type { DoubleSlitParams } from './scene.sim';

bootScenePage<ReturnType<typeof createDoubleSlitScene>>({
  meta: doubleSlitMeta,
  autoPlay: true,
  preferredLayout: 'split-right',
  layoutConfig: {
    defaultLeftRatio: 0.35,
    leftMinWidth: 280,
    leftMaxWidth: 420,
    controlColumns: 'auto',
    readoutCollapsed: false,
    hideHeader: true,
    readoutLabel: '实验状态',
    hideTransport: true,
    hasGraph: false
  },
  paramSync: {
    // 批量应用（单次 setParams，避免中间 notify 触发 schema 重建），
    // 应用后借控制面板句柄全量同步（L 滑块 /100 换算、section 可见性、
    // 步骤 6 专属字段均在 syncFromScene 内处理）。
    applyAll: (urlParams, ctx) => {
      const batch: Partial<DoubleSlitParams> = {};
      if (urlParams.step !== undefined)
        batch.step = parseInt(String(urlParams.step), 10);
      if (urlParams.lambda !== undefined)
        batch.lambda = parseFloat(String(urlParams.lambda));
      if (urlParams.slitDistance !== undefined)
        batch.slitDistance = parseFloat(String(urlParams.slitDistance));
      if (urlParams.activeInstrument !== undefined)
        batch.activeInstrument = String(urlParams.activeInstrument) as
          | 'caliper'
          | 'micrometer';

      if (Object.keys(batch).length > 0) {
        ctx.scene.setParams(batch);
      }
      (
        ctx.controls as { syncFromScene?: () => void } | null
      )?.syncFromScene?.();
      return true;
    }
  },
  createScene: ({ canvas, theme, mode, demoHints }) => {
    return createDoubleSlitScene({ canvas, theme, mode, demoHints });
  },
  createControls: ({
    mount,
    scene,
    scheduleRender = () => scene.render(),
    urlParams = {},
    writeParam = () => {}
  }) => {
    const dsScene = scene as ReturnType<typeof createDoubleSlitScene>;
    let currentRenderer: SchemaRendererInstance | null = null;
    let unsubscribeControls: (() => void) | null = null;
    let currentSchemaId: 'default' | 'step6' = 'default';

    function syncRendererToScene(): void {
      const state = dsScene.getState();
      currentRenderer?.setValue('step', state.params.step);
      currentRenderer?.setActive('step', String(state.params.step));
      currentRenderer?.setValue('lambda', state.params.lambda);
      currentRenderer?.setValue('slitDistance', state.params.slitDistance);
      currentRenderer?.setValue('L', (state.params.L ?? 0.7) * 100);
      // 根据光源模式控制 section 可见性
      const isMono = state.params.lightMode === 'mono';
      currentRenderer?.setVisible('滤光片', !isMono);
      currentRenderer?.setVisible('光源', isMono);
      if (state.params.step === 6) {
        currentRenderer?.setActive(
          'activeInstrument',
          state.params.activeInstrument
        );
        currentRenderer?.setActive(
          'viewMode',
          state.params.viewMode ?? 'fringe'
        );
        currentRenderer?.setValue('stripeOffset', state.params.stripeOffset);
        currentRenderer?.setValue(
          'crosshairAngle',
          state.params.crosshairAngle
        );
      }
    }

    function buildSchema(
      schema: typeof doubleSlitControlsSchema,
      schemaId: 'default' | 'step6'
    ) {
      currentRenderer?.dispose();
      currentRenderer = renderSchema({
        mount,
        schema,
        onChange: (key, value) => {
          if (key === 'step') {
            const num = parseInt(String(value), 10);
            dsScene.setParams({ step: num });
            currentRenderer?.setActive(key, String(num));
          } else if (key === 'lambda') {
            dsScene.setParams({ lambda: Number(value) });
          } else if (key === 'slitDistance') {
            dsScene.setParams({ slitDistance: Number(value) });
          } else if (key === 'L') {
            dsScene.setParams({ L: Number(value) / 100 });
          } else if (key === 'activeInstrument') {
            const instrument = String(value) as 'caliper' | 'micrometer';
            dsScene.setParams({ activeInstrument: instrument });
            currentRenderer?.setActive(key, instrument);
            currentRenderer?.setVisible(
              'micrometerOffset',
              instrument === 'micrometer'
            );
          } else if (key === 'stripeOffset') {
            dsScene.setParams({ stripeOffset: Number(value) });
          } else if (key === 'crosshairAngle') {
            dsScene.setParams({ crosshairAngle: Number(value) });
          } else if (key === 'viewMode') {
            dsScene.setParams({
              viewMode: String(value) as 'crosshair' | 'fringe'
            });
          } else if (key === 'lightMode') {
            const mode = String(value) as 'mono' | 'white';
            dsScene.setParams({ lightMode: mode, filterColor: null });
            currentRenderer?.setActive(key, mode);
            // 切换光源模式时重置滤光片选择
            currentRenderer?.setActive('filterColor', 'none');
            // 单色光：显示波长滑条，隐藏滤光片
            // 白光：显示滤光片，隐藏波长滑条
            currentRenderer?.setVisible('滤光片', mode === 'white');
            currentRenderer?.setVisible('光源', mode === 'mono');
          } else if (key === 'filterColor') {
            const fc = String(value);
            const filterVal =
              fc === 'none'
                ? null
                : (fc as
                    | 'red'
                    | 'orange'
                    | 'yellow'
                    | 'green'
                    | 'blue'
                    | 'violet');
            dsScene.setParams({ filterColor: filterVal });
            currentRenderer?.setActive(key, fc);
          }
          scheduleRender();
          writeParam(key, value);
        },
        onAction: () => {
          // 无 action 按钮
        }
      });
      currentSchemaId = schemaId;
    }

    // ── 读取 URL 参数（bootstrapper 注入），确定初始 schema ──
    const targetStep = urlParams.step
      ? parseInt(String(urlParams.step), 10)
      : dsScene.getState().params.step;

    // 直接构建正确的 schema（仅一次，避免竞态重建）
    const initialSchema =
      targetStep === 6
        ? doubleSlitStep6ControlsSchema
        : doubleSlitControlsSchema;
    const initialSchemaId = targetStep === 6 ? 'step6' : 'default';
    buildSchema(initialSchema, initialSchemaId);

    // 初始同步（与 URL 无关）：对齐 section 可见性（滤光片/光源）与
    // L 滑块 /100 换算等面板初始状态；URL 非空时管线 applyAll 会再次同步
    syncRendererToScene();

    // ── 注册订阅：步骤变化时自动切换 schema ──
    unsubscribeControls = dsScene.subscribe(() => {
      const step = dsScene.getState().params.step;
      const currentIsStep6 = step === 6;
      if (currentIsStep6 && currentSchemaId !== 'step6') {
        buildSchema(doubleSlitStep6ControlsSchema, 'step6');
        syncRendererToScene();
      } else if (!currentIsStep6 && currentSchemaId !== 'default') {
        buildSchema(doubleSlitControlsSchema, 'default');
        syncRendererToScene();
      }
    });

    return {
      setValue(key: string, value: number | string) {
        currentRenderer?.setValue(key, value);
      },
      setActive(key: string, value: string) {
        currentRenderer?.setActive(key, value);
      },
      syncFromScene: syncRendererToScene,
      dispose() {
        unsubscribeControls?.();
        unsubscribeControls = null;
        currentRenderer?.dispose();
        currentRenderer = null;
      }
    };
  }
});
