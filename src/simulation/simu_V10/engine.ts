/**
 * engine.ts — Moteur physique avancé avec calculs aérodynamiques par face
 */

import * as THREE from 'three';
import { WindSimulator } from '@simulation/simu_V10/wind';
import { PhysicsConstants } from '@simulation/simu_V10/constants';
import { AerodynamicsCalculator } from '@simulation/simu_V10/aerodynamics';
import { LineConstraints, PhysicsConstraints } from '@simulation/simu_V10/constraints';

export class PhysicsEngine {
  private velocity = new THREE.Vector3();
  private angularVelocity = new THREE.Vector3(); // Vitesse angulaire 3D
  private lineConstraints: LineConstraints;
  private physicsConstraints: PhysicsConstraints;

  // Debug/aéro (dernière étape)
  private lastApparent = new THREE.Vector3();
  private lastLift = new THREE.Vector3();
  private lastDrag = new THREE.Vector3();
  private lastAoaDeg = 0;
  private lastStall = 1.0;

  constructor(private wind: WindSimulator, lineLength: number = 15) {
    // Initialiser les systèmes de contraintes
    this.lineConstraints = new LineConstraints(lineLength);
    this.physicsConstraints = new PhysicsConstraints();
  }

  step(
    dt: number,
    kite: THREE.Object3D,
    control: { steer: number; tensionDiff?: number } | number,
    handles: { left: THREE.Vector3; right: THREE.Vector3 }
  ): { force: number; tension: number; aoaDeg: number; airspeed: number; leftTension: number; rightTension: number; stallFactor: number } {
    // Back-compat: si on passe un nombre, c'est l'ancien 'steer'
    const steer = typeof control === 'number' ? control : control.steer;
    const tensionDiff = typeof control === 'number' ? 0 : (control.tensionDiff || 0);

    // Calcul du vent apparent
    const windVec = this.wind.getVector();
    const apparent = windVec.clone().sub(this.velocity);
    const V = apparent.length();

    if (V < PhysicsConstants.EPSILON) {
      return { force: 0, tension: 0, aoaDeg: 0, airspeed: 0, leftTension: 0, rightTension: 0, stallFactor: 1.0 };
    }

    // Utiliser le nouveau système aérodynamique avancé
    const aeroForces = AerodynamicsCalculator.calculateForces(apparent, kite.quaternion);

    // NOUVELLE ARCHITECTURE PBD COMME V9
    // 1. Calculer la position prédite avec les forces actuelles
    const currentPosition = kite.position.clone();
    const acceleration = aeroForces.lift.clone().add(aeroForces.drag); // masse = 1
    // Gravité (Y up)
    acceleration.y -= PhysicsConstants.GRAVITY;
    const predictedVelocity = this.velocity.clone().add(acceleration.clone().multiplyScalar(dt));
    const predictedPosition = currentPosition.clone().add(predictedVelocity.clone().multiplyScalar(dt));

    // 2. Appliquer les contraintes de longueur (PBD)
    // Ajuster les longueurs en fonction du tilt utilisateur (asymétrie G/D)
    this.lineConstraints.setSteer(steer);

    const constrainedPosition = this.lineConstraints.enforceConstraints(
      kite,
      predictedPosition,
      handles.left,
      handles.right
    );

    // 3. Calculer la force correctrice
    const positionCorrection = constrainedPosition.clone().sub(predictedPosition);
    const correctionForce = positionCorrection.divideScalar(dt * dt);

    // 4. Force totale = aérodynamique + correction
    const totalForce = acceleration.clone().add(correctionForce);
    const totalTorque = aeroForces.torque.clone();
    // Couple de contrôle simple inspiré V9: yaw proportionnel au tilt et au différentiel de force latéral
    const sideDiff = (aeroForces.rightForce?.length() || 0) - (aeroForces.leftForce?.length() || 0);
    const controlTorqueY = steer * 0.6 + sideDiff * 0.02; // gains modestes pour stabilité
    totalTorque.y += controlTorqueY;

    // Intégration physique avec forces corrigées
    this.velocity.addScaledVector(totalForce, dt).clampLength(0, PhysicsConstants.MAX_VELOCITY);

    // Rotation avec couple 3D - Auto-orientation naturelle
    this.updateOrientation(totalTorque, dt);

    // Appliquer la rotation 3D
    if (this.angularVelocity.length() > PhysicsConstants.EPSILON) {
      const deltaRotation = new THREE.Quaternion();
      const axis = this.angularVelocity.clone().normalize();
      const angle = this.angularVelocity.length() * dt;
      deltaRotation.setFromAxisAngle(axis, angle);

      kite.quaternion.multiply(deltaRotation);
      kite.quaternion.normalize();
    }

    // Appliquer les mouvements
    kite.position.addScaledVector(this.velocity, dt);

    // Appliquer les contraintes physiques (sol et limites)
    this.physicsConstraints.applyAllConstraints(kite, this.velocity);

    // Amortissement (ajusté comme V9 pour stabilité)
    this.velocity.multiplyScalar(0.988); // linéaire comme V9
    this.angularVelocity.multiplyScalar(PhysicsConstants.ANGULAR_DAMPING); // angulaire 3D

    // Calcul des métriques
    const metrics = AerodynamicsCalculator.computeMetrics(apparent, kite.quaternion);

    // Vérifier les contraintes pour les métriques de tension
    const constraintCheck = this.lineConstraints.checkConstraints(kite, handles.left, handles.right);
    const maxes = this.lineConstraints.getMaxLengths();
    const leftTension = constraintCheck.leftDistance > maxes.left ?
      (constraintCheck.leftDistance - maxes.left) * 2000 : 0;
    const rightTension = constraintCheck.rightDistance > maxes.right ?
      (constraintCheck.rightDistance - maxes.right) * 2000 : 0;

    // Mémoriser pour debug
    this.lastApparent.copy(apparent);
    this.lastLift.copy(aeroForces.lift);
    this.lastDrag.copy(aeroForces.drag);
    this.lastAoaDeg = metrics.aoaDeg;
    this.lastStall = metrics.stallFactor;

    return {
      force: totalForce.length(),
      tension: Math.max(leftTension, rightTension),
      aoaDeg: metrics.aoaDeg,
      airspeed: V,
      leftTension,
      rightTension,
      stallFactor: metrics.stallFactor
    };
  }

  /**
   * Met à jour l'orientation du cerf-volant avec auto-orientation naturelle
   */
  private updateOrientation(torque: THREE.Vector3, dt: number): void {
    // Couple d'amortissement (résistance à la rotation dans l'air)
    const dampTorque = this.angularVelocity.clone()
      .multiplyScalar(-PhysicsConstants.ANGULAR_DRAG_COEFF);
    const effectiveTorque = torque.clone().add(dampTorque);

    // Dynamique rotationnelle : α = T / I
    const angularAcceleration = effectiveTorque.divideScalar(PhysicsConstants.KITE_INERTIA);

    // Limiter l'accélération angulaire
    if (angularAcceleration.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY / dt) {
      angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY / dt);
    }

    // Mise à jour de la vitesse angulaire
    this.angularVelocity.add(angularAcceleration.multiplyScalar(dt));

    // Limiter la vitesse angulaire
    if (this.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
      this.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
    }

    // La rotation sera appliquée dans la boucle principale
  }

  getVelocity(): THREE.Vector3 { return this.velocity.clone(); }
  getLastAerodynamics(): { apparent: THREE.Vector3; lift: THREE.Vector3; drag: THREE.Vector3; aoaDeg: number; stallFactor: number } {
    return { apparent: this.lastApparent.clone(), lift: this.lastLift.clone(), drag: this.lastDrag.clone(), aoaDeg: this.lastAoaDeg, stallFactor: this.lastStall };
  }

  /**
   * Obtient l'état des contraintes physiques
   */
  getConstraintStatus(kite: THREE.Object3D): { onGround: boolean; atBoundary: boolean } {
    return this.physicsConstraints.getConstraintStatus(kite);
  }

  reset(): void {
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
  }

  /**
   * Met à jour la longueur des lignes
   */
  setLineLength(length: number): void {
    this.lineConstraints.setMaxLength(length);
  }
}
