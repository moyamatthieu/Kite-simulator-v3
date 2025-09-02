/**
 * SimulationApp.ts - Application de simulation physique
 * Simulation de cerf-volant avec environnement réaliste
 */

import { ThreeRenderer } from '../renderer/ThreeRenderer.js';
import { ConsolePanel } from '../ui/panels/ConsolePanel.js';
import { themeManager } from '../ui/core/ThemeManager.js';
import { Kite2 } from '../objects/organic/Kite2.js';
import * as THREE from 'three';

export interface SimulationAppConfig {
    container: HTMLElement;
    enablePhysics?: boolean;
    windSpeed?: number;
    theme?: 'dark' | 'light' | 'high-contrast';
}

/**
 * Application de simulation physique
 */
export class SimulationApp {
    private renderer!: ThreeRenderer;
    private container: HTMLElement;
    private consolePanel!: ConsolePanel;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private config: Required<SimulationAppConfig>;

    // Objets de simulation
    private simulationObjects: THREE.Object3D[] = [];
    private kite: Kite2 | null = null;

    // Animation
    private frameId: number = 0;
    private isRunning: boolean = false;
    private isInitialized = false;

    // Paramètres physiques
    private windSpeed: number = 5;
    private windDirection: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

    constructor(config: SimulationAppConfig) {
        this.container = config.container;
        this.config = {
            enablePhysics: true,
            windSpeed: 5,
            theme: 'dark',
            ...config
        };

        this.windSpeed = this.config.windSpeed;
    }

    /**
     * Initialise l'application de simulation
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('⚠️ SimulationApp déjà initialisée');
            return;
        }

        try {
            console.log('🚀 Initialisation de la simulation...');

            // Configurer le thème
            themeManager.setTheme(this.config.theme);

            // Initialiser les composants
            await this.setupRenderer();
            this.createUI();
            this.setupEnvironment();
            this.createKite();
            this.setupEventHandlers();
            this.setupConsoleCommands();

            this.isInitialized = true;
            console.log('✅ Simulation initialisée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation simulation:', error);
            throw error;
        }
    }

    /**
     * Démarre la simulation
     */
    start(): void {
        if (!this.isInitialized) {
            throw new Error('Simulation non initialisée. Appelez initialize() d\'abord.');
        }

        if (this.isRunning) {
            console.warn('⚠️ Simulation déjà en cours');
            return;
        }

        this.isRunning = true;
        this.animate();
        console.log('▶️ Simulation démarrée');
        this.consolePanel.addLog('info', '▶️ Simulation démarrée', 'simulation');
    }

    /**
     * Met en pause la simulation
     */
    pause(): void {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
        console.log('⏸️ Simulation mise en pause');
        this.consolePanel.addLog('info', '⏸️ Simulation en pause', 'simulation');
    }

    /**
     * Arrête la simulation
     */
    stop(): void {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
        console.log('⏹️ Simulation arrêtée');
        this.consolePanel.addLog('info', '⏹️ Simulation arrêtée', 'simulation');
    }

    /**
     * Nettoie les ressources
     */
    dispose(): void {
        this.stop();

        // Nettoyer les objets de simulation
        this.simulationObjects.forEach(obj => {
            if (obj.parent) {
                obj.parent.remove(obj);
            }
        });
        this.simulationObjects = [];

        if (this.renderer) {
            this.renderer.dispose();
        }

        console.log('🧹 Simulation nettoyée');
        this.isInitialized = false;
    }

    // === CONFIGURATION PRIVÉE ===

    /**
     * Configure le renderer 3D
     */
    private async setupRenderer(): Promise<void> {
        // Créer un conteneur pour le canvas
        const viewportContainer = document.createElement('div');
        viewportContainer.id = 'viewport';
        viewportContainer.style.cssText = 'width: 100%; height: 100%; position: relative;';

        this.renderer = new ThreeRenderer({
            canvasContainer: viewportContainer
        });

        this.scene = this.renderer.scene;
        this.camera = this.renderer.camera;

        console.log('✅ Renderer de simulation configuré');
    }

    /**
     * Crée l'interface utilisateur
     */
    private createUI(): void {
        // Créer la structure HTML
        this.container.innerHTML = `
            <div class="simulation-app">
                <div class="simulation-app__toolbar">
                    <div class="toolbar__group">
                        <button id="play-simulation" class="toolbar__button">▶️ Démarrer</button>
                        <button id="pause-simulation" class="toolbar__button">⏸️ Pause</button>
                        <button id="stop-simulation" class="toolbar__button">⏹️ Arrêter</button>
                    </div>
                    <div class="toolbar__group">
                        <label>Vent: </label>
                        <input type="range" id="wind-speed" min="0" max="20" value="${this.windSpeed}" step="0.5">
                        <span id="wind-value">${this.windSpeed} m/s</span>
                    </div>
                    <div class="toolbar__spacer"></div>
                    <div class="toolbar__group">
                        <button id="theme-toggle" class="toolbar__button">🌓 Thème</button>
                        <button id="reset-simulation" class="toolbar__button">🔄 Reset</button>
                    </div>
                </div>
                <div class="simulation-app__content">
                    <div class="simulation-app__viewport" id="viewport"></div>
                </div>
                <div class="simulation-app__bottom-panel" id="bottom-panel"></div>
            </div>
        `;

        // Monter le renderer dans le viewport
        const viewport = this.container.querySelector('#viewport') as HTMLElement;
        const rendererCanvas = this.renderer.renderer.domElement;
        viewport.appendChild(rendererCanvas);

        // Créer la console
        this.consolePanel = new ConsolePanel();
        const bottomPanel = this.container.querySelector('#bottom-panel') as HTMLElement;
        bottomPanel.appendChild(this.consolePanel.element);

        console.log('✅ Interface de simulation créée');
    }

    /**
     * Configure l'environnement 3D
     */
    private setupEnvironment(): void {
        // Ciel et brouillard
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 1000);
        this.renderer.renderer.setClearColor(0x87CEEB, 1);

        // Éclairage ambiant
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        this.simulationObjects.push(ambientLight);

        // Lumière du soleil
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 50, 50);
        sunLight.castShadow = true;
        this.scene.add(sunLight);
        this.simulationObjects.push(sunLight);

        // Sol
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.simulationObjects.push(ground);

        // Quelques nuages (simples sprites)
        this.createClouds();

        console.log('✅ Environnement configuré');
    }

    /**
     * Crée des nuages simples
     */
    private createClouds(): void {
        const cloudGeometry = new THREE.SphereGeometry(10, 16, 12);
        const cloudMaterial = new THREE.MeshLambertMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 5; i++) {
            const cloud = new THREE.Mesh(cloudGeometry, cloudMaterial);
            cloud.position.set(
                (Math.random() - 0.5) * 400,
                50 + Math.random() * 50,
                (Math.random() - 0.5) * 400
            );
            cloud.scale.set(
                1 + Math.random() * 2,
                0.5 + Math.random() * 0.5,
                1 + Math.random() * 2
            );
            this.scene.add(cloud);
            this.simulationObjects.push(cloud);
        }
    }

    /**
     * Crée le cerf-volant
     */
    private createKite(): void {
        try {
            this.kite = new Kite2();
            this.kite.position.set(0, 20, 0);
            this.scene.add(this.kite);
            this.simulationObjects.push(this.kite);

            // Focaliser la caméra sur le cerf-volant
            this.renderer.focusOn(this.kite);

            console.log('✅ Cerf-volant créé');
            this.consolePanel.addLog('info', '🪁 Cerf-volant créé', 'simulation');
        } catch (error) {
            console.error('❌ Erreur création cerf-volant:', error);
            this.consolePanel.addLog('error', `Erreur cerf-volant: ${error}`, 'simulation');
        }
    }

    /**
     * Configure les gestionnaires d'événements
     */
    private setupEventHandlers(): void {
        // Boutons de contrôle
        const playBtn = this.container.querySelector('#play-simulation') as HTMLButtonElement;
        const pauseBtn = this.container.querySelector('#pause-simulation') as HTMLButtonElement;
        const stopBtn = this.container.querySelector('#stop-simulation') as HTMLButtonElement;
        const resetBtn = this.container.querySelector('#reset-simulation') as HTMLButtonElement;
        const themeBtn = this.container.querySelector('#theme-toggle') as HTMLButtonElement;

        playBtn?.addEventListener('click', () => this.start());
        pauseBtn?.addEventListener('click', () => this.pause());
        stopBtn?.addEventListener('click', () => this.stop());
        resetBtn?.addEventListener('click', () => this.resetSimulation());
        themeBtn?.addEventListener('click', () => themeManager.toggleTheme());

        // Contrôle du vent
        const windSlider = this.container.querySelector('#wind-speed') as HTMLInputElement;
        const windValue = this.container.querySelector('#wind-value') as HTMLElement;

        windSlider?.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            this.windSpeed = parseFloat(target.value);
            windValue.textContent = `${this.windSpeed} m/s`;
            this.consolePanel.addLog('info', `Vent: ${this.windSpeed} m/s`, 'simulation');
        });

        // Événements de thème
        themeManager.onThemeChange((theme) => {
            this.consolePanel.addLog('info', `🎨 Thème: ${theme.name}`, 'theme');
        });

        console.log('✅ Gestionnaires d\'événements configurés');
    }

    /**
     * Configure les commandes de console
     */
    private setupConsoleCommands(): void {
        this.consolePanel.addCommand({
            name: 'wind',
            description: 'Change la vitesse du vent. Usage: wind <vitesse>',
            execute: (args) => {
                if (args.length === 0) {
                    return `Vitesse actuelle du vent: ${this.windSpeed} m/s`;
                }

                const speed = parseFloat(args[0]);
                if (isNaN(speed) || speed < 0 || speed > 50) {
                    return 'Erreur: Vitesse invalide (0-50 m/s)';
                }

                this.windSpeed = speed;
                const slider = this.container.querySelector('#wind-speed') as HTMLInputElement;
                const value = this.container.querySelector('#wind-value') as HTMLElement;

                if (slider) slider.value = speed.toString();
                if (value) value.textContent = `${speed} m/s`;

                return `Vitesse du vent changée à ${speed} m/s`;
            }
        });

        this.consolePanel.addCommand({
            name: 'reset',
            description: 'Remet à zéro la simulation',
            execute: () => {
                this.resetSimulation();
                return 'Simulation remise à zéro';
            }
        });

        this.consolePanel.addCommand({
            name: 'status',
            description: 'Affiche l\'état de la simulation',
            execute: () => {
                return `Simulation: ${this.isRunning ? 'En cours' : 'Arrêtée'}\nVent: ${this.windSpeed} m/s\nObjets: ${this.simulationObjects.length}`;
            }
        });

        console.log('✅ Commandes de console configurées');
    }

    /**
     * Boucle d'animation
     */
    private animate = (): void => {
        if (!this.isRunning) return;

        this.frameId = requestAnimationFrame(this.animate);

        // Simulation physique simple du cerf-volant
        if (this.kite) {
            this.updateKitePhysics();
        }

        // Le renderer gère le rendu
    };

    /**
     * Met à jour la physique du cerf-volant
     */
    private updateKitePhysics(): void {
        if (!this.kite) return;

        // Simulation simple de l'effet du vent
        const windForce = this.windSpeed * 0.1;

        // Oscillation due au vent
        const time = Date.now() * 0.001;
        this.kite.position.x = Math.sin(time * 0.5) * windForce;
        this.kite.position.z = Math.cos(time * 0.3) * windForce * 0.5;
        this.kite.rotation.y = Math.sin(time * 0.7) * 0.2;
        this.kite.rotation.z = Math.sin(time * 0.4) * 0.1;
    }

    /**
     * Remet à zéro la simulation
     */
    private resetSimulation(): void {
        this.stop();

        if (this.kite) {
            this.kite.position.set(0, 20, 0);
            this.kite.rotation.set(0, 0, 0);
        }

        this.consolePanel.addLog('info', '🔄 Simulation remise à zéro', 'simulation');
    }
}
