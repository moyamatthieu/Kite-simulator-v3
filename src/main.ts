import { ThreeRenderer } from '@renderer';
import { PanelManager } from './ui/core/PanelManager';
import { SceneTreePanel } from './ui/panels/SceneTreePanel';
import { ObjectLibraryPanel } from './ui/panels/ObjectLibraryPanel';
import { PropertiesPanel } from './ui/panels/PropertiesPanel';
import { ConsolePanel } from './ui/panels/ConsolePanel';
import { CadApp } from './apps/CadApp';
import { SimulationApp } from './apps/SimulationApp';

class MainApp {
    private renderer!: ThreeRenderer;
    private panelManager!: PanelManager;
    private sceneTreePanel!: SceneTreePanel;
    private objectLibraryPanel!: ObjectLibraryPanel;
    private propertiesPanel!: PropertiesPanel;
    private consolePanel!: ConsolePanel;

    private currentApp: CadApp | SimulationApp | null = null;
    private isSwitchingMode = false;

    constructor() {
        console.log('🚀 Démarrage de l\'application v3.0');
        this.init();
    }

    private async init(): Promise<void> {
        // 1. Initialiser le gestionnaire de panneaux
        const appContainer = document.getElementById('app-container')!;
        this.panelManager = new PanelManager(appContainer);

        // 2. Pas de renderer pour l'interface liste seule (créé à la demande)

        // 3. Créer et enregistrer les panneaux
        this.sceneTreePanel = new SceneTreePanel();
        this.objectLibraryPanel = new ObjectLibraryPanel();
        this.propertiesPanel = new PropertiesPanel();
        this.consolePanel = new ConsolePanel();

        // Manually render the panels once after creation
        this.sceneTreePanel.render();
        this.objectLibraryPanel.render();
        this.propertiesPanel.render();
        this.consolePanel.render();

        // Enregistrer la bibliothèque d'objets avant l'arbre pour l'afficher en premier
        this.panelManager.registerPanel(this.objectLibraryPanel);
        this.panelManager.registerPanel(this.sceneTreePanel);
        this.panelManager.registerPanel(this.propertiesPanel);
        this.panelManager.registerPanel(this.consolePanel);

        // 4. Appliquer un layout minimal: uniquement la bibliothèque à gauche
        this.panelManager.setLayout('library');
        // On n'applique pas l'état sauvegardé pour garder l'UI minimaliste

        // 5. Connecter la bibliothèque d'objets
        this.setupObjectLibrary();

        // 6. Pour l'instant, pas de switch de mode automatique

        console.log('✅ Application initialisée avec succès');
    }

    private async setupObjectLibrary(): Promise<void> {
        try {
            const { AutoLoader } = await import('./core/AutoLoader');
            const loader = new AutoLoader();
            const categories = await loader.getCategories();
            this.objectLibraryPanel.setCategories(categories);
            // Optionally feed the scene tree add-dialog
            if (this.sceneTreePanel && 'setCreatableObjects' in this.sceneTreePanel) {
                (this.sceneTreePanel as any).setCreatableObjects(categories);
            }

            this.objectLibraryPanel.onSelect(async (id) => {
                if (this.currentApp && 'loadById' in this.currentApp) {
                    // @ts-ignore - CadApp exposes loadById
                    await (this.currentApp as any).loadById(id);
                } else {
                    await this.switchApp('cad');
                    if (this.currentApp && 'loadById' in this.currentApp) {
                        // @ts-ignore
                        await (this.currentApp as any).loadById(id);
                    }
                }
            });
        } catch (err) {
            console.warn('Impossible de charger la bibliothèque d\'objets:', err);
        }
    }

    private setupToolbar(): void {
        const modeCadButton = document.getElementById('mode-cad');
        const modeSimButton = document.getElementById('mode-sim');

        modeCadButton?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('CAD button clicked');
            this.switchApp('cad');
            modeCadButton.classList.add('active');
            modeSimButton?.classList.remove('active');
        });

        modeSimButton?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('SIM button clicked');
            this.switchApp('simulation');
            modeSimButton.classList.add('active');
            modeCadButton?.classList.remove('active');
        });
    }

    private async switchApp(appName: 'cad' | 'simulation'): Promise<void> {
        if (this.isSwitchingMode) {
            console.log('Mode switch in progress, ignoring request.');
            return;
        }
        this.isSwitchingMode = true;

        // Créer le renderer à la demande si absent
        if (!this.renderer) {
            this.renderer = new ThreeRenderer({
                canvasContainer: this.panelManager.getViewportContainer(),
                backgroundColor: '#1a1a2e',
            });
        }

        if (this.currentApp) {
            if ('destroy' in this.currentApp) {
                (this.currentApp as CadApp).destroy();
            } else if ('dispose' in this.currentApp) {
                (this.currentApp as SimulationApp).dispose();
            }
            this.currentApp = null;
        }

        if (appName === 'cad') {
            this.panelManager.setLayout('default');
            this.currentApp = new CadApp({
                container: this.panelManager.getViewportContainer()
            });
            await (this.currentApp as CadApp).init();
        } else if (appName === 'simulation') {
            this.panelManager.setLayout('simulation');
            this.currentApp = new SimulationApp({
                container: this.panelManager.getViewportContainer()
            });
            await (this.currentApp as SimulationApp).initialize();
        }
        this.isSwitchingMode = false;
    }
}

// Démarrage de l'application
document.addEventListener('DOMContentLoaded', () => {
    new MainApp();
});
