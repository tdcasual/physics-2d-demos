/**
 * 高精度干涉测微仪 — Shadow DOM 结构构建（逐字搬移自原 instrument.view.ts）
 */

import type { MicrometerElements } from './types';

export function buildMicrometerDom(shadow: ShadowRoot): MicrometerElements {
  const root = document.createElement('div');
  root.className = 'micrometer-root';
  shadow.appendChild(root);

  // ── DOM 结构（与原始 HTML 完全一致）──
  root.innerHTML = `
    <p class="pan-hint" data-instrument-pan="true">左右滑查看目镜与读数刻度</p>
    <div class="micrometer-system">
      <div class="case">
        <div class="lens-outer-ring">
          <div class="lens-inner-ring">
            <div class="lens-view" id="lens-view"></div>
            <div class="crosshair-system" id="crosshair-system">
              <div class="crosshair-v"></div>
              <div class="crosshair-h"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="sleeve-container">
        <div class="baseline"></div>
        <div class="sleeve-scales" id="sleeve-scales"></div>
      </div>
      <div class="thimble-group" id="thimble-group">
        <div class="thimble-bevel">
          <div class="thimble-scales-strip" id="thimble-strip"></div>
        </div>
        <div class="thimble-body"></div>
        <div class="ratchet"></div>
      </div>
    </div>
    <div class="dashboard">
      <div class="readout" id="readout-display">0.000 mm</div>
      <div class="hint" id="hint-text"></div>
    </div>
  `;

  const qs = <T extends HTMLElement>(id: string) =>
    shadow.getElementById(id) as T;

  return {
    root,
    sleeveContainer: root.querySelector('.sleeve-container') as HTMLDivElement,
    sleeveScales: qs<HTMLDivElement>('sleeve-scales'),
    thimbleStrip: qs<HTMLDivElement>('thimble-strip'),
    thimbleGroup: qs<HTMLDivElement>('thimble-group'),
    crosshairSystem: qs<HTMLDivElement>('crosshair-system'),
    lensView: qs<HTMLDivElement>('lens-view'),
    readoutDisplay: shadow.getElementById(
      'readout-display'
    ) as HTMLDivElement | null,
    hintEl: qs<HTMLDivElement>('hint-text'),
    caseEl: root.querySelector('.case') as HTMLDivElement,
    systemEl: root.querySelector('.micrometer-system') as HTMLDivElement
  };
}
