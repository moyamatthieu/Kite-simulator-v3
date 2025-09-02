/**
 * StateManager.ts - Gestionnaire d'état global réactif
 * State management centralisé avec observateurs pour toute l'application
 */

export type StateValue = any;
export type StateListener<T = StateValue> = (value: T, previous: T) => void;
export type StateValidator<T = StateValue> = (value: T) => boolean | string;

export interface StateConfig<T = StateValue> {
    initialValue: T;
    validator?: StateValidator<T>;
    persistent?: boolean;
    storageKey?: string;
}

/**
 * Gestionnaire d'état global réactif
 */
export class StateManager {
    private static instance: StateManager;
    private states: Map<string, StateValue> = new Map();
    private listeners: Map<string, StateListener[]> = new Map();
    private validators: Map<string, StateValidator> = new Map();
    private persistentKeys: Set<string> = new Set();
    private storageKeys: Map<string, string> = new Map();

    private constructor() {
        this.loadPersistedStates();
        this.setupAutoSave();
    }

    static getInstance(): StateManager {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }

    /**
     * Enregistre un nouvel état avec configuration
     */
    registerState<T>(key: string, config: StateConfig<T>): void {
        // Vérifier si l'état existe déjà
        if (this.states.has(key)) {
            console.warn(`État "${key}" déjà enregistré`);
            return;
        }

        // Charger depuis le storage si persistant
        let initialValue = config.initialValue;
        if (config.persistent) {
            const storageKey = config.storageKey || `state_${key}`;
            this.persistentKeys.add(key);
            this.storageKeys.set(key, storageKey);

            const saved = this.loadFromStorage(storageKey);
            if (saved !== null) {
                initialValue = saved;
            }
        }

        // Valider la valeur initiale
        if (config.validator) {
            this.validators.set(key, config.validator);
            const validation = config.validator(initialValue);
            if (validation !== true) {
                throw new Error(`Valeur initiale invalide pour "${key}": ${validation}`);
            }
        }

        // Enregistrer l'état
        this.states.set(key, initialValue);
        this.listeners.set(key, []);

        console.log(`📊 État "${key}" enregistré avec valeur:`, initialValue);
    }

    /**
     * Met à jour un état
     */
    setState<T>(key: string, value: T): boolean {
        if (!this.states.has(key)) {
            console.error(`État "${key}" non enregistré`);
            return false;
        }

        const previous = this.states.get(key);

        // Valider la nouvelle valeur
        const validator = this.validators.get(key);
        if (validator) {
            const validation = validator(value);
            if (validation !== true) {
                console.error(`Valeur invalide pour "${key}": ${validation}`);
                return false;
            }
        }

        // Vérifier si la valeur a vraiment changé
        if (this.deepEqual(previous, value)) {
            return true; // Pas de changement, mais pas d'erreur
        }

        // Mettre à jour l'état
        this.states.set(key, value);

        // Sauvegarder si persistant
        if (this.persistentKeys.has(key)) {
            const storageKey = this.storageKeys.get(key)!;
            this.saveToStorage(storageKey, value);
        }

        // Notifier les listeners
        this.notifyListeners(key, value, previous);

        return true;
    }

    /**
     * Récupère un état
     */
    getState<T>(key: string): T | undefined {
        return this.states.get(key);
    }

    /**
     * Récupère un état avec valeur par défaut
     */
    getStateOr<T>(key: string, defaultValue: T): T {
        return this.states.get(key) ?? defaultValue;
    }

    /**
     * Met à jour partiellement un état objet
     */
    updateState<T extends object>(key: string, partial: Partial<T>): boolean {
        const current = this.getState<T>(key);
        if (!current || typeof current !== 'object') {
            console.error(`État "${key}" n'est pas un objet`);
            return false;
        }

        const updated = { ...current, ...partial };
        return this.setState(key, updated);
    }

    /**
     * Écoute les changements d'un état
     */
    subscribe<T>(key: string, listener: StateListener<T>): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        const listeners = this.listeners.get(key)!;
        listeners.push(listener as StateListener);

        // Retourner la fonction de désabonnement
        return () => {
            const index = listeners.indexOf(listener as StateListener);
            if (index !== -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Supprime un état
     */
    removeState(key: string): boolean {
        if (!this.states.has(key)) {
            return false;
        }

        this.states.delete(key);
        this.listeners.delete(key);
        this.validators.delete(key);

        if (this.persistentKeys.has(key)) {
            this.persistentKeys.delete(key);
            const storageKey = this.storageKeys.get(key);
            if (storageKey) {
                this.removeFromStorage(storageKey);
                this.storageKeys.delete(key);
            }
        }

        return true;
    }

    /**
     * Réinitialise un état à sa valeur par défaut
     */
    resetState(key: string): boolean {
        // Note: Cette méthode nécessiterait de stocker les valeurs par défaut
        // Pour l'instant, on peut juste supprimer et redemander l'enregistrement
        console.warn(`Reset de "${key}" non implémenté. Utilisez removeState() et registerState()`);
        return false;
    }

    /**
     * Obtient tous les états actuels (pour debug)
     */
    getAllStates(): Record<string, StateValue> {
        const result: Record<string, StateValue> = {};
        this.states.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Obtient les statistiques du gestionnaire d'état
     */
    getStats(): {
        totalStates: number;
        persistentStates: number;
        totalListeners: number;
        validatedStates: number;
    } {
        let totalListeners = 0;
        this.listeners.forEach(listeners => {
            totalListeners += listeners.length;
        });

        return {
            totalStates: this.states.size,
            persistentStates: this.persistentKeys.size,
            totalListeners,
            validatedStates: this.validators.size
        };
    }

    // === MÉTHODES PRIVÉES ===

    private notifyListeners<T>(key: string, value: T, previous: T): void {
        const listeners = this.listeners.get(key) || [];
        listeners.forEach(listener => {
            try {
                listener(value, previous);
            } catch (error) {
                console.error(`Erreur dans listener pour "${key}":`, error);
            }
        });
    }

    private loadPersistedStates(): void {
        try {
            // Cette méthode sera appelée après l'enregistrement des états persistants
            console.log('🔄 Chargement des états persistants...');
        } catch (error) {
            console.error('Erreur lors du chargement des états persistants:', error);
        }
    }

    private setupAutoSave(): void {
        // Sauvegarder périodiquement les états persistants
        setInterval(() => {
            this.savePersistedStates();
        }, 30000); // Toutes les 30 secondes

        // Sauvegarder avant la fermeture de la page
        window.addEventListener('beforeunload', () => {
            this.savePersistedStates();
        });
    }

    private savePersistedStates(): void {
        this.persistentKeys.forEach(key => {
            const storageKey = this.storageKeys.get(key);
            if (storageKey) {
                const value = this.states.get(key);
                this.saveToStorage(storageKey, value);
            }
        });
    }

    private loadFromStorage(key: string): StateValue {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Erreur lors du chargement de "${key}":`, error);
            return null;
        }
    }

    private saveToStorage(key: string, value: StateValue): void {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
            console.error(`Erreur lors de la sauvegarde de "${key}":`, error);
        }
    }

    private removeFromStorage(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error(`Erreur lors de la suppression de "${key}":`, error);
        }
    }

    private deepEqual(a: any, b: any): boolean {
        if (a === b) return true;
        if (a == null || b == null) return false;
        if (typeof a !== typeof b) return false;

        if (typeof a === 'object') {
            if (Array.isArray(a) !== Array.isArray(b)) return false;

            const keysA = Object.keys(a);
            const keysB = Object.keys(b);

            if (keysA.length !== keysB.length) return false;

            for (const key of keysA) {
                if (!keysB.includes(key)) return false;
                if (!this.deepEqual(a[key], b[key])) return false;
            }

            return true;
        }

        return false;
    }
}

// === ÉTATS PRÉDÉFINIS POUR L'APPLICATION ===

/**
 * Initialise les états par défaut de l'application
 */
export function initializeAppStates(): void {
    const stateManager = StateManager.getInstance();

    // État du mode actuel
    stateManager.registerState('app.mode', {
        initialValue: 'cad' as 'cad' | 'simulation' | 'hybrid',
        validator: (value) => ['cad', 'simulation', 'hybrid'].includes(value) || 'Mode invalide',
        persistent: true,
        storageKey: 'app_mode'
    });

    // État de l'interface utilisateur
    stateManager.registerState('ui.theme', {
        initialValue: 'dark' as 'dark' | 'light' | 'high-contrast',
        validator: (value) => ['dark', 'light', 'high-contrast'].includes(value) || 'Thème invalide',
        persistent: true
    });

    stateManager.registerState('ui.panels', {
        initialValue: {
            'scene-tree': { visible: true, width: 250, height: 400 },
            'properties': { visible: true, width: 300, height: 500 },
            'console': { visible: true, width: 800, height: 200 },
            'object-library': { visible: true, width: 250, height: 600 }
        },
        persistent: true
    });

    // État de la scène 3D
    stateManager.registerState('scene.objects', {
        initialValue: [],
        persistent: true
    });

    stateManager.registerState('scene.camera', {
        initialValue: {
            position: { x: 3, y: 5, z: 12 },
            target: { x: 0, y: 3, z: -5 },
            fov: 75
        },
        persistent: true
    });

    // État de la simulation
    stateManager.registerState('simulation.config', {
        initialValue: {
            wind: { strength: 5, direction: 0 },
            physics: { gravity: 9.81, damping: 0.98 },
            rendering: { shadows: true, antialiasing: true }
        },
        persistent: true
    });

    stateManager.registerState('simulation.playing', {
        initialValue: false,
        validator: (value) => typeof value === 'boolean' || 'Doit être un booléen'
    });

    // État de performance
    stateManager.registerState('performance.fps', {
        initialValue: 60,
        validator: (value) => typeof value === 'number' && value > 0 || 'FPS doit être positif'
    });

    stateManager.registerState('performance.frameTime', {
        initialValue: 16.67, // ms
        validator: (value) => typeof value === 'number' && value > 0 || 'Frame time doit être positif'
    });

    console.log('✅ États par défaut de l\'application initialisés');
}

// Export de l'instance singleton
export const stateManager = StateManager.getInstance();
