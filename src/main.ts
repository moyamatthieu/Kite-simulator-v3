/**
 * CAO KISS - Point d'entrée principal
 * Architecture modulaire avec hot reload automatique du dossier /src/objects
 * 🎮 Compatible Godot via Node3D + ThreeRenderer
 */

import { ThreeRenderer } from '@renderer';
import { GodotExporter, OBJExporter } from '@export';
import { AutoLoader } from '@core/AutoLoader';
import { StructuredObject } from '@core/StructuredObject';

// === Application principale KISS avec Hot Reload automatique ===

class App {
    private renderer: ThreeRenderer;
    private autoLoader: AutoLoader;
    private currentObject: StructuredObject | null = null;
    private currentObjectId: string = 'table';
    private isAnimating = false;
    private showingLabels = false;
    private showingDebugPoints = false;

    constructor() {
        console.log('🚀 Démarrage de CAO KISS v3.0 - avec Car!');

        // 🏗️ Initialiser l'auto-loader
        this.autoLoader = new AutoLoader();

        // 🎮 Initialiser le renderer
        this.renderer = new ThreeRenderer({
            canvasContainer: document.getElementById('app')!,
            backgroundColor: '#1a1a2e',
            cameraPosition: [5, 4, 5]
        });

        // 🎯 Configuration initiale
        this.init();

        // Exposer l'instance globalement
        (window as any).app = this;
    }

    private async init(): Promise<void> {
        // Restaurer l'état depuis sessionStorage
        this.restoreState();

        // Attendre que tous les objets soient chargés
        await this.generateObjectButtons();

        // Charger l'objet précédent ou la table par défaut
        await this.loadObject(this.currentObjectId);

        // Restaurer l'état des contrôles
        if (this.showingDebugPoints) {
            this.toggleDebugPoints();
        }
        if (this.showingLabels) {
            this.toggleLabels();
        }

        this.setupControls();
        this.setupModeSelector();
        this.setupExportButton();
    }

    /**
     * Sauvegarde l'état actuel dans sessionStorage
     */
    private saveState(): void {
        const state = {
            currentObjectId: this.currentObjectId,
            showingLabels: this.showingLabels,
            showingDebugPoints: this.showingDebugPoints,
            isAnimating: this.isAnimating
        };
        sessionStorage.setItem('appState', JSON.stringify(state));
    }

    /**
     * Restaure l'état depuis sessionStorage
     */
    private restoreState(): void {
        const savedState = sessionStorage.getItem('appState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                this.currentObjectId = state.currentObjectId || 'table';
                this.showingLabels = state.showingLabels || false;
                this.showingDebugPoints = state.showingDebugPoints || false;
                this.isAnimating = state.isAnimating || false;
                console.log('🔄 État restauré:', state);
            } catch (error) {
                console.error('Erreur lors de la restauration de l\'état:', error);
            }
        }
    }

    // === 🎯 Gestion des Objets ===

    async loadObject(id: string): Promise<void> {
        console.log(`🎯 Chargement de l'objet: ${id}`);

        try {
            const objectInstance = await this.autoLoader.create(id);
            if (!objectInstance) {
                console.error(`❌ Objet '${id}' non trouvé`);
                return;
            }

            // Cast vers StructuredObject (tous nos objets héritent de StructuredObject)
            const structuredObject = objectInstance as StructuredObject;

            // Nettoyer l'ancien objet
            this.renderer.clearScene();

            // Ajouter le nouveau comme root node
            this.currentObject = structuredObject;
            this.currentObjectId = id;
            this.renderer.setRootNode(structuredObject);

            // Centrer la caméra sur l'objet
            this.renderer.focusOn(structuredObject);

            // Mettre à jour l'UI
            await this.updateObjectInfo(structuredObject, id);

            // Sauvegarder l'état
            this.saveState();

            console.log(`✅ Objet '${id}' chargé avec succès`);

        } catch (error) {
            console.error(`❌ Erreur lors du chargement de '${id}':`, error);
        }
    }

    private async updateObjectInfo(object: StructuredObject, id: string): Promise<void> {
        const info = document.getElementById('object-info');
        if (info && 'getName' in object && 'getDescription' in object) {
            const objectInfo = await this.autoLoader.getObjectInfo(id);
            const name = (object as any).getName();
            const description = (object as any).getDescription();
            const primitiveCount = (object as any).getPrimitiveCount?.() || object.children.length;

            info.innerHTML = `
                <h3>${name}</h3>
                <p>${description}</p>
                <p>Primitives: ${primitiveCount}</p>
                <p>Points: ${object.getPointCount()}</p>
                <p>ID: ${object.nodeId}</p>
                <p>Classe: ${objectInfo?.className || 'N/A'}</p>
            `;
        }
    }

    // === 🎮 Contrôles UI ===

    private setupControls(): void {
        // Bouton Reset
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.onclick = () => this.resetView();
        }

        // Bouton Explode (Debug points)
        const explodeBtn = document.getElementById('explode-btn');
        if (explodeBtn) {
            explodeBtn.onclick = () => this.toggleDebugPoints();
        }

        // Bouton Labels
        const labelsBtn = document.getElementById('labels-btn');
        if (labelsBtn) {
            labelsBtn.onclick = () => this.toggleLabels();
        }

        // Bouton Animation
        const animateBtn = document.getElementById('animate-btn');
        if (animateBtn) {
            animateBtn.onclick = () => this.toggleAnimation();
        }

        // Boutons de sélection d'objets
        this.setupObjectButtons();
    }

    /**
     * Configure le sélecteur de mode CAO/Simulation
     */
    private setupModeSelector(): void {
        const simBtn = document.getElementById('mode-simulation');
        const caoBtn = document.getElementById('mode-cao');

        if (simBtn) {
            simBtn.onclick = () => {
                // Sauvegarder l'état avant de basculer
                this.saveState();
                
                // Ajouter une transition douce
                document.body.style.transition = 'opacity 0.3s';
                document.body.style.opacity = '0';
                
                setTimeout(() => {
                    // Rediriger vers la page de simulation
                    window.location.href = '/simulation.html';
                }, 300);
            };
        }
        
        // Le bouton CAO est déjà actif sur cette page
        if (caoBtn) {
            caoBtn.classList.add('active');
        }
    }

    private async setupObjectButtons(): Promise<void> {
        const objectIds = await this.autoLoader.getAllIds();

        objectIds.forEach((id: string) => {
            const button = document.querySelector(`[data-object="${id}"]`) as HTMLButtonElement;
            if (button) {
                button.onclick = () => this.loadObject(id);
            }
        });
    }

    /**
     * Génère automatiquement les boutons d'objets basés sur l'AutoLoader
     */
    private async generateObjectButtons(): Promise<void> {
        const selector = document.querySelector('.object-selector');
        if (!selector) return;

        // Vider le sélecteur
        selector.innerHTML = '';

        try {
            // Obtenir les catégories d'objets
            const categories = await this.autoLoader.getCategories();

            Object.entries(categories).forEach(([categoryName, objects]) => {
                if (objects.length === 0) return;

                // Ajouter le label de catégorie
                const categoryLabel = document.createElement('div');
                categoryLabel.className = 'category-label';
                categoryLabel.textContent = categoryName;
                selector.appendChild(categoryLabel);

                // Ajouter les boutons d'objets
                objects.forEach(obj => {
                    const button = document.createElement('button');
                    button.setAttribute('data-object', obj.id);
                    button.textContent = `${this.getObjectIcon(obj.id)} ${obj.name}`;
                    button.onclick = () => this.loadObject(obj.id);
                    selector.appendChild(button);
                });
            });

            console.log('🎮 Boutons d\'objets générés automatiquement');

        } catch (error) {
            console.error('❌ Erreur lors de la génération des boutons:', error);
        }
    }

    /**
     * Retourne l'icône appropriée pour un objet
     */
    private getObjectIcon(id: string): string {
        const icons: Record<string, string> = {
            'table': '🪑',
            'chair': '🪑',
            'simplechair': '📐',
            'modularchair': '🔧',
            'box': '📦',
            'cube': '🎲',
            'car': '🚗',
            'pyramid': '🔺',
            'gear': '⚙️',
            'fractaltree': '🌳',
            'kite': '🪁'
        };
        return icons[id] || '📦';
    }

    private setupExportButton(): void {
        // Bouton Export Godot
        const exportGodotBtn = document.getElementById('export-godot-btn');
        if (!exportGodotBtn) {
            // Créer le bouton s'il n'existe pas
            const btn = document.createElement('button');
            btn.id = 'export-godot-btn';
            btn.textContent = '🎮 Export Godot';
            btn.className = 'btn btn-primary';

            const controls = document.querySelector('.controls');
            if (controls) {
                controls.appendChild(btn);
            }
        }

        const finalGodotBtn = document.getElementById('export-godot-btn');
        if (finalGodotBtn) {
            finalGodotBtn.onclick = () => this.exportToGodot();
        }

        // Bouton Export OBJ
        const exportObjBtn = document.getElementById('export-obj-btn');
        if (exportObjBtn) {
            exportObjBtn.onclick = () => this.exportToOBJ();
        }
    }

    // === 🔧 Actions ===

    private resetView(): void {
        console.log('🔄 Reset view');
        this.renderer.resetCamera();

        if (this.currentObject) {
            this.renderer.focusOn(this.currentObject);
        }
    }

    private toggleDebugPoints(): void {
        console.log('🔍 Toggle debug points');

        if (this.currentObject) {
            const currentState = this.currentObject.showDebugPoints;
            this.currentObject.setShowDebugPoints(!currentState);
            this.showingDebugPoints = !currentState;

            const btn = document.getElementById('explode-btn');
            if (btn) {
                btn.textContent = currentState ? '💥 Explode' : '🔧 Normal';
                btn.classList.toggle('active', !currentState);
            }

            // Sauvegarder l'état
            this.saveState();
        }
    }

    private toggleLabels(): void {
        console.log('🏷️ Toggle labels');

        if (this.currentObject) {
            const currentState = this.currentObject.showLabels;
            this.currentObject.setShowLabels(!currentState);
            this.showingLabels = !currentState;

            const btn = document.getElementById('labels-btn');
            if (btn) {
                btn.textContent = currentState ? '🏷️ Labels' : '📝 Hide Labels';
                btn.classList.toggle('active', !currentState);
            }

            // Sauvegarder l'état
            this.saveState();
        }
    }

    private toggleAnimation(): void {
        this.isAnimating = !this.isAnimating;
        console.log(`🎬 Animation: ${this.isAnimating ? 'ON' : 'OFF'}`);

        const btn = document.getElementById('animate-btn');
        if (btn) {
            btn.textContent = this.isAnimating ? '⏸️ Stop' : '▶️ Animate';
        }

        // TODO: Implémenter l'animation de rotation
        if (this.currentObject && this.isAnimating) {
            this.startRotationAnimation();
        }
    }

    private startRotationAnimation(): void {
        if (!this.currentObject || !this.isAnimating) return;

        const animate = () => {
            if (this.currentObject && this.isAnimating) {
                this.currentObject.rotation.y += 0.01;
                requestAnimationFrame(animate);
            }
        };
        animate();
    }

    private exportToGodot(): void {
        if (!this.currentObject) {
            alert('Aucun objet à exporter !');
            return;
        }

        console.log('🎮 Export vers Godot...');

        try {
            GodotExporter.downloadTSCN(this.currentObject);
            console.log('✅ Export Godot réussi !');
        } catch (error) {
            console.error('❌ Erreur lors de l\'export Godot:', error);
            alert('Erreur lors de l\'export : ' + error);
        }
    }

    private exportToOBJ(): void {
        if (!this.currentObject) {
            alert('Aucun objet à exporter !');
            return;
        }

        console.log('📦 Export vers OBJ...');

        try {
            let objectToExport = this.currentObject;
            let filename = `${this.currentObjectId}.obj`;

            // Pour le cube, créer une version imprimable (sans frames ni marqueurs)
            if (this.currentObjectId === 'cube') {
                console.log('🎲 Export du cube en mode imprimable...');
                filename = 'cube-20mm.obj';
            }

            // Convention : 1 unité Three.js = 10mm à l'export
            // Le cube fait 2 unités = 20mm
            // Pour d'autres objets, on peut ajuster si nécessaire
            const scale = 10; // 1 unité = 10mm pour tous les objets
            OBJExporter.download(objectToExport, filename, scale);
            console.log('✅ Export OBJ réussi ! (Échelle: 1 unité = 10mm)');
        } catch (error) {
            console.error('❌ Erreur lors de l\'export OBJ:', error);
            alert('Erreur lors de l\'export : ' + error);
        }
    }
}

// === 🚀 Démarrage de l'Application ===

// Attendre que le DOM soit prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}

// === 🔥 Hot Module Replacement ===

if (import.meta.hot) {
    import.meta.hot.accept(() => {
        console.log('🔥 Hot reload détecté');
        window.location.reload();
    });
}

// === 🌍 API Globale (pour compatibilité HTML) ===

declare global {
    interface Window {
        loadObject: (id: string) => Promise<void>;
        app: App;
    }
}

// Exposer loadObject globalement pour les boutons HTML
window.loadObject = async (id: string) => {
    if ((window as any).app) {
        await (window as any).app.loadObject(id);
    }
};
