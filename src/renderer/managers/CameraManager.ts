/**
 * CameraManager.ts - Gère la caméra et ses interactions
 * Sépare les responsabilités de la caméra du ThreeRenderer principal.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Node3D } from '@core/Node3D'; // Pour la compatibilité avec Node3D
import { logger } from '@core/Logger';

export interface CameraConfig {
    fov?: number;
    aspect?: number;
    near?: number;
    far?: number;
    position?: [number, number, number];
    container?: HTMLElement;
}

export class CameraManager {
    public camera: THREE.PerspectiveCamera;
    public controls: OrbitControls;
    private config: Required<CameraConfig>;

    constructor(cameraConfig: CameraConfig = {}, rendererDomElement: HTMLElement) {
        this.config = {
            fov: 75,
            aspect: window.innerWidth / window.innerHeight,
            near: 0.01,
            far: 10,
            position: [0.1, 0.1, 0.1], // Position adaptée aux objets millimétriques
            container: document.body, // Default, will be overridden by rendererDomElement
            ...cameraConfig
        };

        this.camera = new THREE.PerspectiveCamera(
            this.config.fov,
            this.config.aspect,
            this.config.near,
            this.config.far
        );
        const [x, y, z] = this.config.position;
        this.camera.position.set(x, y, z);

        this.controls = new OrbitControls(this.camera, rendererDomElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI;

        this.setupResizeHandler();
        logger.debug('CameraManager initialisé', 'CameraManager');
    }

    /**
     * Centre la caméra sur un objet (THREE.Object3D ou Node3D)
     */
    public focusOn(object: THREE.Object3D | Node3D): void {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxSize = Math.max(size.x, size.y, size.z);

        let distance;
        if (maxSize < 0.1) {
            // Petits objets (millimétriques) - distance réduite
            distance = Math.max(maxSize * 4, 0.08);
        } else if (maxSize < 1) {
            // Objets moyens (centimétriques)
            distance = Math.max(maxSize * 3, 0.3);
        } else {
            // Grands objets (métriques et plus)
            distance = Math.max(maxSize * 2, 1);
        }

        this.camera.position.copy(center);
        this.camera.position.y += distance * 0.4;
        this.camera.position.z += distance;

        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();

        logger.info(`Focus sur l'objet: ${object.name} - Taille: ${maxSize.toFixed(3)}, Distance: ${distance.toFixed(3)}`, 'CameraManager');
    }

    /**
     * Remet la caméra en position par défaut
     */
    public resetCamera(): void {
        const [x, y, z] = this.config.position;
        this.camera.position.set(x, y, z);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
        logger.info('Caméra réinitialisée', 'CameraManager');
    }

    /**
     * Met à jour la caméra et les contrôles (à appeler dans la boucle de rendu)
     */
    public updateControls(): void {
        this.controls.update();
    }

    /**
     * Gère le redimensionnement de la fenêtre
     */
    private setupResizeHandler(): void {
        window.addEventListener('resize', this.onWindowResize);
    }

    private onWindowResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        // Le renderer sera mis à jour par ThreeRenderer
    };

    /**
     * Nettoie les ressources
     */
    public dispose(): void {
        this.controls.dispose();
        window.removeEventListener('resize', this.onWindowResize);
        logger.debug('CameraManager nettoyé', 'CameraManager');
    }
}