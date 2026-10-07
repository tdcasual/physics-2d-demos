import { describe, expect, it, vi } from 'vitest';
import { createDataWorkspacePanel } from '../../src/ui/components/data-workspace-panel';
import {
  createProjectileLabDataWorkspace,
  projectileLabDataWorkspaceSpec,
  projectileLabNoOriginSpec,
  solveWithoutOrigin,
  v0CandidatesFromOrigin
} from '../../src/scenes/projectile-data-analysis/data-task';
import {
  createProjectileLabSim,
  type ProjectileLabSim
} from '../../src/scenes/projectile-data-analysis/scene.sim';
import { createProjectileLabScene } from '../../src/scenes/projectile-data-analysis/scene.entry';
import {
  assertSpecGraph,
  shouldEnableStagePanZoom,
  shouldShowChartAnalysis
} from '../../src/platform/data-workspace';

function settle(sim: ProjectileLabSim): void {
  for (let i = 0; i < 4000 && sim.getState().busy; i += 1) sim.step(1 / 240);
}

function tracedSim(recordOrigin = true): ProjectileLabSim {
  const sim = createProjectileLabSim({ releaseH: 8, plateY: 6, recordOrigin });
  for (let i = 0; i < 5; i += 1) {
    sim.release();
    settle(sim);
    if (i < 4) sim.lowerPlate();
  }
  sim.trace();
  settle(sim);
  return sim;
}

function tracedHost(recordOrigin = true) {
  const sim = tracedSim(recordOrigin);
  const host = createProjectileLabDataWorkspace({
    getState: () => sim.getState()
  });
  return { sim, host };
}

/** 学生读到的坐标（相对坐标原点，0.01 cm）。 */
function readings(sim: ProjectileLabSim): Array<{ x: string; y: string }> {
  const { measurePoints, axesOrigin } = sim.getState();
  return measurePoints.map((point) => ({
    x: (point.x - axesOrigin.x).toFixed(2),
    y: (point.y - axesOrigin.y).toFixed(2)
  }));
}

function submitAllCoordinates(
  host: ReturnType<typeof tracedHost>['host'],
  rows: ReadonlyArray<{ x: string; y: string }>
): void {
  rows.forEach((row, i) => {
    expect(
      host.submitField({ field: 'x', trialIndex: i, raw: row.x }).feedback.ok
    ).toBe(true);
    expect(
      host.submitField({ field: 'y', trialIndex: i, raw: row.y }).feedback.ok
    ).toBe(true);
  });
}

describe('projectile lab data workspace spec', () => {
  it('reads only x and y per point, in a fields-as-rows table, with no chart step', () => {
    for (const spec of [
      projectileLabDataWorkspaceSpec,
      projectileLabNoOriginSpec
    ]) {
      expect(() => assertSpecGraph(spec)).not.toThrow();
      expect(shouldShowChartAnalysis(spec)).toBe(false);
      expect(spec.rowFields.map((field) => field.id)).toEqual(['x', 'y']);
      expect(spec.tableOrientation).toBe('fields');
      expect(spec.trialLabels).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(spec.minRows).toBe(5);
      expect(spec.maxRows).toBe(5);
      // 白纸缩放由场景画布负责（需放大到毫米格）
      expect(shouldEnableStagePanZoom(spec)).toBe(false);
    }
    expect(
      projectileLabDataWorkspaceSpec.summaryFields.map((field) => field.id)
    ).toEqual(['v0']);
    expect(
      projectileLabNoOriginSpec.summaryFields.map((field) => field.id)
    ).toEqual(['v0', 'launchX', 'launchY']);
  });

  it('shows a one-line precision hint and plain knowns', () => {
    const full = tracedHost().host;
    expect(full.getHint()).toBe('x、y 保留 2 位小数；v₀ 保留 3 位有效数字');
    expect(full.getKnowns()).toEqual([
      { key: 'g', label: '重力加速度 g', value: '9.8 m/s²' },
      { key: 'origin', label: '坐标原点', value: '抛出点 O' }
    ]);
    const partial = tracedHost(false).host;
    expect(partial.getHint()).toBe(
      'x、y 保留 2 位小数；v₀ 保留 3 位有效数字；x₀、y₀ 保留 1 位小数'
    );
    expect(partial.getKnowns()[1]).toEqual({
      key: 'origin',
      label: '坐标原点',
      value: 'A 点'
    });
  });

  it('is only eligible after the trajectory has been traced', () => {
    const sim = createProjectileLabSim();
    const host = createProjectileLabDataWorkspace({
      getState: () => sim.getState()
    });
    expect(host.getEligibility()).toEqual({
      ok: false,
      reason: '请先记录落点并描出轨迹'
    });
    expect(tracedHost().host.getEligibility()).toEqual({ ok: true });
  });
});

describe('projectile lab grading: launch point recorded', () => {
  it('grades coordinates to 0.01 cm with a ±0.03 cm window', () => {
    const { host } = tracedHost();
    // C 点 y 真值 18.00 cm
    const y = (raw: string) =>
      host.submitField({ field: 'y', trialIndex: 2, raw }).feedback;
    expect(y('18.00').ok).toBe(true);
    expect(y('18.03').ok).toBe(true);
    expect(y('17.97').ok).toBe(true);
    expect(y('18.04')).toMatchObject({ ok: false, layer: 'range' });
    expect(y('18.0')).toMatchObject({ ok: false, layer: 'format' });
    expect(y('18')).toMatchObject({ ok: false, layer: 'format' });
    // 以 mm 填写：180.00 与答案差 10 倍
    expect(y('180.00')).toMatchObject({ ok: false, layer: 'unit' });
  });

  it('checks v₀ once, after every coordinate, from any point or their mean', () => {
    const { sim, host } = tracedHost();
    expect(
      host.submitField({ field: 'v0', raw: '1.06' }).feedback
    ).toMatchObject({ ok: false, layer: 'relation' });

    const rows = readings(sim);
    submitAllCoordinates(host, rows);
    // 独立手算每个点的 v₀ = x·√(g / 2y)（SI 单位）
    const perPoint = rows.map(
      (row) =>
        (Number(row.x) / 100) * Math.sqrt(9.8 / (2 * (Number(row.y) / 100)))
    );
    const mean = perPoint.reduce((sum, v) => sum + v, 0) / perPoint.length;
    // 释放高度 8 cm 的理论值 √(10·9.8·0.08/7) = 1.058 m/s
    expect(mean).toBeCloseTo(1.058, 2);

    const v0 = (raw: string) => host.submitField({ field: 'v0', raw });
    expect(v0(perPoint[0]!.toPrecision(3)).feedback.ok).toBe(true);
    expect(v0(perPoint[4]!.toPrecision(3)).feedback.ok).toBe(true);
    expect(v0('1.1').feedback).toMatchObject({ ok: false, layer: 'format' });
    expect(v0('1.12').feedback).toMatchObject({ ok: false, layer: 'range' });
    // 以 cm/s 填写
    expect(v0('106').feedback).toMatchObject({ ok: false, layer: 'unit' });

    const done = v0(mean.toPrecision(3));
    expect(done.feedback.ok).toBe(true);
    expect(done.session.completed).toBe(true);
    expect(host.renderResult?.(host.getSession())).toBe(
      `小球平抛的初速度 v₀ = ${mean.toPrecision(3)} m/s`
    );

    // 改动任一坐标：v₀ 需重新核算
    host.submitField({ field: 'x', trialIndex: 0, raw: rows[0]!.x });
    const after = host.getSession();
    expect(after.completed).toBe(false);
    expect(after.summary.v0?.checked).toBe(false);
  });

  it('one v₀ candidate per point', () => {
    // (21.166, 19.6) → 1.0583；(10.583, 4.9) → 同一条抛物线，同一个 v₀
    const candidates = v0CandidatesFromOrigin([
      { x: 21.166, y: 19.6 },
      { x: 10.583, y: 4.9 }
    ]);
    expect(candidates[0]).toBeCloseTo(1.0583, 4);
    expect(candidates[1]).toBeCloseTo(1.0583, 4);
  });
});

describe('projectile lab grading: launch point not recorded', () => {
  it('solves v₀ and the launch point from evenly spaced points', () => {
    // 手工构造：v₀ = 1 m/s，抛出点在 A 左 10 cm（t_A = 0.1 s）处。
    // 取 Δx = 5 cm → T = 0.05 s。相对抛出点 y = ½·980·t²，
    // t = 0.10, 0.15, 0.20, 0.25, 0.30 s → y = 4.9, 11.025, 19.6, 30.625, 44.1 cm
    const abs = [4.9, 11.025, 19.6, 30.625, 44.1];
    const points = abs.map((y, i) => ({ x: 5 * i, y: y - abs[0]! }));
    const solutions = solveWithoutOrigin(points);
    // 3 组相邻三点 + 1 组五点逐差，各配 B、C、D 三个锚点
    expect(solutions).toHaveLength(12);
    for (const solution of solutions) {
      expect(solution.v0).toBeCloseTo(1, 9);
      expect(solution.launchX).toBeCloseTo(-10, 9);
      expect(solution.launchY).toBeCloseTo(-4.9, 9);
    }
  });

  it('keeps A at (0, 0) and checks v₀ and the launch point once at the end', () => {
    const { sim, host } = tracedHost(false);
    const first = host.getSession().trials[0]!;
    expect(first.fields.x).toMatchObject({ raw: '0.00', checked: true });
    expect(first.fields.y).toMatchObject({ raw: '0.00', checked: true });
    // 改 A 点无效：它始终是原点
    host.submitField({ field: 'x', trialIndex: 0, raw: '3.00' });
    expect(host.getSession().trials[0]!.fields.x?.raw).toBe('0.00');

    const rows = readings(sim);
    expect(rows[0]).toEqual({ x: '0.00', y: '0.00' });
    submitAllCoordinates(host, rows);

    // 独立手算（五点逐差）：T² = (y_E − 2y_C + y_A) / (4g)，v₀ = Δx / T
    const x = rows.map((row) => Number(row.x));
    const y = rows.map((row) => Number(row.y));
    const T = Math.sqrt((y[4]! - 2 * y[2]! + y[0]!) / (4 * 980));
    const v0 = (x[4]! - x[0]!) / 4 / T / 100;
    expect(v0).toBeCloseTo(1.058, 1);
    // 以 C 点反推：v_y = (y_D − y_B) / 2T，t = v_y / g
    const t = (y[3]! - y[1]!) / (2 * T) / 980;
    const launchX = x[2]! - v0 * 100 * t;
    const launchY = y[2]! - 0.5 * 980 * t * t;
    // 抛出点在 A 的左上方，离 A 约等于 A 的真实坐标
    const origin = sim.getState().axesOrigin;
    expect(Math.abs(launchX + origin.x)).toBeLessThan(0.5);
    expect(Math.abs(launchY + origin.y)).toBeLessThan(0.5);

    expect(
      host.submitField({ field: 'v0', raw: v0.toPrecision(3) }).feedback.ok
    ).toBe(true);
    expect(host.getSession().completed).toBe(false);
    expect(
      host.submitField({ field: 'launchX', raw: (-launchX).toFixed(1) })
        .feedback.message
    ).toContain('正负号');
    expect(
      host.submitField({ field: 'launchX', raw: launchX.toFixed(1) }).feedback
        .ok
    ).toBe(true);
    expect(
      host.submitField({ field: 'launchY', raw: launchY.toFixed(2) }).feedback
    ).toMatchObject({ ok: false, layer: 'format' });
    const done = host.submitField({
      field: 'launchY',
      raw: launchY.toFixed(1)
    });
    expect(done.feedback.ok).toBe(true);
    expect(done.session.completed).toBe(true);
    expect(host.renderResult?.(host.getSession())).toBe(
      `小球平抛的初速度 v₀ = ${v0.toPrecision(3)} m/s，抛出点坐标 (${launchX.toFixed(1)}, ${launchY.toFixed(1)}) cm`
    );
  });

  it('swaps the table and drops old data when the origin setting changes', () => {
    const { sim, host } = tracedHost();
    expect(host.getSpec()).toBe(projectileLabDataWorkspaceSpec);
    host.submitField({ field: 'y', trialIndex: 2, raw: '18.00' });
    sim.setParams({ recordOrigin: false });
    expect(host.getSpec()).toBe(projectileLabNoOriginSpec);
    const session = host.getSession();
    expect(session.trials[2]!.fields.y).toBeUndefined();
    expect(session.trials[0]!.fields.x?.raw).toBe('0.00');
  });

  it('invalidates checked data when the paper is replaced', () => {
    const { sim, host } = tracedHost(false);
    const rows = readings(sim);
    host.submitField({ field: 'x', trialIndex: 1, raw: rows[1]!.x });
    host.invalidateAll('已换白纸，请重新记录并测量');
    const session = host.getSession();
    expect(session.trials[1]!.fields.x?.checked).toBe(false);
    expect(session.trials[0]!.fields.x?.checked).toBe(true);
  });
});

describe('summary check mode', () => {
  it('rejects an unknown summaryCheck value', () => {
    expect(() =>
      assertSpecGraph({
        ...projectileLabNoOriginSpec,
        id: 'bad-summary-check',
        summaryCheck: 'all' as 'together'
      })
    ).toThrow(/summaryCheck/);
  });

  it('keeps one check button per summary field by default', () => {
    const { host } = tracedHost();
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    const buttons = [
      ...panel.root.querySelectorAll<HTMLButtonElement>(
        '.data-workspace-summary .data-workspace-check'
      )
    ].filter((button) => !button.hidden);
    expect(buttons).toHaveLength(1);
    expect(buttons[0]!.getAttribute('aria-label')).toBeNull();
    panel.dispose();
  });

  it('checks v₀ and the launch point with a single button when the origin is not recorded', () => {
    const { sim, host } = tracedHost(false);
    submitAllCoordinates(host, readings(sim));
    const onChange = vi.fn();
    const submitField = vi.spyOn(host, 'submitField');
    const panel = createDataWorkspacePanel({ host, onChange });
    const visible = [
      ...panel.root.querySelectorAll<HTMLButtonElement>(
        '.data-workspace-summary .data-workspace-check'
      )
    ].filter((button) => !button.hidden);
    expect(visible).toHaveLength(1);
    const checkAll = visible[0]!;
    expect(checkAll.getAttribute('aria-label')).toBe(
      '校对初速度 v₀、抛出点 x₀、抛出点 y₀'
    );
    expect(checkAll.disabled).toBe(false);

    const field = (id: string) =>
      panel.root.querySelector(`[data-field="${id}"]`) as HTMLInputElement;
    // 与上一条用例相同的独立手算
    const rows = readings(sim);
    const x = rows.map((row) => Number(row.x));
    const y = rows.map((row) => Number(row.y));
    const T = Math.sqrt((y[4]! - 2 * y[2]! + y[0]!) / (4 * 980));
    const v0 = (x[4]! - x[0]!) / 4 / T / 100;
    const t = (y[3]! - y[1]!) / (2 * T) / 980;
    field('v0').value = v0.toPrecision(3);
    field('launchX').value = (x[2]! - v0 * 100 * t).toFixed(1);
    field('launchY').value = (y[2]! - 0.5 * 980 * t * t).toFixed(1);

    checkAll.click();
    expect(submitField.mock.calls.map(([input]) => input.field)).toEqual([
      'v0',
      'launchX',
      'launchY'
    ]);
    expect(onChange).toHaveBeenCalledTimes(1);
    const session = host.getSession();
    expect(session.completed).toBe(true);
    expect(session.summary.launchX?.checked).toBe(true);
    panel.dispose();
  });

  it('disables the single button until every coordinate is checked', () => {
    const { host } = tracedHost(false);
    const panel = createDataWorkspacePanel({ host, onChange() {} });
    const checkAll = [
      ...panel.root.querySelectorAll<HTMLButtonElement>(
        '.data-workspace-summary .data-workspace-check'
      )
    ].find((button) => !button.hidden)!;
    expect(checkAll.disabled).toBe(true);
    panel.dispose();
  });
});

describe('projectile lab scene entry', () => {
  it('projects live params as numbers and exposes the workspace host', () => {
    const scene = createProjectileLabScene();
    expect(scene.getParams()).toEqual({
      releaseH: 8,
      plateY: 6,
      chuteTilt: 0,
      useLocator: 1,
      recordOrigin: 1,
      showLabels: 1
    });
    expect(
      scene.setParams({ showLabels: false, plateY: 12, chuteTilt: 3 })
    ).toMatchObject({ plateY: 12, chuteTilt: 3, showLabels: 0 });
    expect(scene.setParams({ useLocator: 0, recordOrigin: 0 })).toMatchObject({
      useLocator: 0,
      recordOrigin: 0
    });
    expect(scene.getDataWorkspace().getEligibility().ok).toBe(false);
    expect(scene.getTransportState().isPlaying).toBe(false);
    scene.dispose();
  });

  it('steps a release to a mark and reports progress in the readout', () => {
    const scene = createProjectileLabScene();
    expect(scene.release()).toEqual({ ok: true });
    expect(scene.getTransportState().isPlaying).toBe(true);
    for (let i = 0; i < 2000 && scene.getState().busy; i += 1) {
      scene.step(1 / 60);
    }
    expect(scene.getState().marks).toHaveLength(1);
    const items = scene.getReadoutItems();
    expect(items.find((item) => item.key === 'marks')?.value).toBe(
      '1 个 / 1 个高度'
    );
    expect(items.find((item) => item.key === 'setup')?.value).toBe('无');
    scene.setParams({ chuteTilt: 4, useLocator: false });
    expect(
      scene.getReadoutItems().find((item) => item.key === 'setup')?.value
    ).toBe('未用定位卡、斜槽末端不水平');
    scene.newPaper();
    expect(scene.getState().marks).toEqual([]);
    scene.dispose();
  });
});
