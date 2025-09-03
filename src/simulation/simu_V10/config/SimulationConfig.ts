/**
 * Configuration centralisée pour la simulation V10
 * Inspirée de la V9 mais adaptée à l'architecture modulaire
 */

import { Result } from '../utils/Result';

/**
 * Configuration complète de la simulation
 */
export interface SimulationConfig {
    debug: DebugConfig;
    physics: PhysicsConfig;
    aero: AeroConfig;
    kite: KiteConfig;
    lines: LinesConfig;
    wind: WindConfig;
    rendering: RenderingConfig;
    controlBar: ControlBarConfig;
}

export interface DebugConfig {
    enabled: boolean;
    verbosePhysics: boolean;
    verboseForces: boolean;
    verboseLines: boolean;
    verboseAero: boolean;
    frameInterval: number;
}

export interface PhysicsConfig {
    gravity: number;              // m/s²
    airDensity: number;          // kg/m³
    deltaTimeMax: number;        // s
    angularDamping: number;      // 0-1
    linearDamping: number;       // 0-1
    angularDragCoeff: number;
}

export interface AeroConfig {
    liftScale: number;
    dragScale: number;
    profileDragCoeff: number;    // Cd0
    inducedDragCoeff: number;    // Cdi
    stabilityFactor: number;
    stallAngle: number;          // deg
    stallRecoveryAngle: number;  // deg
}

export interface KiteConfig {
    mass: number;                // kg
    area: number;                // m²
    inertia: number;             // kg·m²
    minHeight: number;           // m
}

export interface LinesConfig {
    defaultLength: number;       // m
    stiffness: number;          // N/m
    maxTension: number;         // N
    maxSag: number;             // ratio
    catenarySagFactor: number;
    bridleLength: number;       // m
    elasticity: number;         // ratio (0.02 = 2%)
}

export interface WindConfig {
    defaultSpeed: number;        // km/h
    defaultDirection: number;    // deg
    defaultTurbulence: number;   // %
    minSpeed: number;           // km/h
    maxSpeed: number;           // km/h
    turbulenceScale: number;
    turbulenceFreqBase: number;
    maxApparentSpeed: number;   // m/s
}

export interface RenderingConfig {
    shadowMapSize: number;
    antialias: boolean;
    fogStart: number;
    fogEnd: number;
}

export interface ControlBarConfig {
    width: number;              // m
    position: { x: number; y: number; z: number };
}

/**
 * Configuration par défaut
 */
export const DEFAULT_CONFIG: SimulationConfig = {
    debug: {
        enabled: true,
        verbosePhysics: false,
        verboseForces: false,
        verboseLines: false,
        verboseAero: false,
        frameInterval: 60
    },
    physics: {
        gravity: 9.81,
        airDensity: 1.225,
        deltaTimeMax: 0.016,
        angularDamping: 0.985,
        linearDamping: 0.988,
        angularDragCoeff: 0.08
    },
    aero: {
        liftScale: 2.2,
        dragScale: 0.3,
        profileDragCoeff: 0.02,
        inducedDragCoeff: 0.05,
        stabilityFactor: 0.4,
        stallAngle: 18,
        stallRecoveryAngle: 10
    },
    kite: {
        mass: 0.22,
        area: 0.68,
        inertia: 0.05,
        minHeight: 0.5
    },
    lines: {
        defaultLength: 15,
        stiffness: 12000,
        maxTension: 250,
        maxSag: 0.015,
        catenarySagFactor: 2.5,
        bridleLength: 0.8,
        elasticity: 0.02
    },
    wind: {
        defaultSpeed: 12,
        defaultDirection: 0,
        defaultTurbulence: 2,
        minSpeed: 0,
        maxSpeed: 100,
        turbulenceScale: 0.15,
        turbulenceFreqBase: 0.3,
        maxApparentSpeed: 25
    },
    rendering: {
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000
    },
    controlBar: {
        width: 0.6,
        position: { x: 0, y: 1.2, z: 8 }
    }
};

/**
 * Gestionnaire de configuration avec validation
 */
export class ConfigManager {
    private config: SimulationConfig;

    constructor(config?: Partial<SimulationConfig>) {
        this.config = this.mergeWithDefaults(config);
    }

    /**
     * Fusionne une configuration partielle avec les valeurs par défaut
     */
    private mergeWithDefaults(partial?: Partial<SimulationConfig>): SimulationConfig {
        if (!partial) return { ...DEFAULT_CONFIG };

        return {
            debug: { ...DEFAULT_CONFIG.debug, ...partial.debug },
            physics: { ...DEFAULT_CONFIG.physics, ...partial.physics },
            aero: { ...DEFAULT_CONFIG.aero, ...partial.aero },
            kite: { ...DEFAULT_CONFIG.kite, ...partial.kite },
            lines: { ...DEFAULT_CONFIG.lines, ...partial.lines },
            wind: { ...DEFAULT_CONFIG.wind, ...partial.wind },
            rendering: { ...DEFAULT_CONFIG.rendering, ...partial.rendering },
            controlBar: { ...DEFAULT_CONFIG.controlBar, ...partial.controlBar }
        };
    }

    /**
     * Valide la configuration
     */
    validate(): Result<void, string> {
        // Validation physique
        if (this.config.physics.gravity < 0) {
            return Result.err('Gravity must be positive');
        }
        if (this.config.physics.airDensity <= 0) {
            return Result.err('Air density must be positive');
        }

        // Validation aéro
        if (this.config.aero.stallAngle <= this.config.aero.stallRecoveryAngle) {
            return Result.err('Stall angle must be greater than recovery angle');
        }

        // Validation kite
        if (this.config.kite.mass <= 0 || this.config.kite.area <= 0) {
            return Result.err('Kite mass and area must be positive');
        }

        // Validation lignes
        if (this.config.lines.defaultLength <= 0) {
            return Result.err('Line length must be positive');
        }

        // Validation vent
        if (this.config.wind.minSpeed > this.config.wind.maxSpeed) {
            return Result.err('Min wind speed must be less than max');
        }

        return Result.ok(undefined);
    }

    /**
     * Obtient une section de configuration
     */
    get<K extends keyof SimulationConfig>(section: K): SimulationConfig[K] {
        return this.config[section];
    }

    /**
     * Met à jour une section de configuration
     */
    update<K extends keyof SimulationConfig>(
        section: K,
        values: Partial<SimulationConfig[K]>
    ): Result<void, string> {
        this.config[section] = { ...this.config[section], ...values };
        return this.validate();
    }

    /**
     * Obtient la configuration complète
     */
    getAll(): Readonly<SimulationConfig> {
        return Object.freeze({ ...this.config });
    }

    /**
     * Charge depuis le localStorage
     */
    loadFromStorage(): Result<void, string> {
        try {
            const stored = localStorage.getItem('simulation_v10_config');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.config = this.mergeWithDefaults(parsed);
                return this.validate();
            }
            return Result.ok(undefined);
        } catch (error) {
            return Result.err(`Failed to load config: ${error}`);
        }
    }

    /**
     * Sauvegarde dans le localStorage
     */
    saveToStorage(): Result<void, string> {
        try {
            localStorage.setItem('simulation_v10_config', JSON.stringify(this.config));
            return Result.ok(undefined);
        } catch (error) {
            return Result.err(`Failed to save config: ${error}`);
        }
    }
}

// Instance globale singleton
export const CONFIG = new ConfigManager();