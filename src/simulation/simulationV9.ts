/**
 * SimulationV9.ts - Simulation de cerf-volant avec physique réaliste
 * 
 * 🌬️ CE QUE FAIT CE CODE :
 * Ce fichier simule un vrai cerf-volant dans le vent. Imaginez que vous tenez
 * une barre de contrôle avec deux lignes attachées au cerf-volant.
 * Quand vous tirez sur une ligne, le cerf-volant tourne de ce côté.
 * 
 * 🎮 COMMENT ÇA MARCHE :
 * - Vous tournez la barre avec les flèches du clavier
 * - La rotation tire une ligne et relâche l'autre
 * - Le côté tiré se rapproche, changeant l'angle du cerf-volant
 * - Le vent pousse différemment sur chaque côté
 * - Cette différence fait tourner le cerf-volant naturellement
 * 
 * 🎯 POURQUOI C'EST SPÉCIAL :
 * Au lieu de "tricher" avec des formules magiques, on simule vraiment
 * la physique : le vent, les lignes, le poids, tout comme dans la vraie vie!
 * 
 * Architecture modulaire avec séparation des responsabilités :
 * - PhysicsEngine : Orchestration de la simulation
 * - KiteController : Gestion du cerf-volant  
 * - WindSimulator : Simulation du vent
 * - LineSystem : Système de lignes et contraintes (MODIFIÉ)
 * - ControlBarManager : Gestion centralisée de la barre
 * - RenderManager : Gestion du rendu 3D
 * - InputHandler : Gestion des entrées utilisateur
 * 
 * 
 *   J'ai transformé les commentaires techniques en explications simples avec :

  🎯 Explications claires

  - Ce que fait le code : "Simule un vrai cerf-volant dans le vent"
  - Comment ça marche : "Vous tournez la barre → tire une ligne → kite tourne"
  - Pourquoi c'est fait : "Pour simuler la vraie physique, pas tricher"

  🌍 Analogies du monde réel

  - Vent apparent = "Main par la fenêtre de la voiture"
  - Angle d'incidence = "Main à plat vs de profil face au vent"
  - Couple = "Pousser une porte près ou loin des gonds"
  - Turbulences = "Les tourbillons qu'on sent dehors"
  - Lignes = "Comme des cordes, peuvent tirer, mais surtout longueur fixe, mais pas pousser"
  - Rotation barre = "Comme un guidon de vélo"

  📊 Valeurs expliquées

  - MAX_VELOCITY = "30 m/s = 108 km/h"
  - MAX_FORCE = "Comme soulever 100kg"
  - Amortissement = "Le kite perd 2% de sa vitesse" = la résistance a la penetration dans l'air

  🔄 Flux simplifié

  Chaque fonction importante explique :
  1. CE QU'ELLE FAIT - en une phrase simple
  2. COMMENT - les étapes en langage courant
  3. POURQUOI - l'effet sur le cerf-volant

 
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '../objects/organic/Kite2.js';

// ==============================================================================
// CONSTANTES PHYSIQUES GLOBALES
// ==============================================================================

// ==============================================================================
// 🎯 CORE - CONSTANTES ET UTILITAIRES DE BASE
// ==============================================================================

/**
 * Namespace Core - Contient les constantes physiques et utilitaires de base
 * 
 * 🎯 ORGANISATION :
 * - Core.PhysicsConstants : Toutes les constantes physiques
 * - Core.FlightHistory : Historique et analyse de vol
 * - Core.KiteGeometry : Géométrie et données du cerf-volant
 * 
 * ✨ AVANTAGES :
 * - Centralisation des constantes
 * - Organisation logique des utilitaires
 * - Facilite la maintenance
 */
// Namespace Core supprimé - maintenant dans ./core.js
// namespace Core {

/**
 * Les règles du jeu - comme les limites de vitesse sur la route
 * Ces nombres définissent ce qui est possible ou pas dans notre monde virtuel
 */
class PhysicsConstants {
    static readonly EPSILON = 1e-4;                    // Un tout petit nombre pour dire "presque zéro"
    static readonly CONTROL_DEADZONE = 0.01;           // La barre ne réagit pas si vous la bougez très peu
    static readonly LINE_CONSTRAINT_TOLERANCE = 0.005; // Les lignes peuvent s'étirer de 5mm max (marge d'erreur)
    static readonly LINE_TENSION_FACTOR = 0.99;        // Les lignes restent un peu plus courtes pour rester tendues
    static readonly GROUND_FRICTION = 0.85;            // Le sol freine le kite de 15% s'il le touche
    static readonly CATENARY_SEGMENTS = 5;             // Nombre de points pour dessiner la courbe des lignes
    static readonly PBD_ITERATIONS = 2;                // 2 itérations pour contraintes réalistes

    // Limites de sécurité - pour que la simulation ne devienne pas folle
    static readonly MAX_FORCE = 1000;                  // Force max en Newtons (comme soulever 100kg)
    static readonly MAX_VELOCITY = 30;                 // Vitesse max : 30 m/s = 108 km/h
    static readonly MAX_ANGULAR_VELOCITY = 25;          // Rotation max : presque 1 tour par seconde
    static readonly MAX_ACCELERATION = 100;             // Le kite ne peut pas accélérer plus vite qu'une voiture de sport
    static readonly MAX_ANGULAR_ACCELERATION = 20;     // La rotation ne peut pas s'emballer
}

/**
 * Stocke l'historique du vol pour analyser les oscillations et frétillements
 */
class FlightHistory {
    private static readonly HISTORY_SIZE = 60; // 1 seconde à 60fps
    private static readonly ANALYSIS_WINDOW = 30; // Fenêtre d'analyse (0.5s)

    private positions: THREE.Vector3[] = [];
    private velocities: THREE.Vector3[] = [];
    private forces: number[] = [];
    private aoaHistory: number[] = [];
    private timestamps: number[] = [];

    /**
     * Ajoute une nouvelle mesure à l'historique
     */
    addMeasurement(
        position: THREE.Vector3,
        velocity: THREE.Vector3,
        force: number,
        aoa: number,
        timestamp: number
    ): void {
        this.positions.push(position.clone());
        this.velocities.push(velocity.clone());
        this.forces.push(force);
        this.aoaHistory.push(aoa);
        this.timestamps.push(timestamp);

        // Garder seulement les N dernières mesures
        if (this.positions.length > FlightHistory.HISTORY_SIZE) {
            this.positions.shift();
            this.velocities.shift();
            this.forces.shift();
            this.aoaHistory.shift();
            this.timestamps.shift();
        }
    }

    /**
     * Analyse les oscillations dans la position
     */
    analyzeOscillations(): { frequency: number; amplitude: number; stability: number } {
        if (this.positions.length < FlightHistory.ANALYSIS_WINDOW) {
            return { frequency: 0, amplitude: 0, stability: 1 };
        }

        const window = this.positions.slice(-FlightHistory.ANALYSIS_WINDOW);
        const velocities = this.velocities.slice(-FlightHistory.ANALYSIS_WINDOW);

        // Calculer l'amplitude des oscillations (écart-type de la position)
        const xPositions = window.map(p => p.x);
        const yPositions = window.map(p => p.y);
        const zPositions = window.map(p => p.z);

        const xMean = xPositions.reduce((a, b) => a + b, 0) / xPositions.length;
        const yMean = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;
        const zMean = zPositions.reduce((a, b) => a + b, 0) / zPositions.length;

        const xVariance = xPositions.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0) / xPositions.length;
        const yVariance = yPositions.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0) / yPositions.length;
        const zVariance = zPositions.reduce((sum, z) => sum + Math.pow(z - zMean, 2), 0) / zPositions.length;

        const amplitude = Math.sqrt(xVariance + yVariance + zVariance);

        // Calculer la fréquence des oscillations (zéros de la vitesse)
        let zeroCrossings = 0;
        for (let i = 1; i < velocities.length; i++) {
            if (velocities[i - 1].y * velocities[i].y < 0) { // Changement de signe en Y
                zeroCrossings++;
            }
        }
        const frequency = zeroCrossings / (FlightHistory.ANALYSIS_WINDOW / 60); // Hz

        // Calculer la stabilité (inverse de la variance normalisée)
        const maxExpectedAmplitude = 5.0; // 5m d'amplitude max attendue
        const stability = Math.max(0, 1 - (amplitude / maxExpectedAmplitude));

        return { frequency, amplitude, stability };
    }

    /**
     * Détecte les frétillements (oscillations rapides et irrégulières)
     */
    detectWobbling(): { isWobbling: boolean; severity: number; description: string } {
        const analysis = this.analyzeOscillations();

        // Critères de frétillement
        const highFrequency = analysis.frequency > 2.0; // > 2Hz
        const moderateAmplitude = analysis.amplitude > 0.5 && analysis.amplitude < 2.0;
        const lowStability = analysis.stability < 0.7;

        const isWobbling = highFrequency && moderateAmplitude && lowStability;
        let severity = 0;
        let description = "Vol stable";

        if (isWobbling) {
            severity = (2 - analysis.stability) * (analysis.frequency / 5.0);
            severity = Math.min(1, severity);

            if (severity < 0.3) {
                description = "Légères oscillations";
            } else if (severity < 0.6) {
                description = "Frétillements modérés";
            } else {
                description = "Frétillements importants";
            }
        }

        return { isWobbling, severity, description };
    }

    /**
     * Analyse les tendances récentes
     */
    getRecentTrends(): {
        altitudeTrend: 'stable' | 'ascending' | 'descending';
        speedTrend: 'stable' | 'accelerating' | 'decelerating';
        forceTrend: 'stable' | 'increasing' | 'decreasing';
    } {
        if (this.positions.length < 10) {
            return { altitudeTrend: 'stable', speedTrend: 'stable', forceTrend: 'stable' };
        }

        const recentPositions = this.positions.slice(-10);
        const recentVelocities = this.velocities.slice(-10);
        const recentForces = this.forces.slice(-10);

        // Tendance altitude
        const altStart = recentPositions[0].y;
        const altEnd = recentPositions[recentPositions.length - 1].y;
        const altChange = altEnd - altStart;
        const altitudeTrend = Math.abs(altChange) < 0.1 ? 'stable' :
            altChange > 0 ? 'ascending' : 'descending';

        // Tendance vitesse
        const speedStart = recentVelocities[0].length();
        const speedEnd = recentVelocities[recentVelocities.length - 1].length();
        const speedChange = speedEnd - speedStart;
        const speedTrend = Math.abs(speedChange) < 0.1 ? 'stable' :
            speedChange > 0 ? 'accelerating' : 'decelerating';

        // Tendance force
        const forceStart = recentForces[0];
        const forceEnd = recentForces[recentForces.length - 1];
        const forceChange = forceEnd - forceStart;
        const forceTrend = Math.abs(forceChange) < 5 ? 'stable' :
            forceChange > 0 ? 'increasing' : 'decreasing';

        return { altitudeTrend, speedTrend, forceTrend };
    }

    /**
     * Génère un rapport détaillé du comportement de vol
     */
    generateFlightReport(): string {
        const analysis = this.analyzeOscillations();
        const wobble = this.detectWobbling();
        const trends = this.getRecentTrends();

        let report = `📊 ANALYSE DE VOL - Frame ${this.positions.length}\n`;
        report += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        report += `🎯 Oscillations: Fréq=${analysis.frequency.toFixed(1)}Hz, Ampl=${analysis.amplitude.toFixed(2)}m, Stab=${(analysis.stability * 100).toFixed(0)}%\n`;
        report += `🔄 Frétillements: ${wobble.description} (Sévérité: ${(wobble.severity * 100).toFixed(0)}%)\n`;
        report += `📈 Tendances: Altitude ${trends.altitudeTrend}, Vitesse ${trends.speedTrend}, Force ${trends.forceTrend}\n`;

        if (this.aoaHistory.length > 0) {
            const recentAoa = this.aoaHistory.slice(-10);
            const aoaMean = recentAoa.reduce((a, b) => a + b, 0) / recentAoa.length;
            const aoaVariance = recentAoa.reduce((sum, aoa) => sum + Math.pow(aoa - aoaMean, 2), 0) / recentAoa.length;
            report += `📐 AoA: Moy=${aoaMean.toFixed(1)}°, Var=${Math.sqrt(aoaVariance).toFixed(1)}°\n`;
        }

        if (wobble.isWobbling) {
            report += `⚠️  RECOMMANDATIONS:\n`;
            if (analysis.frequency > 3) report += `   • Fréquence élevée: réduire la réactivité des commandes\n`;
            if (analysis.amplitude > 1.5) report += `   • Amplitude importante: ajuster les gains PID\n`;
            if (analysis.stability < 0.5) report += `   • Instabilité: vérifier l'équilibre des forces\n`;
        }

        return report;
    }

} // Fin du namespace Core

// ==============================================================================
// GÉOMÉTRIE DU CERF-VOLANT
// ==============================================================================

/**
 * La forme du cerf-volant - comme un plan de construction
 * On définit où sont tous les points importants du cerf-volant
 */
class KiteGeometry {
    // Les points clés du cerf-volant (comme les coins d'une maison)
    // Coordonnées en mètres : [gauche/droite, haut/bas, avant/arrière]
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),                      // Le bout pointu en haut
        SPINE_BAS: new THREE.Vector3(0, 0, 0),                   // Le centre en bas
        BORD_GAUCHE: new THREE.Vector3(-0.825, 0, 0),            // L'extrémité de l'aile gauche
        BORD_DROIT: new THREE.Vector3(0.825, 0, 0),              // L'extrémité de l'aile droite
        WHISKER_GAUCHE: new THREE.Vector3(-0.4125, 0.1, -0.15),  // Stabilisateur gauche (légèrement en arrière)
        WHISKER_DROIT: new THREE.Vector3(0.4125, 0.1, -0.15),    // Stabilisateur droit (légèrement en arrière)

        // 🔗 POINTS D'ANCRAGE DES BRIDES (sur l'aile du cerf-volant) - 6 brides pour meilleur contrôle
        BRIDE_GAUCHE_A: new THREE.Vector3(0, 0.65, 0),          // Ancrage gauche haut (position du nez)
        BRIDE_GAUCHE_B: new THREE.Vector3(-0.619, 0.1625, 0),   // Ancrage gauche milieu (position INTER_GAUCHE)
        BRIDE_GAUCHE_C: new THREE.Vector3(0, 0.1625, 0),        // Ancrage gauche bas (position du centre)
        BRIDE_DROITE_A: new THREE.Vector3(0, 0.65, 0),          // Ancrage droit haut (position du nez)
        BRIDE_DROITE_B: new THREE.Vector3(0.619, 0.1625, 0),    // Ancrage droit milieu (position INTER_DROIT)
        BRIDE_DROITE_C: new THREE.Vector3(0, 0.1625, 0),        // Ancrage droit bas (position du centre)

        // 🔗 POINTS DE CONSTRUCTION DU KITE (utilisés par Kite2.ts)
        CENTRE: new THREE.Vector3(0, 0.1625, 0),                 // Centre du kite (height/4)
        INTER_GAUCHE: new THREE.Vector3(-0.619, 0.1625, 0),      // Point d'intersection spreader gauche
        INTER_DROIT: new THREE.Vector3(0.619, 0.1625, 0),        // Point d'intersection spreader droit

        // 🎯 POINTS DE CONVERGENCE DES BRIDES (où se rejoignent les brides avant les lignes principales)
        CTRL_GAUCHE: new THREE.Vector3(-0.2475, 0.26, 0.4),      // Convergence des brides gauches (correspondant à Kite2.ts: -width*0.15, height*0.4, 0.4)
        CTRL_DROIT: new THREE.Vector3(0.2475, 0.26, 0.4)         // Convergence des brides droites (correspondant à Kite2.ts: width*0.15, height*0.4, 0.4)
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
// CONFIGURATION ÉPURÉE
// ==============================================================================

/**
 * Les réglages de notre monde virtuel - comme les règles d'un jeu
 * Vous pouvez changer ces valeurs pour voir comment le cerf-volant réagit
 */
const CONFIG = {
    debug: {
        enabled: true,              // Active le mode debug
        verbosePhysics: true,       // Logs physique détaillés
        verboseForces: true,        // Logs des forces
        verboseLines: true,         // Logs du système de lignes
        verboseAero: true,         // Logs aérodynamiques (activé pour diagnostic)
        frameInterval: 30           // Log toutes les 30 frames (plus fréquent)
    },
    physics: {
        gravity: 9.81,              // La gravité terrestre (fait tomber les objets)
        airDensity: 1.225,          // Densité de l'air (l'air épais pousse plus fort)
        deltaTimeMax: 0.016,        // Mise à jour max 60 fois par seconde (pour rester fluide)
        angularDamping: 0.985,      // Amortissement angulaire modéré (1.5% par frame)
        linearDamping: 0.988,       // Friction air modérée (1.2% par frame - équilibre)
        angularDragCoeff: 0.08      // Résistance rotation modérée
    },
    aero: {
        liftScale: 2.2,             // Portance modérée pour vol stable et réaliste
        dragScale: 0.3,             // Traînée réduite car maintenant calculée correctement
        profileDragCoeff: 0.02,     // Coefficient de traînée de profil (forme)
        inducedDragCoeff: 0.05,     // Coefficient de traînée induite (tourbillons)
        stabilityFactor: 0.4        // Facteur de stabilité augmenté
    },
    kite: {
        mass: 0.22,                 // kg - Masse réduite pour meilleur vol (cerf-volant plus léger)
        area: KiteGeometry.TOTAL_AREA, // m² - Surface totale
        inertia: 0.05,              // kg·m² - Inertie réduite en proportion
        minHeight: 0.5              // m - Altitude minimale (plus haut pour éviter le sol)
    },
    lines: {
        defaultLength: 15,          // m - Longueur par défaut
        stiffness: 12000,           // N/m - Rigidité équilibrée pour stabilité
        maxTension: 250,            // N - Tension max pour éviter les pics
        maxSag: 0.015,              // Affaissement modéré
        catenarySagFactor: 2.5      // Facteur de forme caténaire ajusté
    },
    wind: {
        defaultSpeed: 12,           // km/h - Vent par défaut réduit pour test réaliste
        defaultDirection: 0,        // degrés
        defaultTurbulence: 2,       // % - Turbulences réduites pour vol plus stable
        minSpeed: 0,                // km/h - Vent minimum
        maxSpeed: 100,              // km/h - Vent maximum
        turbulenceScale: 0.15,
        turbulenceFreqBase: 0.3,
        turbulenceFreqY: 1.3,
        turbulenceFreqZ: 0.7,
        turbulenceIntensityXZ: 0.8,
        turbulenceIntensityY: 0.2,
        maxApparentSpeed: 25        // m/s - Limite vent apparent
    },
    rendering: {
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000
    },
    controlBar: {
        width: 0.6,                 // m - Largeur de la barre
        position: new THREE.Vector3(0, 1.2, 8) // Position initiale
    }
};

// ==============================================================================
// TYPES ET INTERFACES
// ==============================================================================

interface WindParams {
    speed: number;          // km/h
    direction: number;      // degrés
    turbulence: number;     // pourcentage
}

interface KiteState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    angularVelocity: THREE.Vector3;
    orientation: THREE.Quaternion;
}

interface HandlePositions {
    left: THREE.Vector3;
    right: THREE.Vector3;
}

// ==============================================================================
// CONTROL BAR MANAGER - Gestion centralisée de la barre de contrôle
// ==============================================================================

class ControlBarManager {
    private position: THREE.Vector3;
    private rotation: number = 0;
    private targetRotation: number = 0; // Rotation cible pour le lissage
    private readonly INPUT_SMOOTHING = 0.85; // Lissage des entrées (85% ancien, 15% nouveau)

    constructor(position: THREE.Vector3 = CONFIG.controlBar.position) {
        this.position = position.clone();
    }

    /**
     * Met à jour la rotation avec lissage
     */
    setTargetRotation(newRotation: number): void {
        this.targetRotation = newRotation;
        // Lissage exponentiel pour éviter les changements brusques
        this.rotation = this.rotation * this.INPUT_SMOOTHING + this.targetRotation * (1 - this.INPUT_SMOOTHING);
    }

    /**
     * Calcule le quaternion de rotation de la barre
     */
    private computeRotationQuaternion(toKiteVector: THREE.Vector3): THREE.Quaternion {
        const barDirection = new THREE.Vector3(1, 0, 0);
        const rotationAxis = new THREE.Vector3().crossVectors(barDirection, toKiteVector).normalize();

        if (rotationAxis.length() < PhysicsConstants.CONTROL_DEADZONE) {
            rotationAxis.set(0, 1, 0);
        }

        return new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.rotation);
    }

    /**
     * Obtient les positions des poignées (méthode unique centralisée)
     */
    getHandlePositions(kitePosition: THREE.Vector3): HandlePositions {
        const toKiteVector = kitePosition.clone().sub(this.position).normalize();
        const rotationQuaternion = this.computeRotationQuaternion(toKiteVector);

        const halfWidth = CONFIG.controlBar.width / 2;
        const handleLeftLocal = new THREE.Vector3(-halfWidth, 0, 0);
        const handleRightLocal = new THREE.Vector3(halfWidth, 0, 0);

        handleLeftLocal.applyQuaternion(rotationQuaternion);
        handleRightLocal.applyQuaternion(rotationQuaternion);

        return {
            left: handleLeftLocal.clone().add(this.position),
            right: handleRightLocal.clone().add(this.position)
        };
    }

    /**
     * Met à jour la rotation de la barre
     */
    setRotation(rotation: number): void {
        this.setTargetRotation(rotation); // Utilise le lissage
    }

    getRotation(): number {
        return this.rotation;
    }

    getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    /**
     * Met à jour l'objet 3D visuel de la barre
     */
    updateVisual(bar: THREE.Group, kite: Kite2): void {
        if (!bar) return;

        const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = kite.getPoint('CTRL_DROIT');

        if (ctrlLeft && ctrlRight) {
            const kiteLeftWorld = ctrlLeft.clone();
            const kiteRightWorld = ctrlRight.clone();
            kite.localToWorld(kiteLeftWorld);
            kite.localToWorld(kiteRightWorld);

            const centerKite = kiteLeftWorld.clone().add(kiteRightWorld).multiplyScalar(0.5);
            const toKiteVector = centerKite.clone().sub(this.position).normalize();

            bar.quaternion.copy(this.computeRotationQuaternion(toKiteVector));
        }
    }

}

// ==============================================================================
// WIND SIMULATOR - Gestion du vent et turbulences
// ==============================================================================

class WindSimulator {
    private params: WindParams;
    private time: number = 0;  // Compteur de temps pour faire varier les turbulences

    constructor() {
        // On démarre avec les réglages par défaut du vent
        this.params = {
            speed: CONFIG.wind.defaultSpeed,
            direction: CONFIG.wind.defaultDirection,
            turbulence: CONFIG.wind.defaultTurbulence
        };
    }

    /**
     * Calcule le vent que "ressent" le cerf-volant
     * C'est comme quand vous mettez la main par la fenêtre d'une voiture :
     * - Si la voiture roule vite, vous sentez plus de vent
     * - Si vous allez contre le vent, il est plus fort
     * - Si vous allez avec le vent, il est plus faible
     * 
     * SIMPLIFIÉ : Calcule le vent une fois par face du cerf-volant
     * Prend en compte la rotation au centre de chaque face
     */
    getApparentWind(
        kiteVelocity: THREE.Vector3,
        deltaTime: number,
        angularVelocity?: THREE.Vector3,
        faceCenter?: THREE.Vector3,
        kiteCenter?: THREE.Vector3
    ): THREE.Vector3 {
        this.time += deltaTime;

        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        // Ajouter des rafales aléatoires mais réalistes
        // Les turbulences font bouger le vent de façon imprévisible
        // Comme les tourbillons qu'on sent parfois dehors
        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = CONFIG.wind.turbulenceFreqBase;  // Fréquence des changements

            // On utilise des sinus pour créer des variations douces et naturelles
            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
            windVector.y += Math.sin(this.time * freq * CONFIG.wind.turbulenceFreqY) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityY;
            windVector.z += Math.cos(this.time * freq * CONFIG.wind.turbulenceFreqZ) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
        }

        // Calculer la vitesse totale au centre de la face
        let totalVelocity = kiteVelocity.clone();

        // Ajouter la vitesse due à la rotation (simplifiée : une fois par face)
        if (angularVelocity && faceCenter && kiteCenter) {
            // Position du centre de la face par rapport au centre du cerf-volant
            const faceCenterRelative = faceCenter.clone().sub(kiteCenter);

            // Vitesse tangentielle au centre de la face = vitesse_angulaire × position_relative
            const tangentialVelocity = new THREE.Vector3().crossVectors(angularVelocity, faceCenterRelative);

            // Vitesse totale = vitesse de translation + vitesse de rotation
            totalVelocity.add(tangentialVelocity);
        }

        // Le vent apparent = vent réel - vitesse totale (translation + rotation)
        const apparent = windVector.clone().sub(totalVelocity);

        // On limite pour éviter des valeurs irréalistes
        if (apparent.length() > CONFIG.wind.maxApparentSpeed) {
            apparent.setLength(CONFIG.wind.maxApparentSpeed);
        }
        return apparent;
    }

    /**
     * Calcule le vent apparent en un point spécifique du cerf-volant
     * Prend automatiquement en compte la rotation
     */
    getApparentWindAtPoint(
        kiteVelocity: THREE.Vector3,
        angularVelocity: THREE.Vector3,
        kiteCenter: THREE.Vector3,
        pointPosition: THREE.Vector3,
        deltaTime: number
    ): THREE.Vector3 {
        return this.getApparentWind(
            kiteVelocity,
            deltaTime,
            angularVelocity,
            pointPosition,
            kiteCenter
        );
    }

    /**
     * Obtient le vecteur de vent à une position donnée
     */
    getWindAt(_position: THREE.Vector3): THREE.Vector3 {
        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = 0.5;

            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity;
            windVector.y += Math.sin(this.time * freq * 1.3) * windSpeedMs * turbIntensity * 0.3;
            windVector.z += Math.cos(this.time * freq * 0.7) * windSpeedMs * turbIntensity;
        }

        return windVector;
    }

    setParams(params: Partial<WindParams>): void {
        Object.assign(this.params, params);
    }

    getParams(): WindParams {
        return { ...this.params };
    }

    /**
     * Ajuste la vitesse du vent directement
     * @param speed Nouvelle vitesse en km/h (0-100)
     */
    setWindSpeed(speed: number): void {
        this.params.speed = Math.max(CONFIG.wind.minSpeed, Math.min(CONFIG.wind.maxSpeed, speed));
    }

    getWindSpeed(): number {
        return this.params.speed;
    }
}

// ==============================================================================
// AERODYNAMICS CALCULATOR - Calcul des forces aérodynamiques
// ==============================================================================

class AerodynamicsCalculator {
    // Cache pour éviter les recalculs
    private static cache = new Map<string, {
        forces: { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3; leftForce?: THREE.Vector3; rightForce?: THREE.Vector3 };
        metrics: { apparentSpeed: number; liftMag: number; dragMag: number; lOverD: number; aoaDeg: number };
        timestamp: number;
    }>();

    // Historique des forces pour le lissage
    private static forceHistory: Array<{
        lift: THREE.Vector3;
        drag: THREE.Vector3;
        torque: THREE.Vector3;
        timestamp: number;
    }> = [];

    private static readonly CACHE_DURATION = 16; // Cache pendant 1 frame à 60fps
    private static readonly FORCE_SMOOTHING_FACTOR = 0.15; // 15% nouveau, 85% ancien pour lissage doux

    // Variables pour le lissage simple
    private static previousSmoothedForces = {
        lift: new THREE.Vector3(),
        drag: new THREE.Vector3(),
        torque: new THREE.Vector3()
    };

    /**
     * Lisse les forces pour un vol plus fluide
     */
    private static smoothForces(forces: { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3 }): { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3 } {
        // Lissage exponentiel : nouveau = ancien * (1-alpha) + nouveau * alpha
        this.previousSmoothedForces.lift.multiplyScalar(1 - this.FORCE_SMOOTHING_FACTOR).add(
            forces.lift.clone().multiplyScalar(this.FORCE_SMOOTHING_FACTOR)
        );

        this.previousSmoothedForces.drag.multiplyScalar(1 - this.FORCE_SMOOTHING_FACTOR).add(
            forces.drag.clone().multiplyScalar(this.FORCE_SMOOTHING_FACTOR)
        );

        this.previousSmoothedForces.torque.multiplyScalar(1 - this.FORCE_SMOOTHING_FACTOR).add(
            forces.torque.clone().multiplyScalar(this.FORCE_SMOOTHING_FACTOR)
        );

        return {
            lift: this.previousSmoothedForces.lift.clone(),
            drag: this.previousSmoothedForces.drag.clone(),
            torque: this.previousSmoothedForces.torque.clone()
        };
    }

    /**
     * Génère une clé de cache pour les paramètres donnés
     */
    private static getCacheKey(apparentWind: THREE.Vector3, kiteOrientation: THREE.Quaternion): string {
        const windKey = `${apparentWind.x.toFixed(3)}_${apparentWind.y.toFixed(3)}_${apparentWind.z.toFixed(3)}`;
        const rotKey = `${kiteOrientation.x.toFixed(3)}_${kiteOrientation.y.toFixed(3)}_${kiteOrientation.z.toFixed(3)}_${kiteOrientation.w.toFixed(3)}`;
        return `${windKey}|${rotKey}`;
    }

    /**
     * Nettoie le cache des entrées expirées
     */
    private static cleanCache(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > this.CACHE_DURATION) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Calcule le facteur de stall (décrochage) basé sur l'angle d'attaque
     * Au-delà de 15°, la portance diminue naturellement
     */
    private static calculateStallFactor(aoaDegrees: number): number {
        const stallAngle = 18; // Angle de décrochage plus élevé pour vol plus facile
        const stallRecoveryAngle = 10; // Angle où la portance recommence à augmenter

        if (aoaDegrees <= stallRecoveryAngle) {
            return 1.0; // Portance normale
        } else if (aoaDegrees >= stallAngle) {
            return 0.4; // Portance moins réduite en décrochage
        } else {
            // Transition linéaire entre stallRecoveryAngle et stallAngle
            const factor = 1.0 - (aoaDegrees - stallRecoveryAngle) / (stallAngle - stallRecoveryAngle);
            return Math.max(0.4, factor);
        }
    }

    /**
     * Calcule les forces aérodynamiques sur le cerf-volant (avec cache)
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion,
        kiteVelocity?: THREE.Vector3
    ): { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3; leftForce?: THREE.Vector3; rightForce?: THREE.Vector3 } {
        // Vérifier le cache
        const cacheKey = this.getCacheKey(apparentWind, kiteOrientation);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return {
                lift: cached.forces.lift.clone(),
                drag: cached.forces.drag.clone(),
                torque: cached.forces.torque.clone(),
                leftForce: cached.forces.leftForce?.clone(),
                rightForce: cached.forces.rightForce?.clone()
            };
        }

        // Nettoyer le cache périodiquement
        if (Math.random() < 0.1) this.cleanCache();

        const windSpeed = apparentWind.length();
        if (windSpeed < PhysicsConstants.EPSILON) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * windSpeed * windSpeed;

        // Forces séparées pour gauche et droite
        let leftForce = new THREE.Vector3();
        let rightForce = new THREE.Vector3();
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();

        // On examine chaque triangle du cerf-volant un par un
        KiteGeometry.SURFACES.forEach((surface) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            // Rotation de la normale selon l'orientation du kite
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // Le vent pousse toujours la toile, peu importe la face
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.abs(facing); // Toujours positif

            if (cosIncidence <= PhysicsConstants.EPSILON) {
                return;
            }

            // CORRECTION PHYSIQUE : Forces normale ET traînée par surface

            // 1. FORCE NORMALE (perpendiculaire à la surface)
            // Le vent "plaque" le cerf-volant → force normale à la surface
            const normalDirection = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();
            const normalMagnitude = dynamicPressure * surface.area * cosIncidence;
            const forceNormale = normalDirection.clone().multiplyScalar(normalMagnitude);

            // 2. FORCES DE TRAÎNÉE (physiquement correctes)

            // 2a. Traînée de profil (résistance de forme - opposée au vent apparent)
            const apparentWindDirection = apparentWind.clone().normalize();
            const profileDragMagnitude = dynamicPressure * surface.area * CONFIG.aero.profileDragCoeff;
            const profileDragForce = apparentWindDirection.clone().multiplyScalar(-profileDragMagnitude);

            // 2b. Traînée induite (due à la portance - perpendiculaire à la portance)
            // Plus l'angle d'attaque est fort, plus la traînée induite augmente
            const liftDirection = normalDirection.clone();
            const windInLiftPlane = apparentWindDirection.clone();

            // Protection contre les vecteurs nuls
            if (liftDirection.length() > PhysicsConstants.EPSILON) {
                windInLiftPlane.projectOnPlane(liftDirection.clone().normalize());
            }

            // Calcul sécurisé de l'angle d'attaque pour la traînée induite
            const clampedCosIncidence = Math.max(PhysicsConstants.EPSILON, Math.min(1.0, Math.abs(cosIncidence)));
            const sinIncidence = Math.sqrt(1.0 - clampedCosIncidence * clampedCosIncidence);
            const inducedDragMagnitude = dynamicPressure * surface.area * CONFIG.aero.inducedDragCoeff *
                sinIncidence * sinIncidence;

            let inducedDragForce = new THREE.Vector3();
            if (windInLiftPlane.length() > PhysicsConstants.EPSILON) {
                inducedDragForce = windInLiftPlane.normalize().multiplyScalar(-inducedDragMagnitude);
            }

            // 3. FORCE TOTALE = normale + traînée de profil + traînée induite
            const force = forceNormale.clone()
                .add(profileDragForce)
                .add(inducedDragForce);

            const centre = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            const isLeft = centre.x < 0;

            if (isLeft) {
                leftForce.add(force);
            } else {
                rightForce.add(force);
            }

            totalForce.add(force);

            const centreWorld = centre.clone().applyQuaternion(kiteOrientation);
            const torque = new THREE.Vector3().crossVectors(centreWorld, force);
            totalTorque.add(torque);
        });

        // Calcul de la normale moyenne du cerf-volant
        let weightedNormal = new THREE.Vector3();
        let totalArea = 0;

        KiteGeometry.SURFACES.forEach((surface) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleMonde = new THREE.Vector3()
                .crossVectors(edge1, edge2)
                .normalize()
                .applyQuaternion(kiteOrientation);

            weightedNormal.add(normaleMonde.multiplyScalar(surface.area));
            totalArea += surface.area;
        });

        if (totalArea > PhysicsConstants.EPSILON) {
            weightedNormal.divideScalar(totalArea).normalize();
        }

        // Angle d'attaque global pour le facteur de stall
        if (totalArea > PhysicsConstants.EPSILON) {
            weightedNormal.divideScalar(totalArea).normalize();
        }

        const dotProduct = Math.max(-1, Math.min(1, windDir.dot(weightedNormal)));
        const aoaDeg = Math.abs(Math.acos(Math.abs(dotProduct)) * 180 / Math.PI);
        const stallFactor = this.calculateStallFactor(aoaDeg);

        // NOUVEAU MODÈLE V9 : Séparation physiquement correcte lift/drag
        // Décomposition des forces totales en portance et traînée

        // La portance est la composante perpendiculaire au vent apparent
        const windDirection = windDir.clone();
        const liftComponent = new THREE.Vector3();
        const dragComponent = new THREE.Vector3();

        // Projection des forces totales sur les axes lift/drag
        const forceParallelToWind = totalForce.clone().projectOnVector(windDirection);
        const forcePerpendicularToWind = totalForce.clone().sub(forceParallelToWind);

        // Portance = composante perpendiculaire amplifiée
        const lift = forcePerpendicularToWind.multiplyScalar(CONFIG.aero.liftScale * stallFactor);

        // Traînée = composante parallèle (dans le sens opposé au vent)
        const drag = forceParallelToWind.multiplyScalar(-1); // Opposée au mouvement

        // Application du facteur de traînée global
        drag.multiplyScalar(CONFIG.aero.dragScale);

        const baseTotalMag = Math.max(PhysicsConstants.EPSILON, totalForce.length());
        const scaledTotalMag = lift.length();
        const torqueScale = Math.max(0.1, Math.min(3, scaledTotalMag / baseTotalMag));

        // Appliquer le lissage pour un vol plus fluide
        const rawTorque = totalTorque.multiplyScalar(torqueScale);
        const smoothed = this.smoothForces({ lift, drag, torque: rawTorque });

        const result = {
            lift: smoothed.lift,
            drag: smoothed.drag,
            torque: smoothed.torque,
            leftForce,
            rightForce
        };

        // Mettre en cache le résultat
        this.cache.set(cacheKey, {
            forces: {
                lift: result.lift.clone(),
                drag: result.drag.clone(),
                torque: result.torque.clone(),
                leftForce: result.leftForce?.clone(),
                rightForce: result.rightForce?.clone()
            },
            metrics: {
                apparentSpeed: apparentWind.length(),
                liftMag: result.lift.length(),
                dragMag: result.drag.length(),
                lOverD: result.drag.length() > PhysicsConstants.EPSILON ? result.lift.length() / result.drag.length() : 0,
                aoaDeg: aoaDeg
            },
            timestamp: Date.now()
        });

        return result;
    }

    /**
     * Calcule des métriques pour le debug (optimisé avec cache)
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): { apparentSpeed: number; liftMag: number; dragMag: number; lOverD: number; aoaDeg: number } {
        const windSpeed = apparentWind.length();
        if (windSpeed < PhysicsConstants.EPSILON) {
            return { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };
        }

        // Vérifier si on a les métriques en cache
        const cacheKey = this.getCacheKey(apparentWind, kiteOrientation);
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return { ...cached.metrics };
        }

        // Si pas en cache, calculer les forces (ce qui va aussi mettre en cache)
        this.calculateForces(apparentWind, kiteOrientation);

        // Récupérer du cache maintenant qu'il est rempli
        const newCached = this.cache.get(cacheKey);
        return newCached ? { ...newCached.metrics } : { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };
    }
}

// ==============================================================================
// 🔗 SYSTÈME DE PHYSIQUE DES LIGNES (NAMESPACES)
// ==============================================================================

/**
 * Namespace Physics - Contient toutes les classes liées à la physique des lignes
 * 
 * 🎯 ORGANISATION :
 * - Physics.Line : Classe de base pour toutes les lignes
 * - Physics.BridleLine : Spécialisée pour les brides  
 * - Physics.ControlLine : Spécialisée pour les lignes de contrôle
 * - Physics.BridleSystem : Système complet de bridage
 * 
 * ✨ AVANTAGES DES NAMESPACES :
 * - Évite les conflits avec Three.Line
 * - Organisation logique du code
 * - Intellisense amélioré
 * - Code plus maintenable
 */
namespace Physics {

    /**
     * Classe générique pour représenter une ligne inextensible (bride, ligne de contrôle, etc.)
     * 
     * 🧵 PHYSIQUE DES LIGNES :
     * - Inextensibles : longueur fixe, comme une vraie corde
     * - Peuvent tirer mais pas pousser
     * - Force de contrainte pour maintenir la longueur
     * - Pas d'élasticité ni d'amortissement
     */
    export class Line {
        public fromPoint: string;    // Point de départ
        public toPoint: string;      // Point d'arrivée 
        public restLength: number;   // Longueur au repos (fixe)
        public maxTension: number;   // Tension maximale supportée

        constructor(fromPoint: string, toPoint: string, restLength: number, maxTension: number = 200) {
            this.fromPoint = fromPoint;
            this.toPoint = toPoint;
            this.restLength = restLength;
            this.maxTension = maxTension;
        }

        /**
         * Calcule la force de contrainte pour maintenir la longueur fixe
         * 
         * @param fromPos Position du point de départ dans l'espace monde
         * @param toPos Position du point d'arrivée dans l'espace monde
         * @returns Force et couple à appliquer
         */
        calculateConstraintForce(fromPos: THREE.Vector3, toPos: THREE.Vector3): {
            force: THREE.Vector3;
            tension: number;
            isTaut: boolean;
        } {
            // Vecteur de la ligne
            const lineVector = toPos.clone().sub(fromPos);
            const currentLength = lineVector.length();

            // Si pas de distance, pas de force
            if (currentLength < PhysicsConstants.EPSILON) {
                return { force: new THREE.Vector3(), tension: 0, isTaut: false };
            }

            // Si la ligne est relâchée (plus courte que sa longueur de repos), pas de force
            if (currentLength <= this.restLength) {
                return { force: new THREE.Vector3(), tension: 0, isTaut: false };
            }

            // Direction de la ligne (normalisée)
            const direction = lineVector.normalize();

            // Extension au-delà de la longueur de repos
            const extension = currentLength - this.restLength;

            // Force de contrainte : assez forte pour maintenir la longueur mais pas explosive
            // Plus l'extension est grande, plus la force de "rappel" est forte
            const constraintTension = Math.min(extension * 2000, this.maxTension); // 2000 N/m de rigidité virtuelle

            // Force appliquée dans la direction de la ligne (tire vers l'autre point)
            const force = direction.multiplyScalar(constraintTension);

            return {
                force,
                tension: constraintTension,
                isTaut: true
            };
        }

        /**
         * Vérifie si la ligne est tendue
         */
        isTaut(fromPos: THREE.Vector3, toPos: THREE.Vector3): boolean {
            const currentLength = fromPos.distanceTo(toPos);
            return currentLength > this.restLength + PhysicsConstants.EPSILON;
        }

        /**
         * Obtient le facteur de tension (0 = relâchée, 1 = tension max)
         */
        getTensionFactor(fromPos: THREE.Vector3, toPos: THREE.Vector3): number {
            if (!this.isTaut(fromPos, toPos)) return 0;

            const currentLength = fromPos.distanceTo(toPos);
            const extension = currentLength - this.restLength;
            const maxExtension = this.maxTension / 2000; // Basé sur la rigidité virtuelle

            return Math.min(extension / maxExtension, 1);
        }
    }

    /**
     * Représente une bride utilisant la physique générique des lignes
     */
    export class BridleLine extends Line {
        constructor(fromPoint: string, toPoint: string, length: number) {
            super(fromPoint, toPoint, length, 100); // Max 100N pour les brides
        }

        /**
         * Calcule la force de tension de cette bride (comportement inextensible)
         * Utilise la physique générique des lignes inextensibles
         */
        calculateTension(kite: Kite2, convergencePoints: Map<string, THREE.Vector3>): {
            force: THREE.Vector3;
            torque: THREE.Vector3;
        } {
            const fromWorld = kite.getPoint(this.fromPoint);
            const convergencePos = convergencePoints.get(this.toPoint);

            if (!fromWorld || !convergencePos) {
                return { force: new THREE.Vector3(), torque: new THREE.Vector3() };
            }

            // Position monde du point d'ancrage
            const anchorWorld = fromWorld.clone().applyQuaternion(kite.quaternion).add(kite.position);

            // Utiliser la physique générique des lignes
            const result = this.calculateConstraintForce(anchorWorld, convergencePos);

            // Calculer le couple sur le cerf-volant
            const leverArm = fromWorld.clone(); // Bras de levier dans le repère du cerf-volant
            const torque = new THREE.Vector3().crossVectors(leverArm, result.force);

            return { force: result.force, torque };
        }
    }

    /**
     * Représente une ligne de contrôle principale (de la barre au point de convergence)
     */
    export class ControlLine extends Line {
        constructor(length: number) {
            super('HANDLE', 'CONVERGENCE', length, 300); // Max 300N pour les lignes principales
        }

        /**
         * Calcule la contrainte de longueur fixe entre poignée et point de convergence
         */
        calculateConstraint(handlePos: THREE.Vector3, convergencePos: THREE.Vector3): {
            force: THREE.Vector3;
            tension: number;
            shouldAdjust: boolean;
        } {
            const result = this.calculateConstraintForce(handlePos, convergencePos);

            return {
                force: result.force,
                tension: result.tension,
                shouldAdjust: result.isTaut // Indique si on doit ajuster la position de convergence
            };
        }
    }

} // Fin du namespace Physics

// ==============================================================================
// 🔗 SYSTÈME DE BRIDES PHYSIQUES
// ==============================================================================

/**
 * Système de brides physiques qui connectent l'aile aux points de convergence
 * Utilise les classes du namespace Physics
 */
class BridleSystem {
    private bridles: Physics.BridleLine[];
    private bridleLength: number;

    constructor(bridleLength: number = 0.8) {
        this.bridleLength = bridleLength;
        this.bridles = [
            // Brides gauches (3 brides pour meilleur contrôle)
            new Physics.BridleLine('BRIDE_GAUCHE_A', 'CTRL_GAUCHE', bridleLength * 0.85),  // Bride haute plus courte
            new Physics.BridleLine('BRIDE_GAUCHE_B', 'CTRL_GAUCHE', bridleLength * 1.0),   // Bride milieu normale
            new Physics.BridleLine('BRIDE_GAUCHE_C', 'CTRL_GAUCHE', bridleLength * 1.15),  // Bride basse plus longue

            // Brides droites (3 brides pour meilleur contrôle)  
            new Physics.BridleLine('BRIDE_DROITE_A', 'CTRL_DROIT', bridleLength * 0.85),   // Bride haute plus courte
            new Physics.BridleLine('BRIDE_DROITE_B', 'CTRL_DROIT', bridleLength * 1.0),    // Bride milieu normale
            new Physics.BridleLine('BRIDE_DROITE_C', 'CTRL_DROIT', bridleLength * 1.15)    // Bride basse plus longue
        ];
    }    /**
     * Calcule les positions d'équilibre des points de convergence des brides
     * En tenant compte des contraintes géométriques :
     * 1. Distance fixe des brides depuis les ancrages sur le kite
     * 2. Distance fixe des lignes principales depuis les poignées
     */
    calculateConvergencePoints(kite: Kite2, handles: HandlePositions, mainLineLength: number): Map<string, THREE.Vector3> {
        const convergencePoints = new Map<string, THREE.Vector3>();

        // Positions des ancrages des brides dans le monde
        const leftAnchorA = kite.getPoint('BRIDE_GAUCHE_A')?.clone().applyQuaternion(kite.quaternion).add(kite.position);
        const leftAnchorB = kite.getPoint('BRIDE_GAUCHE_B')?.clone().applyQuaternion(kite.quaternion).add(kite.position);
        const leftAnchorC = kite.getPoint('BRIDE_GAUCHE_C')?.clone().applyQuaternion(kite.quaternion).add(kite.position);
        const rightAnchorA = kite.getPoint('BRIDE_DROITE_A')?.clone().applyQuaternion(kite.quaternion).add(kite.position);
        const rightAnchorB = kite.getPoint('BRIDE_DROITE_B')?.clone().applyQuaternion(kite.quaternion).add(kite.position);
        const rightAnchorC = kite.getPoint('BRIDE_DROITE_C')?.clone().applyQuaternion(kite.quaternion).add(kite.position);

        if (leftAnchorA && leftAnchorB && leftAnchorC && rightAnchorA && rightAnchorB && rightAnchorC) {
            // CÔTÉ GAUCHE : Résolution géométrique avec 3 ancrages
            // Le point de convergence doit satisfaire :
            // - Distance depuis poignée gauche = mainLineLength
            // - Distance depuis ancrages brides = bridleLength
            const leftConvergence = this.solveConvergencePoint(
                handles.left,           // Position de la poignée
                mainLineLength,         // Longueur ligne principale
                [leftAnchorA, leftAnchorB, leftAnchorC], // Ancrages des brides
                [this.bridleLength * 0.85, this.bridleLength * 1.0, this.bridleLength * 1.15] // Longueurs des brides
            );
            convergencePoints.set('CTRL_GAUCHE', leftConvergence);

            // CÔTÉ DROIT : Résolution géométrique avec 3 ancrages
            const rightConvergence = this.solveConvergencePoint(
                handles.right,          // Position de la poignée
                mainLineLength,         // Longueur ligne principale
                [rightAnchorA, rightAnchorB, rightAnchorC], // Ancrages des brides
                [this.bridleLength * 0.85, this.bridleLength * 1.0, this.bridleLength * 1.15] // Longueurs des brides
            );
            convergencePoints.set('CTRL_DROIT', rightConvergence);
        }

        return convergencePoints;
    }

    /**
     * Résout la position du point de convergence en satisfaisant toutes les contraintes
     * Méthode itérative pour trouver le point d'équilibre géométrique
     */
    private solveConvergencePoint(
        handle: THREE.Vector3,
        mainLineLength: number,
        bridleAnchors: THREE.Vector3[],
        bridleLengths: number[]
    ): THREE.Vector3 {
        // Position initiale : sur la sphère de contrainte de la ligne principale
        const direction = bridleAnchors[0].clone().sub(handle).normalize();
        let convergencePoint = handle.clone().add(direction.multiplyScalar(mainLineLength));

        // Itérations pour satisfaire toutes les contraintes
        for (let iter = 0; iter < 5; iter++) {
            // 1. Contrainte ligne principale : forcer sur la sphère de rayon mainLineLength
            const vectorToHandle = convergencePoint.clone().sub(handle);
            const distToHandle = vectorToHandle.length();
            if (Math.abs(distToHandle - mainLineLength) > PhysicsConstants.EPSILON) {
                convergencePoint = handle.clone().add(vectorToHandle.normalize().multiplyScalar(mainLineLength));
            }

            // 2. Contraintes des brides : minimiser l'erreur de distance
            const corrections = new THREE.Vector3();
            let totalWeight = 0;

            for (let i = 0; i < bridleAnchors.length; i++) {
                const vectorToBridle = convergencePoint.clone().sub(bridleAnchors[i]);
                const distToBridle = vectorToBridle.length();
                const expectedDist = bridleLengths[i];

                if (Math.abs(distToBridle - expectedDist) > PhysicsConstants.EPSILON) {
                    const error = distToBridle - expectedDist;
                    const correction = vectorToBridle.normalize().multiplyScalar(-error * 0.5);
                    corrections.add(correction);
                    totalWeight += 1.0;
                }
            }

            if (totalWeight > 0) {
                corrections.divideScalar(totalWeight);
                convergencePoint.add(corrections);
            }
        }

        return convergencePoint;
    }

    /**
     * Calcule les forces et couples de toutes les brides
     */
    calculateBridleForces(kite: Kite2, convergencePoints: Map<string, THREE.Vector3>): {
        totalForce: THREE.Vector3;
        totalTorque: THREE.Vector3;
        bridleForces: Array<{ name: string, force: THREE.Vector3, tension: number }>;
    } {
        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();
        const bridleForces: Array<{ name: string, force: THREE.Vector3, tension: number }> = [];

        for (const bridle of this.bridles) {
            const { force, torque } = bridle.calculateTension(kite, convergencePoints);
            totalForce.add(force);
            totalTorque.add(torque);

            bridleForces.push({
                name: `${bridle.fromPoint}->${bridle.toPoint}`,
                force: force.clone(),
                tension: force.length()
            });
        }

        return { totalForce, totalTorque, bridleForces };
    }

    /**
     * Définit la longueur des brides
     */
    setBridleLength(length: number): void {
        this.bridleLength = length;
        // Recalculer les longueurs de chaque bride (6 brides)
        this.bridles.forEach((bridle, index) => {
            const side = Math.floor(index / 3); // 0 = gauche, 1 = droite
            const position = index % 3; // 0 = haute, 1 = milieu, 2 = basse

            switch (position) {
                case 0: // Brides hautes (plus courtes)
                    bridle.restLength = length * 0.85;
                    break;
                case 1: // Brides milieu (normales)
                    bridle.restLength = length * 1.0;
                    break;
                case 2: // Brides basses (plus longues)
                    bridle.restLength = length * 1.15;
                    break;
            }
        });
    }

    /**
     * Obtient les points des brides pour l'affichage
     */
    getBridlePoints(kite: Kite2, convergencePoints: Map<string, THREE.Vector3>): Array<{
        from: THREE.Vector3;
        to: THREE.Vector3;
        tension: number;
    }> {
        const points: Array<{ from: THREE.Vector3, to: THREE.Vector3, tension: number }> = [];

        for (const bridle of this.bridles) {
            const fromPoint = kite.getPoint(bridle.fromPoint);
            const toPoint = convergencePoints.get(bridle.toPoint);

            if (fromPoint && toPoint) {
                const fromWorld = fromPoint.clone().applyQuaternion(kite.quaternion).add(kite.position);
                const { force } = bridle.calculateTension(kite, convergencePoints);

                points.push({
                    from: fromWorld,
                    to: toPoint.clone(),
                    tension: force.length()
                });
            }
        }

        return points;
    }
}

// ==============================================================================
// 🔗 SYSTÈME DE CONTRAINTE DE LIGNE (NOUVEAU)
// ==============================================================================

/**
 * Gère la contrainte de longueur d'une seule ligne comme une corde.
 * Empêche la ligne de dépasser sa longueur maximale.
 */
class LineConstraint {
    private handle: THREE.Vector3;
    private controlPoint: THREE.Vector3;
    private maxLength: number;

    constructor(handle: THREE.Vector3, controlPoint: THREE.Vector3, maxLength: number) {
        this.handle = handle;
        this.controlPoint = controlPoint;
        this.maxLength = maxLength;
    }

    /**
     * Applique la contrainte de longueur.
     * Si la ligne est trop tendue, corrige la position du cerf-volant et ajuste sa vélocité.
     * @param kitePosition - La position prédictive du cerf-volant à corriger.
     * @param kiteVelocity - La vélocité du cerf-volant à ajuster.
     */
    apply(kitePosition: THREE.Vector3, kiteVelocity: THREE.Vector3): void {
        const lineVector = this.controlPoint.clone().sub(this.handle);
        const distance = lineVector.length();

        if (distance > this.maxLength) {
            // 1. Correction de la position (PBD)
            const correctionVector = lineVector.normalize().multiplyScalar(distance - this.maxLength);
            // On déplace le cerf-volant pour que la ligne respecte sa longueur max
            kitePosition.sub(correctionVector);

            // 2. Correction de la vélocité (annule l'effet "ressort")
            const velocityComponent = kiteVelocity.dot(lineVector.normalize());
            if (velocityComponent > 0) {
                // Si le kite s'éloigne, on annule sa vitesse dans l'axe de la ligne
                kiteVelocity.sub(lineVector.normalize().multiplyScalar(velocityComponent));
            }
        }
    }
}

// ==============================================================================
// LINE SYSTEM - Gestion des lignes et contraintes
// ==============================================================================

class LineSystem {
    public lineLength: number;
    private bridleSystem: BridleSystem;

    constructor(lineLength: number = CONFIG.lines.defaultLength) {
        this.lineLength = lineLength;
        this.bridleSystem = new BridleSystem(0.8); // 80cm de brides par défaut
    }

    /**
     * Expose le système de brides pour les contraintes
     */
    getBridleSystem(): BridleSystem {
        return this.bridleSystem;
    }

    /**
     * 🔗 SYSTÈME COMPLET DE LIGNES AVEC BRIDES PHYSIQUES
     * 
     * Maintenant avec brides réelles :
     * 1. Calcul des points de convergence des brides
     * 2. Forces des brides sur le cerf-volant
     * 3. Forces des lignes principales
     */
    calculateLineTensions(kite: Kite2, handles: HandlePositions, barRotation: number = 0): {
        leftForce: THREE.Vector3;
        rightForce: THREE.Vector3;
        torque: THREE.Vector3;
        bridleForces?: Array<{ name: string, force: THREE.Vector3, tension: number }>;
        totalBridleForce?: THREE.Vector3;
    } {
        // 1️⃣ ÉTAPE 1: Calculer les positions des points de convergence des brides
        const convergencePoints = this.bridleSystem.calculateConvergencePoints(kite, handles, this.lineLength);

        // 2️⃣ ÉTAPE 2: Forces des brides sur le cerf-volant
        const { totalForce: bridleForce, totalTorque: bridleTorque, bridleForces } =
            this.bridleSystem.calculateBridleForces(kite, convergencePoints);

        // 3️⃣ ÉTAPE 3: Forces des lignes principales (des points de convergence vers les poignées)
        const ctrlLeftPos = convergencePoints.get('CTRL_GAUCHE');
        const ctrlRightPos = convergencePoints.get('CTRL_DROIT');

        if (!ctrlLeftPos || !ctrlRightPos) {
            return {
                leftForce: new THREE.Vector3(),
                rightForce: new THREE.Vector3(),
                torque: new THREE.Vector3(),
                bridleForces
            };
        }

        // Positions des mains
        const leftHandlePos = handles.left.clone();
        const rightHandlePos = handles.right.clone();

        // Distances et forces des lignes principales
        const leftDistance = leftHandlePos.distanceTo(ctrlLeftPos);
        const rightDistance = rightHandlePos.distanceTo(ctrlRightPos);

        // SUPPRESSION DES FORCES DES LIGNES PRINCIPALES
        // Les lignes sont de simples cordes avec longueur fixe - pas de forces actives
        // Seules les brides maintiennent la structure du cerf-volant
        // (variables leftLineForce et rightLineForce supprimées - plus de forces)

        // 🐛 DEBUG LOGS - Système SANS forces des lignes principales
        if (CONFIG.debug.enabled && CONFIG.debug.verboseLines) {
            console.log(`🔗 [LineSystem] Left: dist=${leftDistance.toFixed(2)}m, NO FORCE (constraint only)`);
            console.log(`🔗 [LineSystem] Right: dist=${rightDistance.toFixed(2)}m, NO FORCE (constraint only)`);
            console.log(`🔗 [BridleSystem] Total bride force: [${bridleForce.x.toFixed(1)}, ${bridleForce.y.toFixed(1)}, ${bridleForce.z.toFixed(1)}]`);

            if (bridleForces.length > 0) {
                bridleForces.forEach(bf => {
                    if (bf.tension > 0.1) {
                        console.log(`  └─ ${bf.name}: ${bf.tension.toFixed(1)}N`);
                    }
                });
            }
        }

        // 4️⃣ RÉSULTAT: SEULES LES BRIDES EXERCENT DES FORCES
        // Les lignes principales sont de simples contraintes de longueur sans forces actives
        // Les forces sont distribuées selon les points d'application physiques

        // Debug des forces (uniquement brides)
        if (CONFIG.debug.enabled && CONFIG.debug.verboseLines) {
            console.log(`🔗 [BRIDLE SYSTEM] Total force: [${bridleForce.x.toFixed(1)}, ${bridleForce.y.toFixed(1)}, ${bridleForce.z.toFixed(1)}]`);
            console.log(`🔗 [BRIDLE SYSTEM] Magnitude: ${bridleForce.length().toFixed(1)}N`);
            console.log(`🔗 [MAIN LINES] NO FORCE (geometric constraints only)`);
        }

        return {
            leftForce: new THREE.Vector3(),      // Pas de forces directes des lignes
            rightForce: new THREE.Vector3(),     // Pas de forces directes des lignes  
            torque: bridleTorque,                // Seul le couple des brides
            bridleForces,
            // Forces centralisées des brides appliquées au centre de masse
            totalBridleForce: bridleForce
        };
    }

    /**
     * Calcule les points d'une caténaire pour l'affichage des lignes
     */
    calculateCatenary(
        start: THREE.Vector3,
        end: THREE.Vector3,
        segments: number = PhysicsConstants.CATENARY_SEGMENTS
    ): THREE.Vector3[] {
        const directDistance = start.distanceTo(end);

        if (directDistance >= this.lineLength) {
            return [start, end];
        }

        const points: THREE.Vector3[] = [];
        const slack = this.lineLength - directDistance;
        const sag = slack * CONFIG.lines.maxSag;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            point.y -= CONFIG.lines.catenarySagFactor * sag * t * (1 - t);
            points.push(point);
        }

        return points;
    }

    /**
     * Définit la longueur des lignes principales
     */
    setLineLength(length: number): void {
        this.lineLength = length;
    }

    /**
     * Définit la longueur des brides
     */
    setBridleFactor(factor: number): void {
        this.bridleSystem.setBridleLength(0.8 * factor); // Longueur de base 80cm
    }

    /**
     * Applique les contraintes de longueur des lignes principales
     * Retourne la position corrigée du cerf-volant
     */
    enforceLineConstraints(kite: Kite2, predictedPosition: THREE.Vector3, handles: HandlePositions): THREE.Vector3 {
        // Calculer les points de convergence avec la position prédite
        const predictedKite = {
            ...kite,
            position: predictedPosition,
            getPoint: kite.getPoint.bind(kite),
            quaternion: kite.quaternion
        };

        const convergencePoints = this.bridleSystem.calculateConvergencePoints(
            predictedKite as Kite2,
            handles,
            this.lineLength
        );

        const maxLen = this.lineLength;
        const tolerance = PhysicsConstants.LINE_CONSTRAINT_TOLERANCE;
        const correctedPosition = predictedPosition.clone();

        // Vérifier les contraintes pour chaque point de convergence
        const leftConvergence = convergencePoints.get('CTRL_GAUCHE');
        const rightConvergence = convergencePoints.get('CTRL_DROIT');

        if (!leftConvergence || !rightConvergence) return correctedPosition;

        // PBD: itère pour satisfaire les contraintes simultanément
        for (let i = 0; i < PhysicsConstants.PBD_ITERATIONS; i++) {
            let correctionApplied = false;

            // Contrainte ligne gauche
            const vecL = leftConvergence.clone().sub(handles.left);
            const distL = vecL.length();
            if (distL > maxLen + tolerance) {
                const correctionL = vecL.normalize().multiplyScalar(distL - maxLen);
                correctedPosition.sub(correctionL.multiplyScalar(0.5)); // Correction douce
                correctionApplied = true;
            }

            // Contrainte ligne droite
            const vecR = rightConvergence.clone().sub(handles.right);
            const distR = vecR.length();
            if (distR > maxLen + tolerance) {
                const correctionR = vecR.normalize().multiplyScalar(distR - maxLen);
                correctedPosition.sub(correctionR.multiplyScalar(0.5)); // Correction douce
                correctionApplied = true;
            }

            // Recalculer les points de convergence si correction appliquée
            if (correctionApplied) {
                predictedKite.position = correctedPosition;
                const newConvergencePoints = this.bridleSystem.calculateConvergencePoints(
                    predictedKite as Kite2,
                    handles,
                    maxLen
                );
                leftConvergence.copy(newConvergencePoints.get('CTRL_GAUCHE') || leftConvergence);
                rightConvergence.copy(newConvergencePoints.get('CTRL_DROIT') || rightConvergence);
            }
        }

        return correctedPosition;
    }

    /**
     * Obtient les points de toutes les lignes pour l'affichage
     */
    getLinePoints(kite: Kite2, handles: HandlePositions): {
        mainLines: Array<{ from: THREE.Vector3, to: THREE.Vector3, tension: number }>;
        bridles: Array<{ from: THREE.Vector3, to: THREE.Vector3, tension: number }>;
    } {
        const convergencePoints = this.bridleSystem.calculateConvergencePoints(kite, handles, this.lineLength);

        console.log('🎯 Points de convergence:', {
            CTRL_GAUCHE: convergencePoints.get('CTRL_GAUCHE')?.toArray(),
            CTRL_DROIT: convergencePoints.get('CTRL_DROIT')?.toArray(),
            handles: {
                left: handles.left.toArray(),
                right: handles.right.toArray()
            }
        });

        // Lignes principales
        const mainLines: Array<{ from: THREE.Vector3, to: THREE.Vector3, tension: number }> = [];
        const ctrlLeftPos = convergencePoints.get('CTRL_GAUCHE');
        const ctrlRightPos = convergencePoints.get('CTRL_DROIT');

        if (ctrlLeftPos && ctrlRightPos) {
            // Ligne gauche
            const leftDistance = handles.left.distanceTo(ctrlLeftPos);
            const leftTension = leftDistance > this.lineLength ?
                Math.min(CONFIG.lines.stiffness * (leftDistance - this.lineLength), CONFIG.lines.maxTension) : 0;
            mainLines.push({
                from: ctrlLeftPos,
                to: handles.left,
                tension: leftTension
            });

            // Ligne droite
            const rightDistance = handles.right.distanceTo(ctrlRightPos);
            const rightTension = rightDistance > this.lineLength ?
                Math.min(CONFIG.lines.stiffness * (rightDistance - this.lineLength), CONFIG.lines.maxTension) : 0;
            mainLines.push({
                from: ctrlRightPos,
                to: handles.right,
                tension: rightTension
            });

            console.log('📏 Distances calculées:', {
                leftDistance: leftDistance.toFixed(2),
                rightDistance: rightDistance.toFixed(2),
                lineLength: this.lineLength
            });
        } else {
            console.log('❌ Points de convergence manquants');
        }

        // Brides
        const bridles = this.bridleSystem.getBridlePoints(kite, convergencePoints);

        return { mainLines, bridles };
    }
}

// ==============================================================================
// KITE CONTROLLER - Gestion du cerf-volant et de son orientation
// ==============================================================================

class KiteController {
    private kite: Kite2;
    private state: KiteState;
    private previousPosition: THREE.Vector3;

    // États pour les warnings
    private hasExcessiveAccel: boolean = false;
    private hasExcessiveVelocity: boolean = false;
    private hasExcessiveAngular: boolean = false;
    private lastAccelMagnitude: number = 0;
    private lastVelocityMagnitude: number = 0;

    // Lissage temporel des forces
    private smoothedForce: THREE.Vector3;
    private smoothedTorque: THREE.Vector3;
    private readonly FORCE_SMOOTHING = 0.25; // Lissage augmenté pour plus de fluidité (75% nouvelle force)

    constructor(kite: Kite2) {
        this.kite = kite;
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone()
        };
        this.previousPosition = kite.position.clone();
        this.kite.userData.lineLength = CONFIG.lines.defaultLength;

        // Initialiser les forces lissées
        this.smoothedForce = new THREE.Vector3();
        this.smoothedTorque = new THREE.Vector3();
    }

    /**
     * Met à jour la position et l'orientation du cerf-volant
     * 
     * CE QUE FAIT CETTE FONCTION :
     * 1. Vérifie que les forces ne sont pas folles (sécurité)
     * 2. Calcule comment le kite accélère (Force = Masse × Accélération)
     * 3. Met à jour la vitesse et la position
     * 4. S'assure que les lignes ne s'étirent pas
     * 5. Empêche le kite de passer sous terre
     * 6. Fait tourner le kite selon les couples appliqués
     */
    update(
        forces: THREE.Vector3,
        torque: THREE.Vector3,
        handles: HandlePositions,
        deltaTime: number
    ): void {
        // Valider les entrées
        forces = this.validateForces(forces);
        torque = this.validateTorque(torque);

        // Appliquer le lissage temporel (filtre passe-bas)
        // Cela simule l'inertie du tissu et la viscosité de l'air
        this.smoothedForce.lerp(forces, 1 - this.FORCE_SMOOTHING);
        this.smoothedTorque.lerp(torque, 1 - this.FORCE_SMOOTHING);

        // Intégration physique avec les forces lissées
        const newPosition = this.integratePhysics(this.smoothedForce, deltaTime);

        // Appliquer les validations
        this.handleGroundCollision(newPosition);
        this.validatePosition(newPosition);

        // Appliquer la position finale
        this.kite.position.copy(newPosition);
        this.previousPosition.copy(newPosition);

        // Mise à jour de l'orientation avec le couple lissé
        this.updateOrientation(this.smoothedTorque, deltaTime);
    }

    /**
     * Valide et limite les forces
     */
    private validateForces(forces: THREE.Vector3): THREE.Vector3 {
        if (!forces || forces.length() > PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
            if (CONFIG.debug.enabled && CONFIG.debug.verboseForces) {
                console.error(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
                console.error(`⚠️ Magnitude: ${forces ? forces.length() : 'N/A'}, Max autorisé: ${PhysicsConstants.MAX_FORCE}`);
            }
            return new THREE.Vector3();
        }

        // 🐛 DEBUG LOGS - Validation des forces
        if (CONFIG.debug.enabled && CONFIG.debug.verboseForces && forces.length() > 100) {
            console.warn(`⚡ Force élevée détectée: ${forces.length().toFixed(1)}N [${forces.x.toFixed(1)}, ${forces.y.toFixed(1)}, ${forces.z.toFixed(1)}]`);
        }

        return forces;
    }

    /**
     * Valide le couple
     */
    private validateTorque(torque: THREE.Vector3): THREE.Vector3 {
        if (!torque || isNaN(torque.length())) {
            console.error(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return torque;
    }

    /**
     * Intègre les forces pour calculer la nouvelle position (méthode d'Euler)
     * Implémente la 2ème loi de Newton : F = ma → a = F/m
     */
    private integratePhysics(forces: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        // Newton : accélération = Force / masse
        const acceleration = forces.divideScalar(CONFIG.kite.mass);
        this.lastAccelMagnitude = acceleration.length();

        // Sécurité : limiter pour éviter l'explosion numérique
        if (acceleration.length() > PhysicsConstants.MAX_ACCELERATION) {
            this.hasExcessiveAccel = true;
            acceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ACCELERATION);
        } else {
            this.hasExcessiveAccel = false;
        }

        // Intégration d'Euler : v(t+dt) = v(t) + a·dt
        this.state.velocity.add(acceleration.multiplyScalar(deltaTime));
        // Amortissement : simule la résistance de l'air
        this.state.velocity.multiplyScalar(CONFIG.physics.linearDamping);
        this.lastVelocityMagnitude = this.state.velocity.length();

        // Garde-fou vitesse max (réalisme physique)
        if (this.state.velocity.length() > PhysicsConstants.MAX_VELOCITY) {
            this.hasExcessiveVelocity = true;
            this.state.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
        } else {
            this.hasExcessiveVelocity = false;
        }

        // Position : x(t+dt) = x(t) + v·dt
        return this.kite.position.clone()
            .add(this.state.velocity.clone().multiplyScalar(deltaTime));
    }

    /**
     * Gère la collision avec le sol
     */
    private handleGroundCollision(newPosition: THREE.Vector3): void {
        const groundY = CONFIG.kite.minHeight;
        const pointsMap = this.kite.getPointsMap?.() as Map<string, [number, number, number]> | undefined;

        if (pointsMap && pointsMap.size > 0) {
            let minY = Infinity;
            const q = this.kite.quaternion;

            pointsMap.forEach(([px, py, pz]) => {
                const world = new THREE.Vector3(px, py, pz).applyQuaternion(q).add(newPosition);
                if (world.y < minY) minY = world.y;
            });

            if (minY < groundY) {
                const lift = groundY - minY;
                newPosition.y += lift;

                if (this.state.velocity.y < 0) this.state.velocity.y = 0;
                this.state.velocity.x *= PhysicsConstants.GROUND_FRICTION;
                this.state.velocity.z *= PhysicsConstants.GROUND_FRICTION;
            }
        } else {
            // Fallback simple
            if (newPosition.y < groundY) {
                newPosition.y = groundY;
                if (this.state.velocity.y < 0) this.state.velocity.y = 0;
                this.state.velocity.x *= PhysicsConstants.GROUND_FRICTION;
                this.state.velocity.z *= PhysicsConstants.GROUND_FRICTION;
            }
        }
    }

    /**
     * Valide la position finale
     */
    private validatePosition(newPosition: THREE.Vector3): void {
        if (isNaN(newPosition.x) || isNaN(newPosition.y) || isNaN(newPosition.z)) {
            console.error(`⚠️ Position NaN détectée! Reset à la position précédente`);
            newPosition.copy(this.previousPosition);
            this.state.velocity.set(0, 0, 0);
        }
    }

    /**
     * Met à jour l'orientation du cerf-volant - Dynamique du corps rigide
     * L'orientation émerge naturellement des contraintes des lignes et brides
     */
    private updateOrientation(torque: THREE.Vector3, deltaTime: number): void {
        // Couple d'amortissement (résistance à la rotation dans l'air)
        const dampTorque = this.state.angularVelocity.clone()
            .multiplyScalar(-CONFIG.physics.angularDragCoeff);
        const effectiveTorque = torque.clone().add(dampTorque);

        // Dynamique rotationnelle : α = T / I
        const angularAcceleration = effectiveTorque.divideScalar(CONFIG.kite.inertia);

        // Limiter l'accélération angulaire
        if (angularAcceleration.length() > PhysicsConstants.MAX_ANGULAR_ACCELERATION) {
            angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_ACCELERATION);
        }

        // Mise à jour de la vitesse angulaire
        this.state.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.state.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);

        // Limiter la vitesse angulaire
        if (this.state.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
            this.hasExcessiveAngular = true;
            this.state.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
        } else {
            this.hasExcessiveAngular = false;
        }

        // Appliquer la rotation
        if (this.state.angularVelocity.length() > PhysicsConstants.EPSILON) {
            const deltaRotation = new THREE.Quaternion();
            const axis = this.state.angularVelocity.clone().normalize();
            const angle = this.state.angularVelocity.length() * deltaTime;
            deltaRotation.setFromAxisAngle(axis, angle);

            this.kite.quaternion.multiply(deltaRotation);
            this.kite.quaternion.normalize();
        }
    }

    getState(): KiteState {
        return { ...this.state };
    }

    getKite(): Kite2 {
        return this.kite;
    }

    setLineLength(length: number): void {
        this.kite.userData.lineLength = length;
    }

    /**
     * Retourne les états de warning pour l'affichage
     */
    getWarnings(): {
        accel: boolean;
        velocity: boolean;
        angular: boolean;
        accelValue: number;
        velocityValue: number;
    } {
        return {
            accel: this.hasExcessiveAccel,
            velocity: this.hasExcessiveVelocity,
            angular: this.hasExcessiveAngular,
            accelValue: this.lastAccelMagnitude,
            velocityValue: this.lastVelocityMagnitude
        };
    }
}

// ==============================================================================
// INPUT HANDLER - Gestion des entrées utilisateur
// ==============================================================================

class InputHandler {
    private currentRotation: number = 0;
    private keysPressed = new Set<string>();
    private rotationSpeed: number = 2.5;
    private returnSpeed: number = 3.0;
    private maxRotation: number = Math.PI / 3;



    constructor() {
        this.setupKeyboardControls();
    }

    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            this.keysPressed.add(key);

            if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'q' || key === 'a' || key === 'd') {
                event.preventDefault();
            }
        });

        window.addEventListener('keyup', (event) => {
            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
            this.keysPressed.delete(key);

            if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'q' || key === 'a' || key === 'd') {
                event.preventDefault();
            }
        });
    }

    update(deltaTime: number): void {
        const left = this.keysPressed.has('ArrowLeft') || this.keysPressed.has('q') || this.keysPressed.has('a');
        const right = this.keysPressed.has('ArrowRight') || this.keysPressed.has('d');
        const dir = (left ? 1 : 0) + (right ? -1 : 0);

        if (dir !== 0) {
            this.currentRotation += dir * this.rotationSpeed * deltaTime;
        } else {
            if (Math.abs(this.currentRotation) > PhysicsConstants.EPSILON) {
                const sign = Math.sign(this.currentRotation);
                this.currentRotation -= sign * this.returnSpeed * deltaTime;
                if (Math.sign(this.currentRotation) !== sign) {
                    this.currentRotation = 0;
                }
            } else {
                this.currentRotation = 0;
            }
        }

        this.currentRotation = Math.max(-this.maxRotation, Math.min(this.maxRotation, this.currentRotation));
    }

    getTargetBarRotation(): number {
        return this.currentRotation;
    }
}

// ==============================================================================
// RENDER CACHE - Cache pour éviter les recalculs de rendu
// ==============================================================================

class RenderCache {
    private static windAtCache = new Map<string, { wind: THREE.Vector3; timestamp: number }>();
    private static forceCache = new Map<string, {
        lift: THREE.Vector3;
        drag: THREE.Vector3;
        relativeWind: THREE.Vector3;
        timestamp: number
    }>();
    private static readonly CACHE_DURATION = 16; // 1 frame à 60fps

    static getWindAt(position: THREE.Vector3, windSim: WindSimulator): THREE.Vector3 {
        const key = `${position.x.toFixed(2)}_${position.y.toFixed(2)}_${position.z.toFixed(2)}`;
        const cached = this.windAtCache.get(key);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.wind.clone();
        }

        const wind = windSim.getWindAt(position);
        this.windAtCache.set(key, { wind: wind.clone(), timestamp: Date.now() });
        return wind;
    }

    static getAerodynamicForces(
        kitePosition: THREE.Vector3,
        kiteVelocity: THREE.Vector3,
        kiteQuaternion: THREE.Quaternion,
        windSim: WindSimulator
    ): { lift: THREE.Vector3; drag: THREE.Vector3; relativeWind: THREE.Vector3 } {
        const posKey = `${kitePosition.x.toFixed(2)}_${kitePosition.y.toFixed(2)}_${kitePosition.z.toFixed(2)}`;
        const velKey = `${kiteVelocity.x.toFixed(2)}_${kiteVelocity.y.toFixed(2)}_${kiteVelocity.z.toFixed(2)}`;
        const rotKey = `${kiteQuaternion.x.toFixed(3)}_${kiteQuaternion.y.toFixed(3)}_${kiteQuaternion.z.toFixed(3)}_${kiteQuaternion.w.toFixed(3)}`;
        const key = `${posKey}|${velKey}|${rotKey}`;

        const cached = this.forceCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return {
                lift: cached.lift.clone(),
                drag: cached.drag.clone(),
                relativeWind: cached.relativeWind.clone()
            };
        }

        const wind = this.getWindAt(kitePosition, windSim);
        const relativeWind = wind.clone().sub(kiteVelocity);
        const { lift, drag } = AerodynamicsCalculator.calculateForces(relativeWind, kiteQuaternion);

        this.forceCache.set(key, {
            lift: lift.clone(),
            drag: drag.clone(),
            relativeWind: relativeWind.clone(),
            timestamp: Date.now()
        });

        return { lift, drag, relativeWind };
    }

    static clearCache(): void {
        this.windAtCache.clear();
        this.forceCache.clear();
    }
}

// ==============================================================================
// RENDER MANAGER - Gestion du rendu 3D (optimisé)
// ==============================================================================

class RenderManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;

    constructor(container: HTMLElement) {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x87CEEB, CONFIG.rendering.fogStart, CONFIG.rendering.fogEnd);

        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(3, 5, 12);
        this.camera.lookAt(0, 3, -5);

        this.renderer = new THREE.WebGLRenderer({
            antialias: CONFIG.rendering.antialias,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 50;
        this.controls.minDistance = 2;

        this.setupEnvironment();
        window.addEventListener('resize', () => this.onResize());
    }

    private setupEnvironment(): void {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 50, 50);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        sunLight.shadow.mapSize.width = CONFIG.rendering.shadowMapSize;
        sunLight.shadow.mapSize.height = CONFIG.rendering.shadowMapSize;
        this.scene.add(sunLight);

        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x7CFC00 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);
    }

    addObject(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    removeObject(object: THREE.Object3D): void {
        this.scene.remove(object);
    }

    render(): void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getScene(): THREE.Scene {
        return this.scene;
    }
}

// ==============================================================================
// PHYSICS ENGINE - Moteur physique principal
// ==============================================================================

class PhysicsEngine {
    private windSimulator: WindSimulator;
    private lineSystem: LineSystem;
    private kiteController: KiteController;
    private controlBarManager: ControlBarManager;

    constructor(kite: Kite2, controlBarPosition: THREE.Vector3) {
        this.windSimulator = new WindSimulator();
        this.lineSystem = new LineSystem();
        this.kiteController = new KiteController(kite);
        this.controlBarManager = new ControlBarManager(controlBarPosition);
    }

    /**
     * LE CŒUR DE LA SIMULATION - Appelée 60 fois par seconde
     * 
     * C'est ici que tout se passe ! Cette fonction orchestre toute la physique.
     * 
     * VOICI CE QUI SE PASSE À CHAQUE INSTANT :
     * 1. On regarde comment la barre est tournée
     * 2. On calcule où sont les mains du pilote
     * 3. On calcule le vent que ressent le kite
     * 4. On calcule toutes les forces :
     *    - Le vent qui pousse
     *    - Les lignes qui tirent
     *    - La gravité qui attire vers le bas
     * 5. On fait bouger le kite selon ces forces
     * 
     * C'est comme une boucle infinie qui simule la réalité !
     */
    update(deltaTime: number, targetBarRotation: number, isPaused: boolean = false): void {
        // Si en pause, ne rien faire
        if (isPaused) return;

        // Limiter le pas de temps pour éviter l'instabilité numérique
        deltaTime = Math.min(deltaTime, CONFIG.physics.deltaTimeMax);

        // Interpoler la rotation de la barre (lissage des commandes)
        const currentRotation = this.controlBarManager.getRotation();
        const newRotation = currentRotation + (targetBarRotation - currentRotation);
        this.controlBarManager.setRotation(newRotation);

        // Récupérer l'état actuel du système
        const kite = this.kiteController.getKite();
        const handles = this.controlBarManager.getHandlePositions(kite.position);

        // Vent apparent = vent réel - vitesse du kite (principe de relativité)
        // NOUVEAU : Prend en compte la rotation du cerf-volant
        const kiteState = this.kiteController.getState();
        const apparentWind = this.windSimulator.getApparentWind(
            kiteState.velocity,
            deltaTime,
            kiteState.angularVelocity,
            kiteState.position, // Centre de face = position du kite
            kiteState.position  // Centre du kite = position du kite
        );

        // PHYSIQUE ÉMERGENTE 1 : Forces aéro calculées par surface
        // Le couple émerge de la différence gauche/droite naturelle
        const { lift, drag, torque: aeroTorque } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            kite.quaternion
        );

        // Force constante vers le bas (F = mg) - SEULEMENT SUR LE CERF-VOLANT
        // Les brides, lignes et poignées n'ont pas de masse significative
        const gravity = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        // PHYSIQUE ÉMERGENTE 2 : Tensions de lignes comme vraies cordes
        // - Force UNIQUEMENT via les brides (pas de forces directes des lignes)
        // - Couple émerge de l'asymétrie gauche/droite des tensions des brides
        // - PAS DE POIDS sur les lignes (masse négligeable)
        const { torque: lineTorque, totalBridleForce } = this.lineSystem.calculateLineTensions(
            kite,
            handles
        );

        // DEBUG: Vérifier les forces calculées
        if (CONFIG.debug.enabled && CONFIG.debug.verboseForces) {
            console.log(`🌬️ [FORCES] Vent apparent: ${apparentWind.length().toFixed(1)} m/s`);
            console.log(`🎯 [FORCES] Portance: [${lift.x.toFixed(1)}, ${lift.y.toFixed(1)}, ${lift.z.toFixed(1)}] = ${lift.length().toFixed(1)}N`);
            console.log(`💨 [FORCES] Traînée: [${drag.x.toFixed(1)}, ${drag.y.toFixed(1)}, ${drag.z.toFixed(1)}] = ${drag.length().toFixed(1)}N`);
            console.log(`⬇️ [FORCES] Gravité: ${gravity.length().toFixed(1)}N`);
            console.log(`🔗 [FORCES] Brides: ${totalBridleForce?.length().toFixed(1) || '0'}N`);
        }

        // Somme vectorielle de toutes les forces (2ème loi de Newton)
        // CORRECTION MAJEURE : Forces via les brides seulement !
        const totalForce = new THREE.Vector3()
            .add(lift)                    // Forces aérodynamiques totales
            .add(drag)                    // Traînée
            .add(gravity)                 // Poids vers le bas
            .add(totalBridleForce || new THREE.Vector3()); // Forces des brides UNIQUEMENT

        // DEBUG: Vérifier la force totale
        if (CONFIG.debug.enabled && CONFIG.debug.verboseForces) {
            console.log(`🎯 [TOTAL] Force finale: [${totalForce.x.toFixed(1)}, ${totalForce.y.toFixed(1)}, ${totalForce.z.toFixed(1)}] = ${totalForce.length().toFixed(1)}N`);
        }

        // Couple total = somme des moments (rotation du corps rigide)
        // Seul le couple des brides affecte la rotation naturellement
        const totalTorque = aeroTorque.clone().add(lineTorque);

        // NOUVELLE ARCHITECTURE : Appliquer les contraintes de lignes avant l'intégration
        // Calculer la position prédite avec les forces actuelles
        const currentKiteState = this.kiteController.getState();
        const mass = CONFIG.kite.mass;
        const acceleration = totalForce.clone().divideScalar(mass);
        const predictedVelocity = currentKiteState.velocity.clone().add(acceleration.multiplyScalar(deltaTime));
        const predictedPosition = kite.position.clone().add(predictedVelocity.clone().multiplyScalar(deltaTime));

        // Appliquer les contraintes de lignes via LineSystem
        const constrainedPosition = this.lineSystem.enforceLineConstraints(kite, predictedPosition, handles);

        // Calculer la correction nécessaire et l'appliquer comme force correctrice
        const positionCorrection = constrainedPosition.clone().sub(predictedPosition);
        const correctionForce = positionCorrection.divideScalar(deltaTime * deltaTime).multiplyScalar(mass);

        // Force finale = forces physiques + correction de contraintes
        const finalForce = totalForce.clone().add(correctionForce);

        // Intégration physique avec forces corrigées
        this.kiteController.update(finalForce, totalTorque, handles, deltaTime);
    }

    setBridleFactor(factor: number): void {
        // Transmettre le facteur de bride au LineSystem
        this.lineSystem.setBridleFactor(factor);
    }

    setWindParams(params: Partial<WindParams>): void {
        this.windSimulator.setParams(params);
    }

    setLineLength(length: number): void {
        this.lineSystem.setLineLength(length);
        this.kiteController.setLineLength(length);
    }

    getKiteController(): KiteController {
        return this.kiteController;
    }

    getWindSimulator(): WindSimulator {
        return this.windSimulator;
    }

    getLineSystem(): LineSystem {
        return this.lineSystem;
    }

    getControlBarManager(): ControlBarManager {
        return this.controlBarManager;
    }

    /**
     * Ajuste la vitesse du vent directement
     */
    setWindSpeed(speed: number): void {
        this.windSimulator.setWindSpeed(speed);
    }

    getWindSpeed(): number {
        return this.windSimulator.getWindSpeed();
    }
}

// ==============================================================================
// SIMULATION APP - Application principale
// ==============================================================================

export class SimulationAppV9 {
    private renderManager: RenderManager;
    private physicsEngine!: PhysicsEngine;
    private inputHandler: InputHandler;
    private kite!: Kite2;
    private controlBar!: THREE.Group;
    private clock: THREE.Clock;
    private isPlaying: boolean = true;
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private bridleLines: THREE.Line[] = []; // Lignes pour afficher les brides
    private bridleCylinders: THREE.Mesh[] = []; // Cylindres pour afficher les brides (visible au zoom)
    private debugMode: boolean = true; // Activé par défaut
    private debugArrows: THREE.ArrowHelper[] = [];
    private frameCount: number = 0;
    private debugLegend: HTMLElement | null = null;

    // Système d'historique pour analyser les frétillements
    private flightHistory: FlightHistory;

    constructor() {
        console.log('🚀 Démarrage de la Simulation V9 - Version avec contraintes améliorées');

        // Initialiser l'historique de vol
        this.flightHistory = new FlightHistory();

        try {
            const container = document.getElementById('app');
            if (!container) {
                throw new Error('Container #app non trouvé');
            }

            this.renderManager = new RenderManager(container);
            this.inputHandler = new InputHandler();
            this.clock = new THREE.Clock();

            this.setupControlBar();
            this.setupKite();
            this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar.position);
            this.setupModernUI();
            this.createControlLines();
            this.animate();
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de SimulationV9:', error);
            throw error;
        }
    }

    private setupKite(): void {
        this.kite = new Kite2();
        const pilot = this.controlBar.position.clone();
        const lineLength = CONFIG.lines.defaultLength;

        // Position initiale : cerf-volant en l'air avec lignes tendues
        // On place le kite légèrement plus près pour avoir les lignes en tension
        const initialDistance = lineLength * 0.85; // 85% de la longueur max pour tension
        const kiteY = pilot.y + 6; // 6m au-dessus du pilote
        const dy = kiteY - pilot.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));

        this.kite.position.set(pilot.x, kiteY, pilot.z - horizontal);

        // Orientation initiale légèrement inclinée vers le haut pour génération de portance
        this.kite.rotation.set(-0.2, 0, 0); // Légère inclinaison vers le haut (12°)

        // Vitesse initiale légère pour démarrer la simulation
        this.kite.userData.velocity = new THREE.Vector3(0, 0.5, -1); // Mouvement vers l'avant et haut
        this.kite.userData.angularVelocity = new THREE.Vector3(0, 0, 0);
        this.kite.userData.lineLength = lineLength;

        console.log(`📍 Position initiale du kite: ${this.kite.position.toArray()}`);
        console.log(`🎯 Distance au pilote: ${this.kite.position.distanceTo(pilot).toFixed(1)}m`);
        console.log(`🚀 Vitesse initiale: [${this.kite.userData.velocity.toArray().map((v: number) => v.toFixed(1)).join(', ')}]`);

        this.renderManager.addObject(this.kite);
    }

    private setupControlBar(): void {
        this.controlBar = new THREE.Group();
        this.controlBar.position.copy(CONFIG.controlBar.position);

        const barGeometry = new THREE.CylinderGeometry(0.02, 0.02, CONFIG.controlBar.width);
        const barMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const bar = new THREE.Mesh(barGeometry, barMaterial);
        bar.rotation.z = Math.PI / 2;
        this.controlBar.add(bar);

        const handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.15);
        const handleMaterial = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.6
        });

        const halfWidth = CONFIG.controlBar.width / 2;
        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftHandle.position.set(-halfWidth, 0, 0);
        this.controlBar.add(leftHandle);

        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightHandle.position.set(halfWidth, 0, 0);
        this.controlBar.add(rightHandle);

        const pilotGeometry = new THREE.BoxGeometry(0.4, 1.6, 0.3);
        const pilotMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a4a4a,
            roughness: 0.8
        });
        const pilot = new THREE.Mesh(pilotGeometry, pilotMaterial);
        pilot.position.set(0, 0.8, 8.5);
        pilot.castShadow = true;

        this.renderManager.addObject(this.controlBar);
        this.renderManager.addObject(pilot);

    }

    private createControlLines(): void {
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,  // Rouge vif pour une meilleure visibilité
            linewidth: 3
        });

        const leftGeometry = new THREE.BufferGeometry();
        const rightGeometry = new THREE.BufferGeometry();

        this.leftLine = new THREE.Line(leftGeometry, lineMaterial);
        this.rightLine = new THREE.Line(rightGeometry, lineMaterial);

        this.renderManager.addObject(this.leftLine);
        this.renderManager.addObject(this.rightLine);
    }

    private updateControlLines(): void {
        if (!this.leftLine || !this.rightLine) {
            console.log('❌ Lignes non initialisées');
            return;
        }

        // Utiliser le ControlBarManager pour obtenir les positions
        const handles = this.physicsEngine.getControlBarManager().getHandlePositions(this.kite.position);

        // 🔗 NOUVEAU : Obtenir les points du nouveau système avec brides
        const lineData = this.physicsEngine.getLineSystem().getLinePoints(this.kite, handles);

        console.log('🔗 Données lignes:', {
            mainLinesCount: lineData.mainLines.length,
            bridlesCount: lineData.bridles.length,
            handles: handles
        });

        // 1️⃣ Mettre à jour les lignes principales
        if (lineData.mainLines.length >= 2) {
            const leftMainLine = lineData.mainLines[0];
            const rightMainLine = lineData.mainLines[1];

            const leftPoints = this.physicsEngine.getLineSystem()
                .calculateCatenary(leftMainLine.from, leftMainLine.to);
            const rightPoints = this.physicsEngine.getLineSystem()
                .calculateCatenary(rightMainLine.from, rightMainLine.to);

            console.log('📍 Points gauche:', leftPoints.length, 'droite:', rightPoints.length);

            this.leftLine.geometry.setFromPoints(leftPoints);
            this.rightLine.geometry.setFromPoints(rightPoints);

            // Forcer la mise à jour
            this.leftLine.geometry.attributes.position.needsUpdate = true;
            this.rightLine.geometry.attributes.position.needsUpdate = true;
        } else {
            console.log('⚠️ Pas assez de lignes principales');
        }

        // 2️⃣ Mettre à jour les brides (créer si nécessaire)
        this.updateBridleLines(lineData.bridles);

        // Mettre à jour la barre visuelle
        this.physicsEngine.getControlBarManager().updateVisual(this.controlBar, this.kite);
    }

    /**
     * Met à jour l'affichage des brides
     */
    private updateBridleLines(bridleData: Array<{ from: THREE.Vector3, to: THREE.Vector3, tension: number }>): void {
        // Supprimer les anciennes lignes/cylindres si trop nombreuses
        while (this.bridleLines.length > bridleData.length) {
            const oldLine = this.bridleLines.pop();
            const oldCylinder = this.bridleCylinders.pop();
            if (oldLine) {
                this.renderManager.getScene().remove(oldLine);
            }
            if (oldCylinder) {
                this.renderManager.getScene().remove(oldCylinder);
            }
        }

        // Créer de nouvelles lignes de bride si nécessaire
        while (this.bridleLines.length < bridleData.length) {
            // Ligne fine classique
            const bridleGeometry = new THREE.BufferGeometry();
            const bridleMaterial = new THREE.LineBasicMaterial({
                color: 0x00ff00, // Vert pour les distinguer des lignes principales
                transparent: true,
                opacity: 0.8,    // Moins transparent pour meilleure visibilité
                linewidth: 3     // Plus épais (bien que non supporté dans WebGL)
            });
            const bridleLine = new THREE.Line(bridleGeometry, bridleMaterial);

            // Cylindre plus visible pour persistance au zoom
            const cylinderGeometry = new THREE.CylinderGeometry(0.008, 0.008, 1, 8); // Rayon plus large, plus de segments
            const cylinderMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 0.7,
                side: THREE.DoubleSide,  // Visible des deux côtés
                depthWrite: false        // Évite les problèmes de Z-fighting
            });
            const bridleCylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);

            this.bridleLines.push(bridleLine);
            this.bridleCylinders.push(bridleCylinder);
            this.renderManager.addObject(bridleLine);
            this.renderManager.addObject(bridleCylinder);
        }

        // Mettre à jour les positions des brides
        bridleData.forEach((bridle, index) => {
            if (index < this.bridleLines.length && index < this.bridleCylinders.length) {
                // Mettre à jour la ligne
                const points = [bridle.from, bridle.to];
                this.bridleLines[index].geometry.setFromPoints(points);

                // Mettre à jour le cylindre
                const distance = bridle.from.distanceTo(bridle.to);
                const direction = bridle.to.clone().sub(bridle.from).normalize();
                const center = bridle.from.clone().add(bridle.to).multiplyScalar(0.5);

                // Positionner le cylindre
                this.bridleCylinders[index].position.copy(center);
                this.bridleCylinders[index].scale.y = distance;

                // Orienter le cylindre
                this.bridleCylinders[index].lookAt(bridle.to);
                this.bridleCylinders[index].rotateX(Math.PI / 2);

                // Couleur en fonction de la tension (ligne ET cylindre)
                const lineColor = bridle.tension > 50 ? 0xff0000 : bridle.tension > 10 ? 0xffff00 : 0x00ff00;

                const lineMaterial = this.bridleLines[index].material as THREE.LineBasicMaterial;
                const cylinderMaterial = this.bridleCylinders[index].material as THREE.MeshBasicMaterial;

                lineMaterial.color.setHex(lineColor);
                cylinderMaterial.color.setHex(lineColor);
            }
        });
    }

    /**
     * Configure l'interface utilisateur moderne avec le nouveau système
     */
    private setupModernUI(): void {
        // Utiliser l'interface moderne si elle est disponible
        if (typeof window !== 'undefined' && (window as any).simulationUI) {
            console.log('🎨 Interface moderne détectée, configuration des callbacks...');
            this.setupModernUICallbacks();
        } else {
            // Fallback vers l'ancienne interface si la nouvelle n'est pas disponible
            console.log('⚠️ Interface moderne non disponible, utilisation de l\'interface de base...');
            this.setupUIControls();
        }
    }

    /**
     * Configure les callbacks pour l'interface moderne
     */
    private setupModernUICallbacks(): void {
        const ui = (window as any).simulationUI;

        // Configurer les événements des contrôles
        setTimeout(() => {
            // Reset button
            const resetBtn = document.getElementById('reset-sim');
            if (resetBtn) {
                resetBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.resetSimulation();
                });
            }

            // Play/Pause button
            const playBtn = document.getElementById('play-pause');
            if (playBtn) {
                playBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.togglePlayPause();
                });
            }

            // Debug button
            const debugBtn = document.getElementById('debug-physics');
            if (debugBtn) {
                debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug OFF';
                debugBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.toggleDebugMode();
                    // Mettre à jour l'affichage du panneau debug
                    ui.toggleDebugPanel(this.debugMode);
                });
            }

            // Configuration des contrôles de vent
            this.setupWindControls();
        }, 100); // Petit délai pour s'assurer que l'interface est créée
    }

    private setupUIControls(): void {
        const resetBtn = document.getElementById('reset-sim');
        if (resetBtn) {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.resetSimulation();
            });
        }

        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.togglePlayPause();
            });
        }

        const debugBtn = document.getElementById('debug-physics');
        if (debugBtn) {
            // Initialiser l'état du bouton
            debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug OFF';
            debugBtn.classList.toggle('active', this.debugMode);

            debugBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDebugMode();
            });
        }

        // Activer la classe debug-mode sur le body si debugMode est true
        if (this.debugMode) {
            document.body.classList.add('debug-mode');
            this.createDebugLegend(); // Créer la légende au démarrage si debug activé
        }

        this.setupWindControls();
    }

    private setupWindControls(): void {
        // Configuration des contrôles de vent (identique à V8)
        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const speedValue = document.getElementById('wind-speed-value');
        if (speedSlider && speedValue) {
            speedSlider.value = CONFIG.wind.defaultSpeed.toString();
            speedValue.textContent = `${CONFIG.wind.defaultSpeed} km/h`;

            speedSlider.oninput = () => {
                const speed = parseFloat(speedSlider.value);
                this.physicsEngine.setWindParams({ speed });
                speedValue.textContent = `${speed} km/h`;
            };
        }

        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const dirValue = document.getElementById('wind-direction-value');
        if (dirSlider && dirValue) {
            dirSlider.value = CONFIG.wind.defaultDirection.toString();
            dirValue.textContent = `${CONFIG.wind.defaultDirection}°`;

            dirSlider.oninput = () => {
                const direction = parseFloat(dirSlider.value);
                this.physicsEngine.setWindParams({ direction });
                dirValue.textContent = `${direction}°`;
            };
        }

        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const turbValue = document.getElementById('wind-turbulence-value');
        if (turbSlider && turbValue) {
            turbSlider.value = CONFIG.wind.defaultTurbulence.toString();
            turbValue.textContent = `${CONFIG.wind.defaultTurbulence}%`;

            turbSlider.oninput = () => {
                const turbulence = parseFloat(turbSlider.value);
                this.physicsEngine.setWindParams({ turbulence });
                turbValue.textContent = `${turbulence}%`;
            };
        }

        const lengthSlider = document.getElementById('line-length') as HTMLInputElement;
        const lengthValue = document.getElementById('line-length-value');
        if (lengthSlider && lengthValue) {
            lengthSlider.value = CONFIG.lines.defaultLength.toString();
            lengthValue.textContent = `${CONFIG.lines.defaultLength}m`;

            lengthSlider.oninput = () => {
                const length = parseFloat(lengthSlider.value);
                this.physicsEngine.setLineLength(length);
                lengthValue.textContent = `${length}m`;

                const kitePosition = this.kite.position;
                const pilotPosition = this.controlBar.position;
                const distance = kitePosition.distanceTo(pilotPosition);

                if (distance > length) {
                    const direction = kitePosition.clone().sub(pilotPosition).normalize();
                    kitePosition.copy(pilotPosition.clone().add(direction.multiplyScalar(length * 0.95)));
                }
            };
        }

        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;
        const bridleValue = document.getElementById('bridle-length-value');
        if (bridleSlider && bridleValue) {
            bridleSlider.value = '100';
            bridleValue.textContent = '100%';

            bridleSlider.oninput = () => {
                const percent = parseFloat(bridleSlider.value);
                const bridleFactor = percent / 100;
                this.physicsEngine.setBridleFactor(bridleFactor);
                bridleValue.textContent = `${percent}%`;
            };
        }

        // Contrôle de la vitesse du vent
        const windSpeedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const windSpeedValue = document.getElementById('wind-speed-value');
        if (windSpeedSlider && windSpeedValue) {
            windSpeedSlider.min = CONFIG.wind.minSpeed.toString();
            windSpeedSlider.max = CONFIG.wind.maxSpeed.toString();
            windSpeedSlider.value = this.physicsEngine.getWindSpeed().toString();
            windSpeedValue.textContent = `${this.physicsEngine.getWindSpeed()} km/h`;

            windSpeedSlider.oninput = () => {
                const speed = parseFloat(windSpeedSlider.value);
                this.physicsEngine.setWindSpeed(speed);
                windSpeedValue.textContent = `${speed} km/h`;
            };
        }

        // Raccourcis clavier pour ajuster rapidement la vitesse du vent
        window.addEventListener('keydown', (event) => {
            if (event.key === '+' || event.key === '=') {
                const current = this.physicsEngine.getWindSpeed();
                const newValue = Math.min(CONFIG.wind.maxSpeed, current + 5);
                this.physicsEngine.setWindSpeed(newValue);
                if (windSpeedValue) windSpeedValue.textContent = `${newValue} km/h`;
                if (windSpeedSlider) windSpeedSlider.value = newValue.toString();
                console.log(`🌬️ Vitesse vent: ${newValue} km/h`);
            } else if (event.key === '-') {
                const current = this.physicsEngine.getWindSpeed();
                const newValue = Math.max(CONFIG.wind.minSpeed, current - 5);
                this.physicsEngine.setWindSpeed(newValue);
                if (windSpeedValue) windSpeedValue.textContent = `${newValue} km/h`;
                if (windSpeedSlider) windSpeedSlider.value = newValue.toString();
                console.log(`🌬️ Vitesse vent: ${newValue} km/h`);
            }
        });
    }

    private resetSimulation(): void {
        const currentLineLength = this.physicsEngine.getLineSystem().lineLength || CONFIG.lines.defaultLength;
        const initialDistance = currentLineLength * 0.95;

        const pilot = this.controlBar.position.clone();
        const kiteY = 7;
        const dy = kiteY - pilot.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));
        this.kite.position.set(pilot.x, kiteY, pilot.z - horizontal);

        this.kite.rotation.set(0, 0, 0);
        this.kite.quaternion.identity();
        this.controlBar.quaternion.identity();

        this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar.position);
        this.physicsEngine.setLineLength(currentLineLength);

        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;

        if (speedSlider && dirSlider && turbSlider) {
            this.physicsEngine.setWindParams({
                speed: parseFloat(speedSlider.value),
                direction: parseFloat(dirSlider.value),
                turbulence: parseFloat(turbSlider.value)
            });
        }
        if (bridleSlider) {
            this.physicsEngine.setBridleFactor(parseFloat(bridleSlider.value) / 100);
        }

        this.updateControlLines();
        console.log(`🔄 Simulation réinitialisée`);
    }

    private togglePlayPause(): void {
        this.isPlaying = !this.isPlaying;
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.textContent = this.isPlaying ? '⏸️ Pause' : '▶️ Lancer';
        }
    }

    private toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
        const debugBtn = document.getElementById('debug-physics');

        if (debugBtn) {
            debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug OFF';
            debugBtn.classList.toggle('active', this.debugMode);
        }

        document.body.classList.toggle('debug-mode', this.debugMode);

        if (this.debugMode) {
            this.createDebugLegend();
        } else {
            this.clearDebugArrows();
            this.removeDebugLegend();
        }
    }

    private clearDebugArrows(): void {
        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];
    }

    /**
     * 📋 Crée la légende des vecteurs de debug
     */
    private createDebugLegend(): void {
        if (this.debugLegend) return; // Déjà créée

        this.debugLegend = document.createElement('div');
        this.debugLegend.id = 'debug-legend';
        this.debugLegend.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            z-index: 1000;
            max-width: 250px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        `;

        this.debugLegend.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; text-align: center; color: #ffff00;">
                🎯 LÉGENDE DES VECTEURS
            </div>
            
            <div style="margin-bottom: 8px;">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #ffffff; margin-right: 8px;"></div>
                    <span>Vent global</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #00ff00; margin-right: 8px;"></div>
                    <span>Vitesse kite</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #0088ff; margin-right: 8px;"></div>
                    <span>Portance totale</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    <div style="width: 20px; height: 3px; background: #ff0000; margin-right: 8px;"></div>
                    <span>Traînée totale</span>
                </div>
            </div>

            <div style="border-top: 1px solid #444; padding-top: 8px; margin-top: 8px;">
                <div style="font-weight: bold; margin-bottom: 6px; color: #ffff00;">
                    FORCES PAR FACE :
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #ff6b6b; margin-right: 8px;"></div>
                    <span>Face 1</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #4ecdc4; margin-right: 8px;"></div>
                    <span>Face 2</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #45b7d1; margin-right: 8px;"></div>
                    <span>Face 3</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #96ceb4; margin-right: 8px;"></div>
                    <span>Face 4</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #ffd93d; margin-right: 8px;"></div>
                    <span>Face 5</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #bc85ff; margin-right: 8px;"></div>
                    <span>Face 6</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #ff9ff3; margin-right: 8px;"></div>
                    <span>Face 7</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #6c5ce7; margin-right: 8px;"></div>
                    <span>Face 8</span>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 3px;">
                    <div style="width: 20px; height: 3px; background: #888888; margin-right: 8px;"></div>
                    <span>Normales</span>
                </div>
            </div>

            <div style="border-top: 1px solid #444; padding-top: 6px; margin-top: 6px; font-size: 10px; color: #aaa;">
                💡 Plus la flèche est longue, plus la force est importante
            </div>
        `;

        document.body.appendChild(this.debugLegend);
    }

    /**
     * 🗑️ Supprime la légende des vecteurs de debug
     */
    private removeDebugLegend(): void {
        if (this.debugLegend) {
            document.body.removeChild(this.debugLegend);
            this.debugLegend = null;
        }
    }

    private updateDebugArrows(): void {
        if (!this.debugMode) return;

        this.clearDebugArrows();

        const kiteState = this.physicsEngine.getKiteController().getState();
        const kitePosition = this.kite.position.clone();

        // Calculer le centre géométrique entre NEZ et SPINE_BAS
        // NEZ est à [0, 0.65, 0] et SPINE_BAS à [0, 0, 0] en coordonnées locales
        // Le centre est donc à [0, 0.325, 0] en local
        const centerLocal = new THREE.Vector3(0, 0.325, 0);
        const centerWorld = centerLocal.clone()
            .applyQuaternion(this.kite.quaternion)
            .add(kitePosition);

        // 🌬️ VISUALISATION DU VENT GLOBAL (optimisé)
        const windSim = this.physicsEngine.getWindSimulator();
        const globalWind = RenderCache.getWindAt(kitePosition, windSim);
        if (globalWind.length() > 0.1) {
            const windArrow = new THREE.ArrowHelper(
                globalWind.clone().normalize(),
                centerWorld.clone().add(new THREE.Vector3(0, 2, 0)), // Décalé vers le haut
                globalWind.length() * 0.2,
                0xffffff, // Blanc pour le vent global
                0.3,
                0.3
            );
            this.renderManager.addObject(windArrow);
            this.debugArrows.push(windArrow);
        }

        // 🎯 VISUALISATION DES FORCES PAR FACE
        this.visualizePerFaceForces(kitePosition, kiteState);

        // 📊 VISUALISATION DES FORCES GLOBALES (optimisé avec cache)
        if (kiteState.velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                kiteState.velocity.clone().normalize(),
                centerWorld,
                kiteState.velocity.length() * 0.5,
                0x00ff00, // Vert pour la vitesse
                undefined,
                0.3
            );
            this.renderManager.addObject(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }

        // Utiliser le cache pour éviter les recalculs
        const { lift, drag, relativeWind } = RenderCache.getAerodynamicForces(
            kitePosition,
            kiteState.velocity,
            this.kite.quaternion,
            windSim
        );

        if (relativeWind.length() > 0.1) {
            if (lift.length() > 0.01) {
                const liftArrow = new THREE.ArrowHelper(
                    lift.clone().normalize(),
                    centerWorld,
                    Math.sqrt(lift.length()) * 1.5, // Plus grande échelle
                    0x0088ff, // Bleu pour portance totale
                    undefined,
                    0.5 // Tête plus grande
                );
                this.renderManager.addObject(liftArrow);
                this.debugArrows.push(liftArrow);
            }

            if (drag.length() > 0.01) {
                const dragArrow = new THREE.ArrowHelper(
                    drag.clone().normalize(),
                    centerWorld,
                    Math.sqrt(drag.length()) * 1.5, // Plus grande échelle
                    0xff0000, // Rouge pour traînée totale
                    undefined,
                    0.5 // Tête plus grande
                );
                this.renderManager.addObject(dragArrow);
                this.debugArrows.push(dragArrow);
            }
        }

        this.updateDebugDisplay(kiteState, kitePosition, { lift, drag });
    }

    /**
     * 🎯 NOUVELLE MÉTHODE : Visualise les forces de portance pour chaque face du cerf-volant
     */
    private visualizePerFaceForces(kitePosition: THREE.Vector3, kiteState: KiteState): void {
        const windSim = this.physicsEngine.getWindSimulator();
        const wind = windSim.getWindAt(kitePosition);
        const apparentWind = wind.clone().sub(kiteState.velocity);

        if (apparentWind.length() < 0.1) return;

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * apparentWind.lengthSq();

        // Couleurs pour différentes faces (cycle de couleurs vives)
        const faceColors = [
            0xff6b6b, // Rouge-orange
            0x4ecdc4, // Turquoise
            0x45b7d1, // Bleu clair
            0x96ceb4, // Vert menthe
            0xffd93d, // Jaune
            0xbc85ff, // Violet
            0xff9ff3, // Rose
            0x6c5ce7  // Indigo
        ];

        // Parcourir chaque face et visualiser sa force
        KiteGeometry.SURFACES.forEach((surface, index) => {
            // Calculer le centre de la face
            const faceCenter = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            // Transformer en coordonnées monde
            const faceCenterWorld = faceCenter.clone()
                .applyQuaternion(this.kite.quaternion)
                .add(kitePosition);

            // Calculer la normale de la face
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            let normalLocal = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            // POUR LA VISUALISATION : S'assurer que la normale pointe vers l'EXTÉRIEUR
            // pour bien voir comment le vent pousse chaque face
            // Si elle pointe vers l'intérieur (direction +Z), on l'inverse pour la visualisation
            if (normalLocal.z > 0) {
                normalLocal.negate(); // Inverser pour pointer vers l'extérieur
            }

            const normalWorld = normalLocal.clone().applyQuaternion(this.kite.quaternion);

            // Angle d'incidence (utiliser la vraie normale pour le calcul physique)
            const physicsNormal = normalLocal.z > 0 ? normalLocal.clone().negate() : normalLocal.clone();
            const physicsNormalWorld = physicsNormal.applyQuaternion(this.kite.quaternion);
            const facing = windDir.dot(physicsNormalWorld);
            const cosIncidence = Math.max(0, Math.abs(facing));

            if (cosIncidence <= PhysicsConstants.EPSILON) return;

            // Calculer la force sur cette face
            const area = edge1.clone().cross(edge2).length() * 0.5;
            const forceMagnitude = dynamicPressure * area * cosIncidence;

            // VISUALISATION : Direction de la force vers l'EXTÉRIEUR
            // pour montrer comment le vent pousse la toile
            const forceDirection = normalWorld.clone(); // Pointe maintenant vers l'extérieur

            // Si le vent frappe la face arrière (facing < 0), la force est réduite
            const forceMultiplier = facing >= 0 ? 1.0 : 0.2; // Face arrière = 20% de la force
            const adjustedForceMagnitude = forceMagnitude * forceMultiplier;

            // Créer la flèche de visualisation (vers l'extérieur)
            if (forceMagnitude > 0.01) {
                const faceForceArrow = new THREE.ArrowHelper(
                    forceDirection,
                    faceCenterWorld,
                    Math.sqrt(forceMagnitude) * 1.0, // Échelle plus grande
                    faceColors[index % faceColors.length],
                    0.3, // Tête plus grande
                    0.3
                );
                this.renderManager.addObject(faceForceArrow);
                this.debugArrows.push(faceForceArrow);
            }

            // Visualiser aussi la normale de la face (plus petite, plus transparente)
            const normalArrow = new THREE.ArrowHelper(
                normalWorld,
                faceCenterWorld,
                0.5, // Un peu plus grande
                0x888888, // Gris pour les normales
                0.1,
                0.1
            );
            this.renderManager.addObject(normalArrow);
            this.debugArrows.push(normalArrow);
        });
    }

    private updateDebugDisplay(kiteState: KiteState, kitePosition: THREE.Vector3, cachedForces?: { lift: THREE.Vector3; drag: THREE.Vector3 }): void {
        const forceDisplay = document.getElementById('force-display');
        const tensionDisplay = document.getElementById('tension-display');
        const altitudeDisplay = document.getElementById('altitude-display');
        const windSpeedDisplay = document.getElementById('wind-speed-display');
        const fpsDisplay = document.getElementById('fps');
        const physicsStatus = document.getElementById('physics-status');

        // Utiliser les forces cachées si disponibles, sinon recalculer avec le cache optimisé
        let lift: THREE.Vector3, drag: THREE.Vector3;
        if (cachedForces) {
            lift = cachedForces.lift;
            drag = cachedForces.drag;
        } else {
            const windSim = this.physicsEngine.getWindSimulator();
            const forces = RenderCache.getAerodynamicForces(
                kitePosition,
                kiteState.velocity,
                this.kite.quaternion,
                windSim
            );
            lift = forces.lift;
            drag = forces.drag;
        }

        if (forceDisplay) {
            const totalForce = Math.sqrt(lift.lengthSq() + drag.lengthSq());
            forceDisplay.textContent = totalForce.toFixed(1);
        }

        if (tensionDisplay) {
            const lineLength = this.physicsEngine.getLineSystem().lineLength;
            const handles = this.physicsEngine.getControlBarManager().getHandlePositions(kitePosition);

            const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
            const ctrlRight = this.kite.getPoint('CTRL_DROIT');

            if (ctrlLeft && ctrlRight) {
                const kiteLeftWorld = ctrlLeft.clone();
                const kiteRightWorld = ctrlRight.clone();
                this.kite.localToWorld(kiteLeftWorld);
                this.kite.localToWorld(kiteRightWorld);

                const distL = kiteLeftWorld.distanceTo(handles.left);
                const distR = kiteRightWorld.distanceTo(handles.right);
                const tautL = distL >= lineLength - PhysicsConstants.CONTROL_DEADZONE;
                const tautR = distR >= lineLength - PhysicsConstants.CONTROL_DEADZONE;

                // Affichage des lignes avec longueur FIXE (pas de triche !)
                tensionDisplay.textContent = `L:${tautL ? 'T' : 'S'}(${lineLength.toFixed(1)}) R:${tautR ? 'T' : 'S'}(${lineLength.toFixed(1)})`;
            }
        }

        if (altitudeDisplay) {
            altitudeDisplay.textContent = kitePosition.y.toFixed(1);
        }

        // Mettre à jour les indicateurs supplémentaires
        if (windSpeedDisplay) {
            const windParams = this.physicsEngine.getWindSimulator().getParams();
            windSpeedDisplay.textContent = windParams.speed.toFixed(0);
        }

        if (fpsDisplay) {
            const fps = this.clock.getDelta() > 0 ? Math.round(1 / this.clock.getDelta()) : 60;
            fpsDisplay.textContent = fps.toString();
        }

        if (physicsStatus) {
            const warnings = this.physicsEngine.getKiteController().getWarnings();
            if (warnings.accel || warnings.velocity || warnings.angular) {
                physicsStatus.textContent = '⚠️ Limites';
                physicsStatus.style.color = '#ffaa00';
            } else {
                physicsStatus.textContent = '✅ Stable';
                physicsStatus.style.color = '#00ff88';
            }
        }
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        this.frameCount++;

        // Mise à jour des logs à 60Hz (chaque frame)
        {
            const kitePos = this.kite.position.clone();
            const pilotPos = this.controlBar.position.clone();
            const distance = kitePos.distanceTo(pilotPos);
            const state = this.physicsEngine.getKiteController().getState();

            const currentLineLength = this.physicsEngine.getLineSystem().lineLength;
            const windSim = this.physicsEngine.getWindSimulator();
            const wind = windSim.getWindAt(kitePos);
            const apparent = wind.clone().sub(state.velocity);

            const forces = AerodynamicsCalculator.calculateForces(
                apparent,
                this.kite.quaternion
            );
            const isTaut = distance >= currentLineLength * PhysicsConstants.LINE_TENSION_FACTOR;

            // Indicateur de décrochage basé sur la position dans la sphère de contrainte
            const distanceRatio = distance / currentLineLength;
            const isNearStall = distanceRatio > 0.97;  // > 97% = proche du décrochage
            const isStalled = distanceRatio > 0.995;   // > 99.5% = décroche
            const stallWarning = isStalled ? '🚨 DÉCROCHAGE!' : (isNearStall ? '⚠️ Proche décrochage' : '');

            // Calcul des métriques aéronautiques
            const metrics = AerodynamicsCalculator.computeMetrics(apparent, this.kite.quaternion);
            const windSpeed = wind.length();
            const apparentSpeed = apparent.length();

            // Afficher l'asymétrie des forces gauche/droite
            const leftMag = forces.leftForce?.length() || 0;
            const rightMag = forces.rightForce?.length() || 0;
            const asymmetry = ((leftMag - rightMag) / Math.max(leftMag + rightMag, 1)) * 100;

            // Forces aérodynamiques totales
            const aeroForceMag = Math.sqrt(forces.lift.lengthSq() + forces.drag.lengthSq());

            // 📊 AJOUTER À L'HISTORIQUE DE VOL pour analyser les frétillements
            this.flightHistory.addMeasurement(
                kitePos,
                state.velocity,
                aeroForceMag,
                metrics.aoaDeg,
                this.frameCount / 60 // timestamp en secondes
            );

            // Calculer la position dans la fenêtre de vol
            const deltaX = kitePos.x - pilotPos.x;
            const deltaY = kitePos.y - pilotPos.y;
            const deltaZ = kitePos.z - pilotPos.z;

            // Angle X (horizontal) : positif = droite, négatif = gauche
            const angleX = Math.atan2(deltaX, -deltaZ) * 180 / Math.PI;

            // Angle Y (vertical) : positif = haut, négatif = bas
            const horizontalDist = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);
            const angleY = Math.atan2(deltaY, horizontalDist) * 180 / Math.PI;

            // Distance Z (profondeur)
            const distZ = Math.abs(deltaZ);

            // Récupérer les infos de contrôle de la barre
            const barRotation = this.physicsEngine.getControlBarManager().getRotation();
            const barRotationDeg = Math.round(barRotation * 180 / Math.PI);
            const barDirection = barRotation > 0.01 ? '←' : (barRotation < -0.01 ? '→' : '─');

            // Calculer les longueurs réelles des lignes
            const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
            const ctrlRight = this.kite.getPoint('CTRL_DROIT');
            const handles = this.physicsEngine.getControlBarManager().getHandlePositions(kitePos);

            // Pour des lignes de longueur fixe, afficher la longueur théorique constante
            const fixedLineLength = CONFIG.lines.defaultLength;
            let leftLineLength = fixedLineLength;  // Longueur fixe
            let rightLineLength = fixedLineLength; // Longueur fixe

            // Calcul de la distance réelle pour les calculs internes
            let realLeftDistance = 0;
            let realRightDistance = 0;
            if (ctrlLeft && ctrlRight) {
                const kiteLeftWorld = ctrlLeft.clone();
                const kiteRightWorld = ctrlRight.clone();
                this.kite.localToWorld(kiteLeftWorld);
                this.kite.localToWorld(kiteRightWorld);

                realLeftDistance = kiteLeftWorld.distanceTo(handles.left);
                realRightDistance = kiteRightWorld.distanceTo(handles.right);
            }

            // Récupérer les warnings
            const warnings = this.physicsEngine.getKiteController().getWarnings();

            // Construire les indicateurs de warning (seuils plus élevés pour éviter le clignotement)
            let warningIndicators = '';
            if (warnings.accel && warnings.accelValue > 5000) {  // Seuil plus élevé
                warningIndicators += ` ⚠️A:${warnings.accelValue.toFixed(0)}`;
            }
            if (warnings.velocity && warnings.velocityValue > 25) {  // Seuil plus élevé
                warningIndicators += ` ⚠️V:${warnings.velocityValue.toFixed(0)}`;
            }
            if (warnings.angular) {
                warningIndicators += ' ⚠️Ω';
            }

            const logMessage =
                `[Frame ${this.frameCount}] ` +
                `Window: X:${angleX.toFixed(0)}° Y:${angleY.toFixed(0)}° Z:${distZ.toFixed(1)}m ` +
                `| Pos: [${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}] ` +
                `| Vel: ${state.velocity.length().toFixed(1)}m/s ` +
                `| Wind: ${windSpeed.toFixed(1)}m/s App: ${apparentSpeed.toFixed(1)}m/s ` +
                `| Aero: ${aeroForceMag.toFixed(0)}N AoA: ${metrics.aoaDeg.toFixed(0)}° ` +
                `| Bar: ${barDirection}${Math.abs(barRotationDeg)}° ` +
                `| Lines L:${leftLineLength.toFixed(1)}m R:${rightLineLength.toFixed(1)}m ${isTaut ? '✓' : '○'} ` +
                `| F(G/D): ${leftMag.toFixed(0)}/${rightMag.toFixed(0)}N (${asymmetry > 0 ? '+' : ''}${asymmetry.toFixed(0)}%)` +
                warningIndicators;

            // Afficher dans la console seulement toutes les secondes
            if (this.frameCount % 60 === 0) {
                console.log(`📊 ${logMessage}`);

                // 🔍 ANALYSE DES FRÉTILLEMENTS toutes les secondes
                const wobbleAnalysis = this.flightHistory.detectWobbling();
                if (wobbleAnalysis.isWobbling) {
                    console.log(`🔄 ${wobbleAnalysis.description} (Sévérité: ${(wobbleAnalysis.severity * 100).toFixed(0)}%)`);
                }

                // 📈 RAPPORT DÉTAILLÉ toutes les 5 secondes
                if (this.frameCount % 300 === 0) {
                    console.log(this.flightHistory.generateFlightReport());
                }
            }

            // Mettre à jour l'interface seulement 10 fois par seconde pour éviter le clignotement
            if (this.frameCount % 6 === 0) {  // 60fps / 6 = 10fps pour l'interface
                // Mise à jour interface classique
                const logElement = document.getElementById('periodic-log');
                if (logElement) {
                    // Analyser les frétillements pour l'interface
                    const wobbleAnalysis = this.flightHistory.detectWobbling();
                    const trends = this.flightHistory.getRecentTrends();

                    // Formater sur plusieurs lignes pour l'interface
                    let htmlMessage = `
                        <div style="line-height: 1.6;">
                            <strong>[Frame ${this.frameCount}]</strong><br>
                            🎯 Fenêtre: X:${angleX.toFixed(0)}° Y:${angleY.toFixed(0)}° | Profondeur Z:${distZ.toFixed(1)}m<br>
                            📍 Position: [${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}] | Altitude: ${kitePos.y.toFixed(1)}m | Vel: ${state.velocity.length().toFixed(1)}m/s<br>
                            🌬️ Vent: ${windSpeed.toFixed(1)}m/s (${(windSpeed * 3.6).toFixed(0)}km/h) | Apparent: ${apparentSpeed.toFixed(1)}m/s<br>
                            ✈️ Aéro: Force totale ${aeroForceMag.toFixed(0)}N | AoA: ${metrics.aoaDeg.toFixed(0)}°<br>
                            🎮 Barre: ${barDirection} ${Math.abs(barRotationDeg)}° | Forces G/D: ${leftMag.toFixed(0)}/${rightMag.toFixed(0)}N (${asymmetry > 0 ? '+' : ''}${asymmetry.toFixed(0)}%)<br>
                            📏 Lignes: G:${leftLineLength.toFixed(1)}m D:${rightLineLength.toFixed(1)}m | Dist: ${distance.toFixed(1)}/${currentLineLength}m (${(distanceRatio * 100).toFixed(0)}%) ${isTaut ? '✅' : '⚠️'}
                            ${stallWarning ? '<br><strong style="color: #ff6b6b;">' + stallWarning + '</strong>' : ''}
                            ${warningIndicators ? '<br><span class="warning">' + warningIndicators + '</span>' : ''}
                            ${wobbleAnalysis.isWobbling ? '<br><strong style="color: #ffaa00;">🔄 ' + wobbleAnalysis.description + ` (${(wobbleAnalysis.severity * 100).toFixed(0)}%)</strong>` : ''}
                            <br><small style="color: #888;">Tendances: ${trends.altitudeTrend} | ${trends.speedTrend} | ${trends.forceTrend}</small>
                        </div>
                    `;
                    logElement.innerHTML = htmlMessage;
                }

                // Mise à jour interface moderne si disponible
                if (typeof window !== 'undefined' && (window as any).simulationUI) {
                    const ui = (window as any).simulationUI;
                    const fps = Math.round(1 / this.clock.getDelta());

                    ui.updateRealTimeValues({
                        fps: fps,
                        windSpeed: Math.round(windSpeed * 3.6), // Conversion m/s -> km/h
                        force: aeroForceMag,
                        tension: Math.max(leftMag, rightMag),
                        altitude: kitePos.y,
                        physicsStatus: this.isPlaying ? 'Active' : 'En pause'
                    });
                }
            }
        }

        if (this.isPlaying) {
            try {
                const deltaTime = this.clock.getDelta();
                this.inputHandler.update(deltaTime);
                const targetRotation = this.inputHandler.getTargetBarRotation();

                this.physicsEngine.update(deltaTime, targetRotation, false);
                this.updateControlLines();
                this.updateDebugArrows();
            } catch (error) {
                console.error('❌ Erreur dans la boucle d\'animation:', error);
                this.isPlaying = false;
            }
        }

        this.renderManager.render();

        // Nettoyer le cache de rendu périodiquement pour éviter les fuites mémoire
        if (this.frameCount % 120 === 0) { // Toutes les 2 secondes
            RenderCache.clearCache();
        }
    }

    public cleanup(): void {
        console.log('🧹 Nettoyage de SimulationV9...');
        this.isPlaying = false;

        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];

        // Nettoyer les lignes principales
        if (this.leftLine) {
            this.renderManager.removeObject(this.leftLine);
            this.leftLine = null;
        }
        if (this.rightLine) {
            this.renderManager.removeObject(this.rightLine);
            this.rightLine = null;
        }

        // Nettoyer les brides (lignes ET cylindres)
        this.bridleLines.forEach(line => {
            this.renderManager.removeObject(line);
        });
        this.bridleLines = [];

        this.bridleCylinders.forEach(cylinder => {
            this.renderManager.removeObject(cylinder);
        });
        this.bridleCylinders = [];

        if (this.kite) {
            this.renderManager.removeObject(this.kite);
        }

        if (this.controlBar) {
            this.renderManager.removeObject(this.controlBar);
        }

        // Nettoyer la légende de debug
        this.removeDebugLegend();

        console.log('✅ SimulationV9 nettoyée');
    }
}
