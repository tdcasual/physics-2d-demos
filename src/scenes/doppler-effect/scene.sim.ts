/**
 * 多普勒效应 — 物理模拟
 *
 * 1D 波源/观察者模型，波环从源点发出，以声速扩散
 * 接收频率：f_recv = f_emit × (v_sound + v_obs) / (v_sound − v_src)
 */

export type DopplerMode = 'source-moving' | 'observer-moving' | 'both-moving';

export type DopplerParams = {
  sourceSpeed: number; // -5 ~ 5 m/s
  observerSpeed: number; // -5 ~ 5 m/s
  emitFrequency: number; // 1 ~ 10 Hz
  mode: DopplerMode;
  audioEnabled: boolean;
  audioVolume: number; // 0 ~ 1
  playbackSpeed: number; // 0.1 ~ 2.0
};

export type WaveRing = {
  x: number; // 发射位置 x (m)
  birthTime: number; // 发射时刻 (s)
};

export type DopplerState = {
  params: DopplerParams;
  time: number;
  sourceX: number;
  observerX: number;
  waveRings: WaveRing[];
  receivedFrequency: number;
  wavelengthStandard: number;
  wavelengthFront: number;
  wavelengthBack: number;
  machNumber: number;
  frequencyChangePct: number;
  waveArrived: boolean;
};

/** 声速 (m/s) */
export const SOUND_SPEED = 6;

/** 画布物理范围 (m) */
export const CANVAS_MIN = 2;
export const CANVAS_MAX = 28;

function computeReceivedFrequency(
  emitFreq: number,
  sourceSpeed: number,
  observerSpeed: number,
  sourceX: number,
  observerX: number
): number {
  // v_src: 正值 = 朝观察者方向
  const dist = observerX - sourceX;
  const effectiveSourceSpeed = dist >= 0 ? sourceSpeed : -sourceSpeed;
  // v_obs: 正值 = 朝波源方向
  const effectiveObsSpeed = dist >= 0 ? -observerSpeed : observerSpeed;

  const denom = SOUND_SPEED - effectiveSourceSpeed;
  if (Math.abs(denom) < 1e-6) return emitFreq * 100; // 接近音速

  return (emitFreq * (SOUND_SPEED + effectiveObsSpeed)) / denom;
}

function computeWavelengths(sourceSpeed: number, emitFreq: number) {
  const lambda0 = SOUND_SPEED / emitFreq;
  if (Math.abs(sourceSpeed) >= SOUND_SPEED) {
    return { standard: lambda0, front: 0, back: Infinity };
  }
  const absV = Math.abs(sourceSpeed);
  return {
    standard: lambda0,
    front: (lambda0 * (SOUND_SPEED - absV)) / SOUND_SPEED,
    back: (lambda0 * (SOUND_SPEED + absV)) / SOUND_SPEED
  };
}

// ── 音频引擎（懒初始化）──

class AudioEngine {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private _enabled = false;

  get enabled() {
    return this._enabled;
  }

  enable(): void {
    if (this._enabled) return;
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as Record<string, typeof AudioContext>)
          .webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC({ sampleRate: 48000 });
      this.gain = this.ctx.createGain();
      this.gain.gain.value = 0.15;
      this.gain.connect(this.ctx.destination);
      this._enabled = true;
    } catch {
      /* 浏览器不支持 */
    }
  }

  disable(): void {
    this.stopOsc();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._enabled = false;
  }

  startOsc(freq: number): void {
    if (!this.ctx || !this.gain) return;
    this.stopOsc();
    this.osc = this.ctx.createOscillator();
    this.osc.type = 'sine';
    this.osc.frequency.value = Math.max(20, freq);
    this.osc.connect(this.gain);
    this.osc.start();
  }

  updateFreq(freq: number): void {
    if (!this.osc || !this.ctx) return;
    const f = Math.max(20, Math.min(20000, freq));
    this.osc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.05);
  }

  setVolume(v: number): void {
    if (this.gain && this.ctx) {
      this.gain.gain.setTargetAtTime(v * 0.3, this.ctx.currentTime, 0.01);
    }
  }

  private stopOsc(): void {
    if (this.osc) {
      try {
        this.osc.stop();
      } catch {
        /* already stopped */
      }
      this.osc.disconnect();
      this.osc = null;
    }
  }

  dispose(): void {
    this.disable();
  }
}

export function createDopplerSim(initial: Partial<DopplerParams> = {}) {
  const defaults: DopplerParams = {
    sourceSpeed: 0,
    observerSpeed: 0,
    emitFrequency: 3,
    mode: 'source-moving',
    audioEnabled: false,
    audioVolume: 0.5,
    playbackSpeed: 1.0
  };

  let params: DopplerParams = { ...defaults, ...initial };
  let time = 0;
  let sourceX = 15;
  let observerX = 25;
  let waveRings: WaveRing[] = [];
  let lastEmitTime = 0;
  let waveArrived = false;
  const audio = new AudioEngine();

  function seedRings(): void {
    const period = 1 / Math.max(0.1, params.emitFrequency);
    waveRings = [];
    for (let i = 4; i >= 1; i -= 1) {
      waveRings.push({ x: sourceX, birthTime: -i * period });
    }
    lastEmitTime = 0;
  }
  seedRings();

  function getState(): DopplerState {
    const { sourceSpeed, observerSpeed, emitFrequency } = params;
    const receivedFrequency = computeReceivedFrequency(
      emitFrequency,
      sourceSpeed,
      observerSpeed,
      sourceX,
      observerX
    );
    const wl = computeWavelengths(sourceSpeed, emitFrequency);
    const freqChangePct =
      ((receivedFrequency - emitFrequency) / emitFrequency) * 100;

    return {
      params: { ...params },
      time,
      sourceX,
      observerX,
      waveRings: [...waveRings],
      receivedFrequency,
      wavelengthStandard: wl.standard,
      wavelengthFront: wl.front,
      wavelengthBack: wl.back,
      machNumber: Math.abs(sourceSpeed) / SOUND_SPEED,
      frequencyChangePct: freqChangePct,
      waveArrived
    };
  }

  function setParams(next: Partial<DopplerParams>): DopplerParams {
    params = { ...params, ...next };
    // 模式切换时清零对应速度
    if (next.mode === 'source-moving' && params.observerSpeed !== 0) {
      params.observerSpeed = 0;
    } else if (next.mode === 'observer-moving' && params.sourceSpeed !== 0) {
      params.sourceSpeed = 0;
    }
    return params;
  }

  function setSourceX(x: number): void {
    sourceX = Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, x));
  }

  function setObserverX(x: number): void {
    observerX = Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, x));
  }

  function step(dt: number): void {
    const realDt = dt * params.playbackSpeed;
    time += realDt;

    // 移动波源和观察者
    sourceX += params.sourceSpeed * realDt;
    observerX += params.observerSpeed * realDt;
    sourceX = Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, sourceX));
    observerX = Math.max(CANVAS_MIN, Math.min(CANVAS_MAX, observerX));

    // 发射新波环
    const period = 1 / params.emitFrequency;
    if (time - lastEmitTime >= period) {
      waveRings.push({ x: sourceX, birthTime: time });
      lastEmitTime = time;
    }

    // 检测波到达观察者
    waveArrived = false;
    for (const ring of waveRings) {
      const radius = SOUND_SPEED * (time - ring.birthTime);
      const dist = Math.abs(observerX - ring.x);
      if (Math.abs(radius - dist) < SOUND_SPEED * realDt * 1.5) {
        waveArrived = true;
        break;
      }
    }

    // 移除超大环
    waveRings = waveRings.filter(
      (r) => SOUND_SPEED * (time - r.birthTime) < 60
    );

    // 更新音频
    if (audio.enabled) {
      const recvFreq = computeReceivedFrequency(
        params.emitFrequency,
        params.sourceSpeed,
        params.observerSpeed,
        sourceX,
        observerX
      );
      // 将模拟频率 (1-10Hz) 映射到可听范围 (~100-1000Hz)
      audio.updateFreq(recvFreq * 100);
    }
  }

  function enableAudio(): void {
    audio.enable();
    if (audio.enabled) {
      const recvFreq = computeReceivedFrequency(
        params.emitFrequency,
        params.sourceSpeed,
        params.observerSpeed,
        sourceX,
        observerX
      );
      audio.startOsc(recvFreq * 100);
      audio.setVolume(params.audioVolume);
    }
    params.audioEnabled = true;
  }

  function disableAudio(): void {
    audio.disable();
    params.audioEnabled = false;
  }

  function setVolume(v: number): void {
    params.audioVolume = v;
    audio.setVolume(v);
  }

  function reset(): void {
    params = { ...defaults };
    time = 0;
    sourceX = 15;
    observerX = 25;
    waveArrived = false;
    seedRings();
  }

  function dispose(): void {
    audio.dispose();
  }

  return {
    getState,
    setParams,
    setSourceX,
    setObserverX,
    enableAudio,
    disableAudio,
    setVolume,
    step,
    reset,
    dispose
  };
}
