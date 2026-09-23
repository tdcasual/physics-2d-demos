import { bootScenePage } from '../../app/scene-bootstrapper';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { GRAPH_BODY_ATTR } from '../../platform/stage-chrome';
import { tickerTapeControlsSchema } from './controls-schema';
import { createTickerTapeScene } from './scene.entry';
import { tickerTapeMeta } from './scene.meta';

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
    plotBar.append(scatterBtn, fitBtn, dirtyNote);
    // 描点工具条锚点 = 布局契约的 [data-graph-body]（lab 的 .lab-float-body
    // 由布局创建点打标）；查不到时显式 no-op，不落回其他层级
    const graphBody = document.querySelector(`[${GRAPH_BODY_ATTR}]`);
    const graphSlot = document.querySelector(
      '#lab-panel-graph .lab-graph-slot'
    );
    if (graphBody instanceof HTMLElement && graphSlot instanceof HTMLElement) {
      graphBody.insertBefore(plotBar, graphSlot);
    }

    function syncPlotBar(): void {
      const status = tape.getPlotStatus();
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
      syncPlotBar();
    });

    return {
      setValue(key: string, value: number | string) {
        renderer.setValue(key, value);
      },
      setActive(key: string, value: string) {
        renderer.setActive(key, value);
      },
      dispose: () => {
        unsub();
        renderer.dispose();
        plotBar.remove();
      }
    };
  }
});
