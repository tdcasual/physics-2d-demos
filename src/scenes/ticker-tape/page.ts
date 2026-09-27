import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { exposeSchemaHandle } from '../../ui/components/expose-schema-handle';
import {
  GRAPH_BODY_ATTR,
  GRAPH_SECTION_ATTR
} from '../../platform/stage-chrome';
import { tickerTapeControlsSchema } from './controls-schema';
import { createTickerTapeScene } from './scene.entry';
import { tickerTapeMeta } from './scene.meta';

/** getParams.noise 是 0|1|2 索引，控件 preset id 是 off/typical/large */
export const TICKER_TAPE_NOISE_IDS = ['off', 'typical', 'large'] as const;

export type TickerTapeEncodedParams = {
  countEvery: number;
  noise: number;
  showA: number;
  vSigFigs: number;
  preset: string;
};

/** sim 编码 → 控件值。countEvery 1|5 ↔ toggle；noise 索引 ↔ id；showA 0|1 ↔ bool；vSigFigs number ↔ select 字符串 */
export function decodeTickerTapeControls(params: TickerTapeEncodedParams): {
  countEvery: boolean;
  noise: (typeof TICKER_TAPE_NOISE_IDS)[number];
  showA: boolean;
  vSigFigs: string;
  preset: string;
} {
  const noise = TICKER_TAPE_NOISE_IDS[params.noise] ?? 'off';
  return {
    countEvery: params.countEvery === 5,
    noise,
    showA: params.showA > 0,
    vSigFigs: String(params.vSigFigs),
    preset: params.preset
  };
}

bootScenePage({
  meta: tickerTapeMeta,
  preferredLayout: 'lab-stage',
  layoutConfig: {
    controlColumns: 'auto',
    readoutCollapsed: true,
    hasGraph: true,
    graphInitiallyHidden: true,
    floatData: false,
    dataWorkspace: true
  },
  createScene: ({ canvas, theme, mode, demoHints }) =>
    createTickerTapeScene({ canvas, theme, mode, demoHints }),
  paramSync: {
    applyParam: (key, value, ctx) => {
      if (key === 'preset') {
        ctx.scene.setParams({ preset: String(value) });
        ctx.setControlActive('preset', String(value));
        return true;
      }
      if (key === 'countEvery') {
        const every = Number(value) === 1 ? 1 : 5;
        ctx.scene.setParams({ countEvery: every });
        ctx.setControlValue('countEvery', every === 5);
        return true;
      }
      if (key === 'noise') {
        ctx.scene.setParams({ noise: value });
        const id =
          typeof value === 'number'
            ? (['off', 'typical', 'large'][value] ?? 'off')
            : String(value);
        ctx.setControlActive('noise', id);
        return true;
      }
      if (key === 'vSigFigs') {
        const sig = Number(value);
        if (Number.isFinite(sig)) {
          ctx.scene.setParams({ vSigFigs: sig });
          ctx.setControlValue('vSigFigs', String(sig));
        }
        return true;
      }
      return false;
    }
  },
  createControls: ({ mount, scene, scheduleRender, writeParam }) => {
    const tape = scene;
    const render = scheduleRender ?? (() => tape.render());
    const renderer = renderSchema({
      mount,
      schema: tickerTapeControlsSchema,
      onChange: (key, value) => {
        if (key === 'preset') {
          tape.setParams({ preset: String(value) });
          writeParam?.(key, value);
        } else if (key === 'countEvery') {
          tape.setParams({ countEvery: Boolean(value) });
          writeParam?.('countEvery', value ? 5 : 1);
        } else if (key === 'noise') {
          const id = String(value);
          tape.setParams({ noise: id });
          const idx = ['off', 'typical', 'large'].indexOf(id);
          if (idx >= 0) writeParam?.(key, idx);
        } else if (key === 'showA') {
          tape.setParams({ showA: Boolean(value) });
          writeParam?.('showA', value ? 1 : 0);
        } else if (key === 'vSigFigs') {
          const sig = Number(value);
          if (Number.isFinite(sig)) {
            tape.setParams({ vSigFigs: sig });
            writeParam?.('vSigFigs', sig);
          }
        }
        render();
      },
      onAction: (key) => {
        if (key === 'fillRuler') tape.fillFromRuler();
        render();
      }
    });

    const plotBar = document.createElement('div');
    plotBar.className = 'lab-plot-toolbar';
    // 按图选择：x–t / v–t 可勾选（可多选），描点/拟合只作用于选中图。
    const selected = new Set<'x' | 'v'>(
      tape.getSelectedGraphs?.() ?? ['x', 'v']
    );
    const chipDefs: Array<{ kind: 'x' | 'v'; label: string }> = [
      { kind: 'x', label: 'x–t' },
      { kind: 'v', label: 'v–t' }
    ];
    const chips = chipDefs.map(({ kind, label }) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'lab-plot-chip';
      chip.textContent = label;
      chip.setAttribute('aria-pressed', String(selected.has(kind)));
      chip.addEventListener('click', () => {
        if (selected.has(kind)) selected.delete(kind);
        else selected.add(kind);
        if (selected.size === 0) selected.add(kind);
        chip.setAttribute('aria-pressed', String(selected.has(kind)));
        tape.setSelectedGraphs([...selected]);
      });
      return chip;
    });
    const scatterBtn = document.createElement('button');
    scatterBtn.type = 'button';
    scatterBtn.textContent = '描点';
    scatterBtn.setAttribute('aria-pressed', 'false');
    const fitBtn = document.createElement('button');
    fitBtn.type = 'button';
    fitBtn.textContent = '拟合';
    fitBtn.disabled = true;
    fitBtn.setAttribute('aria-pressed', 'false');
    const dirtyNote = document.createElement('span');
    dirtyNote.className = 'lab-plot-dirty';
    dirtyNote.hidden = true;
    dirtyNote.textContent = '数据已改';
    plotBar.append(...chips, scatterBtn, fitBtn, dirtyNote);
    // 描点工具条锚点 = 布局契约的 [data-graph-body]（lab 的 .lab-float-body
    // 由布局创建点打标）；split 系布局无 body 层，回退到收养目标
    // [data-graph-section] 内、slot 之前。
    //
    // createControls 会随每次布局挂载重新执行，且执行点位于布局切换的
    // 中途——此时新布局节点未必已入树、旧布局节点尚未清完，任何全局
    // 查询都可能命中旧节点并让 insertBefore 抛 NotFoundError（整个布局
    // 切换失败）。因此挂载动作必须幂等且延迟到布局稳定后：场景每次
    // notify（subscribe）与首帧 rAF 时重试，成功插入即不再动。
    function placePlotBar(): void {
      if (plotBar.isConnected) return;
      const layoutRoot = mount.closest('.layout-master');
      if (!layoutRoot) return; // 布局切换中途，等下一次重试
      const graphBody = layoutRoot.querySelector(`[${GRAPH_BODY_ATTR}]`);
      // 所有布局的图表 slot 都带通用 graph-slot 类（lab=lab-graph-slot
      // graph-slot、split=teaching-graph-slot graph-slot）。
      const anchor = graphBody
        ? graphBody.querySelector('.graph-slot')
        : layoutRoot.querySelector(`[${GRAPH_SECTION_ATTR}] .graph-slot`);
      // 插到 slot 之前。锚点查询是后代匹配，anchor 未必是查询起点的
      // 直接子级，因此以 anchor 的真实父节点为宿主，保证 insertBefore
      // 合法；布局切换中途命中的旧布局节点即将销毁，重试循环会在
      // 新布局里重新挂载。
      if (anchor?.parentNode && layoutRoot.contains(anchor.parentNode)) {
        anchor.parentNode.insertBefore(plotBar, anchor);
      }
    }

    let plotBarRetries = 0;
    function placePlotBarWhenReady(): void {
      if (plotBar.isConnected || plotBarRetries >= 300) return;
      plotBarRetries += 1;
      placePlotBar();
      if (!plotBar.isConnected && typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => placePlotBarWhenReady());
      }
    }
    placePlotBarWhenReady();

    function syncPlotBar(): void {
      const status = tape.getPlotStatus();
      scatterBtn.disabled = !status.canScatter;
      scatterBtn.title = status.canScatter
        ? '按已校对的数据描点'
        : '数据校对完成后才能描点';
      scatterBtn.setAttribute('aria-pressed', String(status.hasScatter));
      fitBtn.disabled = !status.canFit;
      fitBtn.setAttribute('aria-pressed', String(status.hasFit));
      dirtyNote.hidden = !status.dirty;
    }

    scatterBtn.addEventListener('click', () => {
      tape.plotScatter();
      syncPlotBar();
      render();
    });
    fitBtn.addEventListener('click', () => {
      tape.plotFit();
      syncPlotBar();
      render();
    });
    syncPlotBar();

    const unsub = tape.subscribe(() => {
      placePlotBarWhenReady(); // 布局切换完成后兜底重挂（幂等）
      syncPlotBar();
    });

    const syncFromScene = (): void => {
      const decoded = decodeTickerTapeControls(tape.getParams());
      renderer.setValueSilently('countEvery', decoded.countEvery);
      renderer.setActiveSilently('noise', decoded.noise);
      renderer.setValueSilently('showA', decoded.showA);
      renderer.setValueSilently('vSigFigs', decoded.vSigFigs);
      renderer.setActiveSilently('preset', decoded.preset);
    };

    return {
      ...exposeSchemaHandle(renderer),
      syncFromScene,
      dispose: () => {
        unsub();
        renderer.dispose();
        plotBar.remove();
      }
    };
  }
});
