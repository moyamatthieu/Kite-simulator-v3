/**
 * SimulationUI.ts - Interface simulation (copie pour V10)
 */

import { UIManager, PanelConfig } from './UIManager.js';

export class SimulationUI {
  private uiManager: UIManager;
  private updateCallbacks: Map<string, () => void> = new Map();

  constructor(container: HTMLElement) {
    this.uiManager = new UIManager(container);
    this.initializePanels();
    this.setupEventListeners();
  }

  private initializePanels(): void {
    this.createVersionPanel();
    this.createSystemStatusPanel();
    this.createWindControlsPanel();
    this.createSimulationControlsPanel();
    this.createInfoPanel();
    this.createDebugPanel();
    this.createModeSelector();
  }

  private createVersionPanel(): void {
    const config: PanelConfig = {
      id: 'version-panel', title: '🏷️ Version du simulateur', width: 400, height: 120,
      position: 'bottom-left', priority: 10, collapsible: true,
      content: `
        <div style="color: #667eea; line-height: 1.6;">
          <div><strong>SimulationV10</strong> - Architecture modulaire (système, pilote, barre, lignes)</div>
          <div><strong>Moteur:</strong> Three.js r160 + Vite</div>
          <div><strong>UI:</strong> Panneaux auto‑organisés, sans superpositions</div>
          <div><strong>Monde:</strong> Sol vert, ciel, lumières réalistes</div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private createSystemStatusPanel(): void {
    const config: PanelConfig = {
      id: 'system-status', title: '📊 État du système', width: 400, height: 180,
      position: 'bottom-left', priority: 9,
      content: '<div id="periodic-log" style="color: #00ff88; font-family: monospace; font-size: 11px;">En attente...</div>'
    };
    this.uiManager.createPanel(config);
  }

  private createWindControlsPanel(): void {
    const el = document.createElement('div');
    el.innerHTML = `
      <div class="wind-control" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:6px;font-weight:600;color:#667eea;">Vitesse du vent</label>
        <input type="range" id="wind-speed" min="0" max="50" value="12" step="1" style="width:100%;margin-bottom:4px;">
        <span id="wind-speed-value" style="color:#aaa;font-size:11px;">12 km/h</span>
      </div>
      <div class="wind-control" style="margin-bottom: 12px;">
        <label style="display:block;margin-bottom:6px;font-weight:600;color:#667eea;">Direction</label>
        <input type="range" id="wind-direction" min="0" max="360" value="0" style="width:100%;margin-bottom:4px;">
        <span id="wind-direction-value" style="color:#aaa;font-size:11px;">0°</span>
      </div>
      <div class="wind-control" style="margin-bottom: 0;">
        <label style="display:block;margin-bottom:6px;font-weight:600;color:#667eea;">Turbulence</label>
        <input type="range" id="wind-turbulence" min="0" max="100" value="5" step="1" style="width:100%;margin-bottom:4px;">
        <span id="wind-turbulence-value" style="color:#aaa;font-size:11px;">5%</span>
      </div>
      <div class="wind-control" style="margin-top: 12px;">
        <label style="display:block;margin-bottom:6px;font-weight:600;color:#667eea;">Longueur des lignes</label>
        <input type="range" id="line-length" min="5" max="50" value="15" step="1" style="width:100%;margin-bottom:4px;">
        <span id="line-length-value" style="color:#aaa;font-size:11px;">15m</span>
      </div>
    `;
    const config: PanelConfig = { id: 'wind-controls', title: '🌬️ Paramètres du vent', width: 280, height: 300, position: 'top-left', priority: 9, content: el };
    this.uiManager.createPanel(config);
  }

  private createSimulationControlsPanel(): void {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;">
        <button id="reset-sim" style="padding:12px 20px;background:linear-gradient(135deg,#ff6b6b,#ee5a52);border:none;color:white;border-radius:8px;cursor:pointer;font-weight:600;">🔄 Reset</button>
        <button id="play-pause" style="padding:12px 20px;background:linear-gradient(135deg,#51cf66,#47b35b);border:none;color:white;border-radius:8px;cursor:pointer;font-weight:600;">▶️ Lancer</button>
        <button id="debug-physics" style="padding:12px 20px;background:linear-gradient(135deg,#667eea,#764ba2);border:none;color:white;border-radius:8px;cursor:pointer;font-weight:600;">🔍 Debug OFF</button>
      </div>`;
    const config: PanelConfig = { id: 'sim-controls', title: '🎮 Contrôles', width: 220, height: 200, position: 'top-right', priority: 10, content: el };
    this.uiManager.createPanel(config);
  }

  private createInfoPanel(): void {
    const config: PanelConfig = {
      id: 'sim-info', title: '📈 Informations de simulation', width: 280, height: 160,
      position: 'top-right', priority: 9,
      content: `
        <div style="line-height:1.8;color:#fff;">
          <div><strong>Cerf-volant:</strong> <span id="kite-model">Delta V10</span></div>
          <div><strong>Vent:</strong> <span id="wind-speed-display">12</span> km/h</div>
          <div><strong>FPS:</strong> <span id="fps">60</span></div>
          <div><strong>Physique:</strong> <span id="physics-status" style="color:#51cf66;">Active</span></div>
          <div><strong>Mode:</strong> <span style="color:#667eea;">Simulation Avancée</span></div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private createDebugPanel(): void {
    const config: PanelConfig = {
      id: 'debug-panel', title: '🔬 Debug Physique', width: 320, height: 140,
      position: 'top-right', priority: 8,
      content: `
        <div style="line-height:1.6;">
          <div style="margin-bottom:8px;">
            <span>Forces: <span id="force-display" style="color:#51cf66;">0</span>N</span> |
            <span>Tension: <span id="tension-display" style="color:#ff9f43;">0</span>N</span>
          </div>
          <div style="margin-bottom:8px;">
            <span>Altitude: <span id="altitude-display" style="color:#667eea;">0</span>m</span> |
            <span>Vitesse air: <span id="airspeed-display" style="color:#00e0ff;">0</span>m/s</span> |
            <span>AoA: <span id="aoa-display" style="color:#ffaaff;">0</span>°</span>
          </div>
          <div style="margin-bottom:8px;">
            <span>L: <span id="ltension-display" style="color:#1e90ff;">0</span>N</span> |
            <span>R: <span id="rtension-display" style="color:#ff5555;">0</span>N</span>
          </div>
          <div style="font-size:11px;opacity:.9;">
            <span style="color:#51cf66;">● Vitesse</span> | <span style="color:#667eea;">● Portance</span> | <span style="color:#ff6b6b;">● Traînée</span>
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
    const panel = this.uiManager.getPanel('debug-panel'); if (panel) panel.element.style.display = 'none';
  }

  private createModeSelector(): void {
    const selector = document.createElement('div');
    selector.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;">
        <label style="color:#aaa;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;">MODE:</label>
        <button id="mode-cao" style="padding:10px 18px;background:#444;border:2px solid transparent;color:white;border-radius:6px;cursor:pointer;font-size:13px;min-width:80px;">CAO</button>
        <button id="mode-simulation" style="padding:10px 18px;background:#667eea;border:2px solid #764ba2;color:white;border-radius:6px;cursor:pointer;font-size:13px;min-width:80px;box-shadow:0 0 10px rgba(102,126,234,.5);">Simulation</button>
      </div>`;
    const config: PanelConfig = { id: 'mode-selector', title: '', width: 300, height: 50, position: 'top-left', priority: 10, content: selector, className: 'no-header' };
    const panel = this.uiManager.createPanel(config);
    const header = panel.element.querySelector('.ui-panel-header') as HTMLElement; if (header) header.style.display = 'none';
    const content = panel.element.querySelector('.ui-panel-content') as HTMLElement; if (content) { content.style.height = '100%'; content.style.display = 'flex'; content.style.alignItems = 'center'; content.style.justifyContent = 'center'; }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.uiManager.resize());
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'mode-cao') {
        document.body.style.transition = 'opacity .3s';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = '/'; }, 300);
      }
    });
  }

  updatePanel(panelId: string, content: string | HTMLElement): void {
    this.uiManager.updatePanelContent(panelId, content);
  }
  toggleDebugPanel(show: boolean): void { const p = this.uiManager.getPanel('debug-panel'); if (p) { p.element.style.display = show ? 'block' : 'none'; this.uiManager.resize(); } }
  updateRealTimeValues(data: { fps?: number; windSpeed?: number; force?: number; tension?: number; altitude?: number; physicsStatus?: string; airspeed?: number; aoa?: number; ltension?: number; rtension?: number; }): void {
    if (data.fps !== undefined) { const el = document.getElementById('fps'); if (el) el.textContent = String(data.fps); }
    if (data.windSpeed !== undefined) { const el = document.getElementById('wind-speed-display'); if (el) el.textContent = String(data.windSpeed); }
    if (data.force !== undefined) { const el = document.getElementById('force-display'); if (el) el.textContent = String(Math.round(data.force)); }
    if (data.tension !== undefined) { const el = document.getElementById('tension-display'); if (el) el.textContent = String(Math.round(data.tension)); }
    if (data.altitude !== undefined) { const el = document.getElementById('altitude-display'); if (el) el.textContent = data.altitude.toFixed(1); }
    if (data.physicsStatus !== undefined) { const el = document.getElementById('physics-status'); if (el) { el.textContent = data.physicsStatus; el.setAttribute('style', `color:${data.physicsStatus==='Active'?'#51cf66':'#ff6b6b'}`); } }
  }
}
