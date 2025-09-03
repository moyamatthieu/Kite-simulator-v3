/**
 * ThreeRenderer.ts - Orchestrateur de rendu Three.js
 * Coordonne les gestionnaires de caméra, scène et boucle de rendu
 */

import * as THREE from 'three';
import { CameraManager, CameraConfig } from './managers/CameraManager';
import { SceneManager, SceneConfig } from './managers/SceneManager';
import { RenderLoop, RenderLoopCallback } from './managers/RenderLoop';
import { Node3D } from '@core/Node3D';
import { RendererUtils } from '@/utils/RendererUtils';
import { logger } from '@core/Logger';

export interface ThreeRendererConfig {
    canvasContainer?: HTMLElement;
    camera?: CameraConfig;
    scene?: SceneConfig;
    shadows?: boolean;
    antialias?: boolean;
}

/**
 * Renderer Three.js avec API simple et modulaire
 * Agit comme un orchestrateur pour diverses sous-parties du rendu.
 */
export class ThreeRenderer {
    public renderer!: THREE.WebGLRenderer; // Le renderer Three.js est toujours géré ici
    public cameraManager: CameraManager;
    public sceneManager: SceneManager;
    public renderLoop: RenderLoop;

    private config: Required<Pick<ThreeRendererConfig, 'canvasContainer' | 'shadows' | 'antialias'>>;

    constructor(config: ThreeRendererConfig = {}) {
        this.config = {
            canvasContainer: document.body,
            shadows: true,
            antialias: true,
            ...config
        };

        // Initialiser le renderer Three.js
        this.renderer = new THREE.WebGLRenderer({
            antialias: this.config.antialias
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        if (this.config.shadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        this.config.canvasContainer.appendChild(this.renderer.domElement);
        logger.debug('THREE.WebGLRenderer initialisé', 'ThreeRenderer');

        // Initialiser les gestionnaires avec injection des dépendances
        this.cameraManager = new CameraManager(config.camera, this.renderer.domElement);
        this.sceneManager = new SceneManager(config.scene);
        this.renderLoop = new RenderLoop();

        // Ajout des fonctions de rendu et de mise à jour à la boucle de rendu
        this.renderLoop.addCallback(this.update.bind(this));
        this.renderLoop.start(); // Démarrer la boucle de rendu

        this.setupResizeHandler();
        logger.info('ThreeRenderer orchestrateur initialisé', 'ThreeRenderer');
    }

    private update(delta: number): void {
        // Mettre à jour les contrôles de la caméra
        this.cameraManager.updateControls();

        // Mettre à jour le rootNode de la scène
        this.sceneManager.updateRootNode(delta);

        // Effectuer le rendu
        this.renderer.render(this.sceneManager.getScene(), this.cameraManager.camera);
    }

    /**
     * Définit l'objet racine à afficher
     */
    public setRootNode(node: Node3D | null): void {
        this.sceneManager.setRootNode(node);
    }

    /**
     * Ajouter un objet à la scène
     */
    public addToScene(object: THREE.Object3D): void {
        this.sceneManager.addToScene(object);
    }

    /**
     * Retirer un objet de la scène
     */
    public removeFromScene(object: THREE.Object3D): void {
        this.sceneManager.removeFromScene(object);
    }

    /**
     * Vider la scène (garde l'éclairage et helpers)
     */
    public clearScene(): void {
        this.sceneManager.clearScene();
    }

    /**
     * Centre la caméra sur un objet
     */
    public focusOn(object: THREE.Object3D | Node3D): void {
        this.cameraManager.focusOn(object);
    }

    /**
     * Remet la caméra en position par défaut
     */
    public resetCamera(): void {
        this.cameraManager.resetCamera();
    }

    /**
     * Redimensionnement automatique
     */
    private setupResizeHandler(): void {
        window.addEventListener('resize', this.onWindowResize);
    }

    private onWindowResize = () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // La caméra est gérée par CameraManager
    };

    /**
     * Capture d'écran
     */
    public takeScreenshot(filename: string = 'screenshot.png'): void {
        RendererUtils.takeScreenshot(this.renderer, this.sceneManager.getScene(), this.cameraManager.camera, filename);
    }

    /**
     * Active/désactive le wireframe pour tout
     */
    public setWireframeMode(enabled: boolean): void {
        RendererUtils.setWireframeMode(this.sceneManager.getScene(), enabled);
    }

    /**
     * Nettoyage de toutes les ressources
     */
    public dispose(): void {
        this.renderLoop.stop();
        this.renderer.dispose();
        this.cameraManager.dispose();
        // Pas besoin de dispose pour SceneManager car il ne crée pas d'éléments DOM ou de listeners globaux.
        // Si d'autres ressources étaient gérées par SceneManager, elles seraient disposées ici.

        // Nettoyer le DOM
        if (this.config.canvasContainer && this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        window.removeEventListener('resize', this.onWindowResize);
        logger.info('ThreeRenderer orchestrateur nettoyé', 'ThreeRenderer');
    }
}
