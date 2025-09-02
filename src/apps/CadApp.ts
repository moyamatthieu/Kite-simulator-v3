/**
 * CadApp.ts - Application CAD simple
 * Scène 3D pour visualiser les objets avec sélecteur sur la gauche
 */

import { ThreeRenderer } from '../renderer/ThreeRenderer';
import { ObjectLibraryPanel } from '../ui/panels/ObjectLibraryPanel';
import { themeManager } from '../ui/core/ThemeManager';
import { AutoLoader } from '../core/AutoLoader';
import * as THREE from 'three';

export interface CadAppConfig {
    container: HTMLElement;
    renderer?: ThreeRenderer; // Renderer optionnel - si fourni, on l'utilise
    theme?: 'dark' | 'light' | 'high-contrast';
}

/**
 * Application CAD simple - Architecture KISS
 */
export class CadApp {
    private renderer!: ThreeRenderer;
    private container: HTMLElement;
    private objectLibraryPanel!: ObjectLibraryPanel;
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
            if (this.config.renderer) {
                // Utiliser le renderer fourni
                this.renderer = this.config.renderer;
                console.log('🎨 Utilisation du renderer existant');
            } else {
                // Créer un nouveau renderer
                this.renderer = new ThreeRenderer({
                    canvasContainer: this.container,
                    backgroundColor: '#2a2a3e',
                    fog: false,
                    shadows: true,
                    antialias: true,
                    cameraPosition: [5, 4, 5] // Position appropriée pour voir les objets
                });
                console.log('🎨 Nouveau renderer créé');
            }

            // 3. Initialisation de l'AutoLoader pour charger les objets
            this.autoLoader = new AutoLoader();

            // 4. Configuration de la scène (le renderer gère déjà l'éclairage de base)
            this.setupScene();

            // 5. Initialisation du sélecteur d'objets
            this.objectLibraryPanel = new ObjectLibraryPanel();
            this.objectLibraryPanel.render();

            // 6. Chargement des catégories d'objets
            await this.loadObjectCategories();

            // 7. Connexion des événements
            this.setupEventListeners();

            // 8. Le renderer démarre automatiquement sa boucle
            this.isInitialized = true;
            console.log('✅ CadApp initialisée avec succès');

        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de CadApp:', error);
            throw error;
        }
    }

    /**
     * Configuration de base de la scène 3D (éclairage supplémentaire uniquement)
     */
    private setupScene(): void {
        // Le ThreeRenderer gère déjà l'éclairage de base, la grille et les axes
        // On ajoute seulement un éclairage supplémentaire pour mieux voir les objets
        
        const additionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
        additionalLight.position.set(-5, 5, -5);
        this.renderer.addToScene(additionalLight);

        console.log('✅ Scène CAD configurée avec éclairage supplémentaire');
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

            // Suppression de l'objet actuel via l'API du renderer
            if (this.currentObject) {
                this.renderer.removeFromScene(this.currentObject);
                this.currentObject = null;
            }

            // Création de l'objet via AutoLoader
            const structuredObject = await this.autoLoader.create(objectId);
            if (!structuredObject) {
                console.warn(`⚠️ Impossible de créer l'objet: ${objectId}`);
                return;
            }

            console.log(`🆕 Nouvelle instance créée: ${objectId}`);

            // Positionner l'objet au centre de la scène
            structuredObject.position.set(0, 0, 0);

            // Ajouter à la scène via l'API du renderer
            this.renderer.addToScene(structuredObject);
            this.currentObject = structuredObject;

            // Centrer la caméra sur l'objet
            this.renderer.focusOn(structuredObject);

            console.log(`✅ Objet chargé et centré: ${objectId}`);

        } catch (error) {
            console.error(`❌ Erreur lors du chargement de l'objet ${objectId}:`, error);
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
            this.renderer.removeFromScene(this.currentObject);
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
