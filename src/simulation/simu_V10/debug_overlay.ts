/**
 * debug_overlay.ts — Interface de debug avancée inspirée de V9
 * Affiche des informations détaillées en overlay
 */

export class DebugOverlay {
    private overlay!: HTMLElement;
    private isVisible = false;
    private metrics = {
        fps: 60,
        altitude: 0,
        windSpeed: 0,
        apparentWind: 0,
        aoa: 0,
        stallFactor: 1.0,
        lift: 0,
        drag: 0,
        tension: 0,
        force: 0,
        oscillations: {
            frequency: 0,
            amplitude: 0,
            stability: 1.0,
            isWobbling: false,
            severity: 0
        }
    };

    constructor() {
        this.createOverlay();
    }

    private createOverlay(): void {
        this.overlay = document.createElement('div');
        this.overlay.id = 'debug-overlay';
        this.overlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.9);
      color: #00ff88;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #333;
      z-index: 10000;
      max-width: 400px;
      line-height: 1.4;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      display: none;
    `;

        document.body.appendChild(this.overlay);
        this.updateDisplay();
    }

    /**
     * Met à jour les métriques affichées
     */
    updateMetrics(metrics: Partial<typeof this.metrics>): void {
        Object.assign(this.metrics, metrics);
        this.updateDisplay();
    }

    /**
     * Met à jour l'affichage
     */
    private updateDisplay(): void {
        const osc = this.metrics.oscillations;

        this.overlay.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; color: #ffff00;">
        🚀 SIMULATION V10 - DEBUG MODE
      </div>

      <div style="border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
        <div><strong>Performance:</strong></div>
        <div style="margin-left: 10px;">
          FPS: <span style="color: ${this.getFpsColor()}">${this.metrics.fps}</span> |
          Altitude: <span style="color: #00aaff">${this.metrics.altitude.toFixed(1)}m</span>
        </div>
      </div>

      <div style="border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
        <div><strong>Vent & Aéro:</strong></div>
        <div style="margin-left: 10px;">
          Vent: <span style="color: #00e0ff">${this.metrics.windSpeed.toFixed(1)} m/s</span> |
          Apparent: <span style="color: #ffaa00">${this.metrics.apparentWind.toFixed(1)} m/s</span><br>
          AoA: <span style="color: ${this.getAoaColor()}">${this.metrics.aoa.toFixed(1)}°</span> |
          Stall: <span style="color: ${this.getStallColor()}">${(this.metrics.stallFactor * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div style="border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
        <div><strong>Forces:</strong></div>
        <div style="margin-left: 10px;">
          Portance: <span style="color: #0088ff">${this.metrics.lift.toFixed(1)}N</span> |
          Traînée: <span style="color: #ff4444">${this.metrics.drag.toFixed(1)}N</span><br>
          Tension: <span style="color: #ffaa00">${this.metrics.tension.toFixed(1)}N</span> |
          Total: <span style="color: #00ff88">${this.metrics.force.toFixed(1)}N</span>
        </div>
      </div>

      <div style="border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
        <div><strong>Oscillations:</strong></div>
        <div style="margin-left: 10px;">
          Fréq: <span style="color: #ffff00">${osc.frequency.toFixed(1)}Hz</span> |
          Ampl: <span style="color: #ffaa00">${osc.amplitude.toFixed(2)}m</span><br>
          Stabilité: <span style="color: ${this.getStabilityColor()}">${(osc.stability * 100).toFixed(0)}%</span> |
          État: <span style="color: ${osc.isWobbling ? '#ff6b6b' : '#00ff88'}">${osc.isWobbling ? 'Frétillements' : 'Stable'}</span>
        </div>
      </div>

      <div style="font-size: 10px; color: #888; margin-top: 8px;">
        🔍 Mode debug actif | Appuyez sur 'D' pour masquer
      </div>
    `;
    }

    private getFpsColor(): string {
        if (this.metrics.fps >= 55) return '#00ff88';
        if (this.metrics.fps >= 30) return '#ffff00';
        return '#ff4444';
    }

    private getAoaColor(): string {
        const aoa = Math.abs(this.metrics.aoa);
        if (aoa > 15) return '#ff6b6b';
        if (aoa > 10) return '#ffff00';
        return '#00ff88';
    }

    private getStallColor(): string {
        if (this.metrics.stallFactor < 0.8) return '#ff6b6b';
        if (this.metrics.stallFactor < 0.95) return '#ffff00';
        return '#00ff88';
    }

    private getStabilityColor(): string {
        if (this.metrics.oscillations.stability < 0.5) return '#ff6b6b';
        if (this.metrics.oscillations.stability < 0.7) return '#ffff00';
        return '#00ff88';
    }

    /**
     * Affiche ou masque l'overlay
     */
    setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.overlay.style.display = visible ? 'block' : 'none';
    }

    /**
     * Bascule la visibilité
     */
    toggle(): void {
        this.setVisible(!this.isVisible);
    }

    /**
     * Nettoie l'overlay
     */
    dispose(): void {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
    }
}

/**
 * Gestionnaire de légendes pour les vecteurs de debug
 */
export class VectorLegend {
    private legend!: HTMLElement;
    private isVisible = false;

    constructor() {
        this.createLegend();
    }

    private createLegend(): void {
        this.legend = document.createElement('div');
        this.legend.id = 'vector-legend';
        this.legend.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 15px;
      border-radius: 10px;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.4;
      z-index: 10000;
      max-width: 280px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
      display: none;
    `;

        this.legend.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 10px; text-align: center; color: #ffff00;">
        🎯 LÉGENDE DES VECTEURS
      </div>

      <div style="margin-bottom: 8px;">
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #ffffff; margin-right: 8px;"></div>
          <span>Vent global</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #00e0ff; margin-right: 8px;"></div>
          <span>Vent apparent</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #00ff00; margin-right: 8px;"></div>
          <span>Vitesse kite</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #0088ff; margin-right: 8px;"></div>
          <span>Portance</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #ff0000; margin-right: 8px;"></div>
          <span>Traînée</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #1e90ff; margin-right: 8px;"></div>
          <span>Tension gauche</span>
        </div>
        <div style="display: flex; align-items: center; margin-bottom: 4px;">
          <div style="width: 20px; height: 3px; background: #ff5555; margin-right: 8px;"></div>
          <span>Tension droite</span>
        </div>
      </div>

      <div style="border-top: 1px solid #444; padding-top: 8px; margin-top: 8px; font-size: 10px; color: #aaa;">
        💡 Plus la flèche est longue, plus la force est importante<br>
        🔴 Indicateur rouge = décrochage imminent
      </div>
    `;

        document.body.appendChild(this.legend);
    }

    setVisible(visible: boolean): void {
        this.isVisible = visible;
        this.legend.style.display = visible ? 'block' : 'none';
    }

    toggle(): void {
        this.setVisible(!this.isVisible);
    }

    dispose(): void {
        if (this.legend && this.legend.parentNode) {
            this.legend.parentNode.removeChild(this.legend);
        }
    }
}