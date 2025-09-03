/**
 * engine.ts — Moteur physique émergent inspiré de V8
 * 
 * PHYSIQUE ÉMERGENTE PURE :
 * - Forces aérodynamiques par surface triangulaire
 * - Contraintes des lignes comme vraies cordes (pas de ressorts)
 * - Couple émergeant naturellement de l'asymétrie gauche/droite
 * - Système PBD avec solver multi-passes comme V8
 */

import * as THREE from 'three';
import { WindSimulator } from '@simulation/simu_V10/wind';
import { PhysicsConstants } from '@simulation/simu_V10/constants';
import { AerodynamicsCalculator } from '@simulation/simu_V10/aerodynamics';
import { LineConstraints, PhysicsConstraints } from '@simulation/simu_V10/constraints';

export class PhysicsEngine {
  private velocity = new THREE.Vector3();
  private angularVelocity = new THREE.Vector3();
  private lineConstraints: LineConstraints;
  private physicsConstraints: PhysicsConstraints;
  private previousPosition = new THREE.Vector3();

  // Lissage temporel des forces (comme V8)
  private smoothedForce = new THREE.Vector3();
  private smoothedTorque = new THREE.Vector3();
  private readonly FORCE_SMOOTHING = 0.15; // Lissage léger comme V8

  // Debug/aéro (dernière étape)
  private lastApparent = new THREE.Vector3();
  private lastLift = new THREE.Vector3();
  private lastDrag = new THREE.Vector3();
  private lastAeroData: any = null; // Données complètes d'aérodynamique
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

    // 1. CALCUL DU VENT APPARENT (comme V8)
    const windVec = this.wind.getVector();
    const apparent = windVec.clone().sub(this.velocity);
    const V = apparent.length();

    if (V < PhysicsConstants.EPSILON) {
      return { force: 0, tension: 0, aoaDeg: 0, airspeed: 0, leftTension: 0, rightTension: 0, stallFactor: 1.0 };
    }

    // 2. FORCES AÉRODYNAMIQUES PAR SURFACE (physique émergente V8)
    const aeroForces = AerodynamicsCalculator.calculateForces(apparent, kite.quaternion);

    // 3. GRAVITÉ CONSTANTE
    const gravity = new THREE.Vector3(0, -PhysicsConstants.KITE_MASS * PhysicsConstants.GRAVITY, 0);

    // 4. FORCES DES LIGNES (méthode V8 : cordes rigides)
    const lineForces = this.calculateLineTensions(kite, steer, handles);

    // 5. SOMME VECTORIELLE DE TOUTES LES FORCES (2ème loi de Newton)
    const totalForce = new THREE.Vector3()
      .add(aeroForces.lift)       // Forces aérodynamiques totales
      .add(aeroForces.drag)       // Traînée
      .add(gravity)               // Poids vers le bas  
      .add(lineForces.leftForce)  // Tension ligne gauche
      .add(lineForces.rightForce); // Tension ligne droite

    // 6. COUPLE TOTAL (rotation émergente)
    const totalTorque = aeroForces.torque.clone().add(lineForces.torque);

    // 7. VALIDATION ET LISSAGE (comme V8)
    const validatedForce = this.validateForces(totalForce);
    const validatedTorque = this.validateTorque(totalTorque);

    // Appliquer le lissage temporel (filtre passe-bas V8)
    this.smoothedForce.lerp(validatedForce, 1 - this.FORCE_SMOOTHING);
    this.smoothedTorque.lerp(validatedTorque, 1 - this.FORCE_SMOOTHING);

    // 8. INTÉGRATION PHYSIQUE AVEC CONTRAINTES PBD (méthode V8)
    const newPosition = this.integratePhysicsWithConstraints(
      kite, 
      this.smoothedForce, 
      handles, 
      dt
    );

    // 9. MISE À JOUR ORIENTATION (V8)
    this.updateOrientation(this.smoothedTorque, dt);

    // 10. APPLICATION DES MOUVEMENTS FINAUX
    this.previousPosition.copy(kite.position);
    kite.position.copy(newPosition);

    // Appliquer la rotation si nécessaire
    if (this.angularVelocity.length() > PhysicsConstants.EPSILON) {
      const deltaRotation = new THREE.Quaternion();
      const axis = this.angularVelocity.clone().normalize();
      const angle = this.angularVelocity.length() * dt;
      deltaRotation.setFromAxisAngle(axis, angle);
      kite.quaternion.multiply(deltaRotation).normalize();
    }

    // 11. CONTRAINTES PHYSIQUES FINALES (sol, limites)
    this.physicsConstraints.applyAllConstraints(kite, this.velocity);

    // 12. CALCUL DES MÉTRIQUES
    const metrics = AerodynamicsCalculator.computeMetrics(apparent, kite.quaternion);
    const leftTension = lineForces.leftForce.length();
    const rightTension = lineForces.rightForce.length();

    // Mémoriser pour debug
    this.lastApparent.copy(apparent);
    this.lastLift.copy(aeroForces.lift);
    this.lastDrag.copy(aeroForces.drag);
    this.lastAeroData = aeroForces; // Sauvegarder les données complètes
    this.lastAoaDeg = metrics.aoaDeg;
    this.lastStall = metrics.stallFactor;

    return {
      force: this.smoothedForce.length(),
      tension: Math.max(leftTension, rightTension),
      aoaDeg: metrics.aoaDeg,
      airspeed: V,
      leftTension,
      rightTension,
      stallFactor: metrics.stallFactor
    };
  }

  /**
   * Calcule les tensions des lignes comme dans V8 (cordes rigides)
   */
  private calculateLineTensions(
    kite: THREE.Object3D, 
    controlRotation: number, 
    handles: { left: THREE.Vector3; right: THREE.Vector3 }
  ): { leftForce: THREE.Vector3; rightForce: THREE.Vector3; torque: THREE.Vector3 } {
    // Points d'attache des lignes sur le kite (depuis la géométrie réelle V8)
    const ctrlLeft = (kite as any).getPoint?.('CTRL_GAUCHE');
    const ctrlRight = (kite as any).getPoint?.('CTRL_DROIT');
    
    if (!ctrlLeft || !ctrlRight) {
      return { 
        leftForce: new THREE.Vector3(), 
        rightForce: new THREE.Vector3(), 
        torque: new THREE.Vector3() 
      };
    }

    // Transformer en coordonnées monde
    const leftWorld = ctrlLeft.clone().applyQuaternion(kite.quaternion).add(kite.position);
    const rightWorld = ctrlRight.clone().applyQuaternion(kite.quaternion).add(kite.position);

    // Calcul des distances et directions
    const leftDistance = leftWorld.distanceTo(handles.left);
    const rightDistance = rightWorld.distanceTo(handles.right);
    
    const leftLineDir = handles.left.clone().sub(leftWorld).normalize();
    const rightLineDir = handles.right.clone().sub(rightWorld).normalize();

    // PRINCIPE CLÉ V8 : Les lignes sont des CORDES, pas des ressorts!
    // - Ligne molle (distance < longueur) = AUCUNE force
    // - Ligne tendue (distance > longueur) = Force proportionnelle
    const baseLineLength = this.lineConstraints.getMaxLengths().left; // même longueur de base
    let leftForce = new THREE.Vector3();
    let rightForce = new THREE.Vector3();

    const stiffness = 25000; // Rigidité V8
    const maxTension = 1000;  // Tension max V8

    // Ligne gauche : F = k × extension (Hooke pour corde rigide)
    if (leftDistance > baseLineLength) {
      const extension = leftDistance - baseLineLength;
      const tension = Math.min(stiffness * extension, maxTension);
      leftForce = leftLineDir.multiplyScalar(tension);
    }

    // Ligne droite : même physique
    if (rightDistance > baseLineLength) {
      const extension = rightDistance - baseLineLength;
      const tension = Math.min(stiffness * extension, maxTension);
      rightForce = rightLineDir.multiplyScalar(tension);
    }

    // COUPLE ÉMERGENT V8 : Résulte de l'asymétrie des tensions
    let totalTorque = new THREE.Vector3();

    // Couple ligne gauche (si tendue) - Position relative au centre de masse
    if (leftForce.length() > 0) {
      const leverArm = ctrlLeft.clone(); // Position relative au centre
      const leftTorque = new THREE.Vector3().crossVectors(leverArm, leftForce);
      totalTorque.add(leftTorque);
    }

    // Couple ligne droite (si tendue) - Position relative au centre de masse
    if (rightForce.length() > 0) {
      const leverArm = ctrlRight.clone(); // Position relative au centre
      const rightTorque = new THREE.Vector3().crossVectors(leverArm, rightForce);
      totalTorque.add(rightTorque);
    }

    // COUPLE DE REDRESSEMENT V8 : Force naturelle qui oriente le kite face au vent
    // Les points CTRL sont devant le centre de masse (Z=0.4), créent un moment de redressement
    const totalTensionForce = leftForce.clone().add(rightForce);
    if (totalTensionForce.length() > 0) {
      // Couple de redressement proportionnel à la tension totale
      const redressementIntensity = 0.08; // Gain modéré pour stabilité naturelle
      const avgLeverArm = new THREE.Vector3()
        .addVectors(ctrlLeft, ctrlRight)
        .divideScalar(2);
      
      const redressementTorque = new THREE.Vector3()
        .crossVectors(avgLeverArm, totalTensionForce)
        .multiplyScalar(redressementIntensity);
      
      totalTorque.add(redressementTorque);
    }

    return { leftForce, rightForce, torque: totalTorque };
  }

  /**
   * Valide et limite les forces (sécurité V8)
   */
  private validateForces(forces: THREE.Vector3): THREE.Vector3 {
    if (!forces || forces.length() > PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
      console.warn(`⚠️ Forces invalides: ${forces ? forces.toArray() : 'undefined'}`);
      return new THREE.Vector3();
    }
    return forces;
  }

  /**
   * Valide le couple (sécurité V8)
   */
  private validateTorque(torque: THREE.Vector3): THREE.Vector3 {
    if (!torque || isNaN(torque.length())) {
      console.warn(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}`);
      return new THREE.Vector3();
    }
    return torque;
  }

  /**
   * Intégration physique avec contraintes PBD (méthode V8 simplifiée)
   * 
   * IMPORTANT : Les forces sont calculées au centre de masse physique,
   * mais appliquées à kite.position (qui correspond à SPINE_BAS).
   * Le centre de masse V8 est à [0, 0.325, 0] en coordonnées locales.
   */
  private integratePhysicsWithConstraints(
    kite: THREE.Object3D,
    forces: THREE.Vector3,
    handles: { left: THREE.Vector3; right: THREE.Vector3 },
    deltaTime: number
  ): THREE.Vector3 {
    // 1. Newton : accélération = Force / masse
    const acceleration = forces.clone().divideScalar(PhysicsConstants.KITE_MASS);
    
    // Sécurité : limiter pour éviter l'explosion numérique
    const maxAccel = 100; // m/s² comme V8
    if (acceleration.length() > maxAccel) {
      acceleration.normalize().multiplyScalar(maxAccel);
    }

    // 2. Intégration d'Euler : v(t+dt) = v(t) + a·dt
    this.velocity.add(acceleration.multiplyScalar(deltaTime));
    
    // 3. Amortissement V8 : simule la résistance de l'air
    this.velocity.multiplyScalar(0.92); // Amortissement linéaire V8
    
    // 4. Garde-fou vitesse max
    if (this.velocity.length() > PhysicsConstants.MAX_VELOCITY) {
      this.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
    }

    // 5. Position prédite : x(t+dt) = x(t) + v·dt
    // REMARQUE : kite.position correspond au point SPINE_BAS, pas au centre de masse
    const predictedPosition = kite.position.clone()
      .add(this.velocity.clone().multiplyScalar(deltaTime));

    // 6. Appliquer les contraintes des lignes (PBD simplifié V8)
    const constrainedPosition = this.enforceLineConstraintsV8(
      kite, 
      predictedPosition, 
      handles
    );

    return constrainedPosition;
  }

  /**
   * Applique les contraintes des lignes - Version V8 simplifiée
   */
  private enforceLineConstraintsV8(
    kite: THREE.Object3D,
    predictedPosition: THREE.Vector3,
    handles: { left: THREE.Vector3; right: THREE.Vector3 }
  ): THREE.Vector3 {
    const lineLength = this.lineConstraints.getMaxLengths().left;
    const tolerance = 0.0005; // Tolérance V8

    const ctrlLeft = (kite as any).getPoint?.('CTRL_GAUCHE');
    const ctrlRight = (kite as any).getPoint?.('CTRL_DROIT');
    
    if (!ctrlLeft || !ctrlRight) return predictedPosition;

    let finalPosition = predictedPosition.clone();

    // Solver simple à 2 passes comme V8
    for (let pass = 0; pass < 2; pass++) {
      // Contrainte ligne gauche
      const leftWorld = ctrlLeft.clone().applyQuaternion(kite.quaternion).add(finalPosition);
      const leftDist = leftWorld.distanceTo(handles.left);
      
      if (leftDist > lineLength + tolerance) {
        const correction = leftWorld.clone().sub(handles.left);
        correction.normalize().multiplyScalar(leftDist - lineLength);
        finalPosition.sub(correction.multiplyScalar(0.5)); // Correction partielle
      }

      // Contrainte ligne droite  
      const rightWorld = ctrlRight.clone().applyQuaternion(kite.quaternion).add(finalPosition);
      const rightDist = rightWorld.distanceTo(handles.right);
      
      if (rightDist > lineLength + tolerance) {
        const correction = rightWorld.clone().sub(handles.right);
        correction.normalize().multiplyScalar(rightDist - lineLength);
        finalPosition.sub(correction.multiplyScalar(0.5)); // Correction partielle
      }
    }

    return finalPosition;
  }

  /**
   * Met à jour l'orientation du cerf-volant - Version V8 simplifiée
   */
  private updateOrientation(torque: THREE.Vector3, dt: number): void {
    // Couple d'amortissement (résistance à la rotation dans l'air)
    const dampTorque = this.angularVelocity.clone()
      .multiplyScalar(-PhysicsConstants.ANGULAR_DRAG_COEFF);
    const effectiveTorque = torque.clone().add(dampTorque);

    // Dynamique rotationnelle : α = T / I
    const angularAcceleration = effectiveTorque.divideScalar(PhysicsConstants.KITE_INERTIA);
    
    // Limiter l'accélération angulaire
    const maxAngularAccel = 20; // rad/s² comme V8
    if (angularAcceleration.length() > maxAngularAccel) {
      angularAcceleration.normalize().multiplyScalar(maxAngularAccel);
    }

    // Mise à jour de la vitesse angulaire
    this.angularVelocity.add(angularAcceleration.multiplyScalar(dt));
    this.angularVelocity.multiplyScalar(0.85); // Amortissement angulaire V8
    
    // Limiter la vitesse angulaire
    if (this.angularVelocity.length() > PhysicsConstants.MAX_ANGULAR_VELOCITY) {
      this.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
    }

    // La rotation sera appliquée dans la boucle principale
  }

  getVelocity(): THREE.Vector3 { return this.velocity.clone(); }
  getLastAerodynamics(): any {
    return this.lastAeroData || { apparent: this.lastApparent.clone(), lift: this.lastLift.clone(), drag: this.lastDrag.clone(), aoaDeg: this.lastAoaDeg, stallFactor: this.lastStall, surfaces: [] };
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
    this.previousPosition.set(0, 0, 0);
    this.smoothedForce.set(0, 0, 0);
    this.smoothedTorque.set(0, 0, 0);
    console.log('🔄 Moteur physique réinitialisé');
  }

  /**
   * Met à jour la longueur des lignes
   */
  setLineLength(length: number): void {
    this.lineConstraints.setMaxLength(length);
  }
}
