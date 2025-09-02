/**
 * CadApp.ts - Application CAD simple
 * Scène 3D pour visualiser les objets avec sélecteur sur la gauche
 */

import { ThreeRenderer } from '../renderer/ThreeRenderer.js';
import { ObjectLibraryPanel } from '../ui/panels/ObjectLibraryPanel.js';
import { themeManager } from '../ui/core/ThemeManager.js';
import { AutoLoader } from '../core/AutoLoader.js';
import * as THREE from 'three';

export interface CadAppConfig {
    container: HTMLElement;
    theme?: 'dark' | 'light' | 'high-contrast';
}

/**
 * Application CAD simple - Architecture KISS
 */
export class CadApp {
    private renderer!: ThreeRenderer;
    private container: HTMLElement;
    private objectLibraryPanel!: ObjectLibraryPanel;
    private scene!: THREE.Scene;
    private camera!: THREE.PerspectiveCamera;
    private config: Required<CadAppConfig>;

    // Gestion des objets
    private currentObject: THREE.Object3D | null = null;
    private autoLoader: AutoLoader | null = null;
    private isInitialized = false;

    constructor(config: CadAppConfig) {
        this.container = config.container;
        this.config = {
            theme: 'dark',
            ...config
        };
    }

    /**
     * Initialisation de l'application CAD
     */
    public async init(): Promise<void> {
        if (this.isInitialized) return;

        console.log('🎨 Initialisation CadApp...');

        try {
            // 1. Configuration du thème
            themeManager.setTheme(this.config.theme);

            // 2. Initialisation du renderer 3D
            this.renderer = new ThreeRenderer({
                canvasContainer: this.container,
                backgroundColor: '#2a2a3e',
                fog: false,
                shadows: true,
                antialias: true,
                cameraPosition: [5, 5, 5] // Position plus éloignée
            });

            // 3. Références aux composants Three.js
            this.scene = this.renderer.scene;
            this.camera = this.renderer.camera;

            // 4. Initialisation de l'AutoLoader pour charger les objets
            this.autoLoader = new AutoLoader();

            // 5. Configuration de la scène
            this.setupScene();

            // 6. Initialisation du sélecteur d'objets
            this.objectLibraryPanel = new ObjectLibraryPanel();
            this.objectLibraryPanel.render();

            // 7. Chargement des catégories d'objets
            await this.loadObjectCategories();

            // 8. Connexion des événements
            this.setupEventListeners();

            // 9. Le renderer démarre automatiquement
            this.isInitialized = true;
            console.log('✅ CadApp initialisée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de CadApp:', error);
            throw error;
        }
    }

    /**
     * Configuration de base de la scène 3D
     */
    private setupScene(): void {
        // L'éclairage est déjà configuré par ThreeRenderer
        // On peut ajouter un éclairage supplémentaire si nécessaire

        // Ajouter une lumière supplémentaire pour mieux voir les objets
        const additionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        additionalLight.position.set(-5, 5, -5);
        this.scene.add(additionalLight);

        // Grille de sol plus visible et plus grande
        const gridHelper = new THREE.GridHelper(50, 50, 0x666666, 0x333333);
        this.scene.add(gridHelper);

        // Axes pour l'orientation plus grands
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        // Ajouter un plan de sol pour les ombres
        const planeGeometry = new THREE.PlaneGeometry(50, 50);
        const planeMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333, 
            transparent: true, 
            opacity: 0.3 
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.receiveShadow = true;
        this.scene.add(plane);

        console.log('✅ Scène CAD configurée avec éclairage amélioré');
    }

    /**
     * Configuration des écouteurs d'événements
     */
    private setupEventListeners(): void {
        // Écouteur pour la sélection d'objets
        this.objectLibraryPanel.onSelect((objectId: string) => {
            this.loadById(objectId);
        });
    }

    /**
     * Chargement des catégories d'objets depuis l'AutoLoader
     */
    private async loadObjectCategories(): Promise<void> {
        if (!this.autoLoader) return;

        try {
            const categories = await this.autoLoader.getCategories();
            this.objectLibraryPanel.setCategories(categories);
            console.log(`📚 ${Object.keys(categories).length} catégories d'objets chargées`);
        } catch (error) {
            console.error('❌ Erreur lors du chargement des catégories:', error);
        }
    }

    /**
     * Chargement d'un objet par son ID (appelé depuis main.ts)
     */
    public async loadById(objectId: string): Promise<void> {
        if (!this.autoLoader) {
            console.warn('⚠️ AutoLoader non initialisé');
            return;
        }

        try {
            console.log(`📦 Chargement de l'objet: ${objectId}`);

            // Suppression de l'objet actuel
            if (this.currentObject) {
                this.scene.remove(this.currentObject);
                this.currentObject = null;
            }

            // Création de l'objet via AutoLoader
            const structuredObject = await this.autoLoader.create(objectId);
            if (!structuredObject) {
                console.warn(`⚠️ Impossible de créer l'objet: ${objectId}`);
                return;
            }

            // Positionner l'objet au centre de la scène
            structuredObject.position.set(0, 0, 0);

            // Ajuster l'échelle si l'objet est trop petit
            this.adjustObjectScale(structuredObject);

            // Ajouter à la scène
            this.scene.add(structuredObject);
            this.currentObject = structuredObject;

            // Centrer la caméra sur l'objet
            this.focusOnObject(structuredObject);

            // Forcer le rendu pour s'assurer que l'objet est visible
            this.renderer.renderer.render(this.scene, this.camera);

            console.log(`✅ Objet chargé et centré: ${objectId}`);

        } catch (error) {
            console.error(`❌ Erreur lors du chargement de l'objet ${objectId}:`, error);
        }
    }

    /**
     * Centrer la caméra sur un objet
     */
    private focusOnObject(object: THREE.Object3D): void {
        // Calculer la bounding box de l'objet
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Calculer la distance optimale pour la caméra
        const maxSize = Math.max(size.x, size.y, size.z);
        const distance = Math.max(maxSize * 2, 5); // Distance minimale de 5 unités

        // Positionner la caméra
        this.camera.position.set(
            center.x + distance,
            center.y + distance * 0.5,
            center.z + distance
        );

        // Orienter la caméra vers le centre de l'objet
        this.camera.lookAt(center);

        // Mettre à jour les contrôles si disponibles
        if (this.renderer.controls) {
            this.renderer.controls.target.copy(center);
            this.renderer.controls.update();
        }

        console.log(`📷 Caméra centrée sur l'objet - Distance: ${distance.toFixed(2)}`);
    }

    /**
     * Ajuster l'échelle d'un objet s'il est trop petit
     */
    private adjustObjectScale(object: THREE.Object3D): void {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z);

        // Si l'objet est trop petit (< 0.5 unités), l'agrandir
        if (maxSize < 0.5) {
            const scale = 0.5 / maxSize;
            object.scale.setScalar(scale);
            console.log(`🔍 Objet agrandi - Échelle: ${scale.toFixed(2)}x`);
        }
        // Si l'objet est trop grand (> 10 unités), le réduire
        else if (maxSize > 10) {
            const scale = 10 / maxSize;
            object.scale.setScalar(scale);
            console.log(`🔍 Objet réduit - Échelle: ${scale.toFixed(2)}x`);
        }
    }

    /**
     * Destruction propre de l'application
     */
    public destroy(): void {
        if (this.renderer) {
            this.renderer.stopRenderLoop();
        }

        if (this.currentObject) {
            this.scene.remove(this.currentObject);
        }

        this.isInitialized = false;
        console.log('🗑️ CadApp détruite');
    }

    /**
     * Diagnostic de l'objet actuel
     */
    public diagnoseCurrentObject(): void {
        if (!this.currentObject) {
            console.log('❌ Aucun objet chargé');
            return;
        }

        console.log('🔍 Diagnostic de l\'objet actuel:');
        console.log(`  - Type: ${this.currentObject.type}`);
        console.log(`  - Position: (${this.currentObject.position.x.toFixed(2)}, ${this.currentObject.position.y.toFixed(2)}, ${this.currentObject.position.z.toFixed(2)})`);
        console.log(`  - Échelle: (${this.currentObject.scale.x.toFixed(2)}, ${this.currentObject.scale.y.toFixed(2)}, ${this.currentObject.scale.z.toFixed(2)})`);
        console.log(`  - Visible: ${this.currentObject.visible}`);
        console.log(`  - Enfants: ${this.currentObject.children.length}`);

        // Calculer la bounding box
        const box = new THREE.Box3().setFromObject(this.currentObject);
        const size = box.getSize(new THREE.Vector3());
        console.log(`  - Dimensions: ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)}`);

        // Vérifier les matériaux
        this.currentObject.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
                console.log(`  - Mesh "${child.name}": Matériau ${child.material.type}`);
            }
        });
    }

    /**
     * Obtenir l'objet actuellement affiché
     */
    public getCurrentObject(): THREE.Object3D | null {
        return this.currentObject;
    }

    /**
     * Accès aux composants pour extension future
     */
    public getRenderer(): ThreeRenderer {
        return this.renderer;
    }

    public getObjectLibraryPanel(): ObjectLibraryPanel {
        return this.objectLibraryPanel;
    }
}
