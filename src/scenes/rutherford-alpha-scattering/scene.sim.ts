import { clamp } from '../../core/math';

export type RutherfordModel = 0 | 1;
export type RutherfordParams = {
  model: RutherfordModel;
  aim: number;
  beamEnergy: number;
  autoRun: boolean;
  showForces: boolean;
};

export type RutherfordParticle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  deflection: number;
  path: Array<{ x: number; y: number }>;
};

export type RutherfordState = RutherfordParams & {
  time: number;
  totalCount: number;
  largeAngle: number;
  backscatter: number;
  particles: RutherfordParticle[];
  nucleus: { x: number; y: number };
  focused: RutherfordParticle | null;
  focusedDistance: number;
  focusedForce: number;
  beamStatus: string;
};

export const rutherfordConstants = {
  baseWidth: 1200,
  baseHeight: 760,
  fieldWidth: 760,
  panelX: 786,
  panelWidth: 382,
  sourceX: 58,
  nucleusX: 390,
  nucleusY: 386,
  voltageMin: 0.7,
  voltageMax: 1.4,
  aimMin: -260,
  aimMax: 260,
  particleSpeed: 205,
  coulombScale: 280000,
  emissionInterval: 0.12,
  maxPathPoints: 96,
  initialParticles: 44
} as const;

const DEFAULT_PARAMS: RutherfordParams = {
  model: 1,
  aim: 0,
  beamEnergy: 1,
  autoRun: true,
  showForces: true
};

function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalize(
  input: Partial<RutherfordParams>,
  previous: RutherfordParams = DEFAULT_PARAMS
): RutherfordParams {
  const model =
    input.model === 0 || input.model === 1 ? input.model : previous.model;
  return {
    model,
    aim: clamp(
      finite(input.aim, previous.aim),
      rutherfordConstants.aimMin,
      rutherfordConstants.aimMax
    ),
    beamEnergy: clamp(
      finite(input.beamEnergy, previous.beamEnergy),
      rutherfordConstants.voltageMin,
      rutherfordConstants.voltageMax
    ),
    autoRun:
      typeof input.autoRun === 'boolean' ? input.autoRun : previous.autoRun,
    showForces:
      typeof input.showForces === 'boolean'
        ? input.showForces
        : previous.showForces
  };
}

function copyParticle(particle: RutherfordParticle): RutherfordParticle {
  return { ...particle, path: particle.path.map((point) => ({ ...point })) };
}

export function createRutherfordSim(initial: Partial<RutherfordParams> = {}) {
  let params = normalize(initial);
  let time = 0;
  let emitAccumulator = 0;
  let nextId = 1;
  let totalCount = 538;
  let largeAngle = params.model === 1 ? 13 : 0;
  let backscatter = params.model === 1 ? 3 : 0;
  let particles: RutherfordParticle[] = [];
  let burstRemaining = 0;

  function sourceY(index: number): number {
    const spread = ((index * 47) % 17) - 8;
    return rutherfordConstants.nucleusY + spread * 27 + params.aim;
  }

  function spawn(index = nextId): void {
    const speed = rutherfordConstants.particleSpeed * params.beamEnergy;
    const particle: RutherfordParticle = {
      id: nextId++,
      x: rutherfordConstants.sourceX + 24,
      y: clamp(sourceY(index), 52, rutherfordConstants.baseHeight - 52),
      vx: speed,
      vy: 0,
      deflection: 0,
      path: []
    };
    particle.path.push({ x: particle.x, y: particle.y });
    particles.push(particle);
    totalCount += 1;
  }

  function seed(): void {
    particles = [];
    for (
      let index = 0;
      index < rutherfordConstants.initialParticles;
      index += 1
    ) {
      const speed = rutherfordConstants.particleSpeed * params.beamEnergy;
      const particle: RutherfordParticle = {
        id: nextId++,
        x: 94 + ((index * 61) % 620),
        y: clamp(sourceY(index + 11), 42, rutherfordConstants.baseHeight - 42),
        vx: speed,
        vy:
          params.model === 1 && index % 9 === 0
            ? index % 2 === 0
              ? 24
              : -22
            : 0,
        deflection: 0,
        path: []
      };
      particle.path.push({ x: particle.x, y: particle.y });
      particles.push(particle);
    }
  }

  function resetStats(): void {
    time = 0;
    emitAccumulator = 0;
    totalCount = params.model === 1 ? 538 : 0;
    largeAngle = params.model === 1 ? 13 : 0;
    backscatter = params.model === 1 ? 3 : 0;
    seed();
  }

  function getFocused(): {
    particle: RutherfordParticle | null;
    distance: number;
  } {
    let focused: RutherfordParticle | null = null;
    let distance = Number.POSITIVE_INFINITY;
    particles.forEach((particle) => {
      const dx = particle.x - rutherfordConstants.nucleusX;
      const dy = particle.y - rutherfordConstants.nucleusY;
      const currentDistance = Math.hypot(dx, dy);
      if (currentDistance < distance) {
        focused = particle;
        distance = currentDistance;
      }
    });
    return {
      particle: focused,
      distance: Number.isFinite(distance) ? distance : 0
    };
  }

  function getState(): RutherfordState {
    const focus = getFocused();
    const focusedForce = focus.particle
      ? rutherfordConstants.coulombScale /
        Math.max(36, focus.distance * focus.distance)
      : 0;
    return {
      ...params,
      time,
      totalCount,
      largeAngle,
      backscatter,
      particles: particles.map(copyParticle),
      nucleus: {
        x: rutherfordConstants.nucleusX,
        y: rutherfordConstants.nucleusY
      },
      focused: focus.particle ? copyParticle(focus.particle) : null,
      focusedDistance: focus.distance,
      focusedForce,
      beamStatus: params.autoRun ? '持续发射中' : '已暂停'
    };
  }

  function step(dt: number): void {
    if (!params.autoRun) return;
    const delta = clamp(finite(dt, 0), 0, 0.05);
    time += delta;
    emitAccumulator += delta;
    while (emitAccumulator >= rutherfordConstants.emissionInterval) {
      emitAccumulator -= rutherfordConstants.emissionInterval;
      spawn();
    }
    if (burstRemaining > 0) {
      const burst = Math.min(4, burstRemaining);
      for (let index = 0; index < burst; index += 1) spawn(nextId + index);
      burstRemaining -= burst;
    }
    const survivors: RutherfordParticle[] = [];
    particles.forEach((particle) => {
      if (params.model === 1) {
        const dx = particle.x - rutherfordConstants.nucleusX;
        const dy = particle.y - rutherfordConstants.nucleusY;
        const distance = Math.max(18, Math.hypot(dx, dy));
        const acceleration =
          rutherfordConstants.coulombScale / (distance * distance);
        particle.vx +=
          (acceleration * (dx / distance) * delta) /
          Math.max(0.7, params.beamEnergy);
        particle.vy +=
          (acceleration * (dy / distance) * delta) /
          Math.max(0.7, params.beamEnergy);
      }
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.deflection = Math.atan2(particle.vy, particle.vx);
      particle.path.push({ x: particle.x, y: particle.y });
      if (particle.path.length > rutherfordConstants.maxPathPoints)
        particle.path.shift();
      const outside =
        particle.x > rutherfordConstants.fieldWidth + 45 ||
        particle.y < -60 ||
        particle.y > rutherfordConstants.baseHeight + 60 ||
        particle.x < -40;
      if (outside) {
        const angle = Math.abs(particle.deflection);
        if (params.model === 1 && angle > Math.PI / 2) largeAngle += 1;
        if (params.model === 1 && angle > (3 * Math.PI) / 4) backscatter += 1;
      } else {
        survivors.push(particle);
      }
    });
    particles = survivors;
  }

  function setParams(next: Partial<RutherfordParams>): RutherfordParams {
    const previousModel = params.model;
    params = normalize({ ...params, ...next }, params);
    if (params.model !== previousModel) resetStats();
    return { ...params };
  }

  function fireBeam(): void {
    burstRemaining += 18;
    if (!params.autoRun) {
      for (let index = 0; index < 18; index += 1) spawn();
      burstRemaining = 0;
    }
  }

  function toggleModel(): RutherfordModel {
    const model = params.model === 1 ? 0 : 1;
    setParams({ model });
    return model;
  }

  resetStats();
  return {
    getState,
    getSnapshot: getState,
    getParams: (): RutherfordParams => ({ ...params }),
    setParams,
    fireBeam,
    toggleModel,
    reset: resetStats,
    step
  };
}
