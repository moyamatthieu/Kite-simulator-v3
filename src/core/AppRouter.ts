/**
 * AppRouter.ts - Routeur principal pour la navigation entre modes
 * Gestion centralisée des modes CAO/Simulation avec transitions fluides
 */

export type AppMode = 'cad' | 'simulation' | 'hybrid';
export type AppState = 'loading' | 'ready' | 'error' | 'transitioning';

export interface RouteConfig {
    mode: AppMode;
    title: string;
    description: string;
    icon: string;
    component: () => Promise<any>;
    layout: 'panels' | 'fullscreen' | 'split';
    requiredPanels?: string[];
}

/**
 * Gestionnaire de navigation et d'état global de l'application
 */
export class AppRouter {
    private static instance: AppRouter;
    private currentMode: AppMode = 'cad';
    private currentState: AppState = 'loading';
    private routes: Map<AppMode, RouteConfig> = new Map();
    private currentApp: any = null;

    // Callbacks
    private onModeChangeCallbacks: ((mode: AppMode, previous: AppMode) => void)[] = [];
    private onStateChangeCallbacks: ((state: AppState, previous: AppState) => void)[] = [];

    private constructor() {
        this.setupRoutes();
        this.setupEventListeners();
    }

    static getInstance(): AppRouter {
        if (!AppRouter.instance) {
            AppRouter.instance = new AppRouter();
        }
        return AppRouter.instance;
    }

    /**
     * Configuration des routes disponibles
     */
    private setupRoutes(): void {
        this.routes.set('cad', {
            mode: 'cad',
            title: 'Mode CAO',
            description: 'Conception Assistée par Ordinateur',
            icon: '🛠️',
            component: () => import('./apps/CadApp.js'),
            layout: 'panels',
            requiredPanels: ['scene-tree', 'properties', 'object-library', 'console']
        });

        this.routes.set('simulation', {
            mode: 'simulation',
            title: 'Mode Simulation',
            description: 'Simulation physique en temps réel',
            icon: '🎮',
            component: () => import('./apps/SimulationApp.js'),
            layout: 'fullscreen',
            requiredPanels: ['console']
        });

        this.routes.set('hybrid', {
            mode: 'hybrid',
            title: 'Mode Hybride',
            description: 'CAO + Simulation en temps réel',
            icon: '🔄',
            component: () => import('./apps/HybridApp.js'),
            layout: 'split',
            requiredPanels: ['scene-tree', 'properties', 'console']
        });
    }

    /**
     * Configuration des événements globaux
     */
    private setupEventListeners(): void {
        // Écouter les changements d'URL (pour le futur)
        window.addEventListener('popstate', (event) => {
            const mode = this.getModeFromURL();
            if (mode !== this.currentMode) {
                this.navigateToMode(mode, false);
            }
        });

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateToMode('cad');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateToMode('simulation');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateToMode('hybrid');
                        break;
                }
            }
        });
    }

    /**
     * Navigation vers un mode spécifique
     */
    async navigateToMode(mode: AppMode, updateURL: boolean = true): Promise<void> {
        if (mode === this.currentMode && this.currentState === 'ready') {
            return;
        }

        const previousMode = this.currentMode;
        const previousState = this.currentState;

        try {
            // 1. Changer l'état vers transition
            this.setState('transitioning');

            // 2. Sauvegarder l'état actuel si nécessaire
            await this.saveCurrentState();

            // 3. Nettoyer l'application actuelle
            await this.cleanupCurrentApp();

            // 4. Charger la nouvelle application
            this.currentMode = mode;
            await this.loadApp(mode);

            // 5. Mettre à jour l'URL si demandé
            if (updateURL) {
                this.updateURL(mode);
            }

            // 6. Notifier les changements
            this.notifyModeChange(mode, previousMode);
            this.setState('ready');

            console.log(`✅ Navigation vers ${mode} terminée`);

        } catch (error) {
            console.error(`❌ Erreur lors de la navigation vers ${mode}:`, error);
            this.setState('error');
            // Restaurer l'état précédent en cas d'erreur
            this.currentMode = previousMode;
            this.setState(previousState);
        }
    }

    /**
     * Charge une application spécifique
     */
    private async loadApp(mode: AppMode): Promise<void> {
        const route = this.routes.get(mode);
        if (!route) {
            throw new Error(`Route non trouvée pour le mode: ${mode}`);
        }

        // Charger le composant dynamiquement
        const module = await route.component();
        const AppClass = module.default || module[Object.keys(module)[0]];

        // Créer l'instance de l'application
        this.currentApp = new AppClass();

        // Initialiser l'application
        if (this.currentApp.init) {
            await this.currentApp.init();
        }

        console.log(`📦 Application ${mode} chargée`);
    }

    /**
     * Nettoie l'application actuelle
     */
    private async cleanupCurrentApp(): Promise<void> {
        if (this.currentApp) {
            // Sauvegarder l'état si possible
            if (this.currentApp.saveState) {
                const state = await this.currentApp.saveState();
                this.saveAppState(this.currentMode, state);
            }

            // Nettoyer les ressources
            if (this.currentApp.dispose) {
                await this.currentApp.dispose();
            }

            this.currentApp = null;
        }
    }

    /**
     * Sauvegarde l'état actuel
     */
    private async saveCurrentState(): Promise<void> {
        try {
            const state = {
                mode: this.currentMode,
                timestamp: Date.now(),
                panelStates: this.getPanelStates(),
                appState: this.currentApp?.getState?.() || null
            };

            localStorage.setItem('kite-simulator-state', JSON.stringify(state));
        } catch (error) {
            console.warn('Impossible de sauvegarder l\'état:', error);
        }
    }

    /**
     * Restaure l'état sauvegardé
     */
    async restoreState(): Promise<void> {
        try {
            const savedState = localStorage.getItem('kite-simulator-state');
            if (!savedState) return;

            const state = JSON.parse(savedState);

            // Vérifier si l'état n'est pas trop ancien (24h)
            if (Date.now() - state.timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('kite-simulator-state');
                return;
            }

            // Restaurer le mode
            if (state.mode && this.routes.has(state.mode)) {
                await this.navigateToMode(state.mode, false);
            }

            console.log('📁 État restauré depuis la sauvegarde');
        } catch (error) {
            console.warn('Impossible de restaurer l\'état:', error);
            localStorage.removeItem('kite-simulator-state');
        }
    }

    /**
     * Met à jour l'URL sans recharger la page
     */
    private updateURL(mode: AppMode): void {
        const url = new URL(window.location.href);
        url.searchParams.set('mode', mode);
        window.history.pushState({ mode }, '', url.toString());
    }

    /**
     * Extrait le mode depuis l'URL
     */
    private getModeFromURL(): AppMode {
        const params = new URLSearchParams(window.location.search);
        const mode = params.get('mode') as AppMode;
        return this.routes.has(mode) ? mode : 'cad';
    }

    /**
     * Change l'état de l'application
     */
    private setState(newState: AppState): void {
        const previousState = this.currentState;
        this.currentState = newState;
        this.notifyStateChange(newState, previousState);
    }

    /**
     * Récupère l'état des panels (sera implémenté avec PanelManager)
     */
    private getPanelStates(): any {
        // TODO: Intégrer avec PanelManager
        return {};
    }

    /**
     * Sauvegarde l'état d'une application spécifique
     */
    private saveAppState(mode: AppMode, state: any): void {
        try {
            const key = `kite-simulator-${mode}-state`;
            localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.warn(`Impossible de sauvegarder l'état de ${mode}:`, error);
        }
    }

    /**
     * Récupère l'état sauvegardé d'une application
     */
    getAppState(mode: AppMode): any {
        try {
            const key = `kite-simulator-${mode}-state`;
            const state = localStorage.getItem(key);
            return state ? JSON.parse(state) : null;
        } catch (error) {
            console.warn(`Impossible de récupérer l'état de ${mode}:`, error);
            return null;
        }
    }

    // === ÉVÉNEMENTS ===

    private notifyModeChange(newMode: AppMode, previousMode: AppMode): void {
        this.onModeChangeCallbacks.forEach(callback => {
            try {
                callback(newMode, previousMode);
            } catch (error) {
                console.error('Erreur dans callback onModeChange:', error);
            }
        });
    }

    private notifyStateChange(newState: AppState, previousState: AppState): void {
        this.onStateChangeCallbacks.forEach(callback => {
            try {
                callback(newState, previousState);
            } catch (error) {
                console.error('Erreur dans callback onStateChange:', error);
            }
        });
    }

    // === API PUBLIQUE ===

    getCurrentMode(): AppMode {
        return this.currentMode;
    }

    getCurrentState(): AppState {
        return this.currentState;
    }

    getCurrentApp(): any {
        return this.currentApp;
    }

    getAvailableRoutes(): RouteConfig[] {
        return Array.from(this.routes.values());
    }

    getRoute(mode: AppMode): RouteConfig | undefined {
        return this.routes.get(mode);
    }

    onModeChange(callback: (mode: AppMode, previous: AppMode) => void): void {
        this.onModeChangeCallbacks.push(callback);
    }

    onStateChange(callback: (state: AppState, previous: AppState) => void): void {
        this.onStateChangeCallbacks.push(callback);
    }

    // Raccourcis pour les modes courants
    async goToCad(): Promise<void> {
        await this.navigateToMode('cad');
    }

    async goToSimulation(): Promise<void> {
        await this.navigateToMode('simulation');
    }

    async goToHybrid(): Promise<void> {
        await this.navigateToMode('hybrid');
    }

    /**
     * Bascule vers le mode suivant (rotation cyclique)
     */
    async nextMode(): Promise<void> {
        const modes: AppMode[] = ['cad', 'simulation', 'hybrid'];
        const currentIndex = modes.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        await this.navigateToMode(modes[nextIndex]);
    }

    /**
     * Active le mode plein écran pour la simulation
     */
    async enterFullscreen(): Promise<void> {
        if (this.currentMode === 'simulation') {
            try {
                await document.documentElement.requestFullscreen();
            } catch (error) {
                console.warn('Impossible d\'activer le plein écran:', error);
            }
        }
    }
}

// Export de l'instance singleton
export const appRouter = AppRouter.getInstance();
