import { bootScenePage } from '../../app/scene-bootstrapper';
import { createControlCard } from '../../ui/components/ControlCard';
import { renderSchema } from '../../ui/components/SchemaRenderer';
import { tickerTapeControlsSchema } from './controls-schema';
import { createLabTable } from './lab-table';
import { createTickerTapeScene } from './scene.entry';
import { tickerTapeMeta } from './scene.meta';

bootScenePage({
  meta: tickerTapeMeta,
  preferredLayout: 'lab-stage',
  layoutConfig: {
    controlColumns: 'auto',
    readoutCollapsed: true,
    hasGraph: true,
    graphCollapsed: true,
    dataCollapsed: false
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
        }
        syncTable();
        render();
      },
      onAction: (key) => {
        if (key === 'fillRuler') tape.fillFromRuler();
        syncTable();
        render();
      }
    });

    const table = createLabTable((row, index, value) => {
      if (row === 'x') tape.setMeasuredX(index, value);
      else if (row === 'delta') tape.setDeltaX(index, value);
      else tape.setV(index, value);
      syncTable();
      render();
    });
    const dataSlot = document.querySelector('[data-lab-data-slot]');
    let tableCard: ReturnType<typeof createControlCard> | null = null;
    if (dataSlot instanceof HTMLElement) {
      dataSlot.replaceChildren();
      dataSlot.appendChild(table.element);
    } else {
      tableCard = createControlCard('实验数据', { span: 'full' });
      tableCard.element.dataset.span = 'full';
      tableCard.body.appendChild(table.element);
      mount.appendChild(tableCard.element);
    }

    function syncTable(): void {
      const s = tape.getState();
      table.setModel({
        labels: s.trueXCm.map((_, i) => String(i)),
        xCm: s.measuredXCm,
        deltaXCm: s.deltaXCm,
        vMs: s.vMs,
        aMs2: s.aMs2,
        showA: s.showA
      });
    }

    syncTable();

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
    const graphBody = document.querySelector(
      '#lab-panel-graph .lab-float-body'
    );
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
      if (!tape.getState().playing) syncTable();
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
        table.dispose();
        tableCard?.dispose();
        renderer.dispose();
        plotBar.remove();
      }
    };
  }
});
