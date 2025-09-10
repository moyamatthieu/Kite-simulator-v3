/**
 * PhysicsEngine.ts - Moteur physique principal V8
 * Orchestration complète de la simulation physique
 *
 * LE CŒUR DE LA SIMULATION - Appelée 60 fois par seconde
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

import * as THREE from 'three';
import { Kite } from '@objects/Kite';
import { WindSimulator } from './WindSimulator';
import { LineSystem } from './lines';
import { AerodynamicsCalculator } from './AerodynamicsCalculator';
import { CONFIG, PhysicsConstants, WindParams, KiteState, HandlePositions } from '../core/constants';

// ==============================================================================
// KITE CONTROLLER V8 - Intégré directement
// ==============================================================================

interface KiteWarnings {
    accel: boolean;
    velocity: boolean;
    angular: boolean;
    accelValue: number;
    velocityValue: number;
}

class KiteController {
    private kite: Kite;
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
    private readonly FORCE_SMOOTHING = 0.25; // Lissage renforcé pour réduire oscillations

    constructor(kite: Kite) {
        this.kite = kite;
        this.state = {
            position: kite.position.clone(),
            velocity: new THREE.Vector3(),
            angularVelocity: new THREE.Vector3(),
            orientation: kite.quaternion.clone()
        };
        this.previousPosition = kite.position.clone();
        this.kite.userData.lineLength = CONFIG.lines.defaultLength;

        this.smoothedForce = new THREE.Vector3();
        this.smoothedTorque = new THREE.Vector3();
    }

    update(forces: THREE.Vector3, torque: THREE.Vector3, deltaTime: number): void {
        // Valider les entrées
        forces = this.validateForces(forces);
        torque = this.validateTorque(torque);

        // Appliquer le lissage temporel
        this.smoothedForce.lerp(forces, 1 - this.FORCE_SMOOTHING);
        this.smoothedTorque.lerp(torque, 1 - this.FORCE_SMOOTHING);

        // Intégration physique avec les forces lissées
        const newPosition = this.integratePhysics(this.smoothedForce, deltaTime);

        // Appliquer les contraintes
        this.handleGroundCollision(newPosition);
        this.validatePosition(newPosition);

        // Appliquer la position finale
        this.kite.position.copy(newPosition);
        this.previousPosition.copy(newPosition);

        // Mise à jour de l'orientation avec le couple lissé
        this.updateOrientation(this.smoothedTorque, deltaTime);
    }

    private validateForces(forces: THREE.Vector3): THREE.Vector3 {
        if (!forces || forces.length() > PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
            console.error(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return forces;
    }

    private validateTorque(torque: THREE.Vector3): THREE.Vector3 {
        if (!torque || isNaN(torque.length())) {
            console.error(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}`);
            return new THREE.Vector3();
        }
        return torque;
    }

    private integratePhysics(forces: THREE.Vector3, deltaTime: number): THREE.Vector3 {
        const acceleration = forces.divideScalar(CONFIG.kite.mass);
        this.lastAccelMagnitude = acceleration.length();

        if (acceleration.length() > PhysicsConstants.MAX_ACCELERATION) {
            this.hasExcessiveAccel = true;
            acceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ACCELERATION);
        } else {
            this.hasExcessiveAccel = false;
        }

        this.state.velocity.add(acceleration.multiplyScalar(deltaTime));
        this.state.velocity.multiplyScalar(CONFIG.physics.linearDamping);
        this.lastVelocityMagnitude = this.state.velocity.length();

        if (this.state.velocity.length() > PhysicsConstants.MAX_VELOCITY) {
            this.hasExcessiveVelocity = true;
            this.state.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
        } else {
            this.hasExcessiveVelocity = false;
        }

        return this.kite.position.clone().add(this.state.velocity.clone().multiplyScalar(deltaTime));
    }

    private handleGroundCollision(newPosition: THREE.Vector3): void {
        const groundY = CONFIG.kite.minHeight;

        // Utiliser les points de géométrie du kite pour une collision précise
        const kitePoints = [
            this.kite.getPoint('NEZ'),
            this.kite.getPoint('SPINE_BAS'),
            this.kite.getPoint('BORD_GAUCHE'),
            this.kite.getPoint('BORD_DROIT')
        ].filter(point => point !== undefined) as THREE.Vector3[];

        if (kitePoints.length > 0) {
            let minY = Infinity;
            const q = this.kite.quaternion;

            kitePoints.forEach(localPoint => {
                const world = localPoint.clone().applyQuaternion(q).add(newPosition);
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
            if (newPosition.y < groundY) {
                newPosition.y = groundY;
                if (this.state.velocity.y < 0) this.state.velocity.y = 0;
                this.state.velocity.x *= PhysicsConstants.GROUND_FRICTION;
                this.state.velocity.z *= PhysicsConstants.GROUND_FRICTION;
            }
        }
    }

    private validatePosition(newPosition: THREE.Vector3): void {
        if (isNaN(newPosition.x) || isNaN(newPosition.y) || isNaN(newPosition.z)) {
            console.error(`⚠️ Position NaN détectée! Reset à la position précédente`);
            newPosition.copy(this.previousPosition);
            this.state.velocity.set(0, 0, 0);
        }
    }

    private updateOrientation(torque: THREE.Vector3, deltaTime: number): void {
        const dampTorque = this.state.angularVelocity.clone()
            .multiplyScalar(-CONFIG.physics.angularDragCoeff);
        const effectiveTorque = torque.clone().add(dampTorque);

        const angularAcceleration = effectiveTorque.divideScalar(CONFIG.kite.inertia);

        if (angularAcceleration.length() > PhysicsConstants.MAX_ANGULAR_ACCELERATION) {
            angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_ACCELERATION);
        }

        this.state.angularVelocity.add(angularAcceleration.multiplyScalar(deltaTime));
        this.state.angularVelocity.multiplyScalar(CONFIG.physics.angularDamping);

        if (this.state.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
            this.hasExcessiveAngular = true;
            this.state.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
        } else {
            this.hasExcessiveAngular = false;
        }

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

    getKite(): Kite {
        return this.kite;
    }

    setLineLength(length: number): void {
        this.kite.userData.lineLength = length;
    }

    getWarnings(): KiteWarnings {
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
// CONTROL BAR MANAGER V8 - Intégré directement
// ==============================================================================

class ControlBarManager {
    private position: THREE.Vector3;
    private rotation: number = 0;

    constructor(position: THREE.Vector3 = CONFIG.controlBar.position) {
        this.position = position.clone();
    }

    private computeRotationQuaternion(toKiteVector: THREE.Vector3): THREE.Quaternion {
        const barDirection = new THREE.Vector3(1, 0, 0);
        const rotationAxis = new THREE.Vector3().crossVectors(barDirection, toKiteVector).normalize();

        if (rotationAxis.length() < PhysicsConstants.CONTROL_DEADZONE) {
            rotationAxis.set(0, 1, 0);
        }

        return new THREE.Quaternion().setFromAxisAngle(rotationAxis, this.rotation);
    }

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

    setRotation(rotation: number): void {
        this.rotation = rotation;
    }

    getRotation(): number {
        return this.rotation;
    }

    getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    updateVisual(bar: THREE.Group, kite: Kite): void {
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
// PHYSICS ENGINE V8 - Moteur principal
// ==============================================================================

export class PhysicsEngine {
    private windSimulator: WindSimulator;
    private lineSystem: LineSystem;
    private kiteController: KiteController;
    private controlBarManager: ControlBarManager;

    constructor(kite: Kite, controlBarPosition: THREE.Vector3) {
        this.windSimulator = new WindSimulator();
        this.lineSystem = new LineSystem();
        this.kiteController = new KiteController(kite);
        this.controlBarManager = new ControlBarManager(controlBarPosition);
    }

    /**
     * LE CŒUR DE LA SIMULATION - Appelée 60 fois par seconde
     */
    update(deltaTime: number, targetBarRotation: number, isPaused: boolean = false): void {
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
        const kiteState = this.kiteController.getState();
        const apparentWind = this.windSimulator.getApparentWind(kiteState.velocity, deltaTime);

        // PHYSIQUE ÉMERGENTE 1 : Forces aéro calculées par surface
        // Le couple émerge de la différence gauche/droite naturelle
        const { lift, drag, torque: aeroTorque } = AerodynamicsCalculator.calculateForces(
            apparentWind,
            kite.quaternion
        );

        // Force constante vers le bas (F = mg)
        const gravity = new THREE.Vector3(0, -CONFIG.kite.mass * CONFIG.physics.gravity, 0);

        // PHYSIQUE ÉMERGENTE 2 : Tensions de lignes comme vraies cordes
        // - Force UNIQUEMENT si ligne tendue (distance > longueur)
        // - Couple émerge de l'asymétrie gauche/droite des tensions
        const pilotPosition = this.controlBarManager.getPosition();
        const { leftForce, rightForce, torque: lineTorque } = this.lineSystem.calculateLineTensions(
            kite,
            newRotation,
            pilotPosition
        );

        // Somme vectorielle de toutes les forces (2ème loi de Newton)
        const totalForce = new THREE.Vector3()
            .add(lift)          // Forces aérodynamiques totales (lift + drag combinés)
            .add(drag)          // (Vide - traînée intégrée dans lift)
            .add(gravity)       // Poids vers le bas
            .add(leftForce)     // Tension ligne gauche vers pilote
            .add(rightForce);   // Tension ligne droite vers pilote

        // Couple total = somme des moments (rotation du corps rigide)
        // Le couple émerge NATURELLEMENT sans facteur artificiel!
        const totalTorque = aeroTorque.clone().add(lineTorque);

        // Intégration physique : F=ma et T=Iα pour calculer nouvelle position/orientation
        this.kiteController.update(totalForce, totalTorque, deltaTime);
    }

    setBridleFactor(_factor: number): void {
        // Fonctionnalité désactivée dans V8 - physique émergente pure
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
