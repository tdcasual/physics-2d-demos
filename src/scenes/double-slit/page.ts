/**
 * 双缝干涉 — 页面启动
 *
 * 支持步骤切换时动态更换控制区 schema
 */

import { bootScenePage } from '../../app/scene-bootstrapper';
import { readSceneParams, writeSceneParams } from '../../app/url-sync';
import { doubleSlitMeta } from './scene.meta';
import { createDoubleSlitScene } from './scene.entry';
import { doubleSlitControlsSchema, doubleSlitStep6ControlsSchema } from './controls-schema';
import { renderSchema, type SchemaRendererInstance } from '../../ui/components/SchemaRenderer';

bootScenePage({
  meta: doubleSlitMeta,
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
  createScene: ({ canvas, theme }) => {
    return createDoubleSlitScene({ canvas, theme });
  },
  createControls: ({ mount, scene }) => {
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
      if (state.params.step === 6) {
        currentRenderer?.setActive('activeInstrument', state.params.activeInstrument);
        currentRenderer?.setValue('showInstrumentReadout', state.params.showInstrumentReadout);
        currentRenderer?.setValue('micrometerOffset', state.params.micrometerOffset);
        currentRenderer?.setVisible('micrometerOffset', state.params.activeInstrument === 'micrometer');
        currentRenderer?.setValue('stripeOffset', state.params.stripeOffset);
        currentRenderer?.setVisible('stripeOffset', state.params.activeInstrument === 'micrometer');
      }
    }

    function buildSchema(schema: typeof doubleSlitControlsSchema, schemaId: 'default' | 'step6') {
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
          } else if (key === 'activeInstrument') {
            const instrument = String(value) as 'caliper' | 'micrometer';
            dsScene.setParams({ activeInstrument: instrument });
            currentRenderer?.setActive(key, instrument);
            currentRenderer?.setVisible('micrometerOffset', instrument === 'micrometer');
            currentRenderer?.setVisible('stripeOffset', instrument === 'micrometer');
          } else if (key === 'showInstrumentReadout') {
            dsScene.setParams({ showInstrumentReadout: Boolean(value) });
          } else if (key === 'micrometerOffset') {
            dsScene.setParams({ micrometerOffset: Number(value) });
          } else if (key === 'stripeOffset') {
            dsScene.setParams({ stripeOffset: Number(value) });
          }
          dsScene.render();
          writeSceneParams({ [key]: value });
        },
        onAction: () => {
          // 无 action 按钮
        }
      });
      currentSchemaId = schemaId;
    }

    // ── 读取 URL 参数，确定初始状态 ──
    const urlParams = readSceneParams(doubleSlitMeta);
    const targetStep = urlParams.step
      ? parseInt(String(urlParams.step), 10)
      : dsScene.getState().params.step;

    // 直接构建正确的 schema（仅一次，避免竞态重建）
    const initialSchema = targetStep === 6 ? doubleSlitStep6ControlsSchema : doubleSlitControlsSchema;
    const initialSchemaId = targetStep === 6 ? 'step6' : 'default';
    buildSchema(initialSchema, initialSchemaId);

    // ── 批量应用 URL 参数到场景（不触发中间 notify 导致的 schema 重建）──
    const batchParams: Record<string, number | string> = {};
    if (urlParams.step !== undefined) batchParams.step = parseInt(String(urlParams.step), 10);
    if (urlParams.lambda !== undefined) batchParams.lambda = parseFloat(String(urlParams.lambda));
    if (urlParams.slitDistance !== undefined) batchParams.slitDistance = parseFloat(String(urlParams.slitDistance));
    if (urlParams.activeInstrument !== undefined) batchParams.activeInstrument = String(urlParams.activeInstrument);

    if (Object.keys(batchParams).length > 0) {
      dsScene.setParams(batchParams);
    }

    // 将当前场景状态同步到 renderer
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
      dispose() {
        unsubscribeControls?.();
        unsubscribeControls = null;
        currentRenderer?.dispose();
        currentRenderer = null;
      }
    };
  }
});
