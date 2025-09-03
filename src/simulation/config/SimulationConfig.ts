/**
 * Configuration centralisée pour la simulation V10
 * Inspirée de la V9 mais adaptée à l'architecture modulaire
 */

import { Result } from '@/simulation/utils/Result';
import * as THREE from 'three'; // Importé pour des fins de typage si nécessaire pour d'autres modules qui l'importent
import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';
import { KiteGeometry } from '@/simulation/data/KiteGeometry';

/**
 * @interface SimulationConfig
 * @description Interface TypeScript pour la structure complète de la configuration de la simulation.
 *              Elle regroupe toutes les sous-configurations par domaine.
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
    control: ControlConfig; // Nouvelle section pour le contrôle de l'input et du comportement de la barre.
}

/**
 * @interface DebugConfig
 * @description Configuration pour les fonctionnalités de débogage de la simulation.
 */
export interface DebugConfig {
    enabled: boolean;          // Active/désactive le mode debug global
    verbosePhysics: boolean;   // Log les détails de la physique
    verboseForces: boolean;    // Log les forces appliquées
    verboseLines: boolean;     // Log l'état des lignes
    verboseAero: boolean;      // Log les calculs aérodynamiques
    frameInterval: number;     // Intervalle pour la mise à jour des logs (en frames)
    startVisible: boolean;     // Si l'UI de debug doit être visible au démarrage
}

/**
 * @interface PhysicsConfig
 * @description Configuration des constantes et paramètres physiques généraux de la simulation.
 */
export interface PhysicsConfig {
    gravity: number;              // Gravité en m/s²
    airDensity: number;           // Densité de l'air en kg/m³
    deltaTimeMax: number;         // Pas de temps maximum pour l'intégration physique (s), évite les artefacts
    angularDamping: number;       // Facteur d'amortissement angulaire (0-1)
    linearDamping: number;        // Facteur d'amortissement linéaire (0-1)
    angularDragCoeff: number;     // Coefficient de traînée angulaire
    maxForce: number;             // Force maximale applicable au kite en Newtons (sécurité)
    maxVelocity: number;          // Vitesse maximale du kite en m/s (sécurité)
    maxAngularVelocity: number;   // Vitesse angulaire maximale du kite en rad/s (sécurité)
    maxAcceleration: number;      // Accélération maximale du kite en m/s² (sécurité)
    maxAngularAcceleration: number; // Accélération angulaire maximale du kite en rad/s² (sécurité)
}

/**
 * @interface AeroConfig
 * @description Configuration spécifique à l'aérodynamique du kite.
 */
export interface AeroConfig {
    liftScale: number;           // Facteur d'échelle pour la force de portance
    dragScale: number;           // Facteur d'échelle pour la force de traînée
    profileDragCoeff: number;    // Coefficient de traînée de profil (résistance intrinsèque du shape)
    inducedDragCoeff: number;    // Coefficient de traînée induite par la portance
    stabilityFactor: number;     // Facteur de stabilité pour le comportement auto-équilibrant du kite (couple de redressement)
    stallAngle: number;          // Angle d'attaque (AoA) en degrés à partir duquel le kite commence à décrocher
    stallRecoveryAngle: number;  // Angle d'attaque (AoA) en degrés auquel le kite récupère du décrochage
    rho: number;                 // Densité de l'air, redéfinie ici si la section Aero a besoin de sa propre valeur conceptuelle
}

/**
 * @interface KiteConfig
 * @description Configuration des propriétés physiques et visuelles du kite.
 */
export interface KiteConfig {
    mass: number;                // Masse du cerf-volant en kg
    area: number;                // Surface totale projetée du cerf-volant en m²
    inertia: number;             // Moment d'inertie du cerf-volant (résistance au changement de rotation) en kg·m²
    minHeight: number;           // Hauteur minimale du cerf-volant par rapport au sol (collision)
    defaultColor: string;        // Couleur par défaut du kite pour le rendu (format hex #RRGGBB)
    // controlPoints: Les points de contrôle sont maintenant définis dans `KiteGeometry.ts`
    // et ne sont plus configurables dynamiquement ici pour maintenir la cohérence géométrique.
}

/**
 * @interface LinesConfig
 * @description Configuration des propriétés des lignes de contrôle du kite.
 */
export interface LinesConfig {
    defaultLength: number;       // Longueur initiale et par défaut des lignes en mètres
    stiffness: number;           // Rigidité des lignes (modèle ressort-corde), en Newtons par mètre d'extension
    maxTension: number;          // Tension maximale que les lignes peuvent supporter avant de "casser" (N)
    maxSag: number;              // Affaissement maximal toléré des lignes avant correction (ratio)
    catenarySagFactor: number;   // Facteur influençant la courbe des lignes, simulant leur poids (concept V8)
    bridleLength: number;        // Longueur des brides (petites lignes entre le kite et les lignes principales)
    elasticity: number;          // Élasticité des lignes (ex: 0.02 = 2% d'étirement max)
    constraintTolerance: number; // Tolérance pour les contraintes de ligne, pour éviter des oscillations numériques
}

/**
 * @interface WindConfig
 * @description Configuration du comportement du vent dans la simulation.
 */
export interface WindConfig {
    defaultSpeed: number;        // Vitesse du vent par défaut en km/h
    defaultDirection: number;    // Direction du vent par défaut en degrés (0° = vent de face vers -Z)
    defaultTurbulence: number;   // Niveau de turbulence du vent par défaut (en % de la vitesse)
    minSpeed: number;            // Vitesse minimale du vent configurable en km/h
    maxSpeed: number;            // Vitesse maximale du vent configurable en km/h
    turbulenceScale: number;     // Facteur d'échelle pour l'amplitude des variations de turbulence
    turbulenceFreqBase: number;  // Fréquence de base des variations de turbulence
    maxApparentSpeed: number;    // Vitesse apparente maximale du vent (limite pour la stabilité)
}

/**
 * @interface RenderingConfig
 * @description Configuration des paramètres liés au moteur de rendu 3D.
 */
export interface RenderingConfig {
    shadowMapSize: number;       // Taille de la texture d'ombre pour la qualité des ombres (ex: 2048, 4096)
    antialias: boolean;          // Active/désactive l'anti-aliasing pour adoucir les bords
    fogStart: number;            // Distance à laquelle le brouillard commence dans la scène
    fogEnd: number;              // Distance à laquelle le brouillard est totalement opaque
}


/**
 * @interface ControlBarConfig
 * @description Configuration des propriétés de la barre de contrôle 3D.
 */
export interface ControlBarConfig {
    width: number;               // Largeur visuelle de la barre
    position: { x: number; y: number; z: number }; // Position globale initiale de la barre
}

/**
 * @interface ControlConfig
 * @description Configuration des paramètres du système de contrôle du kite.
 */
export interface ControlConfig {
    inputSmoothing: number;     // Ratio de lissage des entrées utilisateur pour des mouvements plus fluides (0-1)
    returnSpeed: number;        // Vitesse à laquelle la barre de contrôle revient vers le centre (unités/seconde)
    maxTilt: number;            // Inclinaison maximale de la barre (-1 pour gauche, 1 pour droite maximum)
    tiltRotationScale: number;  // Multiplicateur pour la conversion de l'inclinaison en rotation visuelle de la barre (radians)
    barHeight: number;           // Hauteur de la barre de contrôle par rapport au pilote, géré ici pour la config.
}

/**
 * Configuration par défaut
 * Cette implémentation par défaut est utilisée si aucune configuration spécifique n'est fournie.
 * Les valeurs sont basées sur des observations de Simulation V8/V9 pour assurer une compatibilité comportementale.
 */
export const DEFAULT_CONFIG: SimulationConfig = {
    debug: {
        enabled: true,             // Mode debug activé par défaut
        verbosePhysics: false,     // Verbose logging pour la physique
        verboseForces: false,      // Verbose logging pour les forces
        verboseLines: false,       // Verbose logging pour les lignes
        verboseAero: false,        // Verbose logging pour l'aérodynamique
        frameInterval: 60,         // Intervalle de logging en frames
        startVisible: true         // L'interface de debug est visible au démarrage
    },
    physics: {
        gravity: 9.81,             // Gravité terrestre standard en m/s²
        airDensity: 1.225,         // Densité de l'air à 15°C au niveau de la mer (kg/m³)
        deltaTimeMax: 0.016,       // Limite le pas de temps maximum à environ 60 FPS pour la stabilité
        linearDamping: 0.92,       // Amortissement linéaire pour réduire la vitesse progressivement
        angularDamping: 0.85,      // Amortissement angulaire pour réduire la rotation progressivement
        angularDragCoeff: 0.10,    // Coefficient de traînée angulaire du kite
        maxForce: PhysicsConstants.MAX_FORCE,              // Force maximale applicable (issue de PhysicsConstants)
        maxVelocity: PhysicsConstants.MAX_VELOCITY,        // Vitesse maximale (issue de PhysicsConstants)
        maxAngularVelocity: PhysicsConstants.MAX_ANGULAR_VELOCITY, // Vitesse angulaire maximale (issue de PhysicsConstants)
        maxAcceleration: PhysicsConstants.MAX_ACCELERATION,      // Accélération maximale (issue de PhysicsConstants)
        maxAngularAcceleration: PhysicsConstants.MAX_ANGULAR_ACCELERATION // Accélération angulaire maximale (issue de PhysicsConstants)
    },
    aero: {
        liftScale: 1.5,            // Facteur pour ajuster l'intensité de la portance
        dragScale: 1.0,            // Facteur pour ajuster l'intensité de la traînée
        profileDragCoeff: 0.02,    // Coefficient pour la traînée de forme pure (sans portance)
        inducedDragCoeff: 0.05,    // Coefficient pour la traînée induite par la portance
        stabilityFactor: 0.4,      // Facteur d'influence du couple de redressement aérodynamique
        stallAngle: 18,            // Angle d'attaque en degrés où le décrochage commence
        stallRecoveryAngle: 10,  // Angle d'attaque en degrés où le décrochage s'atténue
        rho: 1.225                 // Densité de l'air, peut être configurée séparément des physiques générales
    },
    kite: {
        mass: 0.28,                // Masse du kite en kg
        area: KiteGeometry.TOTAL_AREA, // Utilise l'aire totale calculée dynamiquement par `KiteGeometry`
        inertia: 0.08,             // Moment d'inertie, résistance à la rotation
        minHeight: 0.5,            // Hauteur minimale avant collision avec le sol
        defaultColor: '#ff5555',   // Couleur par défaut du kite (rouge)
    },
    lines: {
        defaultLength: 15,         // Longueur par défaut des lignes de contrôle en mètres
        stiffness: 25000,          // Rigidité des lignes (forte pour des cordes presque inélastiques)
        maxTension: 1000,          // Tension maximale avant que la ligne ne rompe (N)
        maxSag: 0.015,             // Affaissement maximal visuel des lignes
        catenarySagFactor: 2.5,    // Influence du poids sur la courbe de la caténaire
        bridleLength: 0.8,         // Longueur des lignes secondaires (brides)
        elasticity: 0.02,          // Élasticité des lignes (0.02 = 2% d'étirement)
        constraintTolerance: PhysicsConstants.LINE_CONSTRAINT_TOLERANCE // Tolérance pour les calculs de contraintes de ligne
    },
    wind: {
        defaultSpeed: 18,          // Vitesse par défaut du vent en km/h
        defaultDirection: 0,       // Direction par défaut du vent en degrés
        defaultTurbulence: 2,      // Pourcentage de turbulence par défaut
        minSpeed: 0,               // Vitesse minimale réglable
        maxSpeed: 100,             // Vitesse maximale réglable
        turbulenceScale: 0.15,     // Échelle d'amplitude des fluctuations de turbulence
        turbulenceFreqBase: 0.3,   // Fréquence de base des fluctuations du vent
        maxApparentSpeed: 25       // Limite supérieure pour la vitesse du vent apparent
    },
    rendering: {
        shadowMapSize: 2048,       // Résolution de la carte d'ombres
        antialias: true,           // Activation de l'anti-aliasing
        fogStart: 100,             // Début du brouillard
        fogEnd: 1000               // Fin du brouillard
    },
    controlBar: {
        width: 0.6,                // Largeur de la barre de contrôle
        position: { x: 0, y: 1.2, z: 8 } // Position par défaut de la barre
    },
    control: {
        inputSmoothing: 0.85,      // Lissage de l'entrée pour les mouvements de la barre
        returnSpeed: 0.002,        // Vitesse de retour au centre de la barre
        maxTilt: 0.75,             // Inclinaison maximale de la barre
        tiltRotationScale: 0.7,    // Échelle de conversion des mouvements en rotation
        barHeight: 1.4             // Hauteur de la barre de contrôle par rapport au pilote
    }
};

/**
 * @class ConfigManager
 * @description Gère le chargement, la fusion avec les valeurs par défaut, la validation
 *              et l'accès à la configuration de la simulation. Implémente le pattern
 *              Singleton pour une instance globale unique.
 */
export class ConfigManager {
    private config: SimulationConfig;

    /**
     * @constructor
     * @param {Partial<SimulationConfig>} [config] - Une configuration partielle à fusionner avec les valeurs par défaut.
     */
    constructor(config?: Partial<SimulationConfig>) {
        this.config = this.mergeWithDefaults(config);
    }

    /**
     * Fusionne une configuration partielle avec les valeurs par défaut pour créer une configuration complète.
     * Effectue une fusion profonde pour les objets imbriqués comme `position` dans `controlBar`.
     * @param {Partial<SimulationConfig>} [partial] - La configuration partielle fournie.
     * @returns {SimulationConfig} La configuration complète après fusion.
     */
    private mergeWithDefaults(partial?: Partial<SimulationConfig>): SimulationConfig {
        if (!partial) return { ...DEFAULT_CONFIG };

        return {
            debug: { ...DEFAULT_CONFIG.debug, ...partial.debug },
            physics: { ...DEFAULT_CONFIG.physics, ...partial.physics },
            aero: { ...DEFAULT_CONFIG.aero, ...partial.aero },
            kite: { // La section 'kite' ne contient plus de controlPoints configurables directement ici
                ...DEFAULT_CONFIG.kite,
                ...partial.kite,
            },
            lines: { ...DEFAULT_CONFIG.lines, ...partial.lines },
            wind: { ...DEFAULT_CONFIG.wind, ...partial.wind },
            rendering: { ...DEFAULT_CONFIG.rendering, ...partial.rendering },
            controlBar: {
                ...DEFAULT_CONFIG.controlBar,
                ...partial.controlBar,
                position: { // La position est un objet imbriqué qui nécessite une fusion profonde
                    ...DEFAULT_CONFIG.controlBar.position,
                    ...(partial.controlBar?.position || {})
                }
            },
            control: { ...DEFAULT_CONFIG.control, ...partial.control }, // Fusion pour la section control
        };
    }

    /**
     * Valide la configuration actuelle de la simulation.
     * @returns {Result<void, string>} Un objet Result indiquant le succès ou l'échec de la validation.
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
     * Obtient une section spécifique de la configuration.
     * @template K - La clé de la section de configuration (ex: 'physics', 'wind').
     * @param {K} section - La clé de la section à récupérer.
     * @returns {SimulationConfig[K]} La sous-configuration correspondante.
     */
    get<K extends keyof SimulationConfig>(section: K): SimulationConfig[K] {
        return this.config[section];
    }

    /**
     * Met à jour une section spécifique de la configuration.
     * @template K - La clé de la section de configuration.
     * @param {K} section - La clé de la section à mettre à jour.
     * @param {Partial<SimulationConfig[K]>} values - Les valeurs partielles à appliquer à la section.
     * @returns {Result<void, string>} Un objet Result indiquant le succès ou l'échec de la mise à jour et validation.
     */
    update<K extends keyof SimulationConfig>(
        section: K,
        values: Partial<SimulationConfig[K]>
    ): Result<void, string> {
        // Assurez-vous que la section existe et est un objet pour la fusion
        if (typeof this.config[section] === 'object' && this.config[section] !== null) {
            this.config[section] = { ...(this.config[section] as object), ...(values as object) } as SimulationConfig[K];
        } else {
            // Pour les types primitifs, ou si la section n'est pas un objet
            this.config[section] = values as SimulationConfig[K];
        }
        return this.validate();
    }


    /**
     * Obtient la configuration complète en lecture seule.
     * @returns {Readonly<SimulationConfig>} La configuration complète, immuniée.
     */
    getAll(): Readonly<SimulationConfig> {
        return Object.freeze({ ...this.config });
    }

    /**
     * Charge la configuration depuis le stockage local (localStorage).
     * @returns {Result<void, string>} Indique le succès ou l'échec du chargement.
     */
    loadFromStorage(): Result<void, string> {
        try {
            const stored = localStorage.getItem('simulation_v10_config');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Utilise mergeWithDefaults pour fusionner la config chargée avec les valeurs par défaut,
                // ce qui permet d'ajouter de nouvelles propriétés par défaut si la config stockée est ancienne.
                this.config = this.mergeWithDefaults(parsed);
                return this.validate();
            }
            return Result.ok(undefined); // Pas de config stockée, utilise les valeurs par défaut
        } catch (error) {
            return Result.err(`Failed to load config from storage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Sauvegarde la configuration actuelle dans le stockage local (localStorage).
     * @returns {Result<void, string>} Indique le succès ou l'échec de la sauvegarde.
     */
    saveToStorage(): Result<void, string> {
        try {
            localStorage.setItem('simulation_v10_config', JSON.stringify(this.config));
            return Result.ok(undefined);
        } catch (error) {
            return Result.err(`Failed to save config to storage: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Instance globale singleton de ConfigManager pour un accès facile à la configuration partout dans l'application.
export const CONFIG = new ConfigManager();
// Tente de charger la configuration sauvegardée existante.
CONFIG.loadFromStorage();