import { getEl } from '../../core/ui.js';

export function ensureGeometryDom() {
    if (getEl('geo-a')) return;
    const tabs = document.querySelector('#rechner-toolset .conv-tabs');
    const elektrik = getEl('conv-elektrik');
    if (!tabs || !elektrik) return;

    const btn = document.createElement('button');
    btn.className = 'conv-tab-btn';
    btn.dataset.cat = 'geometrie';
    btn.textContent = '📐 Geometrie';
    const after = tabs.querySelector('[data-cat="elektrik"]');
    if (after && after.nextSibling) tabs.insertBefore(btn, after.nextSibling);
    else tabs.appendChild(btn);

    const panel = document.createElement('div');
    panel.id = 'conv-geometrie';
    panel.className = 'conv-panel';
    panel.innerHTML = `
              <p class="tool-desc" style="margin-bottom:10px;">Zwei Seiten eingeben — die dritte und die Formel rechnen live mit.</p>
              <div class="geo-layout">
                <svg class="geo-triangle" viewBox="0 0 160 120" aria-hidden="true">
                  <polygon points="20,100 140,100 20,20" fill="rgba(255,0,60,0.08)" stroke="#ff003c" stroke-width="2"/>
                  <polyline points="20,80 40,80 40,100" fill="none" stroke="#ff003c" stroke-width="1.5"/>
                  <text x="80" y="115" fill="#ff8aa8" font-size="12">a</text>
                  <text x="4" y="62" fill="#ff8aa8" font-size="12">b</text>
                  <text x="86" y="52" fill="#ff003c" font-size="12">c</text>
                </svg>
                <div class="geo-formulas">
                  <div class="geo-formula" id="geo-formula">a² + b² = c²</div>
                  <div class="geo-formula-live" id="geo-formula-used">c = √(a² + b²)</div>
                  <div class="geo-formula-live" id="geo-formula-sub">—</div>
                </div>
              </div>
              <div class="conv-row"><input type="number" id="geo-a" class="cyber-input-field conv-input" placeholder="Kathete a" step="any" inputmode="decimal"><span class="conv-unit-label">a</span></div>
              <div class="conv-row"><input type="number" id="geo-b" class="cyber-input-field conv-input" placeholder="Kathete b" step="any" inputmode="decimal"><span class="conv-unit-label">b</span></div>
              <div class="conv-row"><input type="number" id="geo-c" class="cyber-input-field conv-input" placeholder="Hypotenuse c" step="any" inputmode="decimal"><span class="conv-unit-label">c</span></div>
              <div class="geo-extra">
                <div class="geo-stat"><span>Fläche</span><strong id="geo-area">A = ½·a·b = —</strong></div>
                <div class="geo-stat"><span>Umfang</span><strong id="geo-peri">U = a+b+c = —</strong></div>
                <div class="geo-stat"><span>Höhe auf c</span><strong id="geo-height">h = (a·b)/c = —</strong></div>
              </div>
              <p class="geo-error" id="geo-error" hidden></p>
              <button id="geo-clear" class="btn secondary full-width" style="margin-top: 10px;">Clear</button>`;
    elektrik.insertAdjacentElement('afterend', panel);

    const cardP = document.querySelector('.category-card[data-sub="rechner-toolset"] .card-info p');
    if (cardP) cardP.textContent = 'Elektrik, Geometrie, Umrechner';

    if (!document.getElementById('geo-style')) {
        const style = document.createElement('style');
        style.id = 'geo-style';
        style.textContent = `
.geo-layout{display:flex;gap:12px;align-items:center;margin-bottom:12px}
.geo-triangle{width:120px;height:90px;flex-shrink:0}
.geo-formulas{flex:1;min-width:0}
.geo-formula{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:#ff003c;font-size:1.05rem;font-weight:700;letter-spacing:.02em;margin-bottom:6px}
.geo-formula-live{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--text-secondary,#b8b8c2);font-size:.78rem;white-space:pre-wrap;line-height:1.35}
.geo-extra{display:grid;gap:6px;margin:8px 0 4px}
.geo-stat{display:flex;justify-content:space-between;gap:8px;font-size:.78rem;color:var(--text-secondary,#b8b8c2)}
.geo-stat strong{color:#ff8aa8;font-weight:600;text-align:right}
.geo-error{color:#ff0044;font-size:.8rem;margin:6px 0 0}`;
        document.head.appendChild(style);
    }
}
