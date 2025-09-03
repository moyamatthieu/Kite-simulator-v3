/**
 * SimulationLoader.ts - Système de chargement dynamique des versions de simulation
 *
 * Ce module détecte automatiquement toutes les versions de simulation disponibles
 * et permet de basculer entre elles dynamiquement.
 * Utilise l'interface universelle V10 pour toutes les simulations.
 */

import * as THREE from 'three';
import { UniversalUI, initializeUniversalUI } from './UniversalUI.js';
import { logger } from '@core/Logger'; // Import du logger

// Interface pour les informations d'une simulation
interface SimulationInfo {
    version: string;
    filename: string;
    name: string;
    description: string;
    module?: any;
    instance?: any;
}

// Interface que toutes les simulations doivent implémenter
export interface ISimulation {
    cleanup?(): void;
    pause?(): void;
    resume?(): void;
}

/**
 * Gestionnaire de chargement et de basculement entre simulations
 * Avec interface universelle V10
 */
export class SimulationLoader {
    private simulations: Map<string, SimulationInfo> = new Map();
    private currentSimulation: SimulationInfo | null = null;
    private container: HTMLElement;
    private onSimulationChange?: (info: SimulationInfo) => void;
    private universalUI!: UniversalUI;

    constructor(container: HTMLElement) {
        this.container = container;

        // Initialiser l'interface universelle V10
        this.universalUI = initializeUniversalUI(container);

        this.discoverSimulations();
    }

    /**
     * Découvre automatiquement toutes les simulations disponibles
     * Utilise import.meta.glob pour scanner les fichiers
     */
    private async discoverSimulations(): Promise<void> {
        logger.info('Recherche des simulations disponibles...', 'SimulationLoader');

        // Utiliser import.meta.glob pour trouver tous les fichiers simulation*.ts
        const simulationModules = import.meta.glob('./simulation*.ts');

        for (const path in simulationModules) {
            // Extraire le nom du fichier et la version
            const filename = path.split('/').pop() || '';
            const match = filename.match(/simulation(V?\d+(?:_\d+)?)?\.ts/);

            if (match) {
                let version = match[1] || '';
                if (!version) version = 'V1'; // simulation.ts devient V1
                if (!version.startsWith('V')) version = 'V' + version;

                // Déterminer le nom et la description basés sur la version
                let name = `Simulation ${version}`;
                let description = 'Simulation de cerf-volant';

                // Descriptions spécifiques par version
                const descriptions: Record<string, string> = {
                    'V1': 'Version originale - Physique de base',
                    'V2': 'Version améliorée - Meilleure stabilité',
                    'V3': 'Architecture modulaire - Physique avancée',
                    'V4': 'Physique émergente pure - Modèle réaliste',
                    'V5': 'Version expérimentale',
                    'V6': 'Version avec améliorations futures',
                    'V7': 'Version refactorisée - Code propre et maintenable',
                    'V7_1': 'Version optimisée - Corrections critiques',
                    'V8': 'Physique émergente pure - Architecture modulaire',
                    'V9': 'Forces de traînée individuelles + Interface OOP moderne'
                };

                if (descriptions[version]) {
                    description = descriptions[version];
                }

                const info: SimulationInfo = {
                    version,
                    filename,
                    name,
                    description
                };

                this.simulations.set(version, info);
                logger.debug(`Trouvé: ${name} (${filename})`, 'SimulationLoader');
            }
        }

        logger.info(`${this.simulations.size} simulation(s) découverte(s)`, 'SimulationLoader');

        // Créer l'interface de sélection
        this.createUI();

        // Charger la première simulation par défaut
        const defaultVersion = this.getDefaultVersion();
        if (defaultVersion) {
            await this.loadSimulation(defaultVersion);
        }
    }

    /**
     * Détermine la version par défaut à charger
     */
    private getDefaultVersion(): string | null {
        // Vérifier si une version est spécifiée dans l'URL
        const urlParams = new URLSearchParams(window.location.search);
        const versionParam = urlParams.get('version');

        if (versionParam && this.simulations.has(versionParam)) {
            return versionParam;
        }

        // Choisir la plus grande version numériquement (V10 > V9 > V8 ...)
        const toNumeric = (v: string) => {
            // Ex: V7_2 -> 7.2, V10 -> 10
            const m = v.match(/^V(\d+)(?:_(\d+))?$/);
            if (!m) return 0;
            const major = parseInt(m[1], 10) || 0;
            const minor = m[2] ? parseInt(m[2], 10) : 0;
            return major + minor / 10;
        };

        let best: string | null = null;
        let bestScore = -Infinity;
        for (const v of this.simulations.keys()) {
            const score = toNumeric(v);
            if (score > bestScore) { bestScore = score; best = v; }
        }

        return best;
    }

    /**
     * Charge une simulation spécifique
     */
    public async loadSimulation(version: string): Promise<boolean> {
        const info = this.simulations.get(version);
        if (!info) {
            logger.error(`Version ${version} non trouvée`, 'SimulationLoader');
            return false;
        }

        logger.info(`Chargement de ${info.name}...`, 'SimulationLoader');

        // Nettoyer la simulation actuelle
        if (this.currentSimulation) {
            this.cleanupCurrentSimulation();
        }

        // Nettoyer le container et Three.js
        this.cleanupContainer();

        try {
            // Charger le module dynamiquement
            const modulePath = `./simulation${version === 'V1' ? '' : version}.ts`;
            const module = await import(/* @vite-ignore */ modulePath);

            info.module = module;

            // Chercher la classe principale exportée
            const mainClass = this.findMainClass(module);

            if (mainClass) {
                // Créer une instance de la simulation
                logger.info(`Instanciation de ${mainClass.name}`, 'SimulationLoader');
                info.instance = new mainClass();
            } else {
                logger.warn('Module chargé (pas de classe principale trouvée)', 'SimulationLoader');
            }

            this.currentSimulation = info;

            // Notifier l'interface universelle du changement de version
            this.universalUI.setSimulationVersion(version);

            // Mettre à jour l'URL
            const url = new URL(window.location.href);
            url.searchParams.set('version', version);
            window.history.pushState({}, '', url);

            // Notifier le changement
            if (this.onSimulationChange) {
                this.onSimulationChange(info);
            }

            // Émettre un événement global pour permettre le chargement dynamique de l'UI
            try {
                window.dispatchEvent(new CustomEvent('simulation-loaded', { detail: { info } }));
            } catch (e) {
                // ignore si non-disponible (SSR inexistant ici)
            }

            // Mettre à jour l'interface
            this.updateUI(version);

            logger.info(`${info.name} chargée avec succès`, 'SimulationLoader');
            return true;

        } catch (error) {
            logger.error(`Erreur lors du chargement de ${info.name}: ${error}`, 'SimulationLoader');
            return false;
        }
    }

    /**
     * Trouve la classe principale dans le module
     */
    private findMainClass(module: any): any {
        // Chercher les exports qui ressemblent à des classes de simulation
        const possibleNames = [
            'SimulationApp',
            'SimulationAppV2',
            'SimulationAppV3',
            'SimulationAppV5',
            'SimulationAppV6',
            'SimulationAppV7',
            'SimulationAppV7_1',
            'SimulationAppV8',
            'SimulationAppV9',
            'KiteSimulationV4',
            'KiteSimulation',
            'App',
            'Main'
        ];

        for (const name of possibleNames) {
            if (module[name] && typeof module[name] === 'function') {
                return module[name];
            }
        }

        // Si aucun nom connu, prendre le premier export qui est une classe
        for (const key in module) {
            if (typeof module[key] === 'function' &&
                module[key].prototype &&
                module[key].name.toLowerCase().includes('sim')) {
                return module[key];
            }
        }

        return null;
    }

    /**
     * Nettoie la simulation actuelle
     */
    private cleanupCurrentSimulation(): void {
        if (this.currentSimulation?.instance) {
            logger.info('Nettoyage de la simulation actuelle...', 'SimulationLoader');

            // Essayer de nettoyer le renderer Three.js si accessible
            if (this.currentSimulation.instance.renderer) {
                try {
                    // Forcer le contexte WebGL à se perdre
                    const canvas = this.currentSimulation.instance.renderer.domElement;
                    const gl = this.currentSimulation.instance.renderer.getContext();
                    if (gl) {
                        const loseContext = gl.getExtension('WEBGL_lose_context');
                        if (loseContext) {
                            loseContext.loseContext();
                        }
                    }

                    // Nettoyer le renderer
                    this.currentSimulation.instance.renderer.dispose();
                } catch (error) {
                    logger.warn(`Erreur lors du nettoyage du renderer: ${error}`, 'SimulationLoader');
                }
            }

            // Appeler la méthode cleanup si elle existe
            if (typeof this.currentSimulation.instance.cleanup === 'function') {
                this.currentSimulation.instance.cleanup();
            }

            // Forcer le garbage collection
            this.currentSimulation.instance = null;
        }
    }

    /**
     * Nettoie le container et les ressources Three.js
     */
    private cleanupContainer(): void {
        // Nettoyer le DOM
        while (this.container.firstChild) {
            // Vérifier si c'est un canvas Three.js
            if (this.container.firstChild.nodeName === 'CANVAS') {
                const canvas = this.container.firstChild as HTMLCanvasElement;

                // Ne pas essayer d'obtenir le contexte, juste supprimer le canvas
                logger.debug('Suppression du canvas WebGL...', 'SimulationLoader');
            }
            this.container.removeChild(this.container.firstChild);
        }

        // Nettoyer les event listeners globaux (approximatif)
        const newContainer = this.container.cloneNode(true) as HTMLElement;
        if (this.container.parentNode) {
            this.container.parentNode.replaceChild(newContainer, this.container);
            this.container = newContainer;
        }
    }

    /**
     * Crée l'interface utilisateur de sélection
     */
    private createUI(): void {
        // Créer le sélecteur de version
        const selector = document.createElement('div');
        selector.className = 'simulation-selector';
        selector.innerHTML = `
            <style>
                .simulation-selector {
                    position: absolute;
                    top: 10px;
                    left: 330px;
                    background: rgba(0, 0, 0, 0.8);
                    padding: 10px;
                    border-radius: 8px;
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    z-index: 1001;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
                }
                
                .simulation-selector label {
                    color: #aaa;
                    font-size: 14px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                
                .version-buttons {
                    display: flex;
                    gap: 5px;
                }
                
                .version-btn {
                    padding: 8px 12px;
                    background: #444;
                    border: 2px solid transparent;
                    color: white;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    transition: all 0.3s;
                    position: relative;
                }
                
                .version-btn:hover {
                    background: #555;
                    transform: translateY(-2px);
                }
                
                .version-btn.active {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-color: #764ba2;
                    box-shadow: 0 0 15px rgba(118, 75, 162, 0.5);
                }
                
                .version-tooltip {
                    position: absolute;
                    bottom: -35px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                
                .version-btn:hover .version-tooltip {
                    opacity: 1;
                }
                
                .simulation-info {
                    margin-left: 20px;
                    padding-left: 20px;
                    border-left: 2px solid #444;
                    color: #888;
                    font-size: 12px;
                    max-width: 300px;
                }
                
                .simulation-info.active {
                    color: #667eea;
                }
            </style>
            <label>VERSION:</label>
            <div class="version-buttons" id="version-buttons"></div>
            <div class="simulation-info" id="simulation-info"></div>
        `;

        document.body.appendChild(selector);

        // Ajouter les boutons pour chaque version
        const buttonsContainer = document.getElementById('version-buttons');
        if (buttonsContainer) {
            const versions = Array.from(this.simulations.keys()).sort();

            for (const version of versions) {
                const info = this.simulations.get(version)!;
                const button = document.createElement('button');
                button.className = 'version-btn';
                button.textContent = version;
                button.onclick = () => this.loadSimulation(version);

                // Ajouter le tooltip
                const tooltip = document.createElement('span');
                tooltip.className = 'version-tooltip';
                tooltip.textContent = info.description;
                button.appendChild(tooltip);

                buttonsContainer.appendChild(button);
            }
        }
    }

    /**
     * Met à jour l'interface après un changement de version
     */
    private updateUI(activeVersion: string): void {
        // Mettre à jour les boutons
        const buttons = document.querySelectorAll('.version-btn');
        buttons.forEach(btn => {
            if (btn.textContent === activeVersion) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Mettre à jour les informations
        const infoDiv = document.getElementById('simulation-info');
        if (infoDiv) {
            const info = this.simulations.get(activeVersion);
            if (info) {
                infoDiv.innerHTML = `<strong>${info.name}</strong><br>${info.description}`;
                infoDiv.className = 'simulation-info active';
            }
        }

        // Mettre à jour le titre de la page
        const info = this.simulations.get(activeVersion);
        if (info) {
            document.title = `${info.name} - Cerf-volant`;
        }
    }

    /**
     * Définit un callback pour les changements de simulation
     */
    public onSimulationChanged(callback: (info: SimulationInfo) => void): void {
        this.onSimulationChange = callback;
    }

    /**
     * Retourne la liste des simulations disponibles
     */
    public getAvailableSimulations(): SimulationInfo[] {
        return Array.from(this.simulations.values());
    }

    /**
     * Retourne la simulation actuelle
     */
    public getCurrentSimulation(): SimulationInfo | null {
        return this.currentSimulation;
    }
}

// Auto-initialisation si lancé directement
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const container = document.getElementById('app');
        if (container) {
            const loader = new SimulationLoader(container);

            // Exposer le loader globalement pour debug
            (window as any).simulationLoader = loader;

            // Logger les changements
            loader.onSimulationChanged((info) => {
                logger.info(`Simulation active: ${info.name}`, 'SimulationLoader');
            });

            // La simulation est déjà chargée dans discoverSimulations()
            // Pas besoin de la charger à nouveau
        }
    });
}
