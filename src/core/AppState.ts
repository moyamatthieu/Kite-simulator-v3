import { logger } from '@core/Logger';

export interface AppStatePayload {
    currentObjectId: string;
    showingLabels: boolean;
    showingDebugPoints: boolean;
    isAnimating: boolean;
}

/**
 * Gère l'état global de l'application et sa persistance.
 * Respecte le principe de Single Responsibility (SRP).
 */
export class AppState {
    private static instance: AppState;
    private state: AppStatePayload;

    private constructor() {
        this.state = {
            currentObjectId: 'table',
            showingLabels: false,
            showingDebugPoints: false,
            isAnimating: false,
        };
        this.restoreState();
    }

    public static getInstance(): AppState {
        if (!AppState.instance) {
            AppState.instance = new AppState();
        }
        return AppState.instance;
    }

    /**
     * Sauvegarde l'état actuel dans sessionStorage.
     */
    public saveState(): void {
        try {
            sessionStorage.setItem('appState', JSON.stringify(this.state));
            logger.debug('État de l\'application sauvegardé', 'AppState');
        } catch (error) {
            logger.error(`Erreur lors de la sauvegarde de l'état: ${error}`, 'AppState');
        }
    }

    /**
     * Restaure l'état depuis sessionStorage.
     */
    private restoreState(): void {
        const savedState = sessionStorage.getItem('appState');
        if (savedState) {
            try {
                const parsedState = JSON.parse(savedState);
                this.state = { ...this.state, ...parsedState };
                logger.info('État de l\'application restauré', 'AppState', this.state);
            } catch (error) {
                logger.error(`Erreur lors de la restauration de l'état: ${error}`, 'AppState');
            }
        }
    }

    // Getters
    public getCurrentObjectId(): string {
        return this.state.currentObjectId;
    }

    public getShowingLabels(): boolean {
        return this.state.showingLabels;
    }

    public getShowingDebugPoints(): boolean {
        return this.state.showingDebugPoints;
    }

    public getIsAnimating(): boolean {
        return this.state.isAnimating;
    }

    // Setters
    public setCurrentObjectId(id: string): void {
        this.state.currentObjectId = id;
        this.saveState();
    }

    public setShowingLabels(value: boolean): void {
        this.state.showingLabels = value;
        this.saveState();
    }

    public setShowingDebugPoints(value: boolean): void {
        this.state.showingDebugPoints = value;
        this.saveState();
    }

    public setIsAnimating(value: boolean): void {
        this.state.isAnimating = value;
        this.saveState();
    }
}