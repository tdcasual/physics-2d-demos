import { describe, expect, it } from 'vitest';
import { createThreeForcesScene } from '../../src/scenes/three-forces/scene.entry';
import {
  createThreeForcesSim,
  hasFloatingReadout,
  inclineAxes,
  inclineLayout,
  parseThreeForcesTab,
  springLayout,
  stageLayoutFrom,
  stageTransform,
  threeForcesConstants as C,
  threeForcesContact,
  threeForcesDownslope,
  threeForcesFrictionMax,
  threeForcesGravity,
  threeForcesNormal,
  threeForcesPerpendicular,
  threeForcesSpringForce,
  threeForcesSpringPeriod,
  threeForcesSpringStep,
  threeForcesVectors
} from '../../src/scenes/three-forces/scene.sim';

describe('three-forces gravity decomposition', () => {
  it('uses G = mg with g = 10 N/kg', () => {
    // m=3 → G=30；m=1 → G=10（口算，非从实现抄）
    expect(threeForcesGravity(3)).toBe(30);
    expect(threeForcesGravity(1)).toBe(10);
    expect(createThreeForcesSim().getState().gravity).toBe(30);
  });

  it('decomposes G₁ = mg sinθ and G₂ = mg cosθ, with N = G₂', () => {
    // θ=30°, m=3：sin30=1/2, cos30=√3/2
    // G₁=30×1/2=15，G₂=15√3，N=G₂
    expect(threeForcesDownslope(3, 30)).toBeCloseTo(15, 10);
    expect(threeForcesPerpendicular(3, 30)).toBeCloseTo(15 * Math.sqrt(3), 10);
    expect(threeForcesNormal(3, 30)).toBe(threeForcesPerpendicular(3, 30));
    const state = createThreeForcesSim({
      mass: 3,
      inclineAngle: 30
    }).getState();
    expect(state.downslope).toBeCloseTo(15, 10);
    expect(state.perpendicular).toBeCloseTo(25.981, 3);
    expect(state.normal).toBeCloseTo(state.perpendicular, 10);
  });

  it('vanishes the downslope component at θ = 0 and keeps G₂ = G', () => {
    // 水平面：sin0=0, cos0=1 → G₁=0, G₂=G=30, N=30
    expect(threeForcesDownslope(3, 0)).toBe(0);
    expect(threeForcesPerpendicular(3, 0)).toBe(30);
    expect(threeForcesNormal(3, 0)).toBe(30);
    const state = createThreeForcesSim({ inclineAngle: 0, mass: 3 }).getState();
    expect(state.downslope).toBe(0);
    expect(state.gravityVector).toEqual({ x: 0, y: 30 });
    expect(state.normalVector.x).toBeCloseTo(0, 10);
    expect(state.normalVector.y).toBeCloseTo(-30, 10);
    expect(state.g2Vector.x).toBeCloseTo(0, 10);
    expect(state.g2Vector.y).toBeCloseTo(30, 10);
  });

  it('keeps gravity vertically down and G₁+G₂ = G as vectors', () => {
    const v = threeForcesVectors(3, 30, 0);
    expect(v.gravityVector).toEqual({ x: 0, y: 30 });
    // û_down = (−cos30, sin30)=(-√3/2, 1/2) → G₁=15×û_down
    expect(v.g1Vector.x).toBeCloseTo(-7.5 * Math.sqrt(3), 10);
    expect(v.g1Vector.y).toBeCloseTo(7.5, 10);
    // n_in = (sin30, cos30)=(1/2, √3/2) → G₂=15√3 × n_in
    expect(v.g2Vector.x).toBeCloseTo(7.5 * Math.sqrt(3), 10);
    expect(v.g2Vector.y).toBeCloseTo(22.5, 10);
    expect(v.g1Vector.x + v.g2Vector.x).toBeCloseTo(0, 10);
    expect(v.g1Vector.y + v.g2Vector.y).toBeCloseTo(30, 10);
    // FN 与 G₂ 反向
    expect(v.normalVector.x).toBeCloseTo(-v.g2Vector.x, 10);
    expect(v.normalVector.y).toBeCloseTo(-v.g2Vector.y, 10);
  });

  it('rotates decomposition axes with θ = 60°', () => {
    const axes = inclineAxes(60);
    expect(axes.downslope.x).toBeCloseTo(-0.5, 10);
    expect(axes.downslope.y).toBeCloseTo(Math.sqrt(3) / 2, 10);
    expect(axes.outwardNormal.x).toBeCloseTo(-Math.sqrt(3) / 2, 10);
    expect(axes.outwardNormal.y).toBeCloseTo(-0.5, 10);
    // m=2, θ=60°：G=20, G₁=10√3, G₂=10
    expect(threeForcesDownslope(2, 60)).toBeCloseTo(10 * Math.sqrt(3), 10);
    expect(threeForcesPerpendicular(2, 60)).toBeCloseTo(10, 10);
  });
});

describe('three-forces friction', () => {
  it('keeps the block static with f = G₁ when G₁ < μN', () => {
    // m=3, θ=30°, μ=0.7：μN=0.7×15√3≈18.186 > 15 → 静止，f=G₁=15, a=0
    const contact = threeForcesContact(3, 30, 0.7, 0);
    expect(contact.sliding).toBe(false);
    expect(contact.critical).toBe(false);
    expect(contact.friction).toBeCloseTo(15, 10);
    expect(contact.netForce).toBe(0);
    expect(contact.acceleration).toBe(0);
    const sim = createThreeForcesSim({
      tab: 'friction',
      mass: 3,
      inclineAngle: 30,
      mu: 0.7,
      autoRun: false
    });
    expect(sim.getState().status).toBe('静止');
    expect(sim.getState().friction).toBeCloseTo(15, 10);
  });

  it('treats G₁ = μN as critical rest, not sliding', () => {
    // tan30=1/√3，取 μ=tanθ 则 G₁=μN
    const mu = 1 / Math.sqrt(3);
    expect(threeForcesFrictionMax(3, 30, mu)).toBeCloseTo(15, 10);
    const contact = threeForcesContact(3, 30, mu, 0);
    expect(contact.sliding).toBe(false);
    expect(contact.critical).toBe(true);
    expect(contact.friction).toBeCloseTo(15, 10);
    expect(contact.acceleration).toBe(0);
    const sim = createThreeForcesSim({
      tab: 'friction',
      mu,
      autoRun: false
    });
    expect(sim.getState().status).toBe('临界静止');
  });

  it('slides with f = μN up the slope when G₁ > μN', () => {
    // μ=0.4, μN=0.4×15√3=6√3≈10.3923
    // f=10.3923，合力=15-6√3，a=(15-6√3)/3=5-2√3
    const fMax = threeForcesFrictionMax(3, 30, 0.4);
    expect(fMax).toBeCloseTo(6 * Math.sqrt(3), 10);
    const contact = threeForcesContact(3, 30, 0.4, 0);
    expect(contact.sliding).toBe(true);
    expect(contact.friction).toBeCloseTo(6 * Math.sqrt(3), 10);
    expect(contact.netForce).toBeCloseTo(15 - 6 * Math.sqrt(3), 10);
    expect(contact.acceleration).toBeCloseTo(5 - 2 * Math.sqrt(3), 10);
    const sim = createThreeForcesSim({
      tab: 'friction',
      mu: 0.4,
      autoRun: false
    });
    expect(sim.getState().status).toBe('沿斜面下滑');
    const axes = inclineAxes(30);
    const fVec = sim.getState().frictionVector;
    const alongDown = fVec.x * axes.downslope.x + fVec.y * axes.downslope.y;
    expect(alongDown).toBeLessThan(0);
  });

  it('does not pin friction at zero on the gravity tab', () => {
    const gravity = createThreeForcesSim({
      tab: 'gravity',
      mu: 0.4,
      autoRun: false
    }).getState();
    expect(gravity.friction).toBeCloseTo(6 * Math.sqrt(3), 10);
    expect(gravity.friction).toBeGreaterThan(1);
  });

  it('advances s = ½at² from rest and freezes when paused', () => {
    // a=5-2√3，t=1 → s=0.5(5-2√3)
    const expected = 0.5 * (5 - 2 * Math.sqrt(3));
    const moving = createThreeForcesSim({
      tab: 'friction',
      mu: 0.4,
      autoRun: true
    });
    moving.step(1);
    expect(moving.getState().blockS).toBeCloseTo(expected, 6);
    expect(moving.getState().time).toBe(1);

    const paused = createThreeForcesSim({
      tab: 'friction',
      mu: 0.4,
      autoRun: false
    });
    paused.step(1);
    expect(paused.getState().blockS).toBe(0);
    expect(paused.getState().time).toBe(0);
    paused.stepFrame(1);
    expect(paused.getState().blockS).toBeCloseTo(expected, 6);
  });

  it('clamps the block at the stopper instead of leaving the incline', () => {
    const sim = createThreeForcesSim({
      tab: 'friction',
      mu: 0,
      autoRun: true
    });
    sim.step(20);
    expect(sim.getState().blockS).toBeCloseTo(C.sMax, 8);
    expect(sim.getState().blockS).toBeLessThanOrEqual(C.sMax);
    expect(sim.getState().blockVelocity).toBe(0);
    expect(sim.getState().status).toBe('抵达挡块');
    expect(Number.isFinite(sim.getState().blockS)).toBe(true);
  });
});

describe('three-forces spring Hooke model', () => {
  it('uses F = −kx so the force always opposes the deformation', () => {
    // k=40 N/m, x=+0.2 m → F=−8 N；x=−0.2 m → F=+8 N
    expect(threeForcesSpringForce(40, 0.2)).toBeCloseTo(-8, 10);
    expect(threeForcesSpringForce(40, -0.2)).toBeCloseTo(8, 10);
    expect(threeForcesSpringForce(40, 0)).toBeCloseTo(0, 10);
    const stretch = createThreeForcesSim({
      tab: 'spring',
      springK: 40,
      springX: 0.2,
      autoRun: false
    }).getState();
    expect(stretch.springForce).toBeCloseTo(-8, 10);
    expect(stretch.springDisplacement).toBeCloseTo(0.2, 10);
    expect(stretch.status).toBe('拉伸');
    const compress = createThreeForcesSim({
      tab: 'spring',
      springX: -0.2,
      autoRun: false
    }).getState();
    expect(compress.springForce).toBeCloseTo(8, 10);
    expect(compress.status).toBe('压缩');
  });

  it('oscillates with T = 2π√(m/k) and inverts after T/2', () => {
    // m=3, k=40 → ω=√(40/3)，T/2=π/ω
    const omega = Math.sqrt(40 / 3);
    const halfPeriod = Math.PI / omega;
    expect(threeForcesSpringPeriod(40, 3)).toBeCloseTo(
      (2 * Math.PI) / omega,
      10
    );
    const sim = createThreeForcesSim({
      tab: 'spring',
      mass: 3,
      springK: 40,
      springX: 0.2,
      autoRun: true
    });
    sim.step(halfPeriod);
    expect(sim.getState().springDisplacement).toBeCloseTo(-0.2, 6);
    sim.step(halfPeriod);
    expect(sim.getState().springDisplacement).toBeCloseTo(0.2, 6);
    const energy =
      0.5 * 40 * sim.getState().springDisplacement ** 2 +
      0.5 * 3 * sim.getState().springVelocity ** 2;
    expect(energy).toBeCloseTo(0.5 * 40 * 0.2 ** 2, 6);
  });

  it('keeps the closed-form step finite at the displacement bounds', () => {
    const step = threeForcesSpringStep(0.2, 0, 40, 3, 0.01);
    expect(Number.isFinite(step.x)).toBe(true);
    expect(Number.isFinite(step.v)).toBe(true);
    const sim = createThreeForcesSim({
      tab: 'spring',
      springX: 0.5,
      autoRun: true
    });
    sim.step(1.7);
    const s = sim.getState();
    expect(Number.isFinite(s.springDisplacement)).toBe(true);
    expect(Number.isFinite(s.springForce)).toBe(true);
    expect(s.springDisplacement).toBeGreaterThanOrEqual(C.springXMin);
    expect(s.springDisplacement).toBeLessThanOrEqual(C.springXMax);
  });
});

describe('three-forces switching, clamps, drag, and reset', () => {
  it('parses tab ids and 0/1/2 from URL-style values', () => {
    expect(parseThreeForcesTab(0)).toBe('gravity');
    expect(parseThreeForcesTab('1')).toBe('friction');
    expect(parseThreeForcesTab(2)).toBe('spring');
    expect(parseThreeForcesTab('gravity')).toBe('gravity');
    const sim = createThreeForcesSim();
    sim.setParams({ tab: 'friction' });
    expect(sim.getParams().tab).toBe('friction');
    sim.setParams({ tab: 'spring' });
    expect(sim.getParams().tab).toBe('spring');
    expect(sim.getState().status).toBe('拉伸');
  });

  it('clamps mass, angle, μ and spring parameters', () => {
    const sim = createThreeForcesSim();
    sim.setParams({
      mass: 99,
      inclineAngle: -8,
      mu: 4,
      springK: 1,
      springX: 9
    });
    expect(sim.getParams()).toMatchObject({
      mass: 6,
      inclineAngle: 0,
      mu: 1,
      springK: 10,
      springX: 0.5
    });
  });

  it('ignores non-finite dt and does not produce NaN', () => {
    const sim = createThreeForcesSim({ tab: 'friction', autoRun: true });
    const before = sim.getState();
    sim.step(Number.NaN);
    sim.step(-2);
    expect(sim.getState().time).toBe(before.time);
    expect(sim.getState().blockS).toBe(before.blockS);
    sim.step(0.2);
    expect(Number.isFinite(sim.getState().blockS)).toBe(true);
    expect(Number.isFinite(sim.getState().acceleration)).toBe(true);
  });

  it('picks and drags the incline block along the slope', () => {
    const sim = createThreeForcesSim({
      tab: 'friction',
      autoRun: false,
      mu: 0.8
    });
    const geo = inclineLayout(30, 0);
    const hit = sim.pickHandle(
      geo.blockCenter.x / C.baseWidth,
      geo.blockCenter.y / C.baseHeight
    );
    expect(hit).toBe('block');
    expect(sim.pickHandle(0, 0)).toBeNull();
    const down = inclineLayout(30, 1.5);
    sim.moveHandle(
      'block',
      down.blockCenter.x / C.baseWidth,
      down.blockCenter.y / C.baseHeight
    );
    expect(sim.getState().blockS).toBeCloseTo(1.5, 2);
    expect(sim.getState().blockVelocity).toBe(0);
  });

  it('drags the spring block and writes displacement into springX', () => {
    const sim = createThreeForcesSim({ tab: 'spring', autoRun: false });
    const layout = springLayout(0.2);
    expect(
      sim.pickHandle(
        layout.blockCenter.x / C.baseWidth,
        layout.blockCenter.y / C.baseHeight
      )
    ).toBe('block');
    sim.moveHandle('block', springLayout(0).equilibriumX / C.baseWidth, 0.5);
    expect(sim.getParams().springX).toBeCloseTo(0, 2);
    expect(sim.getState().springDisplacement).toBeCloseTo(0, 2);
    expect(sim.getState().status).toBe('原长');
  });

  it('resets to gravity / m=3 / θ=30° / μ=0.40 / spring defaults', () => {
    const sim = createThreeForcesSim();
    sim.setParams({
      tab: 'spring',
      mass: 6,
      inclineAngle: 55,
      mu: 0.1,
      springX: 0.4,
      autoRun: false,
      showComponents: false
    });
    sim.stepFrame(0.8);
    sim.reset();
    expect(sim.getParams()).toMatchObject({
      tab: 'gravity',
      mass: 3,
      inclineAngle: 30,
      mu: 0.4,
      springK: 40,
      springX: 0.2,
      autoRun: true,
      showComponents: true
    });
    const state = sim.getState();
    expect(state.time).toBe(0);
    expect(state.blockS).toBe(0);
    expect(state.springDisplacement).toBeCloseTo(0.2, 10);
  });

  it('exposes readout formulas off the canvas via the scene entry', () => {
    const scene = createThreeForcesScene();
    const gravity = scene.getReadoutItems();
    expect(gravity.some((item) => item.value === 'G = mg')).toBe(true);
    expect(gravity.some((item) => String(item.value).includes('G sinθ'))).toBe(
      true
    );
    scene.setParams({
      tab: 'spring',
      springK: 40,
      springX: 0.2,
      autoRun: false
    });
    const spring = scene.getReadoutItems();
    const springForce = spring.find((item) => item.key === 'springForce');
    expect(springForce?.label).toBe('F弹');
    // k=40 N/m, x=+0.2 m → F弹=−kx=−8.0 N；大小 |F弹|=kx=8.0 N
    expect(springForce?.value).toBe('-8.0 N');
    expect(spring.some((item) => item.value === 'F弹 = −kx，|F弹| = kx')).toBe(
      true
    );
    expect(spring.some((item) => item.value === 'F弹 = kx')).toBe(false);
    scene.setParams({ springX: -0.2 });
    expect(
      scene.getReadoutItems().find((item) => item.key === 'springForce')?.value
    ).toBe('8.0 N');
    scene.dispose();
  });
});

describe('three-forces stage layout', () => {
  it('fits the 720×660 stage and keeps the slope above the transport band', () => {
    expect(C.baseWidth).toBe(720);
    expect(C.baseHeight).toBe(660);
    expect(C.planeBaseY).toBeLessThan(C.baseHeight - C.transportClearY);
    const pose = stageTransform(1280, 720, { floatingReadout: false });
    expect(pose.fit).toBeGreaterThan(0.5);
    expect(pose.boxW).toBe(720);
    const overlay = stageTransform(1280, 720, {
      floatingReadout: true,
      overlayPx: 228
    });
    expect(overlay.offsetX).toBe(0);
    expect(overlay.fit).toBeLessThan(pose.fit + 1e-9);
  });

  it('does not treat mobile-stack as a floating readout overlay', () => {
    const root = document.createElement('div');
    root.className = 'mobile-stack-layout';
    document.body.append(root);
    expect(hasFloatingReadout(root)).toBe(false);
    expect(stageLayoutFrom(root).floatingReadout).toBe(false);
    root.remove();
  });
});
