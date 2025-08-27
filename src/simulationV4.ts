/**
 * SimulationV4.ts - Simulation physique émergente d'un cerf-volant
 * 
 * PRINCIPE PHYSIQUE FONDAMENTAL :
 * ================================
 * Lorsqu'un cerf‑volant de voltige est soumis au vent, la voile est repoussée vers l'arrière.
 * Les lignes le retiennent au niveau des poignées et le contraignent à rester à une distance 
 * fixe du pilote. Le kite s'oriente alors spontanément dans le vent et adopte une position 
 * d'équilibre qui dépend à la fois de la rotation de la barre et de la longueur des brides.
 * 
 * PHYSIQUE ÉMERGENTE :
 * ====================
 * 1. Le vent pousse sur les surfaces du cerf‑volant
 * 2. Les lignes reliées aux poignées le retiennent et imposent une distance et un angle
 * 3. La combinaison des forces de vent et de tension des lignes détermine la position d'équilibre
 * 
 * PARAMÈTRES D'INFLUENCE :
 * ========================
 * - Force du vent sur la toile : plus elle est forte, plus l'angle de vol tend à augmenter
 * - Tension des lignes : elles contrôlent la distance au pilote et participent au réglage de l'angle
 * - Longueur des brides : elles définissent l'angle de présentation au vent et la répartition des efforts
 * 
 * ARCHITECTURE :
 * ==============
 * - OOP : Chaque système est encapsulé dans sa propre classe
 * - KISS : Logique simple et directe, pas de sur-ingénierie
 * - Émergence : Les comportements complexes émergent des interactions simples
 * - Documentation : Code entièrement documenté et commenté
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '@objects/organic/Kite2';

// ==============================================================================
// CONFIGURATION GLOBALE
// ==============================================================================

/**
 * Configuration centrale de tous les paramètres physiques de la simulation
 */
const SIMULATION_CONFIG = {
    /** Paramètres physiques fondamentaux */
    physics: {
        gravity: 9.81,              // m/s² - Gravité terrestre
        airDensity: 1.225,          // kg/m³ - Densité de l'air au niveau de la mer
        deltaTimeMax: 0.016,        // 60 FPS max pour stabilité
        substeps: 2,                // Nombre de sous-étapes physiques (réduit pour performance)
        angularDamping: 0.5,        // Amortissement angulaire (de V3)
        linearDamping: 0.9          // Amortissement linéaire (de V3)
    },
    
    /** Propriétés du cerf-volant */
    kite: {
        mass: 0.5,                  // kg - Masse totale du cerf-volant
        area: 1.0,                  // m² - Surface de la toile (augmenté de V3)
        inertia: 0.02,              // kg·m² - Moment d'inertie (de V3)
        centerOfPressureOffset: 0.3, // Position du centre de pression (0=nez, 1=base)
        liftCoefficient: 1.5,       // Coefficient de portance (de V3)
        dragCoefficient: 0.18,      // Coefficient de traînée (de V3)
        stabilizationFactor: 0.3    // Facteur de stabilisation (de V3)
    },
    
    /** Système de lignes */
    lines: {
        defaultLength: 15,          // m - Longueur nominale des lignes
        stiffness: 150,             // N/m - Raideur (valeur de V3 pour plus de réactivité)
        damping: 10,                // Ns/m - Amortissement pour éviter les oscillations
        minTension: 2.0,            // N - Tension minimale (de V3)
        pivotStiffness: 0.8,        // Rigidité des pivots (de V3)
        pivotDamping: 0.9,          // Amortissement des pivots (de V3)
        breakingForce: 1000         // N - Force de rupture (sécurité)
    },
    
    /** Paramètres du vent */
    wind: {
        defaultSpeed: 15,           // km/h - Vitesse nominale
        defaultDirection: 0,        // degrés - Direction (0 = nord)
        defaultTurbulence: 0,       // % - Intensité de la turbulence
        gustFrequency: 0.5,         // Hz - Fréquence des rafales
        gustAmplitude: 0.3          // Facteur d'amplitude des rafales
    },
    
    /** Paramètres de contrôle */
    control: {
        barWidth: 0.5,              // m - Largeur de la barre de contrôle
        maxRotation: Math.PI / 3,   // rad - Rotation max de la barre (60°)
        rotationSpeed: 2.0,         // rad/s - Vitesse de rotation de la barre
        pilotHeight: 1.2            // m - Hauteur du pilote
    },
    
    /** Paramètres de rendu */
    rendering: {
        shadowMapSize: 2048,
        fogDensity: 0.001,
        cameraDistance: 20,
        groundSize: 200
    }
};

// ==============================================================================
// INTERFACES ET TYPES
// ==============================================================================

/**
 * État physique d'un corps rigide dans l'espace 3D
 */
interface RigidBodyState {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    orientation: THREE.Quaternion;
    angularVelocity: THREE.Vector3;
    mass: number;
    inertia: THREE.Matrix3;
}

/**
 * Force appliquée à un point spécifique d'un corps
 */
interface AppliedForce {
    force: THREE.Vector3;        // Vecteur force en Newtons
    applicationPoint: THREE.Vector3;  // Point d'application en coordonnées locales
    isGlobal: boolean;           // true si le point est en coordonnées globales
}

/**
 * Paramètres du vent à un instant donné
 */
interface WindState {
    velocity: THREE.Vector3;     // Vitesse du vent en m/s
    turbulence: number;          // Intensité de turbulence 0-1
    gustFactor: number;          // Facteur de rafale multiplicatif
}

/**
 * Configuration des brides du cerf-volant
 */
interface BridleConfiguration {
    mainBridleLength: number;    // Longueur virtuelle des brides principales (facteur 0.5 à 1.5)
    angleOfAttackBias: number;   // Biais sur l'angle d'attaque (-1 à 1)
}

// ==============================================================================
// SYSTÈME DE VENT - Génération du champ de vent avec turbulence
// ==============================================================================

/**
 * Simule un champ de vent réaliste avec turbulence et rafales
 */
class WindFieldSystem {
    private baseWindSpeed: number;      // Vitesse de base en m/s
    private windDirection: number;      // Direction en radians
    private turbulenceIntensity: number;// Intensité 0-1
    private time: number = 0;           // Temps écoulé pour les animations
    private gustPhase: number = 0;      // Phase des rafales
    
    constructor() {
        this.baseWindSpeed = SIMULATION_CONFIG.wind.defaultSpeed / 3.6; // km/h → m/s
        this.windDirection = (SIMULATION_CONFIG.wind.defaultDirection * Math.PI) / 180;
        this.turbulenceIntensity = SIMULATION_CONFIG.wind.defaultTurbulence / 100;
    }
    
    /**
     * Met à jour le système de vent
     * @param deltaTime - Temps écoulé depuis la dernière frame
     */
    public update(deltaTime: number): void {
        this.time += deltaTime;
        this.gustPhase += deltaTime * SIMULATION_CONFIG.wind.gustFrequency * 2 * Math.PI;
    }
    
    /**
     * Obtient l'état du vent à une position donnée
     * @param position - Position dans l'espace 3D
     * @returns État du vent à cette position
     */
    public getWindAt(position: THREE.Vector3): WindState {
        // Vent de base
        const baseWind = new THREE.Vector3(
            Math.sin(this.windDirection) * this.baseWindSpeed,
            0,
            -Math.cos(this.windDirection) * this.baseWindSpeed
        );
        
        // Ajouter la turbulence spatiale (simplifiée avec des sinus)
        const turbulence = this.generateTurbulence(position);
        const windWithTurbulence = baseWind.clone().add(turbulence);
        
        // Calculer le facteur de rafale
        const gustFactor = 1 + Math.sin(this.gustPhase) * 
                          SIMULATION_CONFIG.wind.gustAmplitude * 
                          this.turbulenceIntensity;
        
        return {
            velocity: windWithTurbulence.multiplyScalar(gustFactor),
            turbulence: this.turbulenceIntensity,
            gustFactor: gustFactor
        };
    }
    
    /**
     * Génère la turbulence locale basée sur la position
     * Utilise une approximation de bruit de Perlin avec des fonctions sinusoïdales
     */
    private generateTurbulence(position: THREE.Vector3): THREE.Vector3 {
        if (this.turbulenceIntensity === 0) {
            return new THREE.Vector3();
        }
        
        // Fréquences différentes pour chaque axe pour créer du chaos
        const fx = 0.1, fy = 0.13, fz = 0.17;
        const amplitude = this.baseWindSpeed * this.turbulenceIntensity * 0.3;
        
        return new THREE.Vector3(
            Math.sin(position.x * fx + this.time) * amplitude,
            Math.sin(position.y * fy + this.time * 1.3) * amplitude * 0.5,
            Math.sin(position.z * fz + this.time * 0.7) * amplitude
        );
    }
    
    /**
     * Configure les paramètres du vent
     */
    public setParameters(speed: number, direction: number, turbulence: number): void {
        this.baseWindSpeed = speed / 3.6; // km/h → m/s
        this.windDirection = (direction * Math.PI) / 180;
        this.turbulenceIntensity = turbulence / 100;
    }
}

// ==============================================================================
// SYSTÈME AÉRODYNAMIQUE - Calcul des forces sur les surfaces
// ==============================================================================

/**
 * Calcule les forces aérodynamiques sur le cerf-volant
 * PRINCIPE : Le vent exerce une pression sur la toile qui dépend de l'angle d'incidence
 */
class AerodynamicsSystem {
    /**
     * Calcule les forces aérodynamiques sur une surface
     * @param surfaceNormal - Normale de la surface (vers l'extérieur)
     * @param surfaceArea - Aire de la surface en m²
     * @param windVelocity - Vitesse du vent apparent
     * @param centerOfPressure - Centre de pression en coordonnées locales
     * @returns Forces et moments aérodynamiques
     */
    public calculateSurfaceForces(
        surfaceNormal: THREE.Vector3,
        surfaceArea: number,
        windVelocity: THREE.Vector3,
        centerOfPressure: THREE.Vector3
    ): { force: THREE.Vector3; moment: THREE.Vector3 } {
        
        const windSpeed = windVelocity.length();
        
        // Pas de force si pas de vent
        if (windSpeed < 0.01) {
            return {
                force: new THREE.Vector3(),
                moment: new THREE.Vector3()
            };
        }
        
        // Direction du vent normalisée
        const windDirection = windVelocity.clone().normalize();
        
        // Angle d'incidence : angle entre le vent et la normale
        // cos(θ) = -normale · direction_vent (négatif car la normale pointe vers l'extérieur)
        const cosIncidence = -surfaceNormal.dot(windDirection);
        
        // Le vent ne peut pousser que si il arrive sur la face avant (cosIncidence > 0)
        if (cosIncidence <= 0) {
            return {
                force: new THREE.Vector3(),
                moment: new THREE.Vector3()
            };
        }
        
        // Pression dynamique : q = 0.5 * ρ * V²
        const dynamicPressure = 0.5 * SIMULATION_CONFIG.physics.airDensity * windSpeed * windSpeed;
        
        // Force de pression normale à la surface
        // F = q * A * cos(θ) * normale
        // La force pousse dans la direction de la normale
        const pressureMagnitude = dynamicPressure * surfaceArea * cosIncidence;
        const pressureForce = surfaceNormal.clone().multiplyScalar(pressureMagnitude);
        
        // Moment autour du centre de masse
        // M = r × F où r est le vecteur du centre de masse au centre de pression
        const moment = new THREE.Vector3().crossVectors(centerOfPressure, pressureForce);
        
        return {
            force: pressureForce,
            moment: moment
        };
    }
    
    /**
     * Calcule l'angle d'attaque optimal basé sur la configuration des brides
     * Les brides courtes → angle faible → moins de portance
     * Les brides longues → angle élevé → plus de portance
     */
    public calculateOptimalAngleOfAttack(bridleConfig: BridleConfiguration): number {
        // Angle de base de 30°
        const baseAngle = Math.PI / 6;
        
        // Modification par la longueur des brides (0.5 à 1.5)
        // 0.5 → -15°, 1.0 → 0°, 1.5 → +15°
        const bridleEffect = (bridleConfig.mainBridleLength - 1.0) * Math.PI / 12;
        
        // Biais additionnel de l'angle (-π/12 à π/12)
        const bias = bridleConfig.angleOfAttackBias * Math.PI / 12;
        
        // Angle final limité entre 10° et 50°
        const finalAngle = Math.max(
            Math.PI / 18,  // 10°
            Math.min(
                Math.PI / 3.6, // 50°
                baseAngle + bridleEffect + bias
            )
        );
        
        return finalAngle;
    }
    
    /**
     * Calcule les forces aérodynamiques avec prise en compte du bridleFactor
     * Inspiré de simulationV3 pour une physique émergente naturelle
     */
    public calculateForcesWithBridle(
        windVelocity: THREE.Vector3,
        surfaceNormal: THREE.Vector3,
        surfaceArea: number,
        centerOfPressure: THREE.Vector3,
        bridleFactor: number = 1.0
    ): { force: THREE.Vector3; moment: THREE.Vector3 } {
        const windSpeed = windVelocity.length();
        
        if (windSpeed < 0.01) {
            return {
                force: new THREE.Vector3(),
                moment: new THREE.Vector3()
            };
        }
        
        // Pression dynamique
        const dynamicPressure = 0.5 * SIMULATION_CONFIG.physics.airDensity * windSpeed * windSpeed;
        
        // Direction du vent
        const windDir = windVelocity.clone().normalize();
        
        // Angle entre la surface et le vent
        const dotProduct = surfaceNormal.dot(windDir);
        const baseAngle = Math.acos(Math.abs(dotProduct));
        
        // Les brides modifient l'angle d'incidence (comme dans V3)
        // bridleFactor < 1.0 : NEZ en avant, angle faible
        // bridleFactor > 1.0 : NEZ en arrière, angle fort
        const angleMultiplier = 0.7 + 0.6 * bridleFactor; // de 0.7 à 1.3
        const effectiveAngle = Math.min(Math.PI/2, baseAngle * angleMultiplier);
        
        // Coefficient de pression basé sur l'angle effectif
        const pressureCoeff = Math.sin(effectiveAngle) * Math.sin(effectiveAngle);
        
        // Force de pression avec coefficient de portance
        const pressureMagnitude = dynamicPressure * surfaceArea * pressureCoeff * SIMULATION_CONFIG.kite.liftCoefficient;
        const pressureForce = surfaceNormal.clone().multiplyScalar(pressureMagnitude);
        
        // Force de traînée dans la direction du vent
        const dragMagnitude = dynamicPressure * surfaceArea * SIMULATION_CONFIG.kite.dragCoefficient;
        const dragForce = windDir.clone().multiplyScalar(dragMagnitude);
        
        // Force totale = pression + traînée
        const totalForce = pressureForce.add(dragForce);
        
        // Couple de stabilisation (les brides créent un couple stabilisateur)
        const desiredAngle = (Math.PI / 6) * bridleFactor; // 30° * facteur
        const angleDiff = effectiveAngle - desiredAngle;
        
        const stabilizationTorque = new THREE.Vector3()
            .crossVectors(surfaceNormal, windDir)
            .normalize()
            .multiplyScalar(angleDiff * pressureMagnitude * SIMULATION_CONFIG.kite.stabilizationFactor);
        
        // Moment total
        const moment = new THREE.Vector3()
            .crossVectors(centerOfPressure, totalForce)
            .add(stabilizationTorque);
        
        return {
            force: totalForce,
            moment: moment
        };
    }
}

// ==============================================================================
// SYSTÈME DE LIGNES - Gestion des tensions et contraintes
// ==============================================================================

/**
 * Simule le comportement physique des lignes de contrôle
 * Les lignes agissent comme des ressorts qui maintiennent le kite à distance
 */
class LineSystem {
    private restLength: number;         // Longueur au repos
    private currentLeftLength: number;  // Longueur actuelle ligne gauche
    private currentRightLength: number; // Longueur actuelle ligne droite
    
    // Pivots souples (nœuds élastiques entre lignes et kite)
    private leftPivot: THREE.Vector3 = new THREE.Vector3();
    private rightPivot: THREE.Vector3 = new THREE.Vector3();
    private leftPivotVelocity: THREE.Vector3 = new THREE.Vector3();
    private rightPivotVelocity: THREE.Vector3 = new THREE.Vector3();
    
    constructor(length: number = SIMULATION_CONFIG.lines.defaultLength) {
        this.restLength = length;
        this.currentLeftLength = length;
        this.currentRightLength = length;
    }
    
    /**
     * Calcule les forces de tension dans les lignes
     * Les lignes agissent comme des ressorts : F = -k * (x - x0) - c * v
     */
    public calculateTensions(
        leftAttachPoint: THREE.Vector3,   // Point d'attache gauche sur le kite
        rightAttachPoint: THREE.Vector3,  // Point d'attache droit sur le kite
        leftHandlePos: THREE.Vector3,     // Position poignée gauche
        rightHandlePos: THREE.Vector3,    // Position poignée droite
        velocity: THREE.Vector3           // Vitesse du kite pour l'amortissement
    ): { leftForce: THREE.Vector3; rightForce: THREE.Vector3; totalMoment: THREE.Vector3 } {
        
        // Vecteurs des lignes
        const leftVector = leftHandlePos.clone().sub(leftAttachPoint);
        const rightVector = rightHandlePos.clone().sub(rightAttachPoint);
        
        // Longueurs actuelles
        this.currentLeftLength = leftVector.length();
        this.currentRightLength = rightVector.length();
        
        // Directions normalisées
        const leftDir = leftVector.normalize();
        const rightDir = rightVector.normalize();
        
        // Forces de rappel élastique (loi de Hooke)
        const leftExtension = this.currentLeftLength - this.restLength * 0.95; // Commence à tirer à 95%
        const rightExtension = this.currentRightLength - this.restLength * 0.95;
        
        // Les lignes ne poussent pas, elles ne font que tirer, avec une tension minimale
        const leftSpringForce = Math.max(
            SIMULATION_CONFIG.lines.minTension,
            leftExtension > 0 ? leftExtension * SIMULATION_CONFIG.lines.stiffness : 0
        );
        const rightSpringForce = Math.max(
            SIMULATION_CONFIG.lines.minTension,
            rightExtension > 0 ? rightExtension * SIMULATION_CONFIG.lines.stiffness : 0
        );
        
        // Forces d'amortissement (opposées à la vitesse)
        const leftDampingForce = velocity.dot(leftDir) * SIMULATION_CONFIG.lines.damping;
        const rightDampingForce = velocity.dot(rightDir) * SIMULATION_CONFIG.lines.damping;
        
        // Forces totales dans les lignes
        const leftForce = leftDir.multiplyScalar(leftSpringForce + leftDampingForce);
        const rightForce = rightDir.multiplyScalar(rightSpringForce + rightDampingForce);
        
        // Vérification de la limite de rupture
        if (leftForce.length() > SIMULATION_CONFIG.lines.breakingForce) {
            console.warn('⚠️ Ligne gauche proche de la rupture!');
        }
        if (rightForce.length() > SIMULATION_CONFIG.lines.breakingForce) {
            console.warn('⚠️ Ligne droite proche de la rupture!');
        }
        
        // Calcul du moment total (pour la rotation du kite)
        const centerPoint = leftAttachPoint.clone().add(rightAttachPoint).multiplyScalar(0.5);
        const leftLever = leftAttachPoint.clone().sub(centerPoint);
        const rightLever = rightAttachPoint.clone().sub(centerPoint);
        
        const leftMoment = new THREE.Vector3().crossVectors(leftLever, leftForce);
        const rightMoment = new THREE.Vector3().crossVectors(rightLever, rightForce);
        const totalMoment = leftMoment.add(rightMoment);
        
        return {
            leftForce,
            rightForce,
            totalMoment
        };
    }
    
    /**
     * Met à jour la physique des pivots souples
     * Les pivots permettent un mouvement élastique naturel du cerf-volant
     * IMPORTANT: Multiplier par deltaTime pour une physique correcte (fix de V3)
     */
    public updatePivots(
        leftTarget: THREE.Vector3,
        rightTarget: THREE.Vector3,
        deltaTime: number
    ): void {
        // Force de rappel élastique vers la position cible (ressort)
        const leftForce = leftTarget.clone()
            .sub(this.leftPivot)
            .multiplyScalar(SIMULATION_CONFIG.lines.pivotStiffness);
        
        const rightForce = rightTarget.clone()
            .sub(this.rightPivot)
            .multiplyScalar(SIMULATION_CONFIG.lines.pivotStiffness);
        
        // Intégration de la vélocité (accélération)
        this.leftPivotVelocity.add(leftForce);
        this.rightPivotVelocity.add(rightForce);
        
        // Amortissement (friction)
        this.leftPivotVelocity.multiplyScalar(SIMULATION_CONFIG.lines.pivotDamping);
        this.rightPivotVelocity.multiplyScalar(SIMULATION_CONFIG.lines.pivotDamping);
        
        // Mise à jour de la position (IMPORTANT: multiplier par deltaTime)
        this.leftPivot.add(
            this.leftPivotVelocity.clone().multiplyScalar(deltaTime)
        );
        this.rightPivot.add(
            this.rightPivotVelocity.clone().multiplyScalar(deltaTime)
        );
    }
    
    /**
     * Obtient les positions actuelles des pivots
     */
    public getPivots(): { left: THREE.Vector3; right: THREE.Vector3 } {
        return {
            left: this.leftPivot.clone(),
            right: this.rightPivot.clone()
        };
    }
    
    /**
     * Applique une contrainte sphérique pour maintenir le kite dans sa zone de vol
     */
    public applySphericalConstraint(
        position: THREE.Vector3,
        pilotPosition: THREE.Vector3,
        maxRadius: number
    ): THREE.Vector3 {
        const distance = position.distanceTo(pilotPosition);
        
        if (distance > maxRadius) {
            // Projeter la position sur la sphère de rayon maximal
            const direction = position.clone().sub(pilotPosition).normalize();
            return pilotPosition.clone().add(direction.multiplyScalar(maxRadius));
        }
        
        return position;
    }
    
    /**
     * Retourne les points pour dessiner les lignes en caténaire
     */
    public getCatenaryPoints(
        start: THREE.Vector3,
        end: THREE.Vector3,
        segments: number = 10
    ): THREE.Vector3[] {
        const points: THREE.Vector3[] = [];
        const distance = start.distanceTo(end);
        
        // Si la ligne est tendue, simple ligne droite
        if (distance >= this.restLength * 0.95) {
            return [start, end];
        }
        
        // Sinon, calculer la caténaire (chaînette)
        const slack = this.restLength - distance;
        const sag = slack * 0.1; // Affaissement proportionnel au mou
        
        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const point = new THREE.Vector3().lerpVectors(start, end, t);
            
            // Ajouter l'affaissement (parabole approximative)
            const sagAmount = 4 * sag * t * (1 - t);
            point.y -= sagAmount;
            
            points.push(point);
        }
        
        return points;
    }
    
    public setLength(length: number): void {
        this.restLength = length;
    }
    
    public getStatus(): { left: number; right: number; rest: number } {
        return {
            left: this.currentLeftLength,
            right: this.currentRightLength,
            rest: this.restLength
        };
    }
}

// ==============================================================================
// CONTRÔLEUR DE CERF-VOLANT - Gestion de la dynamique du kite
// ==============================================================================

/**
 * Gère la physique et le comportement du cerf-volant
 * Intègre toutes les forces pour créer le mouvement émergent
 */
class KiteController {
    private kite: Kite2;
    private state: RigidBodyState;
    private bridleConfig: BridleConfiguration;
    private forces: AppliedForce[] = [];
    
    constructor(kite: Kite2) {
        this.kite = kite;
        
        // État initial
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone(),
            angularVelocity: new THREE.Vector3(),
            mass: SIMULATION_CONFIG.kite.mass,
            inertia: new THREE.Matrix3() // Simplifiée pour l'instant
        };
        
        // Configuration des brides par défaut
        this.bridleConfig = {
            mainBridleLength: 1.0,      // Facteur nominal
            angleOfAttackBias: 0        // Pas de biais
        };
    }
    
    /**
     * Ajoute une force au système
     */
    public addForce(force: THREE.Vector3, applicationPoint: THREE.Vector3, isGlobal: boolean = false): void {
        this.forces.push({ force, applicationPoint, isGlobal });
    }
    
    /**
     * Intègre les forces et met à jour l'état du kite
     * Utilise l'intégration de Verlet pour la stabilité
     */
    public integrate(deltaTime: number): void {
        // Limiter le pas de temps pour la stabilité
        const dt = Math.min(deltaTime, SIMULATION_CONFIG.physics.deltaTimeMax);
        
        // Subdiviser pour plus de précision
        const substeps = SIMULATION_CONFIG.physics.substeps;
        const subDt = dt / substeps;
        
        for (let i = 0; i < substeps; i++) {
            this.integrateStep(subDt);
        }
        
        // Appliquer l'état au kite
        this.kite.position.copy(this.state.position);
        this.kite.quaternion.copy(this.state.orientation);
    }
    
    private integrateStep(dt: number): void {
        // Calculer la force et le moment total
        let totalForce = new THREE.Vector3();
        let totalMoment = new THREE.Vector3();
        
        for (const appliedForce of this.forces) {
            totalForce.add(appliedForce.force);
            
            // Calculer le moment si la force n'est pas appliquée au centre de masse
            if (appliedForce.applicationPoint.length() > 0.001) {
                const lever = appliedForce.isGlobal 
                    ? appliedForce.applicationPoint.clone().sub(this.state.position)
                    : appliedForce.applicationPoint;
                    
                const moment = new THREE.Vector3().crossVectors(lever, appliedForce.force);
                totalMoment.add(moment);
            }
        }
        
        // Ajouter la gravité
        const gravity = new THREE.Vector3(0, -SIMULATION_CONFIG.physics.gravity * this.state.mass, 0);
        totalForce.add(gravity);
        
        // Accélération linéaire : a = F / m
        const acceleration = totalForce.divideScalar(this.state.mass);
        
        // Intégration de la position (Verlet)
        const newVelocity = this.state.velocity.clone()
            .add(acceleration.multiplyScalar(dt))
            .multiplyScalar(SIMULATION_CONFIG.physics.linearDamping); // Amortissement linéaire de V3
        
        const newPosition = this.state.position.clone().add(
            this.state.velocity.clone().add(newVelocity).multiplyScalar(0.5 * dt)
        );
        
        // Accélération angulaire avec inertie correcte
        const angularAcceleration = totalMoment.divideScalar(SIMULATION_CONFIG.kite.inertia);
        
        // Intégration de l'orientation avec amortissement correct
        const newAngularVelocity = this.state.angularVelocity.clone()
            .add(angularAcceleration.multiplyScalar(dt))
            .multiplyScalar(SIMULATION_CONFIG.physics.angularDamping); // Amortissement angulaire de V3
            
        // Limiter la vitesse angulaire
        const maxAngularSpeed = 2.0; // rad/s
        if (newAngularVelocity.length() > maxAngularSpeed) {
            newAngularVelocity.normalize().multiplyScalar(maxAngularSpeed);
        }
        
        // Appliquer la rotation
        if (newAngularVelocity.length() > 0.001) {
            const angle = newAngularVelocity.length() * dt;
            const axis = newAngularVelocity.clone().normalize();
            const rotationQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            this.state.orientation.multiplyQuaternions(rotationQuat, this.state.orientation);
        }
        
        // Mettre à jour l'état
        this.state.position.copy(newPosition);
        this.state.velocity.copy(newVelocity);
        this.state.angularVelocity.copy(newAngularVelocity);
        
        // Vider la liste des forces pour la prochaine frame
        this.forces = [];
    }
    
    /**
     * Calcule la normale de la surface du kite dans l'espace monde
     */
    public getSurfaceNormal(): THREE.Vector3 {
        // La normale locale pointe vers l'arrière (Z négatif)
        const localNormal = new THREE.Vector3(0, 0, -1);
        
        // Transformer en coordonnées monde
        localNormal.applyQuaternion(this.state.orientation);
        
        return localNormal;
    }
    
    /**
     * Obtient le centre de pression en coordonnées monde
     */
    public getCenterOfPressure(): THREE.Vector3 {
        // Position relative du centre de pression sur le kite
        const localCP = new THREE.Vector3(
            0,
            -SIMULATION_CONFIG.kite.centerOfPressureOffset,
            0
        );
        
        // Transformer en coordonnées monde
        localCP.applyQuaternion(this.state.orientation);
        
        return this.state.position.clone().add(localCP);
    }
    
    /**
     * Configure les brides du cerf-volant
     */
    public setBridleConfiguration(config: Partial<BridleConfiguration>): void {
        Object.assign(this.bridleConfig, config);
    }
    
    public getBridleConfiguration(): BridleConfiguration {
        return { ...this.bridleConfig };
    }
    
    public getState(): RigidBodyState {
        return { ...this.state };
    }
    
    public getKite(): Kite2 {
        return this.kite;
    }
}

// ==============================================================================
// SYSTÈME DE BARRE DE CONTRÔLE - Gestion des entrées pilote
// ==============================================================================

/**
 * Gère la barre de contrôle et les entrées du pilote
 */
class ControlBarSystem {
    private barRotation: number = 0;        // Rotation actuelle
    private targetRotation: number = 0;     // Rotation cible
    private barObject: THREE.Group;
    private pilotPosition: THREE.Vector3;
    
    constructor(barObject: THREE.Group) {
        this.barObject = barObject;
        this.pilotPosition = new THREE.Vector3(0, SIMULATION_CONFIG.control.pilotHeight, 0);
    }
    
    /**
     * Met à jour la rotation de la barre
     */
    public update(deltaTime: number): void {
        // Interpolation douce vers la rotation cible
        const diff = this.targetRotation - this.barRotation;
        const rotationSpeed = SIMULATION_CONFIG.control.rotationSpeed;
        
        if (Math.abs(diff) > 0.001) {
            const delta = Math.sign(diff) * Math.min(Math.abs(diff), rotationSpeed * deltaTime);
            this.barRotation += delta;
            
            // Appliquer la rotation visuelle
            this.barObject.rotation.y = this.barRotation;
        }
    }
    
    /**
     * Calcule les positions des poignées dans l'espace monde
     */
    public getHandlePositions(): { left: THREE.Vector3; right: THREE.Vector3 } {
        const halfWidth = SIMULATION_CONFIG.control.barWidth / 2;
        
        // Positions locales des poignées
        const leftLocal = new THREE.Vector3(-halfWidth, 0, 0);
        const rightLocal = new THREE.Vector3(halfWidth, 0, 0);
        
        // Appliquer la rotation de la barre
        const rotation = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            this.barRotation
        );
        
        leftLocal.applyQuaternion(rotation);
        rightLocal.applyQuaternion(rotation);
        
        // Transformer en positions monde
        const barWorldPos = this.barObject.position.clone();
        
        return {
            left: barWorldPos.clone().add(leftLocal),
            right: barWorldPos.clone().add(rightLocal)
        };
    }
    
    /**
     * Définit la rotation cible de la barre
     */
    public setTargetRotation(angle: number): void {
        this.targetRotation = Math.max(
            -SIMULATION_CONFIG.control.maxRotation,
            Math.min(SIMULATION_CONFIG.control.maxRotation, angle)
        );
    }
    
    public getPilotPosition(): THREE.Vector3 {
        return this.pilotPosition.clone();
    }
    
    public getRotation(): number {
        return this.barRotation;
    }
}

// ==============================================================================
// MOTEUR PHYSIQUE PRINCIPAL - Orchestration de tous les systèmes
// ==============================================================================

/**
 * Moteur physique principal qui orchestre tous les systèmes
 * C'est ici que la physique émergente prend vie
 */
class PhysicsEngine {
    private windSystem: WindFieldSystem;
    private aeroSystem: AerodynamicsSystem;
    private lineSystem: LineSystem;
    private kiteController: KiteController;
    private controlBarSystem: ControlBarSystem;
    private bridleFactor: number = 1.0;  // Facteur de longueur des brides (0.5 à 1.5)
    
    constructor(
        kite: Kite2,
        controlBar: THREE.Group
    ) {
        // Initialiser tous les systèmes
        this.windSystem = new WindFieldSystem();
        this.aeroSystem = new AerodynamicsSystem();
        this.lineSystem = new LineSystem();
        this.kiteController = new KiteController(kite);
        this.controlBarSystem = new ControlBarSystem(controlBar);
    }
    
    /**
     * Définit le facteur de bride (longueur virtuelle des brides)
     * 0.5 = brides courtes → angle faible → moins de portance
     * 1.0 = brides normales → angle moyen
     * 1.5 = brides longues → angle élevé → plus de portance
     */
    public setBridleFactor(factor: number): void {
        this.bridleFactor = Math.max(0.5, Math.min(1.5, factor));
        console.log(`🪢 Facteur de bride ajusté à : ${this.bridleFactor}`);
    }
    
    /**
     * Met à jour la simulation physique
     * C'est ici que toutes les forces sont calculées et appliquées
     */
    public update(deltaTime: number): void {
        // 1. Mettre à jour les systèmes de base
        this.windSystem.update(deltaTime);
        this.controlBarSystem.update(deltaTime);
        
        // 2. Obtenir l'état actuel
        const kiteState = this.kiteController.getState();
        const kite = this.kiteController.getKite();
        
        // 3. Calculer le vent apparent (vent réel - vitesse du kite)
        const windState = this.windSystem.getWindAt(kiteState.position);
        const apparentWind = windState.velocity.clone().sub(kiteState.velocity);
        
        // 4. Calculer les forces aérodynamiques avec prise en compte du bridleFactor
        const surfaceNormal = this.kiteController.getSurfaceNormal();
        const centerOfPressure = this.kiteController.getCenterOfPressure();
        
        // Utiliser la nouvelle méthode qui prend en compte le bridleFactor
        const aeroForces = this.aeroSystem.calculateForcesWithBridle(
            apparentWind,
            surfaceNormal,
            SIMULATION_CONFIG.kite.area,
            centerOfPressure.clone().sub(kiteState.position), // CP relatif au centre de masse
            this.bridleFactor
        );
        
        // 5. Appliquer les forces aérodynamiques
        this.kiteController.addForce(
            aeroForces.force,
            centerOfPressure,
            true // Coordonnées globales
        );
        
        // 6. Mettre à jour les pivots souples
        const leftAttach = kite.getPoint('CTRL_GAUCHE')!.clone();
        const rightAttach = kite.getPoint('CTRL_DROIT')!.clone();
        kite.localToWorld(leftAttach);
        kite.localToWorld(rightAttach);
        
        // Mettre à jour la physique des pivots
        this.lineSystem.updatePivots(leftAttach, rightAttach, deltaTime);
        
        // 7. Calculer les tensions des lignes avec les pivots
        const handlePositions = this.controlBarSystem.getHandlePositions();
        const pilotPosition = this.controlBarSystem.getPilotPosition();
        const pivots = this.lineSystem.getPivots();
        
        // Utiliser les pivots comme points d'attache effectifs
        const lineTensions = this.lineSystem.calculateTensions(
            pivots.left,
            pivots.right,
            handlePositions.left,
            handlePositions.right,
            kiteState.velocity
        );
        
        // 7. Appliquer les forces des lignes
        this.kiteController.addForce(lineTensions.leftForce, leftAttach, true);
        this.kiteController.addForce(lineTensions.rightForce, rightAttach, true);
        
        // 8. Appliquer la gravité
        const gravityForce = new THREE.Vector3(
            0,
            -SIMULATION_CONFIG.physics.gravity * SIMULATION_CONFIG.kite.mass,
            0
        );
        this.kiteController.addForce(gravityForce, kiteState.position, true);
        
        // 9. Intégrer les forces pour obtenir le mouvement
        this.kiteController.integrate(deltaTime);
        
        // 10. Appliquer la contrainte sphérique
        const newPosition = this.lineSystem.applySphericalConstraint(
            kiteState.position,
            pilotPosition,
            SIMULATION_CONFIG.lines.defaultLength * 0.98
        );
        kite.position.copy(newPosition);
    }
    
    /**
     * Configure les paramètres du vent
     */
    public setWindParameters(speed: number, direction: number, turbulence: number): void {
        this.windSystem.setParameters(speed, direction, turbulence);
    }
    
    /**
     * Configure la longueur des lignes
     */
    public setLineLength(length: number): void {
        this.lineSystem.setLength(length);
    }
    
    /**
     * Configure les brides du kite
     */
    public setBridleConfiguration(config: Partial<BridleConfiguration>): void {
        this.kiteController.setBridleConfiguration(config);
    }
    
    /**
     * Définit la rotation cible de la barre de contrôle
     */
    public setControlBarRotation(angle: number): void {
        this.controlBarSystem.setTargetRotation(angle);
    }
    
    // Getters pour accéder aux systèmes
    public getWindSystem(): WindFieldSystem { return this.windSystem; }
    public getLineSystem(): LineSystem { return this.lineSystem; }
    public getKiteController(): KiteController { return this.kiteController; }
    public getControlBarSystem(): ControlBarSystem { return this.controlBarSystem; }
}

// ==============================================================================
// GESTIONNAIRE DE RENDU - Affichage 3D avec Three.js
// ==============================================================================

/**
 * Gère le rendu 3D de la simulation
 */
class RenderingSystem {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    
    constructor(container: HTMLElement) {
        // Créer la scène
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x87CEEB, SIMULATION_CONFIG.rendering.fogDensity);
        
        // Configurer la caméra
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );
        this.camera.position.set(0, 10, SIMULATION_CONFIG.rendering.cameraDistance);
        this.camera.lookAt(0, 5, 0);
        
        // Configurer le renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);
        
        // Contrôles de caméra
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxDistance = 100;
        this.controls.minDistance = 5;
        
        // Setup de l'environnement
        this.setupEnvironment();
        
        // Gestion du redimensionnement
        window.addEventListener('resize', () => this.onResize());
    }
    
    private setupEnvironment(): void {
        // Lumière ambiante
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Lumière directionnelle (soleil)
        const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
        sunLight.position.set(50, 100, 50);
        sunLight.castShadow = true;
        sunLight.shadow.camera.left = -50;
        sunLight.shadow.camera.right = 50;
        sunLight.shadow.camera.top = 50;
        sunLight.shadow.camera.bottom = -50;
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 200;
        sunLight.shadow.mapSize.width = SIMULATION_CONFIG.rendering.shadowMapSize;
        sunLight.shadow.mapSize.height = SIMULATION_CONFIG.rendering.shadowMapSize;
        this.scene.add(sunLight);
        
        // Sol
        const groundSize = SIMULATION_CONFIG.rendering.groundSize;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x7CFC00,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Grille de référence
        const gridHelper = new THREE.GridHelper(100, 50, 0x444444, 0x222222);
        this.scene.add(gridHelper);
        
        // Axes de référence (pour debug)
        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);
    }
    
    public addObject(object: THREE.Object3D): void {
        this.scene.add(object);
    }
    
    public removeObject(object: THREE.Object3D): void {
        this.scene.remove(object);
    }
    
    public render(): void {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    private onResize(): void {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

// ==============================================================================
// GESTIONNAIRE D'ENTRÉES - Interface utilisateur
// ==============================================================================

/**
 * Gère les entrées clavier et souris
 */
class InputManager {
    private keysPressed = new Set<string>();
    private targetBarRotation: number = 0;
    
    constructor() {
        this.setupKeyboardControls();
    }
    
    private setupKeyboardControls(): void {
        window.addEventListener('keydown', (event) => {
            this.keysPressed.add(event.key);
            
            if (event.key === 'ArrowLeft') {
                this.targetBarRotation = SIMULATION_CONFIG.control.maxRotation;
                event.preventDefault();
            } else if (event.key === 'ArrowRight') {
                this.targetBarRotation = -SIMULATION_CONFIG.control.maxRotation;
                event.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (event) => {
            this.keysPressed.delete(event.key);
            
            if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                if (!this.keysPressed.has('ArrowLeft') && !this.keysPressed.has('ArrowRight')) {
                    this.targetBarRotation = 0;
                }
                event.preventDefault();
            }
        });
    }
    
    public getTargetBarRotation(): number {
        return this.targetBarRotation;
    }
    
    public isKeyPressed(key: string): boolean {
        return this.keysPressed.has(key);
    }
}

// ==============================================================================
// APPLICATION PRINCIPALE - Point d'entrée de la simulation
// ==============================================================================

/**
 * Application principale qui orchestre toute la simulation
 */
export class KiteSimulationV4 {
    private renderingSystem: RenderingSystem;
    private physicsEngine: PhysicsEngine;
    private inputManager: InputManager;
    
    private kite: Kite2;
    private controlBar: THREE.Group;
    
    private clock: THREE.Clock;
    private isRunning: boolean = true;
    
    // Éléments visuels
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private debugArrows: THREE.ArrowHelper[] = [];
    private debugMode: boolean = false;
    
    constructor() {
        console.log('🚀 Démarrage de la Simulation V4 - Physique Émergente Pure');
        
        // Initialiser le conteneur
        const container = document.getElementById('app');
        if (!container) {
            throw new Error('Container #app non trouvé');
        }
        
        // Initialiser les systèmes
        this.renderingSystem = new RenderingSystem(container);
        this.inputManager = new InputManager();
        this.clock = new THREE.Clock();
        
        // Créer les objets 3D
        this.kite = this.createKite();
        this.controlBar = this.createControlBar();
        
        // Initialiser le moteur physique
        this.physicsEngine = new PhysicsEngine(this.kite, this.controlBar);
        
        // Créer les éléments visuels
        this.createVisualElements();
        
        // Setup de l'interface utilisateur
        this.setupUI();
        
        // Démarrer l'animation
        this.animate();
    }
    
    private createKite(): Kite2 {
        const kite = new Kite2();
        
        // Position initiale
        const initialDistance = SIMULATION_CONFIG.lines.defaultLength * 0.8;
        kite.position.set(0, 10, -initialDistance);
        
        // Ajouter au rendu
        this.renderingSystem.addObject(kite);
        
        return kite;
    }
    
    private createControlBar(): THREE.Group {
        const barGroup = new THREE.Group();
        barGroup.position.set(0, SIMULATION_CONFIG.control.pilotHeight, 0);
        
        // Créer la barre physique
        const barGeometry = new THREE.CylinderGeometry(0.02, 0.02, SIMULATION_CONFIG.control.barWidth);
        const barMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            metalness: 0.7,
            roughness: 0.3
        });
        const barMesh = new THREE.Mesh(barGeometry, barMaterial);
        barMesh.rotation.z = Math.PI / 2; // Horizontale
        barGroup.add(barMesh);
        
        // Ajouter les poignées
        const handleGeometry = new THREE.SphereGeometry(0.03);
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        
        const leftHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        leftHandle.position.x = -SIMULATION_CONFIG.control.barWidth / 2;
        barGroup.add(leftHandle);
        
        const rightHandle = new THREE.Mesh(handleGeometry, handleMaterial);
        rightHandle.position.x = SIMULATION_CONFIG.control.barWidth / 2;
        barGroup.add(rightHandle);
        
        // Ajouter au rendu
        this.renderingSystem.addObject(barGroup);
        
        return barGroup;
    }
    
    private createVisualElements(): void {
        // Créer les lignes de contrôle
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            linewidth: 2
        });
        
        this.leftLine = new THREE.Line(
            new THREE.BufferGeometry(),
            lineMaterial
        );
        this.rightLine = new THREE.Line(
            new THREE.BufferGeometry(),
            lineMaterial
        );
        
        this.renderingSystem.addObject(this.leftLine);
        this.renderingSystem.addObject(this.rightLine);
    }
    
    private updateVisualElements(): void {
        // Mettre à jour les lignes visuelles
        if (this.leftLine && this.rightLine) {
            const handles = this.physicsEngine.getControlBarSystem().getHandlePositions();
            const lineSystem = this.physicsEngine.getLineSystem();
            
            // Points d'attache sur le kite
            const leftAttach = this.kite.getPoint('CTRL_GAUCHE')!.clone();
            const rightAttach = this.kite.getPoint('CTRL_DROIT')!.clone();
            this.kite.localToWorld(leftAttach);
            this.kite.localToWorld(rightAttach);
            
            // Obtenir les points de la caténaire
            const leftPoints = lineSystem.getCatenaryPoints(handles.left, leftAttach);
            const rightPoints = lineSystem.getCatenaryPoints(handles.right, rightAttach);
            
            // Mettre à jour les géométries
            this.leftLine.geometry.setFromPoints(leftPoints);
            this.rightLine.geometry.setFromPoints(rightPoints);
        }
        
        // Mettre à jour les flèches de debug si activé
        if (this.debugMode) {
            this.updateDebugArrows();
        }
    }
    
    private updateDebugArrows(): void {
        // Nettoyer les anciennes flèches
        this.debugArrows.forEach(arrow => {
            this.renderingSystem.removeObject(arrow);
        });
        this.debugArrows = [];
        
        const kiteState = this.physicsEngine.getKiteController().getState();
        const windState = this.physicsEngine.getWindSystem().getWindAt(kiteState.position);
        
        // Flèche de vent (blanche)
        const windArrow = new THREE.ArrowHelper(
            windState.velocity.clone().normalize(),
            kiteState.position.clone().add(new THREE.Vector3(2, 0, 0)),
            windState.velocity.length() * 0.3,
            0xffffff,
            undefined,
            0.5
        );
        this.renderingSystem.addObject(windArrow);
        this.debugArrows.push(windArrow);
        
        // Flèche de vitesse (verte)
        if (kiteState.velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                kiteState.velocity.clone().normalize(),
                kiteState.position,
                kiteState.velocity.length() * 0.5,
                0x00ff00,
                undefined,
                0.3
            );
            this.renderingSystem.addObject(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }
        
        // Normale de surface (jaune)
        const normal = this.physicsEngine.getKiteController().getSurfaceNormal();
        const normalArrow = new THREE.ArrowHelper(
            normal,
            kiteState.position,
            1,
            0xffff00,
            undefined,
            0.2
        );
        this.renderingSystem.addObject(normalArrow);
        this.debugArrows.push(normalArrow);
    }
    
    private setupUI(): void {
        // Contrôles de base
        const resetBtn = document.getElementById('reset-sim');
        if (resetBtn) {
            resetBtn.onclick = () => this.reset();
        }
        
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.onclick = () => this.togglePlayPause();
        }
        
        const debugBtn = document.getElementById('debug-physics');
        if (debugBtn) {
            debugBtn.onclick = () => this.toggleDebugMode();
        }
        
        // Contrôles du vent
        this.setupWindControls();
        
        // Contrôles des lignes et brides
        this.setupLineControls();
    }
    
    private setupWindControls(): void {
        // Vitesse du vent
        const speedSlider = document.getElementById('wind-speed') as HTMLInputElement;
        const speedValue = document.getElementById('wind-speed-value');
        if (speedSlider && speedValue) {
            speedSlider.value = SIMULATION_CONFIG.wind.defaultSpeed.toString();
            speedValue.textContent = `${SIMULATION_CONFIG.wind.defaultSpeed} km/h`;
            
            speedSlider.oninput = () => {
                const speed = parseFloat(speedSlider.value);
                this.physicsEngine.setWindParameters(
                    speed,
                    parseFloat((document.getElementById('wind-direction') as HTMLInputElement)?.value || '0'),
                    parseFloat((document.getElementById('wind-turbulence') as HTMLInputElement)?.value || '0')
                );
                speedValue.textContent = `${speed} km/h`;
            };
        }
        
        // Direction du vent
        const dirSlider = document.getElementById('wind-direction') as HTMLInputElement;
        const dirValue = document.getElementById('wind-direction-value');
        if (dirSlider && dirValue) {
            dirSlider.value = SIMULATION_CONFIG.wind.defaultDirection.toString();
            dirValue.textContent = `${SIMULATION_CONFIG.wind.defaultDirection}°`;
            
            dirSlider.oninput = () => {
                const direction = parseFloat(dirSlider.value);
                this.physicsEngine.setWindParameters(
                    parseFloat((document.getElementById('wind-speed') as HTMLInputElement)?.value || '15'),
                    direction,
                    parseFloat((document.getElementById('wind-turbulence') as HTMLInputElement)?.value || '0')
                );
                dirValue.textContent = `${direction}°`;
            };
        }
        
        // Turbulence
        const turbSlider = document.getElementById('wind-turbulence') as HTMLInputElement;
        const turbValue = document.getElementById('wind-turbulence-value');
        if (turbSlider && turbValue) {
            turbSlider.value = SIMULATION_CONFIG.wind.defaultTurbulence.toString();
            turbValue.textContent = `${SIMULATION_CONFIG.wind.defaultTurbulence}%`;
            
            turbSlider.oninput = () => {
                const turbulence = parseFloat(turbSlider.value);
                this.physicsEngine.setWindParameters(
                    parseFloat((document.getElementById('wind-speed') as HTMLInputElement)?.value || '15'),
                    parseFloat((document.getElementById('wind-direction') as HTMLInputElement)?.value || '0'),
                    turbulence
                );
                turbValue.textContent = `${turbulence}%`;
            };
        }
    }
    
    private setupLineControls(): void {
        // Longueur des lignes
        const lengthSlider = document.getElementById('line-length') as HTMLInputElement;
        const lengthValue = document.getElementById('line-length-value');
        if (lengthSlider && lengthValue) {
            lengthSlider.value = SIMULATION_CONFIG.lines.defaultLength.toString();
            lengthValue.textContent = `${SIMULATION_CONFIG.lines.defaultLength}m`;
            
            lengthSlider.oninput = () => {
                const length = parseFloat(lengthSlider.value);
                this.physicsEngine.setLineLength(length);
                lengthValue.textContent = `${length}m`;
            };
        }
        
        // Longueur des brides
        const bridleSlider = document.getElementById('bridle-length') as HTMLInputElement;
        const bridleValue = document.getElementById('bridle-length-value');
        if (bridleSlider && bridleValue) {
            bridleSlider.value = '100';
            bridleValue.textContent = '100%';
            
            bridleSlider.oninput = () => {
                const percent = parseFloat(bridleSlider.value);
                const factor = percent / 100;
                
                // Utiliser la nouvelle méthode setBridleFactor
                this.physicsEngine.setBridleFactor(factor);
                
                // Mettre à jour aussi sur le kite si il supporte
                if ('adjustBridleLength' in this.kite) {
                    (this.kite as any).adjustBridleLength(factor);
                }
                
                bridleValue.textContent = `${percent}%`;
                
                // Log de l'effet
                let effect = '';
                if (percent < 100) {
                    effect = ' (angle faible, rapide)';
                } else if (percent > 100) {
                    effect = ' (angle fort, stable)';
                }
                console.log(`📏 Brides: ${percent}%${effect}`);
            };
        }
    }
    
    private reset(): void {
        // Réinitialiser la position du kite
        const initialDistance = SIMULATION_CONFIG.lines.defaultLength * 0.8;
        this.kite.position.set(0, 10, -initialDistance);
        this.kite.quaternion.identity();
        
        console.log('🔄 Simulation réinitialisée');
    }
    
    private togglePlayPause(): void {
        this.isRunning = !this.isRunning;
        const playBtn = document.getElementById('play-pause');
        if (playBtn) {
            playBtn.textContent = this.isRunning ? '⏸️ Pause' : '▶️ Lancer';
        }
    }
    
    private toggleDebugMode(): void {
        this.debugMode = !this.debugMode;
        const debugBtn = document.getElementById('debug-physics');
        if (debugBtn) {
            debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug';
        }
        
        // Nettoyer les flèches si on désactive
        if (!this.debugMode) {
            this.debugArrows.forEach(arrow => {
                this.renderingSystem.removeObject(arrow);
            });
            this.debugArrows = [];
        }
        
        // Toggle du panneau de debug
        document.body.classList.toggle('debug-mode', this.debugMode);
    }
    
    private animate = (): void => {
        requestAnimationFrame(this.animate);
        
        if (this.isRunning) {
            const deltaTime = this.clock.getDelta();
            
            // Obtenir l'entrée utilisateur
            const targetRotation = this.inputManager.getTargetBarRotation();
            this.physicsEngine.setControlBarRotation(targetRotation);
            
            // Mettre à jour la physique
            this.physicsEngine.update(deltaTime);
            
            // Mettre à jour les éléments visuels
            this.updateVisualElements();
            
            // Mettre à jour l'affichage des infos
            this.updateInfoDisplay();
        }
        
        // Rendu
        this.renderingSystem.render();
    }
    
    private updateInfoDisplay(): void {
        // Mettre à jour les informations dans le panneau de debug
        if (this.debugMode) {
            const kiteState = this.physicsEngine.getKiteController().getState();
            const lineStatus = this.physicsEngine.getLineSystem().getStatus();
            
            const altitudeDisplay = document.getElementById('altitude-display');
            if (altitudeDisplay) {
                altitudeDisplay.textContent = kiteState.position.y.toFixed(1);
            }
            
            const tensionDisplay = document.getElementById('tension-display');
            if (tensionDisplay) {
                const avgTension = ((lineStatus.left + lineStatus.right) / 2 - lineStatus.rest) * 
                                 SIMULATION_CONFIG.lines.stiffness;
                tensionDisplay.textContent = Math.max(0, avgTension).toFixed(1);
            }
            
            const forceDisplay = document.getElementById('force-display');
            if (forceDisplay) {
                const windState = this.physicsEngine.getWindSystem().getWindAt(kiteState.position);
                const windPressure = 0.5 * SIMULATION_CONFIG.physics.airDensity * 
                                   windState.velocity.lengthSq();
                forceDisplay.textContent = windPressure.toFixed(1);
            }
        }
    }
}

// ==============================================================================
// POINT D'ENTRÉE
// ==============================================================================

if (typeof window !== 'undefined') {
    // Démarrer la simulation au chargement de la page
    window.addEventListener('DOMContentLoaded', () => {
        new KiteSimulationV4();
    });
}