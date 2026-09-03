import { describe, expect, it } from 'vitest';
import {
  createXtGraphSim,
  getXtPreset,
  XT_T_MAX
} from '../../src/scenes/xt-graph/scene.sim';

describe('xt-graph sim', () => {
  /* ── 解析解对照：手算期望值（非从实现抄公式） ── */

  it('rest 预设：x 恒为 2，v 恒为 0（水平直线 = 静止）', () => {
    const sim = createXtGraphSim('rest');
    sim.step(3);
    const s = sim.getState();
    expect(s.x).toBeCloseTo(2, 10);
    expect(s.v).toBeCloseTo(0, 10);
  });

  it('uniform-pos 预设：x(5) = -8 + 1.6×5 = 0，v = +1.6', () => {
    const sim = createXtGraphSim('uniform-pos');
    sim.step(5);
    const s = sim.getState();
    expect(s.x).toBeCloseTo(0, 10);
    expect(s.v).toBeCloseTo(1.6, 10);
  });

  it('uniform-neg 预设：x(5) = 8 − 1.6×5 = 0，v = −1.6', () => {
    const sim = createXtGraphSim('uniform-neg');
    sim.step(5);
    const s = sim.getState();
    expect(s.x).toBeCloseTo(0, 10);
    expect(s.v).toBeCloseTo(-1.6, 10);
  });

  it('accel 预设：x(10) = −9 + 0.18×100 = 9，v(5) = 0.36×5 = 1.8', () => {
    const sim = createXtGraphSim('accel');
    sim.step(5);
    expect(sim.getState().v).toBeCloseTo(1.8, 10);
    sim.step(5);
    expect(sim.getState().x).toBeCloseTo(9, 10);
  });

  it('decel 预设：x(10) = 9 − 0.18×100 = −9，v(5) = −1.8', () => {
    const sim = createXtGraphSim('decel');
    sim.step(5);
    expect(sim.getState().v).toBeCloseTo(-1.8, 10);
    sim.step(5);
    expect(sim.getState().x).toBeCloseTo(-9, 10);
  });

  it('tri 预设（三角波）：每段速率 ±6.4 m/s，t=1.25 时过原点', () => {
    // 第一段 (−8→8，2.5 s)：速率 = 16/2.5 = 6.4；x(1.25) = −8 + 6.4×1.25 = 0
    const sim = createXtGraphSim('tri');
    sim.step(1.25);
    let s = sim.getState();
    expect(s.x).toBeCloseTo(0, 10);
    expect(s.v).toBeCloseTo(6.4, 10);
    // 第二段折返：x(3.75) = 8 − 6.4×1.25 = 0，v = −6.4
    sim.step(2.5);
    s = sim.getState();
    expect(s.x).toBeCloseTo(0, 10);
    expect(s.v).toBeCloseTo(-6.4, 10);
  });

  it('abc 预设（课本折线）：匀速 → 停顿 → 匀速 → 返回', () => {
    const sim = createXtGraphSim('abc');
    // 第一段 (0→4，2 s)：v = 2；x(1) = 2
    sim.step(1);
    expect(sim.getState().x).toBeCloseTo(2, 10);
    expect(sim.getState().v).toBeCloseTo(2, 10);
    // 第二段停顿 (t=2..4)：x 恒为 4，v = 0
    sim.step(2);
    expect(sim.getState().x).toBeCloseTo(4, 10);
    expect(sim.getState().v).toBeCloseTo(0, 10);
    // 第三段 (4→8，3 s)：v = 4/3；x(5.5) = 4 + (4/3)×1.5 = 6
    sim.step(2.5);
    expect(sim.getState().x).toBeCloseTo(6, 10);
    expect(sim.getState().v).toBeCloseTo(4 / 3, 10);
    // 第四段返回原点 (8→0，3 s)：v = −8/3；x(8.5) = 8 − (8/3)×1.5 = 4
    sim.step(3);
    expect(sim.getState().x).toBeCloseTo(4, 10);
    expect(sim.getState().v).toBeCloseTo(-8 / 3, 10);
  });

  it('abc-cross 预设（跨越正负区）：从 x=−6 出发穿过原点再返回', () => {
    const sim = createXtGraphSim('abc-cross');
    // 第一段 (−6→−1，2 s)：v = 2.5；x(1) = −3.5
    sim.step(1);
    expect(sim.getState().x).toBeCloseTo(-3.5, 10);
    expect(sim.getState().v).toBeCloseTo(2.5, 10);
    // 第三段 (−1→7，3 s)：v = 8/3；x(5.5) = −1 + (8/3)×1.5 = 3（已入正半区）
    sim.step(4.5);
    expect(sim.getState().x).toBeCloseTo(3, 10);
    expect(sim.getState().v).toBeCloseTo(8 / 3, 10);
    // 第四段 (7→−3，3 s)：v = −10/3；x(8.5) = 7 − (10/3)×1.5 = 2
    sim.step(3);
    expect(sim.getState().x).toBeCloseTo(2, 10);
    expect(sim.getState().v).toBeCloseTo(-10 / 3, 10);
  });

  /* ── 不变量：v 是 x 的时间导数（中心差分交叉验证，非抄实现） ── */

  it('每个预设的 v(t) 都是 x(t) 的导数（中心差分，取段内光滑点 t=3.7）', () => {
    const eps = 1e-6;
    for (const id of [
      'rest',
      'uniform-pos',
      'uniform-neg',
      'accel',
      'decel',
      'tri',
      'abc',
      'abc-cross'
    ] as const) {
      const p = getXtPreset(id);
      const numeric = (p.x(3.7 + eps) - p.x(3.7 - eps)) / (2 * eps);
      expect(p.v(3.7)).toBeCloseTo(numeric, 4);
    }
  });

  /* ── 语义断言：图线斜率的物理含义 ── */

  it('匀速预设的图线斜率 = 声明的速度（由 x 两点式独立推算）', () => {
    // 两点式斜率只用 x()，不引用 v()；期望值 1.6 来自预设声明的物理语义
    const p = getXtPreset('uniform-pos');
    const slope = (p.x(10) - p.x(0)) / 10;
    expect(slope).toBeCloseTo(1.6, 10);
  });

  /* ── 边界：时间 clamp 与 finished ── */

  it('到达 T_MAX 后 clamp 并标记 finished，后续 step 为空操作', () => {
    const sim = createXtGraphSim('uniform-pos');
    sim.step(XT_T_MAX + 5);
    const s = sim.getState();
    expect(s.t).toBe(XT_T_MAX);
    expect(s.finished).toBe(true);
    // 播完后 x(10) = 8（手算：-8 + 1.6×10）
    expect(s.x).toBeCloseTo(8, 10);
    sim.step(1);
    expect(sim.getState().t).toBe(XT_T_MAX);
  });

  it('负 dt 与零 dt 不推进时间', () => {
    const sim = createXtGraphSim('uniform-pos');
    sim.step(-1);
    sim.step(0);
    expect(sim.getState().t).toBe(0);
  });

  it('reset 回到 t = 0 并清除 finished；setPreset 回到 t = 0 并切换预设', () => {
    const sim = createXtGraphSim('uniform-pos');
    sim.step(XT_T_MAX);
    expect(sim.getState().finished).toBe(true);
    sim.reset();
    expect(sim.getState().t).toBe(0);
    expect(sim.getState().finished).toBe(false);

    sim.step(2);
    sim.setPreset('decel');
    const s = sim.getState();
    expect(s.preset).toBe('decel');
    expect(s.t).toBe(0);
    // decel 的 x(0) = 9（手算：9 − 0）
    expect(s.x).toBeCloseTo(9, 10);
  });

  it('未知预设 id 回退到默认预设（uniform-pos）', () => {
    const sim = createXtGraphSim('uniform-pos');
    sim.setPreset('not-a-preset');
    expect(sim.getState().preset).toBe('uniform-pos');
  });
});
