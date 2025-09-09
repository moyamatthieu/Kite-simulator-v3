/**
 * Constants.ts - Configuration complète V8 intégrée
 * Physique émergente pure avec toutes les constantes de SimulationV8
 */

import * as THREE from 'three';

// ==============================================================================
// CONSTANTES PHYSIQUES GLOBALES - DIRECTEMENT DE V8
// ==============================================================================

/**
 * Les règles du jeu - comme les limites de vitesse sur la route
 * Ces nombres définissent ce qui est possible ou pas dans notre monde virtuel
 */
export class PhysicsConstants {
    static readonly EPSILON = 1e-4;                    // Un tout petit nombre pour dire "presque zéro"
    static readonly CONTROL_DEADZONE = 0.01;           // La barre ne réagit pas si vous la bougez très peu
    static readonly LINE_CONSTRAINT_TOLERANCE = 0.0005; // Les lignes peuvent s'étirer de 5mm max (marge d'erreur)
    static readonly LINE_TENSION_FACTOR = 0.99;        // Les lignes restent un peu plus courtes pour rester tendues
    static readonly GROUND_FRICTION = 0.85;            // Le sol freine le kite de 15% s'il le touche
    static readonly CATENARY_SEGMENTS = 5;             // Nombre de points pour dessiner la courbe des lignes

    // Limites de sécurité - pour que la simulation ne devienne pas folle
    static readonly MAX_FORCE = 2500;                  // Force max pour montée au zénith
    static readonly MAX_VELOCITY = 40;                 // Vitesse max : 40 m/s = 144 km/h
    static readonly MAX_ANGULAR_VELOCITY = 25;          // Rotation max : presque 1 tour par seconde
    static readonly MAX_ACCELERATION = 150;             // Accélération max pour montée verticale
    static readonly MAX_ANGULAR_ACCELERATION = 20;     // La rotation ne peut pas s'emballer
}

// ==============================================================================
// GÉOMÉTRIE DU CERF-VOLANT - EXACTEMENT COMME V8
// ==============================================================================

/**
 * La forme du cerf-volant - comme un plan de construction
 * On définit où sont tous les points importants du cerf-volant
 */
export class KiteGeometry {
    // Les points clés du cerf-volant (comme les coins d'une maison)
    // Coordonnées en mètres : [gauche/droite, haut/bas, avant/arrière]
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),                      // Le bout pointu en haut
        SPINE_BAS: new THREE.Vector3(0, 0, 0),                   // Le centre en bas
        BORD_GAUCHE: new THREE.Vector3(-0.825, 0, 0),            // L'extrémité de l'aile gauche
        BORD_DROIT: new THREE.Vector3(0.825, 0, 0),              // L'extrémité de l'aile droite
        WHISKER_GAUCHE: new THREE.Vector3(-0.4125, 0.1, -0.15),  // Stabilisateur gauche (légèrement en arrière)
        WHISKER_DROIT: new THREE.Vector3(0.4125, 0.1, -0.15),    // Stabilisateur droit (légèrement en arrière)
        CTRL_GAUCHE: new THREE.Vector3(-0.15, 0.3, 0.4),         // Où s'attache la ligne gauche
        CTRL_DROIT: new THREE.Vector3(0.15, 0.3, 0.4)            // Où s'attache la ligne droite
    };

    // Le cerf-volant est fait de 4 triangles de tissu
    // Chaque triangle a 3 coins (vertices) et une surface en mètres carrés
    static readonly SURFACES = [
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_GAUCHE,
                KiteGeometry.POINTS.WHISKER_GAUCHE
            ],
            area: 0.23 // m² - Surface haute gauche
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_GAUCHE,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0.11 // m² - Surface basse gauche
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.BORD_DROIT,
                KiteGeometry.POINTS.WHISKER_DROIT
            ],
            area: 0.23 // m² - Surface haute droite
        },
        {
            vertices: [
                KiteGeometry.POINTS.NEZ,
                KiteGeometry.POINTS.WHISKER_DROIT,
                KiteGeometry.POINTS.SPINE_BAS
            ],
            area: 0.11 // m² - Surface basse droite
        }
    ];

    static readonly TOTAL_AREA = 0.68; // m² - Surface totale
}

// ==============================================================================
// CONFIGURATION ÉPURÉE INSPIRÉE DE V8
// ==============================================================================

/**
 * Les réglages de notre monde virtuel - comme les règles d'un jeu
 * Configuration optimisée de SimulationV8 sans over-engineering
 */
export const CONFIG = {
    physics: {
        gravity: 9.81,              // La gravité terrestre (fait tomber les objets)
        airDensity: 1.225,          // Densité de l'air (l'air épais pousse plus fort)
        deltaTimeMax: 0.016,        // Mise à jour max 60 fois par seconde (pour rester fluide)
        angularDamping: 0.85,       // Amortissement angulaire équilibré
        linearDamping: 0.96,        // Amortissement réduit pour permettre montée au zénith (4% de perte)
        angularDragCoeff: 0.10      // Résistance rotation augmentée pour moins d'oscillations
    },
    aero: {
        liftScale: 1.5,             // Portance augmentée pour meilleur vol
        dragScale: 1.0,             // Traînée naturelle
        liftCoefficient: 1.0        // Coefficient d'amélioration de la portance (0.0-2.0)
    },
    kite: {
        mass: 0.28,                 // kg - Masse du cerf-volant
        area: KiteGeometry.TOTAL_AREA, // m² - Surface totale
        inertia: 0.08,              // kg·m² - Moment d'inertie réduit pour meilleure réactivité
        minHeight: 0.5              // m - Altitude minimale (plus haut pour éviter le sol)
    },
    lines: {
        defaultLength: 25,          // m - Longueur augmentée pour permettre montée au zénith
        stiffness: 25000,           // N/m - Rigidité renforcée pour mieux maintenir le kite
        maxTension: 1000,           // N - Tension max augmentée pour éviter rupture
        maxSag: 0.008,              // Affaissement réduit pour lignes plus tendues
        catenarySagFactor: 3        // Facteur de forme caténaire ajusté
    },
    wind: {
        defaultSpeed: 18,           // km/h
        defaultDirection: 0,        // degrés
        defaultTurbulence: 3,       // %
        turbulenceScale: 0.15,
        turbulenceFreqBase: 0.3,
        turbulenceFreqY: 1.3,
        turbulenceFreqZ: 0.7,
        turbulenceIntensityXZ: 0.8,
        turbulenceIntensityY: 0.2,
        maxApparentSpeed: 25        // m/s - Limite vent apparent
    },
    rendering: {
        backgroundColor: 0x87CEEB,  // Couleur ciel
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000
    },
    controlBar: {
        width: 0.6,                 // m - Largeur de la barre
        position: new THREE.Vector3(0, 1.2, 8) // Position initiale
    },
    control: {
        inputSmoothing: 0.8,        // Lissage des entrées utilisateur
        returnSpeed: 2.0,           // Vitesse de retour au centre
        maxTilt: 1.0                // Inclinaison maximale de la barre
    }
};

// ==============================================================================
// TYPES ET INTERFACES
// ==============================================================================

export interface WindParams {
    speed: number;          // km/h
    direction: number;      // degrés
    turbulence: number;     // pourcentage
}

export interface KiteState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    orientation: THREE.Quaternion;
}

export interface HandlePositions {
    left: THREE.Vector3;
    right: THREE.Vector3;
}

export interface AerodynamicForces {
    lift: THREE.Vector3;
    drag: THREE.Vector3;
    torque: THREE.Vector3;
    leftForce?: THREE.Vector3;
    rightForce?: THREE.Vector3;
}

export interface SimulationMetrics {
    apparentSpeed: number;
    liftMag: number;
    dragMag: number;
    lOverD: number;
    aoaDeg: number;
}
