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
    this.createPerformancePanel();
    this.createKeyboardShortcutsPanel();
  }

  private createVersionPanel(): void {
    const config: PanelConfig = {
      id: 'version-panel', title: '🏷️ Version du simulateur', width: 420, height: 140,
      position: 'bottom-left', priority: 10, collapsible: true,
      content: `
        <div style="background: linear-gradient(135deg, rgba(102,126,234,0.1), rgba(118,75,162,0.1)); border-radius: 8px; padding: 12px; border: 1px solid rgba(102,126,234,0.2);">
          <div style="color: #667eea; line-height: 1.8; font-size: 13px;">
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
              <span style="background: linear-gradient(90deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: 700; font-size: 16px;">SimulationV10</span>
              <span style="margin-left: 8px; background: rgba(102,126,234,0.2); padding: 2px 8px; border-radius: 12px; font-size: 10px; color: #a0aec0;">BETA</span>
            </div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; font-size: 12px;">
              <span style="color: #a0aec0;">🔧 Moteur:</span><span>Three.js r160 + Vite</span>
              <span style="color: #a0aec0;">🎨 UI:</span><span>Panneaux intelligents avec auto-organisation</span>
              <span style="color: #a0aec0;">🌍 Monde:</span><span>Environnement réaliste avec physique avancée</span>
            </div>
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private createSystemStatusPanel(): void {
    const config: PanelConfig = {
      id: 'system-status', title: '📊 État du système', width: 420, height: 200,
      position: 'bottom-left', priority: 9,
      content: `
        <div style="background: rgba(0,20,20,0.5); border-radius: 8px; padding: 12px; border: 1px solid rgba(0,255,136,0.2);">
          <div style="margin-bottom: 8px; font-size: 11px; color: #00ff88; opacity: 0.7;">CONSOLE LOG:</div>
          <div id="periodic-log" style="color: #00ff88; font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 11px; line-height: 1.4; height: 120px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px; border: 1px solid rgba(0,255,136,0.1);">
            <div style="color: #667eea; opacity: 0.8;">🟢 Système initialisé</div>
            <div style="color: #00ff88;">⚡ En attente des données de simulation...</div>
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private createWindControlsPanel(): void {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display: grid; gap: 16px;">
        <div class="wind-control">
          <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 600; color: #667eea;">
            <span style="display: flex; align-items: center;"><span style="margin-right: 6px;">💨</span>Vitesse du vent</span>
            <span id="wind-speed-value" style="color: #00ff88; font-size: 13px; font-weight: 700;">12 km/h</span>
          </label>
          <div style="position: relative;">
            <input type="range" id="wind-speed" min="0" max="50" value="12" step="1" 
                   style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); outline: none; -webkit-appearance: none;">
            <style>
              #wind-speed::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); cursor: pointer; box-shadow: 0 2px 6px rgba(102,126,234,0.4); }
              #wind-speed::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); cursor: pointer; border: none; }
            </style>
          </div>
        </div>
        
        <div class="wind-control">
          <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 600; color: #667eea;">
            <span style="display: flex; align-items: center;"><span style="margin-right: 6px;">🧭</span>Direction</span>
            <span id="wind-direction-value" style="color: #00ff88; font-size: 13px; font-weight: 700;">0°</span>
          </label>
          <div style="position: relative;">
            <input type="range" id="wind-direction" min="0" max="360" value="0" 
                   style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); outline: none; -webkit-appearance: none;">
          </div>
        </div>
        
        <div class="wind-control">
          <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 600; color: #667eea;">
            <span style="display: flex; align-items: center;"><span style="margin-right: 6px;">🌪️</span>Turbulence</span>
            <span id="wind-turbulence-value" style="color: #00ff88; font-size: 13px; font-weight: 700;">5%</span>
          </label>
          <div style="position: relative;">
            <input type="range" id="wind-turbulence" min="0" max="100" value="5" step="1" 
                   style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); outline: none; -webkit-appearance: none;">
          </div>
        </div>
        
        <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(102,126,234,0.3), transparent); margin: 8px 0;"></div>
        
        <div class="wind-control">
          <label style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: 600; color: #667eea;">
            <span style="display: flex; align-items: center;"><span style="margin-right: 6px;">📏</span>Longueur des lignes</span>
            <span id="line-length-value" style="color: #00ff88; font-size: 13px; font-weight: 700;">15m</span>
          </label>
          <div style="position: relative;">
            <input type="range" id="line-length" min="5" max="50" value="15" step="1" 
                   style="width: 100%; height: 6px; border-radius: 3px; background: linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); outline: none; -webkit-appearance: none;">
          </div>
        </div>
      </div>
    `;
    const config: PanelConfig = { 
      id: 'wind-controls', 
      title: '🌬️ Paramètres du vent', 
      width: 320, 
      height: 380, 
      position: 'top-left', 
      priority: 9, 
      content: el 
    };
    this.uiManager.createPanel(config);
  }

  private createSimulationControlsPanel(): void {
    const el = document.createElement('div');
    el.innerHTML = `
      <div style="display: grid; gap: 12px;">
        <button id="reset-sim" style="
          padding: 14px 20px; 
          background: linear-gradient(135deg, #ff6b6b, #ee5a52); 
          border: none; 
          color: white; 
          border-radius: 10px; 
          cursor: pointer; 
          font-weight: 600; 
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        " onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(255, 107, 107, 0.4)'" 
           onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 12px rgba(255, 107, 107, 0.3)'">
          <span style="font-size: 16px;">🔄</span> 
          <span>Reset Simulation</span>
        </button>
        
        <button id="play-pause" style="
          padding: 14px 20px; 
          background: linear-gradient(135deg, #51cf66, #47b35b); 
          border: none; 
          color: white; 
          border-radius: 10px; 
          cursor: pointer; 
          font-weight: 600; 
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(81, 207, 102, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        " onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(81, 207, 102, 0.4)'" 
           onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 12px rgba(81, 207, 102, 0.3)'">
          <span style="font-size: 16px;">▶️</span> 
          <span>Lancer</span>
        </button>
        
        <button id="debug-physics" style="
          padding: 14px 20px; 
          background: linear-gradient(135deg, #667eea, #764ba2); 
          border: none; 
          color: white; 
          border-radius: 10px; 
          cursor: pointer; 
          font-weight: 600; 
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        " onmouseover="this.style.transform='translateY(-2px) scale(1.02)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.4)'" 
           onmouseout="this.style.transform='translateY(0) scale(1)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.3)'">
          <span style="font-size: 16px;">🔍</span> 
          <span>Debug OFF</span>
        </button>
      </div>`;
    const config: PanelConfig = { 
      id: 'sim-controls', 
      title: '🎮 Contrôles de simulation', 
      width: 250, 
      height: 220, 
      position: 'top-right', 
      priority: 10, 
      content: el 
    };
    this.uiManager.createPanel(config);
  }

  private createInfoPanel(): void {
    const config: PanelConfig = {
      id: 'sim-info', title: '📈 Informations de simulation', width: 320, height: 180,
      position: 'top-right', priority: 9,
      content: `
        <div style="display: grid; gap: 12px;">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; align-items: center;">
            <div style="display: flex; align-items: center; color: #a0aec0; font-size: 12px;">
              <span style="margin-right: 6px;">🪁</span>Cerf-volant:
            </div>
            <span id="kite-model" style="color: #667eea; font-weight: 600;">Delta V10</span>
            
            <div style="display: flex; align-items: center; color: #a0aec0; font-size: 12px;">
              <span style="margin-right: 6px;">💨</span>Vent:
            </div>
            <span style="color: #00ff88; font-weight: 600;"><span id="wind-speed-display">12</span> km/h</span>
            
            <div style="display: flex; align-items: center; color: #a0aec0; font-size: 12px;">
              <span style="margin-right: 6px;">⚡</span>FPS:
            </div>
            <span style="color: #ff9f43; font-weight: 600;" id="fps">60</span>
            
            <div style="display: flex; align-items: center; color: #a0aec0; font-size: 12px;">
              <span style="margin-right: 6px;">🔬</span>Physique:
            </div>
            <span id="physics-status" style="color: #51cf66; font-weight: 600;">Active</span>
            
            <div style="display: flex; align-items: center; color: #a0aec0; font-size: 12px;">
              <span style="margin-right: 6px;">🎯</span>Mode:
            </div>
            <span style="color: #667eea; font-weight: 600;">Simulation Avancée</span>
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private createDebugPanel(): void {
    const config: PanelConfig = {
      id: 'debug-panel', title: '🔬 Debug Physique', width: 380, height: 160,
      position: 'top-right', priority: 8,
      content: `
        <div style="background: rgba(20,20,40,0.5); border-radius: 8px; padding: 12px; border: 1px solid rgba(102,126,234,0.2);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px;">
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #a0aec0;">⚡ Forces:</span>
                <span id="force-display" style="color: #51cf66; font-weight: 600;">0N</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #a0aec0;">🎯 Tension:</span>
                <span id="tension-display" style="color: #ff9f43; font-weight: 600;">0N</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #a0aec0;">📏 Altitude:</span>
                <span id="altitude-display" style="color: #667eea; font-weight: 600;">0m</span>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #a0aec0;">💨 Vitesse air:</span>
                <span id="airspeed-display" style="color: #00e0ff; font-weight: 600;">0m/s</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #a0aec0;">📐 AoA:</span>
                <span id="aoa-display" style="color: #ffaaff; font-weight: 600;">0°</span>
              </div>
              <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: #1e90ff; font-size: 11px;">L: <span id="ltension-display" style="font-weight: 600;">0</span>N</span>
                <span style="color: #ff5555; font-size: 11px;">R: <span id="rtension-display" style="font-weight: 600;">0</span>N</span>
              </div>
            </div>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(102,126,234,0.1); font-size: 10px; display: flex; gap: 12px; justify-content: center;">
            <span style="color: #51cf66;">● Vitesse</span>
            <span style="color: #667eea;">● Portance</span>
            <span style="color: #ff6b6b;">● Traînée</span>
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
    const panel = this.uiManager.getPanel('debug-panel'); 
    if (panel) panel.element.style.display = 'none';
  }

  private createModeSelector(): void {
    const selector = document.createElement('div');
    selector.innerHTML = `
      <div style="display: flex; gap: 16px; align-items: center; background: rgba(20,20,40,0.6); padding: 12px; border-radius: 12px; border: 1px solid rgba(102,126,234,0.2);">
        <label style="color: #a0aec0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; display: flex; align-items: center;">
          <span style="margin-right: 8px;">🎛️</span>MODE:
        </label>
        <button id="mode-cao" style="
          padding: 10px 20px; 
          background: linear-gradient(135deg, #444, #555); 
          border: 2px solid transparent; 
          color: #a0aec0; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 13px; 
          font-weight: 600;
          min-width: 90px;
          transition: all 0.3s ease;
        " onmouseover="this.style.background='linear-gradient(135deg, #555, #666)'; this.style.color='white'" 
           onmouseout="this.style.background='linear-gradient(135deg, #444, #555)'; this.style.color='#a0aec0'">
          CAO
        </button>
        <button id="mode-simulation" style="
          padding: 10px 20px; 
          background: linear-gradient(135deg, #667eea, #764ba2); 
          border: 2px solid #667eea; 
          color: white; 
          border-radius: 8px; 
          cursor: pointer; 
          font-size: 13px; 
          font-weight: 600;
          min-width: 90px; 
          box-shadow: 0 0 15px rgba(102,126,234,0.4);
          transition: all 0.3s ease;
        " onmouseover="this.style.boxShadow='0 0 20px rgba(102,126,234,0.6)'; this.style.transform='scale(1.05)'" 
           onmouseout="this.style.boxShadow='0 0 15px rgba(102,126,234,0.4)'; this.style.transform='scale(1)'">
          Simulation
        </button>
      </div>`;
    const config: PanelConfig = { 
      id: 'mode-selector', 
      title: '', 
      width: 340, 
      height: 60, 
      position: 'top-left', 
      priority: 10, 
      content: selector, 
      className: 'no-header' 
    };
    const panel = this.uiManager.createPanel(config);
    const header = panel.element.querySelector('.ui-panel-header') as HTMLElement; 
    if (header) header.style.display = 'none';
    const content = panel.element.querySelector('.ui-panel-content') as HTMLElement; 
    if (content) { 
      content.style.height = '100%'; 
      content.style.display = 'flex'; 
      content.style.alignItems = 'center'; 
      content.style.justifyContent = 'center'; 
      content.style.padding = '8px';
    }
  }

  private createPerformancePanel(): void {
    const config: PanelConfig = {
      id: 'performance-panel', title: '📊 Performance temps réel', width: 300, height: 200,
      position: 'bottom-right', priority: 8, collapsible: true,
      content: `
        <div style="display: grid; gap: 12px;">
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; text-align: center;">
            <div style="background: rgba(81,207,102,0.1); border: 1px solid rgba(81,207,102,0.3); border-radius: 6px; padding: 8px;">
              <div style="color: #51cf66; font-size: 18px; font-weight: 700;" id="fps-display">60</div>
              <div style="color: #a0aec0; font-size: 10px;">FPS</div>
            </div>
            <div style="background: rgba(255,159,67,0.1); border: 1px solid rgba(255,159,67,0.3); border-radius: 6px; padding: 8px;">
              <div style="color: #ff9f43; font-size: 18px; font-weight: 700;" id="frame-time">16.7</div>
              <div style="color: #a0aec0; font-size: 10px;">MS/FRAME</div>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; font-size: 11px;">
            <div style="text-align: center;">
              <div style="color: #667eea; font-weight: 600;" id="triangles">0</div>
              <div style="color: #a0aec0;">Triangles</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #ff6b6b; font-weight: 600;" id="draw-calls">0</div>
              <div style="color: #a0aec0;">Draw Calls</div>
            </div>
            <div style="text-align: center;">
              <div style="color: #00e0ff; font-weight: 600;" id="memory">0</div>
              <div style="color: #a0aec0;">MB RAM</div>
            </div>
          </div>
          <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(102,126,234,0.3), transparent);"></div>
          <div style="font-size: 10px; color: #a0aec0; text-align: center;">
            Graphiques de performance disponibles en mode debug
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private createKeyboardShortcutsPanel(): void {
    const config: PanelConfig = {
      id: 'shortcuts-panel', title: '⌨️ Raccourcis clavier', width: 280, height: 240,
      position: 'bottom-right', priority: 7, collapsible: true,
      content: `
        <div style="display: grid; gap: 8px; font-size: 11px;">
          <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 12px; align-items: center;">
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">ESPACE</kbd>
            <span style="color: #a0aec0;">Play/Pause simulation</span>
            
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">R</kbd>
            <span style="color: #a0aec0;">Reset simulation</span>
            
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">D</kbd>
            <span style="color: #a0aec0;">Toggle debug mode</span>
            
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">H</kbd>
            <span style="color: #a0aec0;">Hide/Show UI</span>
            
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">F</kbd>
            <span style="color: #a0aec0;">Toggle fullscreen</span>
            
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">↑/↓</kbd>
            <span style="color: #a0aec0;">Ajuster vitesse vent</span>
            
            <kbd style="background: rgba(102,126,234,0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace; border: 1px solid rgba(102,126,234,0.4);">←/→</kbd>
            <span style="color: #a0aec0;">Ajuster direction vent</span>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(102,126,234,0.2); font-size: 10px; color: #667eea; text-align: center;">
            Survolez les contrôles pour plus d'informations
          </div>
        </div>`
    };
    this.uiManager.createPanel(config);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.uiManager.resize());
    
    // Gestionnaires pour les sliders avec animations
    this.setupSliderEvents();
    
    // Gestionnaires pour les raccourcis clavier
    this.setupKeyboardShortcuts();
    
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.id === 'mode-cao') {
        document.body.style.transition = 'opacity .3s';
        document.body.style.opacity = '0';
        setTimeout(() => { window.location.href = '/'; }, 300);
      }
    });
  }

  private setupKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e) => {
      // Ignorer si on est dans un champ de saisie
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'space':
          e.preventDefault();
          document.getElementById('play-pause')?.click();
          this.showNotification('Simulation play/pause', 'info');
          break;
        case 'r':
          e.preventDefault();
          document.getElementById('reset-sim')?.click();
          this.showNotification('Simulation réinitialisée', 'success');
          break;
        case 'd':
          e.preventDefault();
          document.getElementById('debug-physics')?.click();
          this.showNotification('Mode debug basculé', 'info');
          break;
        case 'h':
          e.preventDefault();
          this.toggleUIVisibility();
          break;
        case 'f':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'arrowup':
          e.preventDefault();
          this.adjustWindSpeed(1);
          break;
        case 'arrowdown':
          e.preventDefault();
          this.adjustWindSpeed(-1);
          break;
        case 'arrowleft':
          e.preventDefault();
          this.adjustWindDirection(-5);
          break;
        case 'arrowright':
          e.preventDefault();
          this.adjustWindDirection(5);
          break;
      }
    });
  }

  private toggleUIVisibility(): void {
    const panels = document.querySelectorAll('.ui-panel');
    const isVisible = !document.body.hasAttribute('data-ui-hidden');
    
    panels.forEach(panel => {
      (panel as HTMLElement).style.transition = 'all 0.3s ease';
      (panel as HTMLElement).style.opacity = isVisible ? '0' : '1';
      (panel as HTMLElement).style.pointerEvents = isVisible ? 'none' : 'auto';
    });
    
    if (isVisible) {
      document.body.setAttribute('data-ui-hidden', 'true');
      this.showNotification('Interface masquée (H pour afficher)', 'info');
    } else {
      document.body.removeAttribute('data-ui-hidden');
      this.showNotification('Interface affichée', 'info');
    }
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      this.showNotification('Mode plein écran activé', 'success');
    } else {
      document.exitFullscreen();
      this.showNotification('Mode plein écran désactivé', 'info');
    }
  }

  private adjustWindSpeed(delta: number): void {
    const slider = document.getElementById('wind-speed') as HTMLInputElement;
    if (slider) {
      const newValue = Math.max(0, Math.min(50, parseInt(slider.value) + delta));
      slider.value = String(newValue);
      slider.dispatchEvent(new Event('input'));
      this.showNotification(`Vitesse du vent: ${newValue} km/h`, 'info');
    }
  }

  private adjustWindDirection(delta: number): void {
    const slider = document.getElementById('wind-direction') as HTMLInputElement;
    if (slider) {
      let newValue = parseInt(slider.value) + delta;
      if (newValue < 0) newValue = 360 + newValue;
      if (newValue > 360) newValue = newValue - 360;
      slider.value = String(newValue);
      slider.dispatchEvent(new Event('input'));
      this.showNotification(`Direction du vent: ${newValue}°`, 'info');
    }
  }

  private setupSliderEvents(): void {
    // Gestionnaire pour le slider de vitesse du vent
    const windSpeedSlider = document.getElementById('wind-speed') as HTMLInputElement;
    const windSpeedValue = document.getElementById('wind-speed-value');
    if (windSpeedSlider && windSpeedValue) {
      windSpeedSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        windSpeedValue.textContent = `${value} km/h`;
        windSpeedValue.style.transform = 'scale(1.1)';
        windSpeedValue.style.color = '#00ff88';
        setTimeout(() => {
          windSpeedValue.style.transform = 'scale(1)';
          windSpeedValue.style.color = '#00ff88';
        }, 150);
      });
    }

    // Gestionnaire pour le slider de direction du vent
    const windDirectionSlider = document.getElementById('wind-direction') as HTMLInputElement;
    const windDirectionValue = document.getElementById('wind-direction-value');
    if (windDirectionSlider && windDirectionValue) {
      windDirectionSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        windDirectionValue.textContent = `${value}°`;
        windDirectionValue.style.transform = 'scale(1.1)';
        windDirectionValue.style.color = '#00ff88';
        setTimeout(() => {
          windDirectionValue.style.transform = 'scale(1)';
          windDirectionValue.style.color = '#00ff88';
        }, 150);
      });
    }

    // Gestionnaire pour le slider de turbulence
    const windTurbulenceSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
    const windTurbulenceValue = document.getElementById('wind-turbulence-value');
    if (windTurbulenceSlider && windTurbulenceValue) {
      windTurbulenceSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        windTurbulenceValue.textContent = `${value}%`;
        windTurbulenceValue.style.transform = 'scale(1.1)';
        windTurbulenceValue.style.color = '#00ff88';
        setTimeout(() => {
          windTurbulenceValue.style.transform = 'scale(1)';
          windTurbulenceValue.style.color = '#00ff88';
        }, 150);
      });
    }

    // Gestionnaire pour le slider de longueur des lignes
    const lineLengthSlider = document.getElementById('line-length') as HTMLInputElement;
    const lineLengthValue = document.getElementById('line-length-value');
    if (lineLengthSlider && lineLengthValue) {
      lineLengthSlider.addEventListener('input', (e) => {
        const value = (e.target as HTMLInputElement).value;
        lineLengthValue.textContent = `${value}m`;
        lineLengthValue.style.transform = 'scale(1.1)';
        lineLengthValue.style.color = '#00ff88';
        setTimeout(() => {
          lineLengthValue.style.transform = 'scale(1)';
          lineLengthValue.style.color = '#00ff88';
        }, 150);
      });
    }
  }

  updatePanel(panelId: string, content: string | HTMLElement): void {
    this.uiManager.updatePanelContent(panelId, content);
  }
  toggleDebugPanel(show: boolean): void { const p = this.uiManager.getPanel('debug-panel'); if (p) { p.element.style.display = show ? 'block' : 'none'; this.uiManager.resize(); } }
  updateRealTimeValues(data: { fps?: number; windSpeed?: number; force?: number; tension?: number; altitude?: number; physicsStatus?: string; airspeed?: number; aoa?: number; ltension?: number; rtension?: number; }): void {
    if (data.fps !== undefined) { 
      const el = document.getElementById('fps'); 
      if (el) el.textContent = String(data.fps);
      const fpsDisplay = document.getElementById('fps-display');
      if (fpsDisplay) fpsDisplay.textContent = String(data.fps);
      const frameTime = document.getElementById('frame-time');
      if (frameTime) frameTime.textContent = (1000 / data.fps).toFixed(1);
    }
    if (data.windSpeed !== undefined) { const el = document.getElementById('wind-speed-display'); if (el) el.textContent = String(data.windSpeed); }
    if (data.force !== undefined) { const el = document.getElementById('force-display'); if (el) el.textContent = String(Math.round(data.force)); }
    if (data.tension !== undefined) { const el = document.getElementById('tension-display'); if (el) el.textContent = String(Math.round(data.tension)); }
    if (data.altitude !== undefined) { const el = document.getElementById('altitude-display'); if (el) el.textContent = data.altitude.toFixed(1); }
    if (data.physicsStatus !== undefined) { const el = document.getElementById('physics-status'); if (el) { el.textContent = data.physicsStatus; el.setAttribute('style', `color:${data.physicsStatus==='Active'?'#51cf66':'#ff6b6b'}; font-weight: 600;`); } }
  }

  updatePerformanceData(data: { triangles?: number; drawCalls?: number; memoryMB?: number }): void {
    if (data.triangles !== undefined) {
      const el = document.getElementById('triangles');
      if (el) el.textContent = data.triangles.toLocaleString();
    }
    if (data.drawCalls !== undefined) {
      const el = document.getElementById('draw-calls');
      if (el) el.textContent = String(data.drawCalls);
    }
    if (data.memoryMB !== undefined) {
      const el = document.getElementById('memory');
      if (el) el.textContent = data.memoryMB.toFixed(1);
    }
  }

  showNotification(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    const colors = {
      success: { bg: 'rgba(81,207,102,0.9)', border: '#51cf66', icon: '✅' },
      warning: { bg: 'rgba(255,159,67,0.9)', border: '#ff9f43', icon: '⚠️' },
      error: { bg: 'rgba(255,107,107,0.9)', border: '#ff6b6b', icon: '❌' },
      info: { bg: 'rgba(102,126,234,0.9)', border: '#667eea', icon: 'ℹ️' }
    };
    
    const color = colors[type];
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      border: 2px solid ${color.border};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      transform: translateX(400px);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 300px;
    `;
    
    notification.innerHTML = `
      <span style="font-size: 16px;">${color.icon}</span>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animation d'entrée
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Animation de sortie
    setTimeout(() => {
      notification.style.transform = 'translateX(400px)';
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 400);
    }, 3000);
  }
}
