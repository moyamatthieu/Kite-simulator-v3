/**
 * SceneManager.ts - Gère la scène Three.js, l'éclairage et les helpers
 * Sépare les responsabilités de la scène du ThreeRenderer principal.
 */

import * as THREE from 'three';
import { Node3D } from '@core/Node3D';
import { logger } from '@core/Logger';

export interface SceneConfig {
    backgroundColor?: string;
    fog?: boolean;
    shadows?: boolean;
}

export class SceneManager {
    public scene: THREE.Scene;
    private config: Required<SceneConfig>;
    private rootNode: Node3D | null = null;

    constructor(sceneConfig: SceneConfig = {}) {
        this.config = {
            backgroundColor: '#1a1a2e',
            fog: true,
            shadows: true,
            ...sceneConfig
        };

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);

        if (this.config.fog) {
            this.scene.fog = new THREE.Fog(this.config.backgroundColor, 5, 20);
        }

        this.initializeLighting();
        this.initializeHelpers();
        logger.debug('SceneManager initialisé', 'SceneManager');
    }

    private initializeLighting(): void {
        // Lumière ambiante douce
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Lumière directionnelle principale
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 10, 5);
        directionalLight.castShadow = this.config.shadows;

        if (this.config.shadows) {
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.5;
            directionalLight.shadow.camera.far = 50;
        }

        this.scene.add(directionalLight);

        // Lumière de remplissage
        const fillLight = new THREE.DirectionalLight(0x404040, 0.3);
        fillLight.position.set(-10, 5, -5);
        this.scene.add(fillLight);
        logger.debug('Éclairage initialisé', 'SceneManager');
    }

    private initializeHelpers(): void {
        // Grille de référence
        const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // Axes de référence (X=rouge, Y=vert, Z=bleu)
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
        logger.debug('Helpers initialisés', 'SceneManager');
    }

    /**
     * Définit l'objet racine à afficher
     */
    public setRootNode(node: Node3D | null): void {
        // Retirer l'ancien objet
        if (this.rootNode) {
            this.scene.remove(this.rootNode);
            (this.rootNode as any).dispose?.(); // Appeler dispose si disponible
        }

        // Ajouter le nouveau
        this.rootNode = node;
        if (this.rootNode) {
            this.scene.add(this.rootNode);
            logger.info(`Root node défini: ${node?.name || 'aucun'}`, 'SceneManager');
        } else {
            logger.info('Root node retiré', 'SceneManager');
        }
    }

    /**
     * Ajouter un objet à la scène
     */
    public addToScene(object: THREE.Object3D): void {
        this.scene.add(object);
        logger.debug(`Objet ajouté à la scène: ${object.name}`, 'SceneManager');
    }

    /**
     * Retirer un objet de la scène
     */
    public removeFromScene(object: THREE.Object3D): void {
        this.scene.remove(object);
        logger.debug(`Objet retiré de la scène: ${object.name}`, 'SceneManager');
    }

    /**
     * Vider la scène (garde l'éclairage et helpers)
     */
    public clearScene(): void {
        const objectsToRemove: THREE.Object3D[] = [];

        this.scene.traverse((child) => {
            // Ne pas retirer la scène elle-même, les lumières ou les helpers
            if (child !== this.scene &&
                !(child instanceof THREE.Light) &&
                !(child instanceof THREE.GridHelper) &&
                !(child instanceof THREE.AxesHelper)) {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            (obj as any).dispose?.(); // Tenter de disposer l'objet s'il a une méthode dispose
        });

        this.rootNode = null;
        logger.info('Scène nettoyée', 'SceneManager');
    }

    /**
     * Obtenir la scène Three.js
     */
    public getScene(): THREE.Scene {
        return this.scene;
    }

    /**
     * Mettre à jour le node racine et ses enfants (à appeler dans la boucle de rendu)
     */
    public updateRootNode(delta: number): void {
        if (this.rootNode) {
            this.rootNode.update(delta);
        }
    }
}