/**
 * PanelManager.ts - Gestionnaire de layout et d'organisation des panels
 * Système de dock inspiré de Godot Editor
 */

import { Panel, PanelConfig } from './Panel.js';

export interface LayoutConfig {
    name: string;
    panels: {
        [panelId: string]: {
            visible: boolean;
            position: 'left' | 'right' | 'top' | 'bottom' | 'center' | 'floating';
            size: { width: number; height: number };
            dockOrder?: number;
        };
    };
    dockSizes: {
        left: number;
        right: number;
        top: number;
        bottom: number;
    };
}

/**
 * Gestionnaire principal des panels et layouts
 */
export class PanelManager {
    private panels: Map<string, Panel> = new Map();
    private container: HTMLElement;
    private dockContainers: Map<string, HTMLElement> = new Map();
    private currentLayout = 'default';
    private layouts: Map<string, LayoutConfig> = new Map();
    private handleResponsiveResize?: () => void;

    constructor(container: HTMLElement) {
        this.container = container;
        this.setupDockStructure();
        this.loadDefaultLayouts();
        this.setupEventListeners();
    }

    /**
     * Crée la structure de dock HTML
     */
    private setupDockStructure(): void {
        this.container.innerHTML = `
            <div class="panel-manager">
                <div class="dock dock--top" id="dock-top"></div>
                <div class="dock-middle">
                    <div class="dock dock--left" id="dock-left"></div>
                    <div class="dock dock--center" id="dock-center">
                        <div id="viewport-container" class="viewport-container"></div>
                    </div>
                    <div class="dock dock--right" id="dock-right"></div>
                </div>
                <div class="dock dock--bottom" id="dock-bottom"></div>
                <div class="floating-container" id="floating-container"></div>
            </div>
        `;

        // Récupérer les références des docks
        this.dockContainers.set('top', document.getElementById('dock-top')!);
        this.dockContainers.set('left', document.getElementById('dock-left')!);
        this.dockContainers.set('center', document.getElementById('dock-center')!);
        this.dockContainers.set('right', document.getElementById('dock-right')!);
        this.dockContainers.set('bottom', document.getElementById('dock-bottom')!);
        this.dockContainers.set('floating', document.getElementById('floating-container')!);
    }

    /**
     * Configure les layouts par défaut
     */
    private loadDefaultLayouts(): void {
        // Layout par défaut - CAO
        this.layouts.set('default', {
            name: 'CAO Standard',
            panels: {
                'object-library': {
                    visible: true,
                    position: 'left',
                    size: { width: 260, height: 300 },
                    dockOrder: 0
                },
                'scene-tree': {
                    visible: true,
                    position: 'left',
                    size: { width: 250, height: 400 },
                    dockOrder: 0
                },
                'properties': {
                    visible: true,
                    position: 'right',
                    size: { width: 300, height: 500 },
                    dockOrder: 0
                },
                'console': {
                    visible: false,
                    position: 'bottom',
                    size: { width: 0, height: 200 },
                    dockOrder: 0
                }
            },
            dockSizes: {
                left: 300,
                right: 300,
                top: 0,
                bottom: 0
            }
        });

        // Layout simulation
        this.layouts.set('simulation', {
            name: 'Simulation',
            panels: {
                'object-library': {
                    visible: false,
                    position: 'left',
                    size: { width: 0, height: 0 }
                },
                'scene-tree': {
                    visible: false,
                    position: 'left',
                    size: { width: 0, height: 0 }
                },
                'properties': {
                    visible: true,
                    position: 'right',
                    size: { width: 320, height: 600 }
                },
                'console': {
                    visible: true,
                    position: 'bottom',
                    size: { width: 0, height: 180 }
                }
            },
            dockSizes: {
                left: 0,
                right: 320,
                top: 0,
                bottom: 180
            }
        });

        // Layout développement
        this.layouts.set('development', {
            name: 'Développement',
            panels: {
                'object-library': {
                    visible: true,
                    position: 'left',
                    size: { width: 260, height: 260 }
                },
                'scene-tree': {
                    visible: true,
                    position: 'left',
                    size: { width: 280, height: 350 }
                },
                'properties': {
                    visible: true,
                    position: 'right',
                    size: { width: 350, height: 400 }
                },
                'console': {
                    visible: true,
                    position: 'bottom',
                    size: { width: 0, height: 250 }
                }
            },
            dockSizes: {
                left: 320,
                right: 350,
                top: 0,
                bottom: 250
            }
        });

        // Layout bibliothèque seule (liste à gauche uniquement)
        this.layouts.set('library', {
            name: 'Bibliothèque',
            panels: {
                'object-library': {
                    visible: true,
                    position: 'left',
                    size: { width: 320, height: 500 }
                },
                'scene-tree': { visible: false, position: 'left', size: { width: 0, height: 0 } },
                'properties': { visible: false, position: 'right', size: { width: 0, height: 0 } },
                'console': { visible: false, position: 'bottom', size: { width: 0, height: 0 } }
            },
            dockSizes: {
                left: 320,
                right: 0,
                top: 0,
                bottom: 0
            }
        });
    }

    /**
     * Configuration des écouteurs d'événements globaux
     */
    private setupEventListeners(): void {
        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.setLayout('default');
                        break;
                    case '2':
                        e.preventDefault();
                        this.setLayout('simulation');
                        break;
                    case '3':
                        e.preventDefault();
                        this.setLayout('development');
                        break;
                    case '`':
                        e.preventDefault();
                        this.togglePanel('console');
                        break;
                }
            }
        });

        // Sauvegarde automatique de l'état
        window.addEventListener('beforeunload', () => {
            this.saveLayoutState();
        });

        // Redimensionnement responsive pour le layout 'library'
        this.handleResponsiveResize = () => {
            if (this.currentLayout !== 'library') return;
            const w = window.innerWidth;
            // Largeur du dock gauche selon la taille d'écran
            const left = w < 600 ? w : (w < 900 ? 360 : 320);
            this.updateDockSizes({ left, right: 0, top: 0, bottom: 0 });
        };
        window.addEventListener('resize', this.handleResponsiveResize);
    }

    /**
     * Enregistre un nouveau panel
     */
    registerPanel(panel: Panel): void {
        const panelId = panel.element.id.replace('panel-', '');
        this.panels.set(panelId, panel);
        
        // Monter le panel dans le bon dock
        const config = panel.config;
        const dockContainer = this.dockContainers.get(config.position) || this.dockContainers.get('floating')!;
        console.log(`Registering panel ${panelId}. Docking to ${config.position}. Container:`, dockContainer);
        panel.mount(dockContainer);

        // Appliquer le layout actuel
        this.applyLayoutToPanel(panelId, panel);
    }

    /**
     * Supprime un panel
     */
    unregisterPanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.unmount();
            this.panels.delete(panelId);
        }
    }

    /**
     * Bascule la visibilité d'un panel
     */
    togglePanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            if (panel.isVisible) {
                panel.hide();
            } else {
                panel.show();
            }
        }
    }

    /**
     * Affiche un panel
     */
    showPanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.show();
        }
    }

    /**
     * Cache un panel
     */
    hidePanel(panelId: string): void {
        const panel = this.panels.get(panelId);
        if (panel) {
            panel.hide();
        }
    }

    /**
     * Change le layout actuel
     */
    setLayout(layoutName: string): void {
        const layout = this.layouts.get(layoutName);
        if (!layout) {
            console.warn(`Layout '${layoutName}' non trouvé`);
            return;
        }

        this.currentLayout = layoutName;
        this.applyLayout(layout);
        this.updateDockSizes(layout.dockSizes);
        // Ajuster immédiatement pour le mode responsive si nécessaire
        if (layoutName === 'library' && this.handleResponsiveResize) {
            this.handleResponsiveResize();
        }
        
        console.log(`📐 Layout changé vers: ${layout.name}`);
    }

    /**
     * Applique un layout à tous les panels
     */
    private applyLayout(layout: LayoutConfig): void {
        this.panels.forEach((panel, panelId) => {
            this.applyLayoutToPanel(panelId, panel, layout);
        });
    }

    /**
     * Applique le layout à un panel spécifique
     */
    private applyLayoutToPanel(panelId: string, panel: Panel, layout?: LayoutConfig): void {
        const currentLayout = layout || this.layouts.get(this.currentLayout);
        if (!currentLayout) return;

        const panelLayout = currentLayout.panels[panelId];
        if (!panelLayout) return;

        // Visibilité
        if (panelLayout.visible) {
            panel.show();
        } else {
            panel.hide();
        }

        // Taille
        if (panelLayout.size.width > 0 && panelLayout.size.height > 0) {
            panel.setSize(panelLayout.size.width, panelLayout.size.height);
        }

        // Position (redocking si nécessaire)
        this.dockPanel(panel, panelLayout.position);
    }

    /**
     * Dock un panel dans une position spécifique
     */
    private dockPanel(panel: Panel, position: string): void {
        const currentContainer = panel.element.parentElement;
        const targetContainer = this.dockContainers.get(position);
        
        if (currentContainer && targetContainer && currentContainer !== targetContainer) {
            targetContainer.appendChild(panel.element);
        }
    }

    /**
     * Met à jour les tailles des docks
     */
    private updateDockSizes(sizes: LayoutConfig['dockSizes']): void {
        const dockLeft = this.dockContainers.get('left')!;
        const dockRight = this.dockContainers.get('right')!;
        const dockTop = this.dockContainers.get('top')!;
        const dockBottom = this.dockContainers.get('bottom')!;

        dockLeft.style.width = sizes.left > 0 ? `${sizes.left}px` : '0';
        dockRight.style.width = sizes.right > 0 ? `${sizes.right}px` : '0';
        dockTop.style.height = sizes.top > 0 ? `${sizes.top}px` : '0';
        dockBottom.style.height = sizes.bottom > 0 ? `${sizes.bottom}px` : '0';

        // Affichage/masquage des docks vides
        dockLeft.style.display = sizes.left > 0 ? 'flex' : 'none';
        dockRight.style.display = sizes.right > 0 ? 'flex' : 'none';
        dockTop.style.display = sizes.top > 0 ? 'flex' : 'none';
        dockBottom.style.display = sizes.bottom > 0 ? 'flex' : 'none';
    }

    /**
     * Sauvegarde l'état actuel des panels
     */
    saveLayoutState(): void {
        const state = {
            currentLayout: this.currentLayout,
            panelStates: {} as any
        };

        this.panels.forEach((panel, panelId) => {
            state.panelStates[panelId] = {
                visible: panel.isVisible,
                collapsed: panel.isCollapsed,
                size: panel.size,
                position: panel.position
            };
        });

        localStorage.setItem('panelManager-state', JSON.stringify(state));
    }

    /**
     * Restore l'état sauvegardé
     */
    restoreLayoutState(): void {
        const savedState = localStorage.getItem('panelManager-state');
        if (!savedState) return;

        try {
            const state = JSON.parse(savedState);
            
            // Restaurer le layout
            if (state.currentLayout && this.layouts.has(state.currentLayout)) {
                this.setLayout(state.currentLayout);
            }

            // Restaurer l'état des panels
            if (state.panelStates) {
                Object.entries(state.panelStates).forEach(([panelId, panelState]: [string, any]) => {
                    const panel = this.panels.get(panelId);
                    if (panel) {
                        if (panelState.visible) panel.show();
                        else panel.hide();
                        
                        if (panelState.size) {
                            panel.setSize(panelState.size.width, panelState.size.height);
                        }
                    }
                });
            }
        } catch (error) {
            console.warn('Erreur lors de la restauration de l\'état des panels:', error);
        }
    }

    /**
     * Obtient le conteneur du viewport principal
     */
    getViewportContainer(): HTMLElement {
        return document.getElementById('viewport-container')!;
    }

    /**
     * Liste des layouts disponibles
     */
    getAvailableLayouts(): string[] {
        return Array.from(this.layouts.keys());
    }

    /**
     * Layout actuel
     */
    getCurrentLayout(): string {
        return this.currentLayout;
    }

    /**
     * Ajoute un nouveau layout
     */
    addLayout(name: string, config: LayoutConfig): void {
        this.layouts.set(name, config);
    }

    /**
     * Supprime un layout
     */
    removeLayout(name: string): void {
        if (name === 'default') {
            console.warn('Impossible de supprimer le layout par défaut');
            return;
        }
        this.layouts.delete(name);
    }

    // === GETTERS ===

    get panelCount(): number {
        return this.panels.size;
    }

    get visiblePanelCount(): number {
        return Array.from(this.panels.values()).filter(panel => panel.isVisible).length;
    }
}
