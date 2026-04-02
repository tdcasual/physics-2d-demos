/**
 * V-T Integral Controls - V3
 */

import {
  createCollapsibleCard,
  createButtonGrid,
  createTransportControls,
  createParamSlider
} from '../../ui/control-layout';

export interface VtIntegralControlsOptions {
  mount: HTMLElement;
  onPlay?: () => void;
  onPause?: () => void;
  onReset?: () => void;
  onStep?: () => void;
  onSetScene?: (scene: string) => void;
  onSetRects?: (value: number) => void;
  onSetTime?: (value: number) => void;
  onSetMethod?: (method: string) => void;
  onSetCurveAmplitude?: (value: number) => void;
  onSetCircleN?: (value: number) => void;
  onSetSurfaceN?: (value: number) => void;
  onSetDivision?: (value: number) => void;
  onPreset?: (preset: string) => void;
  onStatus?: (text: string) => void;
}

export function createVtIntegralControlsV3(options: VtIntegralControlsOptions) {
  const { mount, onPlay, onPause, onReset, onStep, onSetScene, onSetRects, onSetTime, onSetMethod, onSetCurveAmplitude, onSetCircleN, onSetSurfaceN, onSetDivision, onPreset, onStatus } = options;

  mount.innerHTML = '';

  // 播放控制卡片
  if (onPlay || onPause || onReset) {
    const transportCard = createCollapsibleCard('▶️ 播放控制', { defaultCollapsed: false });
    const transport = createTransportControls({ 
      onPlay: onPlay || (() => {}), 
      onPause: onPause || (() => {}), 
      onReset: onReset || (() => {}), 
      onStep: onStep || (() => {}) 
    });
    transportCard.body.appendChild(transport.element);
    mount.appendChild(transportCard.element);
  }

  // 场景选择卡片
  if (onSetScene) {
    const sceneCard = createCollapsibleCard('📋 子场景', { defaultCollapsed: false });
    const sceneBtns = createButtonGrid([
      { label: 'v-t面积', value: 'vt', onClick: () => { onSetScene?.('vt'); onStatus?.('v-t图面积'); } },
      { label: '曲线逼近', value: 'curve', onClick: () => { onSetScene?.('curve'); onStatus?.('曲线逼近'); } },
      { label: '圆面积', value: 'circle', onClick: () => { onSetScene?.('circle'); onStatus?.('圆面积微元'); } },
      { label: '表面积', value: 'surface', onClick: () => { onSetScene?.('surface'); onStatus?.('表面积微元'); } },
      { label: '旋转体', value: 'volume', onClick: () => { onSetScene?.('volume'); onStatus?.('旋转体体积'); } }
    ], { columns: 1 });
    sceneCard.body.appendChild(sceneBtns.element);
    mount.appendChild(sceneCard.element);
  }

  // 函数预设卡片
  if (onPreset) {
    const presetCard = createCollapsibleCard('📈 函数类型', { defaultCollapsed: false });
    const presetBtns = createButtonGrid([
      { label: '匀速', value: 'constant', onClick: () => { onPreset?.('constant'); onStatus?.('匀速运动 v(t)=2'); } },
      { label: '匀加速', value: 'linear', onClick: () => { onPreset?.('linear'); onStatus?.('匀加速运动 v(t)=0.5t'); } },
      { label: '变加速', value: 'quadratic', onClick: () => { onPreset?.('quadratic'); onStatus?.('变加速运动 v(t)=0.1t²'); } },
      { label: '正弦', value: 'sine', onClick: () => { onPreset?.('sine'); onStatus?.('正弦运动 v(t)=sin(t)'); } }
    ], { columns: 2 });
    presetCard.body.appendChild(presetBtns.element);
    mount.appendChild(presetCard.element);
  }

  // 微元设置卡片
  if (onSetRects || onSetDivision) {
    const elementCard = createCollapsibleCard('📐 微元设置', { defaultCollapsed: true });
    
    if (onSetRects) {
      const rectSlider = createParamSlider('矩形数量', {
        min: 1,
        max: 50,
        step: 1,
        value: 10,
        onChange: (val) => onSetRects?.(val)
      });
      elementCard.body.appendChild(rectSlider.element);
    }
    
    if (onSetDivision) {
      const divSlider = createParamSlider('分割数 n', {
        min: 4,
        max: 100,
        step: 1,
        value: 8,
        onChange: (val) => onSetDivision?.(val)
      });
      elementCard.body.appendChild(divSlider.element);
    }
    
    elementCard.body.innerHTML += `
      <div class="ctrl-hint" style="margin-top: 10px;">
        <span class="icon">💡</span>
        <span>微元越窄，近似越接近真实值。</span>
      </div>
    `;
    mount.appendChild(elementCard.element);
  }

  // 高级参数卡片
  const hasAdvancedParams = onSetTime || onSetMethod || onSetCurveAmplitude || onSetCircleN || onSetSurfaceN;
  if (hasAdvancedParams) {
    const advancedCard = createCollapsibleCard('⚙️ 高级参数', { defaultCollapsed: true });
    
    if (onSetTime) {
      const timeSlider = createParamSlider('时间 t', {
        min: 0,
        max: 10,
        step: 0.1,
        value: 5,
        unit: 's',
        onChange: (val) => onSetTime?.(val)
      });
      advancedCard.body.appendChild(timeSlider.element);
    }
    
    if (onSetCurveAmplitude) {
      const ampSlider = createParamSlider('振幅', {
        min: 0.5,
        max: 3,
        step: 0.1,
        value: 1,
        onChange: (val) => onSetCurveAmplitude?.(val)
      });
      advancedCard.body.appendChild(ampSlider.element);
    }
    
    if (onSetCircleN) {
      const nSlider = createParamSlider('分割数', {
        min: 4,
        max: 100,
        step: 1,
        value: 8,
        onChange: (val) => onSetCircleN?.(val)
      });
      advancedCard.body.appendChild(nSlider.element);
    }
    
    if (onSetSurfaceN) {
      const snSlider = createParamSlider('网格密度', {
        min: 10,
        max: 100,
        step: 5,
        value: 20,
        onChange: (val) => onSetSurfaceN?.(val)
      });
      advancedCard.body.appendChild(snSlider.element);
    }
    
    mount.appendChild(advancedCard.element);
  }

  return { dispose: () => { mount.innerHTML = ''; } };
}
