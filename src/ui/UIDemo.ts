/**
 * UIDemo.ts - Démonstration de l'interface utilisateur
 * Exemple d'intégration de tous les composants UI
 */

import { 
    SceneTreePanel, 
    PropertiesPanel, 
    ConsolePanel,
    themeManager
} from './index.js';
import { Node3D } from '../core/Node3D.js';

/**
 * Classe de démonstration de l'interface utilisateur
 */
export class UIDemo {
    private sceneTree!: SceneTreePanel;
    private properties!: PropertiesPanel;
    private console!: ConsolePanel;
    private sceneRoot!: Node3D;
    private container!: HTMLElement;

    constructor(container: HTMLElement) {
        this.container = container;
        this.initializeUI();
        this.setupDemoScene();
        this.setupEventHandlers();
        this.showWelcomeMessage();
    }

    /**
     * Initialise l'interface utilisateur
     */
    private initializeUI(): void {
        // Créer la structure HTML
        this.container.innerHTML = `
            <div class="app-layout">
                <div class="app-layout__toolbar">
                    <button id="theme-toggle" class="toolbar__button">🌓 Thème</button>
                    <button id="refresh-scene" class="toolbar__button">🔄 Actualiser</button>
                    <div class="toolbar__spacer"></div>
                    <span class="toolbar__title">Kite Simulator v3 - UI Demo</span>
                </div>
                <div class="app-layout__content">
                    <div class="panel-dock panel-dock--left" id="left-dock">
                        <div id="scene-tree-container"></div>
                    </div>
                    <div class="app-layout__main">
                        <div class="app-layout__viewport" id="viewport">
                            <div class="empty-state">
                                <div class="empty-state__icon">🎮</div>
                                <div class="empty-state__title">Viewport 3D</div>
                                <div class="empty-state__description">
                                    La vue 3D s'affichera ici. 
                                    Sélectionnez un objet dans l'arbre pour voir ses propriétés.
                                </div>
                            </div>
                        </div>
                        <div class="panel-dock panel-dock--bottom" id="bottom-dock">
                            <div id="console-container"></div>
                        </div>
                    </div>
                    <div class="panel-dock panel-dock--right" id="right-dock">
                        <div id="properties-container"></div>
                    </div>
                </div>
            </div>
        `;

        // Créer les panels
        this.sceneTree = new SceneTreePanel();
        this.properties = new PropertiesPanel();
        this.console = new ConsolePanel();

        // Monter les panels dans leurs containers
        const sceneTreeContainer = this.container.querySelector('#scene-tree-container') as HTMLElement;
        const propertiesContainer = this.container.querySelector('#properties-container') as HTMLElement;
        const consoleContainer = this.container.querySelector('#console-container') as HTMLElement;

        sceneTreeContainer.appendChild(this.sceneTree.element);
        propertiesContainer.appendChild(this.properties.element);
        consoleContainer.appendChild(this.console.element);

        console.log('✅ Interface utilisateur initialisée');
    }

    /**
     * Configure une scène de démonstration
     */
    private setupDemoScene(): void {
        // Créer la racine de scène
        this.sceneRoot = new Node3D();
        this.sceneRoot.name = 'Scene';

        // Créer quelques objets de test
        const group1 = new Node3D();
        group1.name = 'Groupe 1';
        group1.position.set(1, 0, 0);

        const group2 = new Node3D();
        group2.name = 'Groupe 2';
        group2.position.set(-1, 0, 0);

        // Ajouter des objets simulés
        const cube = new Node3D();
        cube.name = 'Cube';
        cube.position.set(0, 0, 0);

        const sphere = new Node3D();
        sphere.name = 'Sphere';
        sphere.position.set(3, 0, 0);

        const cylinder = new Node3D();
        cylinder.name = 'Cylindre';
        cylinder.position.set(-3, 0, 0);

        // Construire la hiérarchie
        group1.add(cube);
        group1.add(sphere);
        group2.add(cylinder);
        
        this.sceneRoot.add(group1);
        this.sceneRoot.add(group2);

        // Mettre à jour l'arbre de scène
        this.sceneTree.setRootNode(this.sceneRoot);

        console.log('✅ Scène de démonstration créée');
    }

    /**
     * Configure les gestionnaires d'événements
     */
    private setupEventHandlers(): void {
        // Boutons de la toolbar
        const themeToggle = this.container.querySelector('#theme-toggle') as HTMLButtonElement;
        const refreshScene = this.container.querySelector('#refresh-scene') as HTMLButtonElement;

        themeToggle?.addEventListener('click', () => {
            themeManager.toggleTheme();
        });

        refreshScene?.addEventListener('click', () => {
            this.sceneTree.setRootNode(this.sceneRoot);
            this.console.addLog('info', '🔄 Scène actualisée', 'system');
        });

        // Sélection dans l'arbre de scène
        this.sceneTree.onNodeSelect((node) => {
            console.log(`🎯 Nœud sélectionné: ${node.name}`);
            this.properties.setSelectedNode(node);
        });

        // Changement de propriété
        this.properties.onPropertyChange((property, value) => {
            console.log(`🔧 Propriété modifiée: ${property} = ${value}`);
            this.console.addLog('info', `Propriété ${property} = ${value}`, 'properties');
        });

        // Commandes de console personnalisées
        this.console.addCommand({
            name: 'scene',
            description: 'Affiche des informations sur la scène',
            execute: () => {
                const nodeCount = this.countNodes(this.sceneRoot);
                return `Scène: ${nodeCount} nœuds au total`;
            }
        });

        this.console.addCommand({
            name: 'theme',
            description: 'Change le thème (dark/light/high-contrast)',
            execute: (args) => {
                const themeName = args[0];
                if (themeName) {
                    themeManager.setTheme(themeName);
                    return `Thème changé vers: ${themeName}`;
                } else {
                    const current = themeManager.getCurrentTheme();
                    const available = themeManager.getAvailableThemes()
                        .map(t => t.id).join(', ');
                    return `Thème actuel: ${current.name}\nDisponibles: ${available}`;
                }
            }
        });

        // Écouter les changements de thème
        themeManager.onThemeChange((theme) => {
            this.console.addLog('info', `🎨 Thème changé vers: ${theme.name}`, 'theme');
        });

        console.log('✅ Gestionnaires d\'événements configurés');
    }

    /**
     * Affiche un message de bienvenue
     */
    private showWelcomeMessage(): void {
        this.console.addLog('info', '🚀 Interface Kite Simulator v3 initialisée', 'system');
        this.console.addLog('info', '💡 Tapez "help" pour voir les commandes disponibles', 'system');
        this.console.addLog('info', '🎯 Cliquez sur un objet dans l\'arbre pour le sélectionner', 'system');
        this.console.addLog('info', '🔧 Modifiez les propriétés dans le panel de droite', 'system');
        this.console.addLog('info', '🎨 Changez le thème avec la commande "theme dark/light"', 'system');
    }

    // === MÉTHODES UTILITAIRES ===

    /**
     * Compte le nombre de nœuds dans la scène
     */
    private countNodes(node: Node3D): number {
        let count = 1;
        node.children.forEach(child => {
            if (child instanceof Node3D) {
                count += this.countNodes(child);
            }
        });
        return count;
    }

    // === API PUBLIQUE ===

    /**
     * Ajoute un objet à la scène
     */
    addToScene(object: Node3D): void {
        this.sceneRoot.add(object);
        this.sceneTree.setRootNode(this.sceneRoot);
        this.console.addLog('info', `➕ Objet "${object.name}" ajouté à la scène`, 'scene');
    }

    /**
     * Supprime un objet de la scène
     */
    removeFromScene(object: Node3D): void {
        if (object.parent) {
            object.parent.remove(object);
            this.sceneTree.setRootNode(this.sceneRoot);
            this.console.addLog('info', `➖ Objet "${object.name}" supprimé de la scène`, 'scene');
        }
    }

    /**
     * Sélectionne un objet
     */
    selectObject(object: Node3D): void {
        this.properties.setSelectedNode(object);
    }

    /**
     * Obtient l'objet actuellement sélectionné
     */
    getSelectedObject(): Node3D | null {
        return this.properties.currentNode;
    }

    /**
     * Change le thème
     */
    setTheme(themeId: string): void {
        themeManager.setTheme(themeId);
    }

    /**
     * Bascule entre dark et light
     */
    toggleTheme(): void {
        themeManager.toggleTheme();
    }

    /**
     * Obtient la racine de scène
     */
    getSceneRoot(): Node3D {
        return this.sceneRoot;
    }
}

// === FONCTION D'INITIALISATION ===

/**
 * Initialise l'interface utilisateur complète
 */
export function initializeUI(container: HTMLElement): UIDemo {
    // Charger les styles CSS
    if (!document.querySelector('#ui-styles')) {
        const link = document.createElement('link');
        link.id = 'ui-styles';
        link.rel = 'stylesheet';
        link.href = './src/ui/themes/main.css';
        document.head.appendChild(link);
    }

    // Créer la démo
    const demo = new UIDemo(container);
    
    // Exposer globalement pour debug
    (window as any).ui = demo;
    
    return demo;
}

export default UIDemo;
