/**
 * SimulationUIManager.ts - Gère l'interface utilisateur spécifique à la simulation V10
 * Cette classe est un gestionnaire d'UI dédié, inspiré de SimulationV9 pour ses contrôles,
 * et respectant une architecture modulaire.
 */

import * as THREE from 'three';
import { logger } from '@core/Logger'; // Import du logger
import { CONFIG } from '@/simulation/config/SimulationConfig'; // Importe la configuration

export class SimulationUIManager {
    private static instance: SimulationUIManager | null = null;
    private container: HTMLElement;
    private elements: { [key: string]: HTMLElement | HTMLInputElement | HTMLSelectElement | null } = {};
    private currentVersion: string = ''; // Pour garder une trace de la version de simulation active
    private debugLegend: HTMLElement | null = null; // Légende pour les flèches de debug

    private constructor(container: HTMLElement) {
        this.container = container;
        this.initializeUI();
        SimulationUIManager.instance = this;

        logger.debug('SimulationUIManager: Interface de simulation V10 initialisée', 'SimulationUIManager');
    }

    /**
     * Obtenir l'instance singleton
     */
    public static getInstance(container?: HTMLElement): SimulationUIManager {
        if (!SimulationUIManager.instance && container) {
            SimulationUIManager.instance = new SimulationUIManager(container);
        } else if (SimulationUIManager.instance && container && SimulationUIManager.instance.container !== container) {
            logger.warn('SimulationUIManager: Instance déjà existante avec un autre conteneur, mise à jour du conteneur.', 'SimulationUIManager');
            SimulationUIManager.instance.container = container;
            SimulationUIManager.instance.initializeUI(); // Réinitialise l'UI avec le nouveau conteneur
        }
        return SimulationUIManager.instance as SimulationUIManager;
    }

    private initializeUI(): void {
        this.container.innerHTML = ''; // Nettoyer le conteneur existant
        this.createBaseLayout();
        this.createSimulationControls();
        this.createDebugControls();
        this.setupEventListeners();
    }

    private createBaseLayout(): void {
        const mainContainer = document.createElement('div');
        mainContainer.id = 'simulation-ui-container';
        mainContainer.className = 'absolute top-0 left-0 w-full h-full pointer-events-none p-4 z-50'; // Assure que l'UI est au-dessus
        this.container.appendChild(mainContainer);
        this.elements.mainContainer = mainContainer;

        const logPanel = document.createElement('div');
        logPanel.id = 'periodic-log';
        logPanel.className = 'absolute top-4 right-4 p-3 bg-gray-800 bg-opacity-75 rounded-lg shadow-lg pointer-events-auto text-white text-xs max-w-sm overflow-auto max-h-1/2 panel-log';
        mainContainer.appendChild(logPanel);
        this.elements.periodicLog = logPanel;

        const debugInfoPanel = document.createElement('div');
        debugInfoPanel.id = 'debug-info-panel';
        debugInfoPanel.className = 'info-panel top-1/2 left-4 -translate-y-1/2'; // Positionné au milieu à gauche
        debugInfoPanel.innerHTML = `
            <div class="panel-header">Statut Physique</div>
            <div class="panel-content">
                <p>Altitude: <span id="altitude-display">0.0</span> m</p>
                <p>Vitesse: <span id="wind-speed-display">0.0</span> km/h</p>
                <p>Force Aero: <span id="force-display">0.0</span> N</p>
                <p>Lignes: <span id="tension-display">S:0.0 T:0.0</span></p>
                <p>FPS: <span id="fps">0</span></p>
                <p>Statut: <span id="physics-status">✅ Stable</span></p>
            </div>
        `;
        mainContainer.appendChild(debugInfoPanel);
        this.elements.debugInfoPanel = debugInfoPanel;

    }

    private createSimulationControls(): void {
        const controlsPanel = document.createElement('div');
        controlsPanel.id = 'simulation-controls';
        controlsPanel.className = 'info-panel top-4 left-4';
        controlsPanel.innerHTML = `
            <div class="panel-header">Contrôles Simulation</div>
            <div class="panel-content">
                <div class="control-group">
                    <label for="wind-speed">Vent Vitesse (km/h): <span id="wind-speed-value">${CONFIG.get('wind').defaultSpeed}</span></label>
                    <input type="range" id="wind-speed" min="${CONFIG.get('wind').minSpeed}" max="${CONFIG.get('wind').maxSpeed}" value="${CONFIG.get('wind').defaultSpeed}" step="1">
                </div>
                <div class="control-group">
                    <label for="wind-direction">Vent Direction (°): <span id="wind-direction-value">${CONFIG.get('wind').defaultDirection}</span></label>
                   <input type="range" id="wind-direction" min="0" max="360" value="${CONFIG.get('wind').defaultDirection}" step="1">
                </div>
                <div class="control-group">
                    <label for="wind-turbulence">Turbulence (%): <span id="wind-turbulence-value">${CONFIG.get('wind').defaultTurbulence}</span></label>
                    <input type="range" id="wind-turbulence" min="0" max="100" value="${CONFIG.get('wind').defaultTurbulence}" step="1">
                </div>
                <div class="control-group">
                    <label for="line-length">Longueur Lignes (m): <span id="line-length-value">${CONFIG.get('lines').defaultLength}</span></label>
                    <input type="range" id="line-length" min="5" max="50" value="${CONFIG.get('lines').defaultLength}" step="1">
                </div>
                 <div class="control-group">
                    <label for="bridle-length">Longueur Brides (%): <span id="bridle-length-value">100</span></label>
                    <input type="range" id="bridle-length" min="50" max="150" value="100" step="1">
                </div>
                <button id="reset-sim" class="ui-button">🔄 Réinitialiser</button>
                <button id="play-pause" class="ui-button active">⏸️ Pause</button>
            </div>
        `;
        this.elements.mainContainer?.appendChild(controlsPanel);

        // Stocker les références aux éléments pour un accès facile
        this.elements.windSpeedInput = controlsPanel.querySelector<HTMLInputElement>('#wind-speed');
        this.elements.windSpeedValue = controlsPanel.querySelector<HTMLElement>('#wind-speed-value');
        this.elements.windDirectionInput = controlsPanel.querySelector<HTMLInputElement>('#wind-direction');
        this.elements.windDirectionValue = controlsPanel.querySelector<HTMLElement>('#wind-direction-value');
        this.elements.windTurbulenceInput = controlsPanel.querySelector<HTMLInputElement>('#wind-turbulence');
        this.elements.windTurbulenceValue = controlsPanel.querySelector<HTMLElement>('#wind-turbulence-value');
        this.elements.lineLengthInput = controlsPanel.querySelector<HTMLInputElement>('#line-length');
        this.elements.lineLengthValue = controlsPanel.querySelector<HTMLElement>('#line-length-value');
        this.elements.bridleLengthInput = controlsPanel.querySelector<HTMLInputElement>('#bridle-length');
        this.elements.bridleLengthValue = controlsPanel.querySelector<HTMLElement>('#bridle-length-value');
        this.elements.resetButton = controlsPanel.querySelector<HTMLButtonElement>('#reset-sim');
        this.elements.playPauseButton = controlsPanel.querySelector<HTMLButtonElement>('#play-pause');

        this.elements.altitudeDisplay = this.elements.debugInfoPanel?.querySelector<HTMLElement>('#altitude-display') || null;
        this.elements.windSpeedDisplay = this.elements.debugInfoPanel?.querySelector<HTMLElement>('#wind-speed-display') || null;
        this.elements.forceDisplay = this.elements.debugInfoPanel?.querySelector<HTMLElement>('#force-display') || null;
        this.elements.tensionDisplay = this.elements.debugInfoPanel?.querySelector<HTMLElement>('#tension-display') || null;
        this.elements.fpsDisplay = this.elements.debugInfoPanel?.querySelector<HTMLElement>('#fps') || null;
        this.elements.physicsStatus = this.elements.debugInfoPanel?.querySelector<HTMLElement>('#physics-status') || null;
    }

    private createDebugControls(): void {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-controls';
        debugPanel.className = 'info-panel bottom-4 left-4';
        debugPanel.innerHTML = `
            <div class="panel-header">Options Debug</div>
            <div class="panel-content">
                <button id="debug-physics" class="ui-button">🔍 Debug ON</button>
            </div>
        `;
        this.elements.mainContainer?.appendChild(debugPanel);
        this.elements.debugPhysicsButton = debugPanel.querySelector<HTMLButtonElement>('#debug-physics');
    }

    private setupEventListeners(): void {
        // Event listeners pour les sliders de simulation
        this.elements.windSpeedInput?.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            if (this.elements.windSpeedValue) this.elements.windSpeedValue.textContent = `${value} km/h`;
            // Un gestionnaire externe (SimulationApp) écoutera ces changements
        });
        this.elements.windDirectionInput?.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            if (this.elements.windDirectionValue) this.elements.windDirectionValue.textContent = `${value}°`;
        });
        this.elements.windTurbulenceInput?.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            if (this.elements.windTurbulenceValue) this.elements.windTurbulenceValue.textContent = `${value}%`;
        });
        this.elements.lineLengthInput?.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            if (this.elements.lineLengthValue) this.elements.lineLengthValue.textContent = `${value}m`;
        });
        this.elements.bridleLengthInput?.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value;
            if (this.elements.bridleLengthValue) this.elements.bridleLengthValue.textContent = `${value}%`;
        });

        // Event listeners pour les boutons (Reset, Play/Pause, Debug)
        // Ces événements seront dispatchés et écoutés par SimulationApp
        this.elements.resetButton?.addEventListener('click', () => {
            logger.debug('SimulationUIManager: Bouton Reset cliqué', 'SimulationUIManager');
            window.dispatchEvent(new CustomEvent('simulation:reset'));
        });
        this.elements.playPauseButton?.addEventListener('click', () => {
            logger.debug('SimulationUIManager: Bouton Play/Pause cliqué', 'SimulationUIManager');
            window.dispatchEvent(new CustomEvent('simulation:togglePlayPause'));
        });
        this.elements.debugPhysicsButton?.addEventListener('click', () => {
            logger.debug('SimulationUIManager: Bouton Debug cliqué', 'SimulationUIManager');
            window.dispatchEvent(new CustomEvent('simulation:toggleDebugMode'));
        });
    }

    /**
     * Définit la version de simulation courante (pour info ou adaptation future si nécessaire)
     * @param {string} version - La chaîne de caractères représentant la version de la simulation.
     */
    public setSimulationVersion(version: string): void {
        this.currentVersion = version;
        // Pour l'instant, l'UI V10 est générique, pas d'adaptation spécifique requise
        logger.debug(`SimulationUIManager: Interface adaptée pour la simulation ${version}`, 'SimulationUIManager');
    }

    /**
     * Méthode pour activer/désactiver le panneau d'informations de debug.
     * @param {boolean} show - True pour afficher le panneau, false pour le cacher.
     */
    public toggleDebugInfoPanel(show: boolean): void {
        const panel = this.elements.debugInfoPanel;
        if (panel) {
            panel.style.display = show ? 'block' : 'none';
        }
    }

    /**
     * Met à jour les valeurs affichées en temps réel sur l'interface.
     * @param data - Un objet contenant les différentes métriques à afficher.
     */
    public updateRealTimeValues(data: {
        altitude: number;
        windSpeed: number; // en km/h
        forceAero: number;
        lineTensionStatus: string;
        fps: number;
        physicsStatus: string;
        logMessage: string;
    }): void {
        // Ces éléments sont garantis d'exister après création (avec || null) mais un check est plus sûr.
        if (this.elements.altitudeDisplay) this.elements.altitudeDisplay.textContent = data.altitude.toFixed(1);
        if (this.elements.windSpeedDisplay) this.elements.windSpeedDisplay.textContent = `${data.windSpeed.toFixed(0)} km/h`;
        if (this.elements.forceDisplay) this.elements.forceDisplay.textContent = data.forceAero.toFixed(1);
        if (this.elements.tensionDisplay) this.elements.tensionDisplay.textContent = data.lineTensionStatus;
        if (this.elements.fpsDisplay) this.elements.fpsDisplay.textContent = Math.round(data.fps).toString();
        if (this.elements.physicsStatus) {
            this.elements.physicsStatus.textContent = data.physicsStatus;
            this.elements.physicsStatus.style.color = data.physicsStatus.includes('⚠️') ? '#ffaa00' : '#00ff88';
        }
        if (this.elements.periodicLog) this.elements.periodicLog.innerHTML = data.logMessage;
    }

    /**
     * Gère l'affichage de la légende des vecteurs de debug (recréée ici car non intégrée au UIManager principal).
     * @param {boolean} show - True pour afficher la légende, false pour la cacher.
     */
    public toggleDebugLegend(show: boolean): void {
        if (show && !this.debugLegend) {
            this.createDebugLegend();
        } else if (!show && this.debugLegend) {
            this.removeDebugLegend();
        }
    }

    /**
     * @public
     * Met à jour l'état visuel du bouton Play/Pause.
     * @param {boolean} isPlaying - True si la simulation est en cours (affiche 'Pause'), false si en pause (affiche 'Lancer').
     */
    public setPlayPauseButtonState(isPlaying: boolean): void {
        if (this.elements.playPauseButton) {
            this.elements.playPauseButton.textContent = isPlaying ? '⏸️ Pause' : '▶️ Lancer';
            this.elements.playPauseButton.classList.toggle('active', isPlaying);
        }
    }

    /**
     * @public
     * Met à jour l'état visuel du bouton Debug.
     * @param {boolean} debugMode - True si le mode debug est activé, false sinon.
     */
    public setDebugButtonState(debugMode: boolean): void {
        if (this.elements.debugPhysicsButton) {
            this.elements.debugPhysicsButton.textContent = debugMode ? '🔍 Debug ON' : '🔍 Debug OFF';
            this.elements.debugPhysicsButton.classList.toggle('active', debugMode);
        }
        document.body.classList.toggle('debug-mode', debugMode); // Par exemple, pour appliquer des styles CSS globaux en mode debug
    }

    /**
     * @public
     * Permet d'ajouter des écouteurs d'événements à des éléments UI spécifiques via leur ID.
     * Cela permet à SimulationApp de s'abonner aux événements des contrôles UI.
     * @param {string} elementId - L'ID de l'élément HTML ciblé (ex: 'wind-speed', 'reset-sim').
     * @param {string} eventType - Le type d'événement à écouter (ex: 'input', 'click').
     * @param {EventListener} handler - La fonction de rappel à exécuter lorsque l'événement se produit.
     */
    public addUIEventListener(elementId: string, eventType: string, handler: EventListener): void {
        const element = this.elements[elementId];
        if (element) {
            element.addEventListener(eventType, handler);
        } else {
            logger.warn(`SimulationUIManager: Élément UI avec l'ID '${elementId}' non trouvé pour ajouter un écouteur.`, 'SimulationUIManager');
        }
    }

    /**
     * 📋 Crée la légende des vecteurs de debug.
     * Cette logique est copiée de SimulationV9 pour réintroduire la visualisation.
     */
    private createDebugLegend(): void {
        this.debugLegend = document.createElement('div');
        this.debugLegend.id = 'debug-legend';
        this.debugLegend.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            z-index: 1000;
            max-width: 250px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;

        this.debugLegend.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; text-align: center; color: #ffff00;">
                🎯 LÉGENDE DES VECTEURS
            </div>
            
            <div style="margin-bottom: 8px;">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #ffffff; margin-right: 8px;"></div>
                    <span>Vent global</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #00ff00; margin-right: 8px;"></div>
                    <span>Vitesse kite</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #0088ff; margin-right: 8px;"></div>
                    <span>Portance totale</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #ff0000; margin-right: 8px;"></div>
                    <span>Traînée totale</span>
                </div>
            </div>

            <div style="border-top: 1px solid #444; padding-top: 8px; margin-top: 8px;">
                <div style="font-weight: bold; margin-bottom: 6px; color: #ffff00;">
                    FORCES PAR FACE :
                </div>
                <!-- Couleurs dynamiques pour les faces -->
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #ff6b6b; margin-right: 8px;"></div>
                    <span>Face 1</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #4ecdc4; margin-right: 8px;"></div>
                    <span>Face 2</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #45b7d1; margin-right: 8px;"></div>
                    <span>Face 3</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #96ceb4; margin-right: 8px;"></div>
                    <span>Face 4</span>
                </div>
                <!-- Les autres faces (si plus de 4 triangles) -->
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #888888; margin-right: 8px;"></div>
                    <span>Normales</span>
                </div>
            </div>

            <div style="border-top: 1px solid #444; padding-top: 6px; margin-top: 6px; font-size: 10px; color: #aaa;">
                💡 Plus la flèche est longue, plus la force est importante
            </div>
        `;

        document.body.appendChild(this.debugLegend);
    }

    /**
     * 🗑️ Supprime la légende des vecteurs de debug
     */
    private removeDebugLegend(): void {
        if (this.debugLegend) {
            document.body.removeChild(this.debugLegend);
            this.debugLegend = null;
        }
    }

    /**
     * Nettoie tous les éléments UI créés par ce gestionnaire et supprime le debug legend.
     */
    public cleanup(): void {
        if (this.elements.mainContainer && this.container.contains(this.elements.mainContainer)) {
            this.container.removeChild(this.elements.mainContainer);
        }
        this.removeDebugLegend(); // S'assurer que le legend est retiré du body
        SimulationUIManager.instance = null;
        logger.debug('SimulationUIManager: Interface de simulation nettoyée', 'SimulationUIManager');
    }
}

/**
 * Fonction d'initialisation globale pour obtenir l'instance du gestionnaire d'UI.
 */
export function initializeSimulationUI(container: HTMLElement): SimulationUIManager {
    return SimulationUIManager.getInstance(container);
}
