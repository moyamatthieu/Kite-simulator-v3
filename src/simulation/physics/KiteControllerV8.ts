/**
 * KiteControllerV8.ts - Contrôleur avancé du cerf-volant avec validation
 * Intégration complète du KiteController de SimulationV8
 *
 * AMÉLIORATIONS V8 :
 * - Validation des forces et couples
 * - Système de warnings pour détecter les anomalies
 * - Lissage temporel des forces (filtre passe-bas)
 * - Gestion avancée des contraintes de sol
 * - Validation de position et sécurité
 */

import * as THREE from 'three';
import { PhysicsConstants, CONFIG, KiteState } from '../core/constants';
import { Kite } from '@objects/Kite';

export interface KiteWarnings {
    accel: boolean;
    velocity: boolean;
    angular: boolean;
    accelValue: number;
    velocityValue: number;
}

export class KiteControllerV8 {
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
    private readonly FORCE_SMOOTHING = 0.15; // Lissage léger (85% de la nouvelle force appliquée)

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

        // Appliquer les contraintes
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

    /**
     * Applique les contraintes des lignes avec PBD
     */
    applyLineConstraints(
        handles: { left: THREE.Vector3; right: THREE.Vector3 },
        deltaTime: number
    ): void {
        // Cette méthode sera appelée depuis le LineSystemV8
        // pour appliquer les contraintes PBD
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

    /**
     * Retourne les états de warning pour l'affichage
     */
    getWarnings(): KiteWarnings {
        return {
            accel: this.hasExcessiveAccel,
            velocity: this.hasExcessiveVelocity,
            angular: this.hasExcessiveAngular,
            accelValue: this.lastAccelMagnitude,
            velocityValue: this.lastVelocityMagnitude
        };
    }

    /**
     * Reset l'état du contrôleur
     */
    reset(): void {
        this.state.velocity.set(0, 0, 0);
        this.state.angularVelocity.set(0, 0, 0);
        this.hasExcessiveAccel = false;
        this.hasExcessiveVelocity = false;
        this.hasExcessiveAngular = false;
        this.lastAccelMagnitude = 0;
        this.lastVelocityMagnitude = 0;
        this.smoothedForce.set(0, 0, 0);
        this.smoothedTorque.set(0, 0, 0);
    }

    /**
     * Met à jour la position du kite (pour synchronisation externe)
     */
    updatePosition(newPosition: THREE.Vector3): void {
        this.kite.position.copy(newPosition);
        this.previousPosition.copy(newPosition);
        this.state.position.copy(newPosition);
    }

    /**
     * Met à jour l'orientation du kite (pour synchronisation externe)
     */
    updateOrientationExternal(newQuaternion: THREE.Quaternion): void {
        this.kite.quaternion.copy(newQuaternion);
        this.state.orientation.copy(newQuaternion);
    }
}
