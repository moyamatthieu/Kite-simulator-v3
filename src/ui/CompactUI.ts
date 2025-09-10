/**
 * CompactUI.ts - Interface utilisateur compacte et moderne
 * Design minimal fullscreen avec panneau flottant discret
 */

import { CONFIG, WindParams } from '@core/constants';
import { SimulationApp } from '../SimulationApp';

export class CompactUI {
    private simulation: SimulationApp;
    private controlPanel: HTMLElement | null = null;
    private isCollapsed: boolean = false;

    constructor(simulation: SimulationApp) {
        this.simulation = simulation;
        this.createCompactPanel();
    }

    private createCompactPanel(): void {
        const panel = document.createElement('div');
        panel.id = 'compact-controls';
        panel.innerHTML = `
            <div id="control-panel" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.9) 100%);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(148, 163, 184, 0.2);
                border-radius: 12px;
                font-family: 'Segoe UI', system-ui, sans-serif;
                font-size: 13px;
                z-index: 1000;
                min-width: 320px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
            ">
                <!-- Header avec toggle -->
                <div id="panel-header" style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
                    cursor: pointer;
                " onclick="window.togglePanel()">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="
                            width: 8px;
                            height: 8px;
                            border-radius: 50%;
                            background: #10b981;
                            box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
                        "></div>
                        <span style="color: #f1f5f9; font-weight: 600; font-size: 14px;">🪁 Kite Sim</span>
                    </div>
                    <span id="toggle-btn" style="
                        color: #64748b;
                        font-size: 16px;
                        transform: rotate(0deg);
                        transition: transform 0.3s ease;
                    ">◀</span>
                </div>

                <!-- Contenu principal -->
                <div id="panel-content" style="
                    padding: 16px;
                    transition: all 0.3s ease;
                ">
                    <!-- Contrôles vent - Compact -->
                    <div style="margin-bottom: 16px;">
                        <div style="
                            display: grid;
                            grid-template-columns: 1fr 1fr 1fr 1fr;
                            gap: 10px;
                            margin-bottom: 8px;
                        ">
                            <div style="text-align: center;">
                                <label style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Vent</label>
                                <div style="color: #f1f5f9; font-weight: 600; font-size: 16px;" id="wind-speed-display">${CONFIG.wind.defaultSpeed}</div>
                                <div style="color: #64748b; font-size: 10px;">km/h</div>
                            </div>
                            <div style="text-align: center;">
                                <label style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Dir</label>
                                <div style="color: #f1f5f9; font-weight: 600; font-size: 16px;" id="wind-dir-display">${CONFIG.wind.defaultDirection}</div>
                                <div style="color: #64748b; font-size: 10px;">°</div>
                            </div>
                            <div style="text-align: center;">
                                <label style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Turb</label>
                                <div style="color: #f1f5f9; font-weight: 600; font-size: 16px;" id="turb-display">${CONFIG.wind.defaultTurbulence}</div>
                                <div style="color: #64748b; font-size: 10px;">%</div>
                            </div>
                            <div style="text-align: center;">
                                <label style="color: #cbd5e1; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">Lignes</label>
                                <div style="color: #f1f5f9; font-weight: 600; font-size: 16px;" id="lines-display">${CONFIG.lines.defaultLength}</div>
                                <div style="color: #64748b; font-size: 10px;">m</div>
                            </div>
                        </div>
                        
                        <!-- Sliders compacts -->
                        <input type="range" id="wind-speed" min="0" max="50" value="${CONFIG.wind.defaultSpeed}" style="
                            width: 100%;
                            height: 6px;
                            background: linear-gradient(90deg, #1e293b 0%, #0f766e 50%, #059669 100%);
                            border-radius: 3px;
                            outline: none;
                            margin: 8px 0 4px 0;
                            -webkit-appearance: none;
                        ">
                        <!-- Slider coefficient de portance -->
                        <div style="margin-top: 8px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <label style="color: #cbd5e1; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Portance</label>
                                <span style="color: #f1f5f9; font-size: 11px; font-weight: 600;" id="lift-coeff-display">${CONFIG.aero.liftCoefficient.toFixed(1)}x</span>
                            </div>
                            <input type="range" id="lift-coefficient" min="0" max="20" step="0.1" value="${CONFIG.aero.liftCoefficient}" style="
                                width: 100%;
                                height: 6px;
                                background: linear-gradient(90deg, #1e293b 0%, #10b981 50%, #059669 100%);
                                border-radius: 3px;
                                outline: none;
                                -webkit-appearance: none;
                            ">
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                            <input type="range" id="wind-dir" min="0" max="360" value="${CONFIG.wind.defaultDirection}" style="
                                width: 100%;
                                height: 4px;
                                background: #374151;
                                border-radius: 2px;
                                outline: none;
                                -webkit-appearance: none;
                            ">
                            <input type="range" id="turbulence" min="0" max="20" value="${CONFIG.wind.defaultTurbulence}" style="
                                width: 100%;
                                height: 4px;
                                background: #374151;
                                border-radius: 2px;
                                outline: none;
                                -webkit-appearance: none;
                            ">
                            <input type="range" id="lines-length" min="10" max="50" value="${CONFIG.lines.defaultLength}" style="
                                width: 100%;
                                height: 4px;
                                background: linear-gradient(90deg, #1e293b 0%, #dc2626 50%, #f59e0b 100%);
                                border-radius: 2px;
                                outline: none;
                                -webkit-appearance: none;
                            ">
                        </div>
                    </div>

                    <!-- Actions -->
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr 1fr;
                        gap: 6px;
                        margin-bottom: 16px;
                    ">
                        <button id="play-pause-btn" style="
                            background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            padding: 8px 6px;
                            font-size: 11px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            ⏸️ Pause
                        </button>
                        <button id="reset-sim-btn" style="
                            background: linear-gradient(135deg, #64748b 0%, #475569 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            padding: 8px 6px;
                            font-size: 11px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            🔄 Reset
                        </button>
                        <button id="debug-toggle-btn" style="
                            background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
                            border: none;
                            border-radius: 8px;
                            color: white;
                            padding: 8px 6px;
                            font-size: 11px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.2s ease;
                            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3);
                        " onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                            🔍 Debug
                        </button>
                    </div>

                    <!-- Stats compactes -->
                    <div style="
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        padding: 12px;
                        background: rgba(15, 23, 42, 0.6);
                        border-radius: 8px;
                        border: 1px solid rgba(148, 163, 184, 0.1);
                    ">
                        <div>
                            <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Position</div>
                            <div style="color: #f1f5f9; font-size: 11px; font-family: 'Courier New', monospace;" id="kite-pos">---</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Vitesse</div>
                            <div style="color: #f1f5f9; font-size: 11px;" id="kite-vel">-- m/s</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Frame</div>
                            <div style="color: #f1f5f9; font-size: 11px;" id="frame-count">0</div>
                        </div>
                        <div>
                            <div style="color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Contrôles</div>
                            <div style="color: #f1f5f9; font-size: 11px;">← → Q A D</div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                /* Sliders custom */
                input[type="range"]::-webkit-slider-thumb {
                    appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    cursor: pointer;
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
                    transition: all 0.2s ease;
                }
                
                input[type="range"]::-webkit-slider-thumb:hover {
                    transform: scale(1.1);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.6);
                }
                
                input[type="range"]::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 6px rgba(16, 185, 129, 0.4);
                }
            </style>
        `;

        document.body.appendChild(panel);
        this.controlPanel = panel;
        this.setupEventListeners();
        this.setupToggleFunction();
    }

    private setupToggleFunction(): void {
        // Fonction globale pour le toggle
        (window as any).togglePanel = () => {
            const content = document.getElementById('panel-content');
            const toggleBtn = document.getElementById('toggle-btn');
            const panel = document.getElementById('control-panel');

            if (!content || !toggleBtn || !panel) return;

            this.isCollapsed = !this.isCollapsed;

            if (this.isCollapsed) {
                content.style.display = 'none';
                toggleBtn.style.transform = 'rotate(180deg)';
                panel.style.minWidth = 'auto';
                panel.style.width = '140px';
            } else {
                content.style.display = 'block';
                toggleBtn.style.transform = 'rotate(0deg)';
                panel.style.minWidth = '320px';
                panel.style.width = 'auto';
            }
        };
    }

    private setupEventListeners(): void {
        // Vent
        const windSpeedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const windSpeedDisplay = document.getElementById('wind-speed-display')!;
        if (windSpeedSlider && windSpeedDisplay) {
            windSpeedSlider.oninput = () => {
                const speed = parseFloat(windSpeedSlider.value);
                this.simulation.setWindParams({ speed });
                windSpeedDisplay.textContent = speed.toString();
            };
        }

        const windDirSlider = document.getElementById('wind-dir') as HTMLInputElement;
        const windDirDisplay = document.getElementById('wind-dir-display')!;
        if (windDirSlider && windDirDisplay) {
            windDirSlider.oninput = () => {
                const direction = parseFloat(windDirSlider.value);
                this.simulation.setWindParams({ direction });
                windDirDisplay.textContent = direction.toString();
            };
        }

        const turbulenceSlider = document.getElementById('turbulence') as HTMLInputElement;
        const turbDisplay = document.getElementById('turb-display')!;
        if (turbulenceSlider && turbDisplay) {
            turbulenceSlider.oninput = () => {
                const turbulence = parseFloat(turbulenceSlider.value);
                this.simulation.setWindParams({ turbulence });
                turbDisplay.textContent = turbulence.toString();
            };
        }

        // Coefficient de portance
        const liftCoeffSlider = document.getElementById('lift-coefficient') as HTMLInputElement;
        const liftCoeffDisplay = document.getElementById('lift-coeff-display')!;
        if (liftCoeffSlider && liftCoeffDisplay) {
            liftCoeffSlider.oninput = () => {
                const coefficient = parseFloat(liftCoeffSlider.value);
                this.simulation.setLiftCoefficient(coefficient);
                liftCoeffDisplay.textContent = coefficient.toFixed(1) + 'x';
            };
        }

        // Longueur des lignes
        const linesSlider = document.getElementById('lines-length') as HTMLInputElement;
        const linesDisplay = document.getElementById('lines-display')!;
        if (linesSlider && linesDisplay) {
            linesSlider.oninput = () => {
                const length = parseFloat(linesSlider.value);
                this.simulation.setLineLength(length);
                linesDisplay.textContent = length.toString();
            };
        }

        // Boutons
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.onclick = () => {
                this.simulation.togglePlayPause();
            };
        }

        const resetBtn = document.getElementById('reset-sim-btn');
        if (resetBtn) {
            resetBtn.onclick = () => {
                this.simulation.resetSimulation();
            };
        }

        // Bouton debug
        const debugBtn = document.getElementById('debug-toggle-btn');
        if (debugBtn) {
            debugBtn.onclick = () => {
                this.simulation.toggleDebugMode();
            };
        }
    }

    public updateUI(frameCount: number, position: { x: number, y: number, z: number }, velocity: number, isPlaying: boolean, debugMode: boolean = false): void {
        const frameElement = document.getElementById('frame-count');
        if (frameElement) frameElement.textContent = frameCount.toString();

        const posElement = document.getElementById('kite-pos');
        if (posElement) {
            posElement.textContent = `${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}`;
        }

        const velElement = document.getElementById('kite-vel');
        if (velElement) {
            velElement.textContent = `${velocity.toFixed(1)} m/s`;
        }

        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = isPlaying ? '⏸️ Pause' : '▶️ Play';
            playPauseBtn.style.background = isPlaying
                ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)';
        }

        // Mettre à jour le bouton debug
        const debugBtn = document.getElementById('debug-toggle-btn');
        if (debugBtn) {
            debugBtn.innerHTML = debugMode ? '🔍 Debug ON' : '🔍 Debug';
            debugBtn.style.background = debugMode
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)';
            debugBtn.style.boxShadow = debugMode
                ? '0 2px 8px rgba(16, 185, 129, 0.4)'
                : '0 2px 8px rgba(124, 58, 237, 0.3)';
        }
    }

    public destroy(): void {
        if (this.controlPanel) {
            document.body.removeChild(this.controlPanel);
            this.controlPanel = null;
        }
    }
}
