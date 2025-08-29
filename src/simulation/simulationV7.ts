/**
 * SimulationV7.ts - Version refactorisée avec code propre et maintenable
 * 
 * Améliorations par rapport à V6 :
 * - Élimination complète des doublons de code
 * - Classes utilitaires pour constantes et géométrie
 * - Séparation claire des responsabilités
 * - Méthodes décomposées et lisibles
 * - Configuration épurée sans paramètres inutiles
 * 
 * Architecture modulaire avec séparation des responsabilités :
 * - PhysicsEngine : Orchestration de la simulation
 * - KiteController : Gestion du cerf-volant  
 * - WindSimulator : Simulation du vent
 * - LineSystem : Système de lignes et contraintes
 * - ControlBarManager : Gestion centralisée de la barre
 * - RenderManager : Gestion du rendu 3D
 * - InputHandler : Gestion des entrées utilisateur
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Kite2 } from '@objects/organic/Kite2';

// ==============================================================================
// CONSTANTES PHYSIQUES GLOBALES
// ==============================================================================

/**
 * Constantes physiques utilisées dans toute la simulation
 */
class PhysicsConstants {
    static readonly EPSILON = 1e-4;                    // Tolérance générale pour comparaisons
    static readonly CONTROL_DEADZONE = 0.01;           // Zone morte pour les contrôles
    static readonly LINE_CONSTRAINT_TOLERANCE = 0.005; // Tolérance pour contrainte de ligne
    static readonly LINE_TENSION_FACTOR = 0.99;        // Facteur pour éviter extension ligne
    static readonly GROUND_FRICTION = 0.85;            // Friction au contact du sol
    static readonly CATENARY_SEGMENTS = 5;             // Segments pour affichage ligne courbée

    // Limites de sécurité
    static readonly MAX_FORCE = 1000;                  // N - Force maximale
    static readonly MAX_VELOCITY = 30;                 // m/s - Vitesse maximale
    static readonly MAX_ANGULAR_VELOCITY = 5;          // rad/s - Vitesse angulaire max
    static readonly MAX_ACCELERATION = 50;             // m/s² - Accélération max
    static readonly MAX_ANGULAR_ACCELERATION = 20;     // rad/s² - Accélération angulaire max
}

// ==============================================================================
// GÉOMÉTRIE DU CERF-VOLANT
// ==============================================================================

/**
 * Gestion centralisée de la géométrie du cerf-volant
 */
class KiteGeometry {
    // Points anatomiques du cerf-volant (coordonnées locales)
    static readonly POINTS = {
        NEZ: new THREE.Vector3(0, 0.65, 0),
        SPINE_BAS: new THREE.Vector3(0, 0, 0),
        BORD_GAUCHE: new THREE.Vector3(-0.825, 0, 0),
        BORD_DROIT: new THREE.Vector3(0.825, 0, 0),
        WHISKER_GAUCHE: new THREE.Vector3(-0.4125, 0.1, -0.15),
        WHISKER_DROIT: new THREE.Vector3(0.4125, 0.1, -0.15),
        CTRL_GAUCHE: new THREE.Vector3(-0.15, 0.3, 0.4),
        CTRL_DROIT: new THREE.Vector3(0.15, 0.3, 0.4)
    };

    // Définition des 4 surfaces triangulaires
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
 * Configuration globale de la simulation (uniquement les paramètres utilisés)
 */
const CONFIG = {
    physics: {
        gravity: 9.81,              // m/s²
        airDensity: 1.225,          // kg/m³ au niveau de la mer
        deltaTimeMax: 0.016,        // 60 FPS max
        angularDamping: 0.95,       // Amortissement angulaire
        linearDamping: 0.98,        // Amortissement linéaire
        angularDragCoeff: 0.02      // Coefficient de frottement angulaire
    },
    aero: {
        liftScale: 1.35,            // Facteur d'échelle pour la portance
        dragScale: 1.0              // Facteur d'échelle pour la traînée
    },
    kite: {
        mass: 0.28,                 // kg - Masse du cerf-volant
        area: KiteGeometry.TOTAL_AREA, // m² - Surface totale
        inertia: 0.15,              // kg·m² - Moment d'inertie (augmenté pour stabilité)
        minHeight: 0.0              // m - Altitude minimale (sol)
    },
    lines: {
        defaultLength: 15,          // m - Longueur par défaut
        controlFactor: 50,          // Facteur de couple de contrôle (fortement réduit)
        maxSag: 0.01,               // Affaissement max pour visuel
        catenarySagFactor: 4        // Facteur de forme caténaire
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
        shadowMapSize: 2048,
        antialias: true,
        fogStart: 100,
        fogEnd: 1000
    },
    controlBar: {
        width: 1.5,                 // m - Largeur de la barre
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
    private visualBar: THREE.Group | null = null;

    constructor(position: THREE.Vector3 = CONFIG.controlBar.position) {
        this.position = position.clone();
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
        this.rotation = rotation;
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

    setVisualBar(bar: THREE.Group): void {
        this.visualBar = bar;
    }
}

// ==============================================================================
// WIND SIMULATOR - Gestion du vent et turbulences
// ==============================================================================

class WindSimulator {
    private params: WindParams;
    private time: number = 0;

    constructor() {
        this.params = {
            speed: CONFIG.wind.defaultSpeed,
            direction: CONFIG.wind.defaultDirection,
            turbulence: CONFIG.wind.defaultTurbulence
        };
    }

    /**
     * Calcule le vecteur de vent apparent
     */
    getApparentWind(kiteVelocity: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        this.time += deltaTime;

        const windSpeedMs = this.params.speed / 3.6;
        const windRad = (this.params.direction * Math.PI) / 180;

        const windVector = new THREE.Vector3(
            Math.sin(windRad) * windSpeedMs,
            0,
            -Math.cos(windRad) * windSpeedMs
        );

        // Ajouter la turbulence cohérente
        if (this.params.turbulence > 0) {
            const turbIntensity = this.params.turbulence / 100 * CONFIG.wind.turbulenceScale;
            const freq = CONFIG.wind.turbulenceFreqBase;

            windVector.x += Math.sin(this.time * freq) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
            windVector.y += Math.sin(this.time * freq * CONFIG.wind.turbulenceFreqY) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityY;
            windVector.z += Math.cos(this.time * freq * CONFIG.wind.turbulenceFreqZ) * windSpeedMs * turbIntensity * CONFIG.wind.turbulenceIntensityXZ;
        }

        // Vent apparent = vent réel - vitesse du cerf-volant
        const apparent = windVector.clone().sub(kiteVelocity);
        if (apparent.length() > CONFIG.wind.maxApparentSpeed) {
            apparent.setLength(CONFIG.wind.maxApparentSpeed);
        }
        return apparent;
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
}

// ==============================================================================
// AERODYNAMICS CALCULATOR - Calcul des forces aérodynamiques
// ==============================================================================

class AerodynamicsCalculator {
    /**
     * Calcule les forces aérodynamiques sur le cerf-volant
     */
    static calculateForces(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): { lift: THREE.Vector3; drag: THREE.Vector3; torque: THREE.Vector3 } {
        const windSpeed = apparentWind.length();
        if (windSpeed < 0.1) {
            return {
                lift: new THREE.Vector3(),
                drag: new THREE.Vector3(),
                torque: new THREE.Vector3()
            };
        }

        const windDir = apparentWind.clone().normalize();
        const dynamicPressure = 0.5 * CONFIG.physics.airDensity * windSpeed * windSpeed;

        let totalForce = new THREE.Vector3();
        let totalTorque = new THREE.Vector3();

        // Calculer les forces sur chaque surface
        KiteGeometry.SURFACES.forEach((surface) => {
            // Calculer la normale locale
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleLocale = new THREE.Vector3().crossVectors(edge1, edge2).normalize();

            // Transformer en coordonnées monde
            const normaleMonde = normaleLocale.clone().applyQuaternion(kiteOrientation);

            // Calculer l'incidence
            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            if (cosIncidence <= PhysicsConstants.EPSILON) {
                return;
            }

            // Direction de la force
            const normalDir = facing >= 0 ? normaleMonde.clone() : normaleMonde.clone().negate();

            // Force de pression
            const forceMagnitude = dynamicPressure * surface.area * cosIncidence;
            const force = normalDir.multiplyScalar(forceMagnitude);

            totalForce.add(force);

            // Calculer le couple (centre du triangle)
            const centre = surface.vertices[0].clone()
                .add(surface.vertices[1])
                .add(surface.vertices[2])
                .divideScalar(3);

            const centreWorld = centre.clone().applyQuaternion(kiteOrientation);
            const torque = new THREE.Vector3().crossVectors(centreWorld, force);
            totalTorque.add(torque);
        });

        // Décomposition en portance et traînée
        const dragMagnitude = totalForce.dot(windDir);
        const baseDrag = windDir.clone().multiplyScalar(Math.max(0, dragMagnitude));
        const baseLift = totalForce.clone().sub(baseDrag);

        const lift = baseLift.multiplyScalar(CONFIG.aero.liftScale);
        const drag = baseDrag.multiplyScalar(CONFIG.aero.dragScale);

        // Mise à l'échelle du couple
        const baseTotalMag = Math.max(PhysicsConstants.EPSILON, totalForce.length());
        const scaledTotalMag = lift.clone().add(drag).length();
        const torqueScale = Math.max(0.1, Math.min(3, scaledTotalMag / baseTotalMag));

        return {
            lift,
            drag,
            torque: totalTorque.multiplyScalar(torqueScale)
        };
    }

    /**
     * Calcule des métriques pour le debug
     */
    static computeMetrics(
        apparentWind: THREE.Vector3,
        kiteOrientation: THREE.Quaternion
    ): { apparentSpeed: number; liftMag: number; dragMag: number; lOverD: number; aoaDeg: number } {
        const windSpeed = apparentWind.length();
        if (windSpeed < PhysicsConstants.EPSILON) {
            return { apparentSpeed: 0, liftMag: 0, dragMag: 0, lOverD: 0, aoaDeg: 0 };
        }

        const { lift, drag } = this.calculateForces(apparentWind, kiteOrientation);
        const liftMag = lift.length();
        const dragMag = drag.length();
        const lOverD = dragMag > PhysicsConstants.EPSILON ? (liftMag / dragMag) : 0;

        // Calcul approximatif de l'angle d'attaque
        const windDir = apparentWind.clone().normalize();
        let weightedNormal = new THREE.Vector3();

        KiteGeometry.SURFACES.forEach((surface) => {
            const edge1 = surface.vertices[1].clone().sub(surface.vertices[0]);
            const edge2 = surface.vertices[2].clone().sub(surface.vertices[0]);
            const normaleMonde = new THREE.Vector3()
                .crossVectors(edge1, edge2)
                .normalize()
                .applyQuaternion(kiteOrientation);

            const facing = windDir.dot(normaleMonde);
            const cosIncidence = Math.max(0, Math.abs(facing));

            const normalDir = facing >= 0 ? normaleMonde : normaleMonde.clone().negate();
            weightedNormal.add(normalDir.multiplyScalar(surface.area * cosIncidence));
        });

        let aoaDeg = 0;
        if (weightedNormal.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
            const eff = weightedNormal.normalize();
            const dot = Math.max(-1, Math.min(1, eff.dot(windDir)));
            const phiDeg = Math.acos(dot) * 180 / Math.PI;
            aoaDeg = Math.max(0, 90 - phiDeg);
        }

        return { apparentSpeed: windSpeed, liftMag, dragMag, lOverD, aoaDeg };
    }
}

// ==============================================================================
// LINE SYSTEM - Gestion des lignes et contraintes
// ==============================================================================

class LineSystem {
    public lineLength: number;

    constructor(lineLength: number = CONFIG.lines.defaultLength) {
        this.lineLength = lineLength;
    }

    /**
     * Calcule le couple de contrôle généré par la rotation de la barre
     */
    calculateControlTorque(kite: Kite2, controlRotation: number): THREE.Vector3 {
        if (Math.abs(controlRotation) < PhysicsConstants.CONTROL_DEADZONE) {
            return new THREE.Vector3();
        }

        // Le couple agit autour de l'axe vertical du cerf-volant
        const kiteUp = new THREE.Vector3(0, 1, 0).applyQuaternion(kite.quaternion);
        const torqueStrength = controlRotation * CONFIG.lines.controlFactor;
        
        // Limiter le couple de contrôle pour éviter les accélérations excessives
        const maxControlTorque = 3.0; // N·m max
        const torque = kiteUp.multiplyScalar(torqueStrength);
        if (torque.length() > maxControlTorque) {
            torque.normalize().multiplyScalar(maxControlTorque);
        }
        
        return torque;
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

    setLineLength(length: number): void {
        this.lineLength = length;
    }
}

// ==============================================================================
// KITE CONTROLLER - Gestion du cerf-volant et de son orientation
// ==============================================================================

class KiteController {
    private kite: Kite2;
    private state: KiteState;
    private previousPosition: THREE.Vector3;
    private angularWarnCooldown: number;

    constructor(kite: Kite2) {
        this.kite = kite;
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone()
        };
        this.previousPosition = kite.position.clone();
        this.angularWarnCooldown = 0;
        this.kite.userData.lineLength = CONFIG.lines.defaultLength;
    }

    /**
     * Met à jour la physique du cerf-volant
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

        // Intégration physique
        const newPosition = this.integratePhysics(forces, deltaTime);

        // Appliquer les contraintes
        this.enforceLineConstraints(newPosition, handles);
        this.handleGroundCollision(newPosition);
        this.validatePosition(newPosition);

        // Appliquer la position finale
        this.kite.position.copy(newPosition);
        this.previousPosition.copy(newPosition);

        // Mise à jour de l'orientation
        this.updateOrientation(torque, deltaTime);
    }

    /**
     * Valide et limite les forces
     */
    private validateForces(forces: THREE.Vector3): THREE.Vector3 {
        if (!forces || forces.length() > PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
            console.error(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
            return new THREE.Vector3();
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
     * Intègre les forces pour calculer la nouvelle position
     */
    private integratePhysics(forces: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        // Accélération = F / m
        const acceleration = forces.divideScalar(CONFIG.kite.mass);

        // Limiter l'accélération
        if (acceleration.length() > PhysicsConstants.MAX_ACCELERATION) {
            console.warn(`⚠️ Accélération excessive: ${acceleration.length()}m/s²`);
            acceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ACCELERATION);
        }

        // Intégration de la vitesse
        this.state.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.state.velocity.multiplyScalar(CONFIG.physics.linearDamping);

        // Limiter la vitesse
        if (this.state.velocity.length() > PhysicsConstants.MAX_VELOCITY) {
            console.warn(`⚠️ Vitesse excessive: ${this.state.velocity.length()}m/s`);
            this.state.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
        }

        // Nouvelle position
        return this.kite.position.clone()
            .add(this.state.velocity.clone().multiplyScalar(deltaTime));
    }

    /**
     * Applique les contraintes des lignes
     */
    private enforceLineConstraints(predictedPosition: THREE.Vector3, handles: HandlePositions): void {
        const lineLength = this.kite.userData.lineLength || CONFIG.lines.defaultLength;
        const tol = PhysicsConstants.LINE_CONSTRAINT_TOLERANCE;

        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');
        if (!ctrlLeft || !ctrlRight) return;

        const mass = CONFIG.kite.mass;
        const inertia = CONFIG.kite.inertia;

        // Résolution PBD pour chaque ligne
        const solveLine = (ctrlLocal: THREE.Vector3, handle: THREE.Vector3) => {
            const q = this.kite.quaternion;
            const cpWorld = ctrlLocal.clone().applyQuaternion(q).add(predictedPosition);
            const diff = cpWorld.clone().sub(handle);
            const dist = diff.length();

            if (dist <= lineLength - tol) return; // Ligne molle

            const n = diff.clone().normalize();
            const C = dist - lineLength;

            const r = cpWorld.clone().sub(predictedPosition);
            const alpha = new THREE.Vector3().crossVectors(r, n);
            const invMass = 1 / mass;
            const invInertia = 1 / Math.max(inertia, PhysicsConstants.EPSILON);
            const denom = invMass + alpha.lengthSq() * invInertia;
            const lambda = C / Math.max(denom, PhysicsConstants.EPSILON);

            // Corrections
            const dPos = n.clone().multiplyScalar(-invMass * lambda);
            predictedPosition.add(dPos);

            const dTheta = alpha.clone().multiplyScalar(-invInertia * lambda);
            const angle = dTheta.length();
            if (angle > PhysicsConstants.EPSILON) {
                const axis = dTheta.normalize();
                const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
                this.kite.quaternion.premultiply(dq).normalize();
            }

            // Correction de vitesse
            const q2 = this.kite.quaternion;
            const cpWorld2 = ctrlLocal.clone().applyQuaternion(q2).add(predictedPosition);
            const n2 = cpWorld2.clone().sub(handle).normalize();
            const r2 = cpWorld2.clone().sub(predictedPosition);
            const pointVel = this.state.velocity.clone()
                .add(new THREE.Vector3().crossVectors(this.state.angularVelocity, r2));
            const radialSpeed = pointVel.dot(n2);

            if (radialSpeed > 0) {
                const rxn = new THREE.Vector3().crossVectors(r2, n2);
                const eff = invMass + (rxn.lengthSq() * invInertia);
                const J = -radialSpeed / Math.max(eff, PhysicsConstants.EPSILON);

                this.state.velocity.add(n2.clone().multiplyScalar(J * invMass));
                const angImpulse = new THREE.Vector3().crossVectors(r2, n2.clone().multiplyScalar(J));
                this.state.angularVelocity.add(angImpulse.multiplyScalar(invInertia));
            }
        };

        // Deux passes pour mieux satisfaire les contraintes
        for (let i = 0; i < 2; i++) {
            solveLine(ctrlLeft, handles.left);
            solveLine(ctrlRight, handles.right);
        }
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
     * Met à jour l'orientation du cerf-volant
     */
    private updateOrientation(torque: THREE.Vector3, deltaTime: number): void {
        this.angularWarnCooldown = Math.max(0, this.angularWarnCooldown - deltaTime);

        // Amortissement aérodynamique
        const dampTorque = this.state.angularVelocity.clone()
            .multiplyScalar(-CONFIG.physics.angularDragCoeff);
        const effectiveTorque = torque.clone().add(dampTorque);

        // Accélération angulaire
        const angularAcceleration = effectiveTorque.divideScalar(CONFIG.kite.inertia);

        // Limiter l'accélération angulaire
        if (angularAcceleration.length() > PhysicsConstants.MAX_ANGULAR_ACCELERATION) {
            if (this.angularWarnCooldown <= 0) {
                console.warn(`⚠️ Accélération angulaire excessive: ${angularAcceleration.length()}rad/s²`);
                this.angularWarnCooldown = 0.5;
            }
            angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_ACCELERATION);
        }

        // Mise à jour de la vitesse angulaire
        this.state.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.state.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);

        // Limiter la vitesse angulaire
        if (this.state.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
            console.warn(`⚠️ Vitesse angulaire excessive: ${this.state.angularVelocity.length()}rad/s`);
            this.state.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
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
}

// ==============================================================================
// INPUT HANDLER - Gestion des entrées utilisateur
// ==============================================================================

class InputHandler {
    private currentRotation: number = 0;
    private keysPressed = new Set<string>();
    private rotationSpeed: number = 2.5;
    private returnSpeed: number = 3.0;
    private maxRotation: number = Math.PI / 6;

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
// RENDER MANAGER - Gestion du rendu 3D
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
    private bridleFactor: number = 1.0;

    constructor(kite: Kite2, controlBarPosition: THREE.Vector3) {
        this.windSimulator = new WindSimulator();
        this.lineSystem = new LineSystem();
        this.kiteController = new KiteController(kite);
        this.controlBarManager = new ControlBarManager(controlBarPosition);
    }

    /**
     * Met à jour la simulation physique
     */
    update(deltaTime: number, targetBarRotation: number): void {
        deltaTime = Math.min(deltaTime, CONFIG.physics.deltaTimeMax);

        // Interpoler la rotation de la barre
        const currentRotation = this.controlBarManager.getRotation();
        const newRotation = currentRotation + (targetBarRotation - currentRotation);
        this.controlBarManager.setRotation(newRotation);

        // Obtenir les positions des poignées
        const kite = this.kiteController.getKite();
        const handles = this.controlBarManager.getHandlePositions(kite.position);

        // Calculer le vent apparent
        const kiteState = this.kiteController.getState();
        const apparentWind = this.windSimulator.getApparentWind(kiteState.velocity, deltaTime);

        // Calculer les forces aérodynamiques
        const { lift, drag, torque: aeroTorque } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            kite.quaternion
        );

        // Force de gravité
        const gravity = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        // Couple de contrôle
        const controlTorque = this.lineSystem.calculateControlTorque(kite, newRotation);

        // Forces et couples totaux
        const totalForce = new THREE.Vector3().add(lift).add(drag).add(gravity);
        const totalTorque = aeroTorque.clone().add(controlTorque);

        // Mettre à jour le cerf-volant
        this.kiteController.update(totalForce, totalTorque, handles, deltaTime);
    }

    setBridleFactor(factor: number): void {
        this.bridleFactor = Math.max(0.5, Math.min(1.5, factor));
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
}

// ==============================================================================
// SIMULATION APP - Application principale
// ==============================================================================

export class SimulationAppV7 {
    private renderManager: RenderManager;
    private physicsEngine!: PhysicsEngine;
    private inputHandler: InputHandler;
    private kite!: Kite2;
    private controlBar!: THREE.Group;
    private clock: THREE.Clock;
    private isPlaying: boolean = true;
    private leftLine: THREE.Line | null = null;
    private rightLine: THREE.Line | null = null;
    private debugMode: boolean = false; // Désactivé par défaut en V7
    private debugArrows: THREE.ArrowHelper[] = [];
    private frameCount: number = 0;

    constructor() {
        console.log('🚀 Démarrage de la Simulation V7 - Version refactorisée');

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
            this.setupUIControls();
            this.createControlLines();
            this.animate();
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation de SimulationV7:', error);
            throw error;
        }
    }

    private setupKite(): void {
        this.kite = new Kite2();
        const pilot = this.controlBar.position.clone();
        const initialDistance = CONFIG.lines.defaultLength * 0.95;

        const kiteY = 7;
        const dy = kiteY - pilot.y;
        const horizontal = Math.max(0.1, Math.sqrt(Math.max(0, initialDistance * initialDistance - dy * dy)));

        this.kite.position.set(pilot.x, kiteY, pilot.z - horizontal);
        this.kite.rotation.set(0, 0, 0);
        this.kite.quaternion.identity();

        console.log(`📍 Position initiale du kite: ${this.kite.position.toArray()}`);
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

        // Enregistrer la barre dans le manager
        this.physicsEngine?.getControlBarManager().setVisualBar(this.controlBar);
    }

    private createControlLines(): void {
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            linewidth: 2
        });

        const leftGeometry = new THREE.BufferGeometry();
        const rightGeometry = new THREE.BufferGeometry();

        this.leftLine = new THREE.Line(leftGeometry, lineMaterial);
        this.rightLine = new THREE.Line(rightGeometry, lineMaterial);

        this.renderManager.addObject(this.leftLine);
        this.renderManager.addObject(this.rightLine);
    }

    private updateControlLines(): void {
        if (!this.leftLine || !this.rightLine) return;

        const ctrlLeft = this.kite.getPoint('CTRL_GAUCHE');
        const ctrlRight = this.kite.getPoint('CTRL_DROIT');

        if (!ctrlLeft || !ctrlRight) return;

        const kiteLeftWorld = ctrlLeft.clone();
        const kiteRightWorld = ctrlRight.clone();
        this.kite.localToWorld(kiteLeftWorld);
        this.kite.localToWorld(kiteRightWorld);

        // Utiliser le ControlBarManager pour obtenir les positions
        const handles = this.physicsEngine.getControlBarManager().getHandlePositions(this.kite.position);

        const leftPoints = this.physicsEngine.getLineSystem()
            .calculateCatenary(handles.left, kiteLeftWorld);
        const rightPoints = this.physicsEngine.getLineSystem()
            .calculateCatenary(handles.right, kiteRightWorld);

        this.leftLine.geometry.setFromPoints(leftPoints);
        this.rightLine.geometry.setFromPoints(rightPoints);

        // Mettre à jour la barre visuelle
        this.physicsEngine.getControlBarManager().updateVisual(this.controlBar, this.kite);
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
            debugBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleDebugMode();
            });
        }

        this.setupWindControls();
    }

    private setupWindControls(): void {
        // Configuration des contrôles de vent (identique à V6)
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
            debugBtn.textContent = this.debugMode ? '🔍 Debug ON' : '🔍 Debug';
            debugBtn.classList.toggle('active', this.debugMode);
        }

        document.body.classList.toggle('debug-mode', this.debugMode);

        if (!this.debugMode) {
            this.clearDebugArrows();
        }
    }

    private clearDebugArrows(): void {
        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];
    }

    private updateDebugArrows(): void {
        if (!this.debugMode) return;

        this.clearDebugArrows();

        const kiteState = this.physicsEngine.getKiteController().getState();
        const kitePosition = this.kite.position.clone();

        if (kiteState.velocity.length() > 0.1) {
            const velocityArrow = new THREE.ArrowHelper(
                kiteState.velocity.clone().normalize(),
                kitePosition,
                kiteState.velocity.length() * 0.5,
                0x00ff00,
                undefined,
                0.3
            );
            this.renderManager.addObject(velocityArrow);
            this.debugArrows.push(velocityArrow);
        }

        const windSim = this.physicsEngine.getWindSimulator();
        const wind = windSim.getWindAt(kitePosition);
        const relativeWind = wind.clone().sub(kiteState.velocity);

        if (relativeWind.length() > 0.1) {
            const { lift, drag } = AerodynamicsCalculator.calculateForces(
                relativeWind,
                this.kite.quaternion
            );

            if (lift.length() > 0.01) {
                const liftArrow = new THREE.ArrowHelper(
                    lift.clone().normalize(),
                    kitePosition,
                    Math.sqrt(lift.length()) * 0.3,
                    0x0088ff,
                    undefined,
                    0.3
                );
                this.renderManager.addObject(liftArrow);
                this.debugArrows.push(liftArrow);
            }

            if (drag.length() > 0.01) {
                const dragArrow = new THREE.ArrowHelper(
                    drag.clone().normalize(),
                    kitePosition,
                    Math.sqrt(drag.length()) * 0.3,
                    0xff0000,
                    undefined,
                    0.3
                );
                this.renderManager.addObject(dragArrow);
                this.debugArrows.push(dragArrow);
            }
        }

        this.updateDebugDisplay(kiteState, kitePosition);
    }

    private updateDebugDisplay(kiteState: KiteState, kitePosition: THREE.Vector3): void {
        const forceDisplay = document.getElementById('force-display');
        const tensionDisplay = document.getElementById('tension-display');
        const altitudeDisplay = document.getElementById('altitude-display');

        const windSim = this.physicsEngine.getWindSimulator();
        const wind = windSim.getWindAt(kitePosition);
        const relativeWind = wind.clone().sub(kiteState.velocity);

        const { lift, drag } = AerodynamicsCalculator.calculateForces(
            relativeWind,
            this.kite.quaternion
        );

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

                tensionDisplay.textContent = `L:${tautL ? 'T' : 'S'}(${distL.toFixed(2)}) R:${tautR ? 'T' : 'S'}(${distR.toFixed(2)})`;
            }
        }

        if (altitudeDisplay) {
            altitudeDisplay.textContent = kitePosition.y.toFixed(1);
        }
    }

    private animate = (): void => {
        requestAnimationFrame(this.animate);

        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            const kitePos = this.kite.position.clone();
            const pilotPos = this.controlBar.position.clone();
            const distance = kitePos.distanceTo(pilotPos);
            const state = this.physicsEngine.getKiteController().getState();

            const currentLineLength = this.physicsEngine.getLineSystem().lineLength;
            const windSim = this.physicsEngine.getWindSimulator();
            const wind = windSim.getWindAt(kitePos);
            const apparent = wind.clone().sub(state.velocity);

            const metrics = AerodynamicsCalculator.computeMetrics(apparent, this.kite.quaternion);
            const isTaut = distance >= currentLineLength * PhysicsConstants.LINE_TENSION_FACTOR;

            console.log(
                `📊 [Frame ${this.frameCount}] ` +
                `Dist: ${distance.toFixed(2)}/${currentLineLength}m ` +
                `| Pos: [${kitePos.x.toFixed(1)}, ${kitePos.y.toFixed(1)}, ${kitePos.z.toFixed(1)}] ` +
                `| Vel: ${state.velocity.length().toFixed(2)}m/s ` +
                `| Line: ${isTaut ? 'T' : 'S'}`
            );
        }

        if (this.isPlaying) {
            try {
                const deltaTime = this.clock.getDelta();
                this.inputHandler.update(deltaTime);
                const targetRotation = this.inputHandler.getTargetBarRotation();

                this.physicsEngine.update(deltaTime, targetRotation);
                this.updateControlLines();
                this.updateDebugArrows();
            } catch (error) {
                console.error('❌ Erreur dans la boucle d\'animation:', error);
                this.isPlaying = false;
            }
        }

        this.renderManager.render();
    }

    public cleanup(): void {
        console.log('🧹 Nettoyage de SimulationV7...');
        this.isPlaying = false;

        this.debugArrows.forEach(arrow => {
            this.renderManager.removeObject(arrow);
        });
        this.debugArrows = [];

        if (this.leftLine) {
            this.renderManager.removeObject(this.leftLine);
            this.leftLine = null;
        }
        if (this.rightLine) {
            this.renderManager.removeObject(this.rightLine);
            this.rightLine = null;
        }

        if (this.kite) {
            this.renderManager.removeObject(this.kite);
        }

        if (this.controlBar) {
            this.renderManager.removeObject(this.controlBar);
        }

        console.log('✅ SimulationV7 nettoyée');
    }
}