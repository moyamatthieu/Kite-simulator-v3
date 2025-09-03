/**
 * UniversalUI.ts - Interface universelle utilisant le système V10
 * Système d'interface unifié pour toutes les versions de simulation
 */

import { SimulationUI } from './simu_V10/ui/SimulationUI.js';

export class UniversalUI {
    private static instance: UniversalUI | null = null;
    private simulationUI!: SimulationUI;
    private container!: HTMLElement;
    private currentVersion: string = '';

    constructor(container: HTMLElement) {
        // Pattern singleton pour éviter les duplications
        if (UniversalUI.instance) {
            console.warn('UniversalUI: Instance déjà existante, réutilisation');
            return UniversalUI.instance;
        }

        this.container = container;
        this.simulationUI = new SimulationUI(container);
        UniversalUI.instance = this;

        // Nettoyer les anciennes interfaces
        this.cleanupOldInterfaces();
        
        // Exposer l'interface globalement pour compatibilité
        (window as any).simulationUI = this.simulationUI;
        
        console.log('✅ Interface universelle V10 initialisée');
    }

    /**
     * Obtenir l'instance singleton
     */
    public static getInstance(container?: HTMLElement): UniversalUI {
        if (!UniversalUI.instance && container) {
            UniversalUI.instance = new UniversalUI(container);
        }
        return UniversalUI.instance as UniversalUI;
    }

    /**
     * Définir la version de simulation courante
     */
    public setSimulationVersion(version: string): void {
        this.currentVersion = version;
        this.updateUIForVersion(version);
    }

    /**
     * Adapter l'interface selon la version de simulation
     */
    private updateUIForVersion(version: string): void {
        // L'interface V10 est suffisamment flexible pour toutes les versions
        // Pas besoin de modifications spécifiques
        console.log(`🎨 Interface adaptée pour la simulation ${version}`);
    }

    /**
     * Nettoyer les anciennes interfaces pour éviter les conflits
     */
    private cleanupOldInterfaces(): void {
        // Supprimer les anciens panneaux d'autres systèmes
        const oldPanels = this.container.querySelectorAll('.ui-panel:not([data-v10])');
        oldPanels.forEach(panel => panel.remove());
        
        // Nettoyer les anciens event listeners
        const oldButtons = document.querySelectorAll('button[id*="mode-"], button[id*="reset-"], button[id*="play-"]');
        oldButtons.forEach(button => {
            if (!button.closest('[data-v10]')) {
                button.remove();
            }
        });
        
        console.log('🧹 Anciennes interfaces nettoyées');
    }

    /**
     * Méthodes de l'interface pour compatibilité
     */
    public updateRealTimeValues(data: any): void {
        return this.simulationUI.updateRealTimeValues(data);
    }

    public toggleDebugPanel(show: boolean): void {
        return this.simulationUI.toggleDebugPanel(show);
    }

    public updatePanel(panelId: string, content: string | HTMLElement): void {
        return this.simulationUI.updatePanel(panelId, content);
    }

    public showNotification(message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info'): void {
        return this.simulationUI.showNotification(message, type);
    }

    public updatePerformanceData(data: any): void {
        return this.simulationUI.updatePerformanceData(data);
    }

    /**
     * Nettoyer l'interface
     */
    public cleanup(): void {
        if (this.simulationUI) {
            // Marquer tous les panneaux pour suppression
            const panels = this.container.querySelectorAll('.ui-panel[data-v10]');
            panels.forEach(panel => panel.remove());
        }
        
        UniversalUI.instance = null;
        delete (window as any).simulationUI;
        
        console.log('🗑️ Interface universelle nettoyée');
    }
}

/**
 * Fonction d'initialisation globale
 */
export function initializeUniversalUI(container: HTMLElement): UniversalUI {
    return UniversalUI.getInstance(container);
}
