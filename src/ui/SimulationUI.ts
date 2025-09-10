/**
 * SimulationUI.ts - Interface utilisateur simple pour la simulation
 */

import { CONFIG, WindParams } from '@core/constants';
import { SimulationApp } from '../SimulationApp';

export class SimulationUI {
    private simulation: SimulationApp;
    private controlPanel: HTMLElement | null = null;

    constructor(simulation: SimulationApp) {
        this.simulation = simulation;
        this.createControlPanel();
    }

    private createControlPanel(): void {
        // Vérifier si déjà créé
        if (this.controlPanel) return;

        const panel = document.createElement('div');
        panel.id = 'simulation-controls';
        panel.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                background: rgba(0,0,0,0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 12px;
                z-index: 1000;
                min-width: 220px;
            ">
                <h3 style="margin: 0 0 10px 0; color: #ff6b6b;">🪁 Simulation Kite V8</h3>
                
                <div style="margin: 10px 0;">
                    <label>Vent (km/h): <span id="wind-speed-value">${CONFIG.wind.defaultSpeed}</span></label><br>
                    <input type="range" id="wind-speed" min="0" max="50" value="${CONFIG.wind.defaultSpeed}" style="width: 100%;">
                </div>
                
                <div style="margin: 10px 0;">
                    <label>Direction (°): <span id="wind-dir-value">${CONFIG.wind.defaultDirection}</span></label><br>
                    <input type="range" id="wind-dir" min="0" max="360" value="${CONFIG.wind.defaultDirection}" style="width: 100%;">
                </div>
                
                <div style="margin: 10px 0;">
                    <label>Turbulence (%): <span id="turb-value">${CONFIG.wind.defaultTurbulence}</span></label><br>
                    <input type="range" id="turbulence" min="0" max="20" value="${CONFIG.wind.defaultTurbulence}" style="width: 100%;">
                </div>
                
                <div style="margin: 15px 0; text-align: center;">
                    <button id="play-pause-btn" style="padding: 8px 16px; margin: 2px; cursor: pointer;">
                        ⏸️ Pause
                    </button>
                    <button id="reset-sim-btn" style="padding: 8px 16px; margin: 2px; cursor: pointer;">
                        🔄 Reset
                    </button>
                </div>
                
                <div id="debug-info" style="font-size: 10px; margin-top: 10px; color: #ccc;">
                    <div>Frame: <span id="frame-count">0</span></div>
                    <div>Position: <span id="kite-pos">-</span></div>
                    <div>Vitesse: <span id="kite-vel">-</span> m/s</div>
                    <div>Contrôles: ← → ou Q/A/D</div>
                </div>
                
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #555; font-size: 10px;">
                    <div>🎯 Physique émergente pure</div>
                    <div>🔧 Architecture V8-style</div>
                    <div>🪁 Cerf-volant Kite.ts</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(panel);
        this.controlPanel = panel;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        // Contrôles de vent
        const windSpeedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const windSpeedValue = document.getElementById('wind-speed-value')!;
        if (windSpeedSlider && windSpeedValue) {
            windSpeedSlider.oninput = () => {
                const speed = parseFloat(windSpeedSlider.value);
                this.simulation.setWindParams({ speed });
                windSpeedValue.textContent = speed.toString();
            };
        }

        const windDirSlider = document.getElementById('wind-dir') as HTMLInputElement;
        const windDirValue = document.getElementById('wind-dir-value')!;
        if (windDirSlider && windDirValue) {
            windDirSlider.oninput = () => {
                const direction = parseFloat(windDirSlider.value);
                this.simulation.setWindParams({ direction });
                windDirValue.textContent = direction.toString();
            };
        }

        const turbulenceSlider = document.getElementById('turbulence') as HTMLInputElement;
        const turbValue = document.getElementById('turb-value')!;
        if (turbulenceSlider && turbValue) {
            turbulenceSlider.oninput = () => {
                const turbulence = parseFloat(turbulenceSlider.value);
                this.simulation.setWindParams({ turbulence });
                turbValue.textContent = turbulence.toString();
            };
        }

        // Boutons de contrôle
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.onclick = () => {
                this.simulation.togglePlayPause();
                // L'état sera mis à jour via updateUI()
            };
        }

        const resetBtn = document.getElementById('reset-sim-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.simulation.resetSimulation();
            };
        }
    }

    public updateUI(frameCount: number, position: { x: number, y: number, z: number }, velocity: number, isPlaying: boolean): void {
        const frameElement = document.getElementById('frame-count');
        if (frameElement) frameElement.textContent = frameCount.toString();

        const posElement = document.getElementById('kite-pos');
        if (posElement) {
            posElement.textContent = `[${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}]`;
        }

        const velElement = document.getElementById('kite-vel');
        if (velElement) {
            velElement.textContent = velocity.toFixed(1);
        }

        // Mettre à jour le bouton play/pause
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.textContent = isPlaying ? '⏸️ Pause' : '▶️ Play';
        }
    }

    public destroy(): void {
        if (this.controlPanel) {
            document.body.removeChild(this.controlPanel);
            this.controlPanel = null;
        }
    }
}