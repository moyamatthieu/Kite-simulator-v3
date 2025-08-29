/**
 * ThreeRenderer.ts - Renderer Th    constructor(config: RendererConfig = {}) {
        this.config = {
            canvasContainer: document.body,
            backgroundColor: '#1a1a2e',
            fog: true,
            shadows: true,
            antialias: true,
            cameraPosition: [2, 1.5, 2], // Position équilibrée pour petits et grands objets
            ...config
        };lé
 * Encapsule toute la logique de rendu Three.js
 * 🎮 Interface propre pour faciliter la migration vers Godot
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Node3D } from '@core/Node3D';

export interface RendererConfig {
    canvasContainer?: HTMLElement;
    backgroundColor?: string;
    fog?: boolean;
    shadows?: boolean;
    antialias?: boolean;
    cameraPosition?: [number, number, number];
}

/**
 * Renderer Three.js avec API simple et modulaire
 */
export class ThreeRenderer {
    // 🎮 Composants Core
    public scene!: THREE.Scene;
    public camera!: THREE.PerspectiveCamera;
    public renderer!: THREE.WebGLRenderer;
    public controls!: OrbitControls;

    // 🎯 État
    private animationId: number | null = null;
    private clock = new THREE.Clock();
    private rootNode: Node3D | null = null;

    // 🔧 Configuration
    private config: Required<RendererConfig>;

    constructor(config: RendererConfig = {}) {
        this.config = {
            canvasContainer: document.body,
            backgroundColor: '#1a1a2e',
            fog: true,
            shadows: true,
            antialias: true,
            cameraPosition: [0.1, 0.1, 0.1], // Position adaptée aux objets millimétriques
            ...config
        };

        this.initializeScene();
        this.initializeCamera();
        this.initializeRenderer();
        this.initializeControls();
        this.initializeLighting();
        this.initializeHelpers();

        this.startRenderLoop();
        this.setupResizeHandler();
    }

    // === 🏗️ Initialisation ===

    private initializeScene(): void {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);

        if (this.config.fog) {
            this.scene.fog = new THREE.Fog(this.config.backgroundColor, 5, 20); // Brouillard équilibré pour tous les objets
        }
    }

    private initializeCamera(): void {
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.01, // Near plane adapté aux petits objets (1mm)
            10    // Far plane adapté aux petits objets (10 unités = 10m)
        );

        const [x, y, z] = this.config.cameraPosition;
        this.camera.position.set(x, y, z);
    }

    private initializeRenderer(): void {
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
    }

    private initializeControls(): void {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.maxPolarAngle = Math.PI;
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
    }

    private initializeHelpers(): void {
        // Grille de référence
        const gridHelper = new THREE.GridHelper(10, 20, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // Axes de référence (X=rouge, Y=vert, Z=bleu)
        const axesHelper = new THREE.AxesHelper(2);
        this.scene.add(axesHelper);
    }

    // === 🔄 Boucle de Rendu ===

    private startRenderLoop(): void {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);

            const delta = this.clock.getDelta();

            // Mettre à jour les contrôles
            this.controls.update();

            // Mettre à jour le node racine et ses enfants
            if (this.rootNode) {
                this.rootNode.update(delta);
            }

            // Rendu
            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }

    public stopRenderLoop(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    // === 🎯 Gestion des Objets ===

    /**
     * Définit l'objet racine à afficher
     */
    public setRootNode(node: Node3D | null): void {
        // Retirer l'ancien objet
        if (this.rootNode) {
            this.scene.remove(this.rootNode);
        }

        // Ajouter le nouveau
        this.rootNode = node;
        if (this.rootNode) {
            this.scene.add(this.rootNode);
        }
    }

    /**
     * Ajouter un objet à la scène
     */
    public addToScene(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    /**
     * Retirer un objet de la scène
     */
    public removeFromScene(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    /**
     * Vider la scène (garde l'éclairage et helpers)
     */
    public clearScene(): void {
        const objectsToRemove: THREE.Object3D[] = [];

        this.scene.traverse((child) => {
            if (child !== this.scene &&
                !(child instanceof THREE.Light) &&
                !(child instanceof THREE.GridHelper) &&
                !(child instanceof THREE.AxesHelper)) {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
        });

        this.rootNode = null;
    }

    // === 🎮 Caméra et Contrôles ===

    /**
     * Centre la caméra sur un objet
     */
    public focusOn(object: THREE.Object3D): void {
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Distance appropriée adaptée à la taille de l'objet
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

        // Positionner la caméra
        this.camera.position.copy(center);
        this.camera.position.y += distance * 0.4;
        this.camera.position.z += distance;

        // Regarder le centre
        this.camera.lookAt(center);
        this.controls.target.copy(center);
        this.controls.update();

        console.log(`📹 Focus on object - Size: ${maxSize.toFixed(3)}, Distance: ${distance.toFixed(3)}`);
    }

    /**
     * Remet la caméra en position par défaut
     */
    public resetCamera(): void {
        const [x, y, z] = this.config.cameraPosition;
        this.camera.position.set(x, y, z);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    // === 🔧 Utilitaires ===

    /**
     * Redimensionnement automatique
     */
    private setupResizeHandler(): void {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    /**
     * Capture d'écran
     */
    public takeScreenshot(filename: string = 'screenshot.png'): void {
        this.renderer.render(this.scene, this.camera);

        const canvas = this.renderer.domElement;
        const link = document.createElement('a');
        link.download = filename;
        link.href = canvas.toDataURL();
        link.click();
    }

    /**
     * Active/désactive le wireframe pour tout
     */
    public setWireframeMode(enabled: boolean): void {
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat instanceof THREE.Material) {
                            (mat as any).wireframe = enabled;
                        }
                    });
                } else if (child.material instanceof THREE.Material) {
                    (child.material as any).wireframe = enabled;
                }
            }
        });
    }

    /**
     * Nettoyage
     */
    public dispose(): void {
        this.stopRenderLoop();
        this.renderer.dispose();
        this.controls.dispose();

        // Nettoyer le DOM
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
    }
}
