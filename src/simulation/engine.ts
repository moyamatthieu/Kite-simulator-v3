/**
 * `engine.ts` - Moteur physique émergent inspiré de V8.
 *
 * Ce module implémente la logique physique principale de la simulation de kite,
 * incluant le calcul des forces aérodynamiques, la gravité, les tensions de ligne,
 * et l'intégration des mouvements. Il utilise un système de type "Position-Based Dynamics" (PBD)
 * simplifié pour gérer les contraintes.
 */

import * as THREE from 'three';
import { WindSimulator } from '@/simulation/wind';
import { AerodynamicsCalculator } from '@/simulation/aerodynamics';
import {
  ILineConstraints,
  IPhysicsConstraints,
} from '@/simulation/interfaces/physics';
import { StructuredObject } from '@core/StructuredObject';
import { CONFIG, PhysicsConfig } from '@/simulation/config/SimulationConfig'; // Importe PhysicsConfig aussi
import { PhysicsConstants } from '@/simulation/physics/PhysicsConstants';
import { KiteGeometry } from '@/simulation/data/KiteGeometry';

export class PhysicsEngine {
  private velocity = new THREE.Vector3();      // Vitesse linéaire actuelle du kite
  private angularVelocity = new THREE.Vector3(); // Vitesse angulaire actuelle du kite
  private lineConstraints: ILineConstraints;   // Gestionnaire des contraintes de lignes
  private physicsConstraints: IPhysicsConstraints; // Gestionnaire des contraintes physiques globales (sol, bornes)
  private previousPosition = new THREE.Vector3(); // Position à l'étape précédente pour l'intégration de Verlet

  // Lissage temporel des forces et couples pour des mouvements plus stables
  private smoothedForce = new THREE.Vector3();
  private smoothedTorque = new THREE.Vector3();
  private readonly FORCE_SMOOTHING = 0.15;     // Facteur de lissage (0 à 1, plus faible = plus de lissage)

  // Données de la dernière étape pour le debug et l'UI
  private lastApparent = new THREE.Vector3();
  private lastLift = new THREE.Vector3();
  private lastDrag = new THREE.Vector3();
  private lastAeroData: any = null; // Données aérodynamiques complètes pour debug
  private lastAoaDeg = 0;           // Dernier angle d'attaque calculé
  private lastStall = 1.0;          // Dernier facteur de décrochage
  private lastLeftTension: number = 0; // Dernière tension de la ligne gauche (N)
  private lastRightTension: number = 0; // Dernière tension de la ligne droite (N)

  // Constantes physiques de la simulation, configurables via `PhysicsConfig`
  private readonly GRAVITY: number;
  private readonly KITE_MASS: number;
  private readonly KITE_INERTIA: number;
  private readonly ANGULAR_DRAG_COEFF: number;

  /**
   * @constructor
   * @param {WindSimulator} wind - Instance du simulateur de vent.
   * @param {ILineConstraints} lineConstraints - Système de contraintes pour les lignes du kite.
   * @param {IPhysicsConstraints} physicsConstraints - Système de contraintes physiques générales (sol, limites).
   * @param {PhysicsConfig} physicsConfig - Section de la configuration globale dédiée à la physique.
   */
  constructor(
    private wind: WindSimulator,
    lineConstraints: ILineConstraints,
    physicsConstraints: IPhysicsConstraints,
    physicsConfig: PhysicsConfig // Reçoit la section de config physique
  ) {
    this.lineConstraints = lineConstraints;
    this.physicsConstraints = physicsConstraints;

    // Initialisation des propriétés à partir de la configuration
    this.GRAVITY = physicsConfig.gravity;
    this.KITE_MASS = CONFIG.get('kite').mass; // La masse du kite est dans la config du kite
    this.KITE_INERTIA = CONFIG.get('kite').inertia; // L'inertie du kite est dans la config du kite
    this.ANGULAR_DRAG_COEFF = physicsConfig.angularDragCoeff;

    // Les autres constantes comme MAX_FORCE, MAX_VELOCITY sont maintenant accédées
    // directement via PhysicsConstants et ne sont plus stockées comme propriétés ici.
  }

  /**
   * Exécute une étape de simulation physique pour le kite.
   * C'est la méthode principale du moteur physique, elle calcule toutes les forces,
   * intègre le mouvement et applique les contraintes.
   * @param {number} dt - Le pas de temps (delta time) pour cette étape de simulation, en secondes.
   * @param {StructuredObject} kite - L'objet Kite (représentation physique du cerf-volant).
   * @param {object} control - Les paramètres de contrôle issus de l'input utilisateur.
   * @param {number} control.steer - Facteur de direction de la barre de contrôle (-1 à 1).
   * @param {object} handles - Les positions mondiales des poignées gauche et droite du pilote.
   * @param {THREE.Vector3} handles.left - Position mondiale de la poignée gauche.
   * @param {THREE.Vector3} handles.right - Position mondiale de la poignée droite.
   * @returns {object} Un objet contenant diverses métriques de l'étape de simulation.
   */
  step(
    dt: number,
    kite: StructuredObject,
    control: { steer: number; tensionDiff?: number },
    handles: { left: THREE.Vector3; right: THREE.Vector3 }
  ): { force: number; tension: number; aoaDeg: number; airspeed: number; leftTension: number; rightTension: number; stallFactor: number } {

    const steer = control.steer; // Récupère le facteur de direction de la barre

    // Mettre à jour les contraintes de ligne pour refléter l'action du pilote
    this.lineConstraints.setSteer(steer);

    // 1. CALCUL DU VENT APPARENT (vent relatif au kite)
    const windVec = this.wind.getVector();
    const apparent = windVec.clone().sub(this.velocity); // Vent relatif au mouvement du kite
    const V = apparent.length(); // Magnitude du vent apparent

    // Si le vent apparent est trop faible, il n'y a pas de force aérodynamique significative
    if (V < PhysicsConstants.EPSILON) {
      return { force: 0, tension: 0, aoaDeg: 0, airspeed: 0, leftTension: 0, rightTension: 0, stallFactor: 1.0 };
    }

    // 2. FORCES AÉRODYNAMIQUES PAR SURFACE
    const aeroForces = AerodynamicsCalculator.calculateForces(apparent, kite.quaternion);

    // 3. GRAVITÉ
    const gravity = new THREE.Vector3(0, -this.KITE_MASS * this.GRAVITY, 0);

    // 4. FORCES DES LIGNES (tensions exercées par les lignes sur le kite)
    const lineForces = this.calculateLineTensions(kite, steer, handles);

    // 5. SOMME VECTORIELLE DE TOUTES LES FORCES (2ème loi de Newton : F = ma)
    const totalForce = new THREE.Vector3()
      .add(aeroForces.lift)
      .add(aeroForces.drag)
      .add(gravity)
      .add(lineForces.leftForce)
      .add(lineForces.rightForce);

    // 6. COUPLE TOTAL (pour la rotation : τ = Iα)
    const totalTorque = aeroForces.torque.clone().add(lineForces.torque);

    // 7. VALIDATION ET LISSAGE (évite les comportements irréalistes et stabilise le mouvement)
    const validatedForce = this.validateForces(totalForce);
    const validatedTorque = this.validateTorque(totalTorque);

    // Appliquer le lissage temporel (filtre passe-bas)
    this.smoothedForce.lerp(validatedForce, 1 - this.FORCE_SMOOTHING);
    this.smoothedTorque.lerp(validatedTorque, 1 - this.FORCE_SMOOTHING);

    // 8. INTÉGRATION PHYSIQUE AVEC CONTRAINTES PBD
    const newPosition = this.integratePhysicsWithConstraints(
      kite,
      this.smoothedForce,
      handles,
      dt
    );

    // 9. MISE À JOUR ORIENTATION
    this.updateOrientation(this.smoothedTorque, dt);

    // 10. APPLICATION DES MOUVEMENTS FINAUX
    this.previousPosition.copy(kite.position); // Sauvegarde la position actuelle pour le calcul de vitesse
    kite.position.copy(newPosition);           // Applique la nouvelle position linéaire

    // Appliquer la rotation du kite
    if (this.angularVelocity.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
      const deltaRotation = new THREE.Quaternion();
      const axis = this.angularVelocity.clone().normalize();
      const angle = this.angularVelocity.length() * dt;
      deltaRotation.setFromAxisAngle(axis, angle);
      kite.quaternion.multiply(deltaRotation).normalize();
    }

    // 11. CONTRAINTES PHYSIQUES FINALES (sol et limites du monde)
    this.physicsConstraints.applyAllConstraints(kite, this.velocity);

    // 12. CALCUL DES MÉTRIQUES pour le retour (UI, debug, analyse)
    const metrics = AerodynamicsCalculator.computeMetrics(apparent, kite.quaternion);
    const leftTension = lineForces.leftForce.length();
    const rightTension = lineForces.rightForce.length();

    // Mémoriser les dernières données pour l'accès externe (debug, UI)
    this.lastApparent.copy(apparent);
    this.lastLift.copy(aeroForces.lift);
    this.lastDrag.copy(aeroForces.drag);
    this.lastAeroData = aeroForces;
    this.lastAoaDeg = metrics.aoaDeg;
    this.lastStall = metrics.stallFactor;
    this.lastLeftTension = leftTension;
    this.lastRightTension = rightTension;

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
   * Calcule les tensions des lignes selon le modèle V8 (cordes rigides/non élastiques).
   * Plus la ligne est tirée au-delà de sa longueur maximale, plus la force de tension est grande.
   * @param {StructuredObject} kite - L'objet Kite.
   * @param {number} controlRotation - Rotation de la barre de contrôle (non utilisée directement pour les tensions)
   * @param {Object} handles - Positions mondiales des poignées.
   * @param {THREE.Vector3} handles.left - Position de la poignée gauche.
   * @param {THREE.Vector3} handles.right - Position de la poignée droite.
   * @returns {object} Les forces de tension gauche et droite, et le couple résultant.
   */
  private calculateLineTensions(
    kite: StructuredObject,
    controlRotation: number, // Paramètre unused, gardé pour compatibilité signature
    handles: { left: THREE.Vector3; right: THREE.Vector3 }
  ): { leftForce: THREE.Vector3; rightForce: THREE.Vector3; torque: THREE.Vector3 } {
    // Points d'attache des lignes sur le kite (depuis KiteGeometry, en LOCAL)
    const { CTRL_GAUCHE, CTRL_DROIT } = KiteGeometry.CONTROL_POINTS;

    // Transformer les points de contrôle locaux du kite en coordonnées mondiales
    const leftKiteAttachPointWorld = CTRL_GAUCHE.clone().applyQuaternion(kite.quaternion).add(kite.position);
    const rightKiteAttachPointWorld = CTRL_DROIT.clone().applyQuaternion(kite.quaternion).add(kite.position);

    // Calcul des distances entre les poignées et les points d'attache du kite
    const leftDistance = leftKiteAttachPointWorld.distanceTo(handles.left);
    const rightDistance = rightKiteAttachPointWorld.distanceTo(handles.right);

    // Vecteurs directionnels du kite vers les poignées
    const leftLineDir = handles.left.clone().sub(leftKiteAttachPointWorld).normalize();
    const rightLineDir = handles.right.clone().sub(rightKiteAttachPointWorld).normalize();

    // PRINCIPE CLÉ V8 : Les lignes sont des CORDES, pas des ressorts!
    // - Ligne molle (distance < longueur) = AUCUNE force
    // - Ligne tendue (distance > longueur) = Force proportionnelle à l'extension
    const lineLengths = this.lineConstraints.getMaxLengths(); // Longueurs de lignes ajustées par le steer
    let leftForce = new THREE.Vector3();
    let rightForce = new THREE.Vector3();

    const stiffness = CONFIG.get('lines').stiffness; // Rigidité des lignes (issue de la config)
    const maxTension = CONFIG.get('lines').maxTension;  // Tension maximale (issue de la config)

    // Calcul de la force de tension pour la ligne gauche
    if (leftDistance > lineLengths.left + PhysicsConstants.EPSILON) {
      const extension = leftDistance - lineLengths.left;
      const tension = Math.min(stiffness * extension, maxTension); // Limite la tension max
      leftForce = leftLineDir.multiplyScalar(tension);
    }

    // Calcul de la force de tension pour la ligne droite
    if (rightDistance > lineLengths.right + PhysicsConstants.EPSILON) {
      const extension = rightDistance - lineLengths.right;
      const tension = Math.min(stiffness * extension, maxTension);
      rightForce = rightLineDir.multiplyScalar(tension);
    }

    // COUPLE ÉMERGENT V8 : Résulte de l'asymétrie des tensions ou de leur point d'application.
    let totalTorque = new THREE.Vector3();

    // Transformer les forces des lignes en couple par rapport au centre de masse du kite
    // Le centre de masse est généralement à l'origine (0,0,0) dans le repère local du kite pour KiteGeometry
    if (leftForce.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
      const leverArm = CTRL_GAUCHE.clone(); // Point d'application de la force sur le kite (local)
      totalTorque.add(new THREE.Vector3().crossVectors(leverArm, leftForce));
    }
    if (rightForce.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
      const leverArm = CTRL_DROIT.clone();
      totalTorque.add(new THREE.Vector3().crossVectors(leverArm, rightForce));
    }

    // COUPLE DE REDRESSEMENT V8 : Force naturelle qui oriente le kite face au vent.
    // Ce couple aide à stabiliser le kite et à le ramener dans une orientation favorable.
    const totalTensionForce = leftForce.clone().add(rightForce);
    if (totalTensionForce.lengthSq() > PhysicsConstants.EPSILON * PhysicsConstants.EPSILON) {
      const redressementIntensity = CONFIG.get('aero').stabilityFactor; // Facteur depuis la config
      const avgLeverArm = new THREE.Vector3()
        .addVectors(CTRL_GAUCHE, CTRL_DROIT)
        .divideScalar(2); // Point d'application moyen des lignes (local)

      const redressementTorque = new THREE.Vector3()
        .crossVectors(avgLeverArm, totalTensionForce)
        .multiplyScalar(redressementIntensity);

      totalTorque.add(redressementTorque);
    }

    return { leftForce, rightForce, torque: totalTorque };
  }

  /**
   * Valide et limite les forces appliquées au kite pour éviter les comportements irréalistes.
   * @param {THREE.Vector3} forces - Le vecteur de force total.
   * @returns {THREE.Vector3} Le vecteur de force validé et potentiellement limité.
   */
  private validateForces(forces: THREE.Vector3): THREE.Vector3 {
    if (!forces || forces.lengthSq() > PhysicsConstants.MAX_FORCE * PhysicsConstants.MAX_FORCE || isNaN(forces.length())) {
      console.warn(`⚠️ Forces invalides ou excessives (${forces ? forces.length().toFixed(2) : 'NaN'}N). Réinitialisation de la force.`);
      return new THREE.Vector3();
    }
    return forces;
  }

  /**
   * Valide et limite le couple appliqué au kite.
   * @param {THREE.Vector3} torque - Le vecteur de couple total.
   * @returns {THREE.Vector3} Le vecteur de couple validé et potentiellement limité.
   */
  private validateTorque(torque: THREE.Vector3): THREE.Vector3 {
    if (!torque || isNaN(torque.length())) {
      console.warn(`⚠️ Couple invalide: ${torque ? torque.toArray() : 'undefined'}. Réinitialisation du couple.`);
      return new THREE.Vector3();
    }
    return torque;
  }

  /**
   * Intègre les lois de la physique pour calculer la nouvelle position prédite du kite,
   * en tenant compte des forces et en appliquant les contraintes des lignes.
   * @param {StructuredObject} kite - L'objet Kite.
   * @param {THREE.Vector3} forces - La force totale appliquée au kite.
   * @param {Object} handles - Positions mondiales des poignées.
   * @param {THREE.Vector3} handles.left - Position de la poignée gauche.
   * @param {THREE.Vector3} handles.right - Position de la poignée droite.
   * @param {number} deltaTime - Le pas de temps.
   * @returns {THREE.Vector3} La nouvelle position du kite après application des contraintes.
   */
  private integratePhysicsWithConstraints(
    kite: StructuredObject,
    forces: THREE.Vector3,
    handles: { left: THREE.Vector3; right: THREE.Vector3 },
    deltaTime: number
  ): THREE.Vector3 {
    // 1. Calcul de l'accélération : a = F / m
    const acceleration = forces.clone().divideScalar(this.KITE_MASS);

    // Limiter l'accélération pour éviter l'explosion numérique
    if (acceleration.lengthSq() > PhysicsConstants.MAX_ACCELERATION * PhysicsConstants.MAX_ACCELERATION) {
      acceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ACCELERATION);
    }

    // 2. Intégration de la vitesse (Euler) : v(t+dt) = v(t) + a·dt
    this.velocity.add(acceleration.multiplyScalar(deltaTime));

    // 3. Amortissement linéaire pour simuler la résistance de l'air
    this.velocity.multiplyScalar(CONFIG.get('physics').linearDamping);

    // 4. Garde-fou de la vitesse maximale
    if (this.velocity.lengthSq() > PhysicsConstants.MAX_VELOCITY * PhysicsConstants.MAX_VELOCITY) {
      this.velocity.normalize().multiplyScalar(PhysicsConstants.MAX_VELOCITY);
    }

    // 5. Position prédite : x(t+dt) = x(t) + v·dt
    const predictedPosition = kite.position.clone()
      .add(this.velocity.clone().multiplyScalar(deltaTime));

    // 6. Appliquer les contraintes des lignes (PBD simplifié V8)
    const constrainedPosition = this.lineConstraints.enforceConstraints(
      kite,
      predictedPosition,
      handles.left,
      handles.right
    );

    return constrainedPosition;
  }

  /**
   * Met à jour l'orientation angulaire du cerf-volant.
   * @param {THREE.Vector3} torque - Le couple total appliqué au kite.
   * @param {number} dt - Le pas de temps.
   */
  private updateOrientation(torque: THREE.Vector3, dt: number): void {
    // Couple d'amortissement (résistance à la rotation dans l'air, proportionnel à la vitesse angulaire)
    const dampTorque = this.angularVelocity.clone().multiplyScalar(-this.ANGULAR_DRAG_COEFF);
    const effectiveTorque = torque.clone().add(dampTorque);

    // Dynamique rotationnelle : α = T / I (accélération angulaire = Couple / Inertie)
    const angularAcceleration = effectiveTorque.divideScalar(this.KITE_INERTIA); // Utilise l'inertie du kite

    // Limiter l'accélération angulaire pour éviter des rotations irréalistes
    if (angularAcceleration.lengthSq() > PhysicsConstants.MAX_ANGULAR_ACCELERATION * PhysicsConstants.MAX_ANGULAR_ACCELERATION) {
      angularAcceleration.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_ACCELERATION);
    }

    // Mise à jour de la vitesse angulaire
    this.angularVelocity.add(angularAcceleration.multiplyScalar(dt));
    // Appliquer l'amortissement angulaire
    this.angularVelocity.multiplyScalar(CONFIG.get('physics').angularDamping);

    // Limiter la vitesse angulaire maximale
    if (this.angularVelocity.lengthSq() > PhysicsConstants.MAX_ANGULAR_VELOCITY * PhysicsConstants.MAX_ANGULAR_VELOCITY) {
      this.angularVelocity.normalize().multiplyScalar(PhysicsConstants.MAX_ANGULAR_VELOCITY);
    }
  }

  /**
   * Retourne la vitesse linéaire actuelle du kite.
   * @returns {THREE.Vector3} La vitesse du kite.
   */
  getVelocity(): THREE.Vector3 { return this.velocity.clone(); }

  /**
   * Retourne les dernières données aérodynamiques calculées.
   * @returns {any} Un objet contenant les données aérodynamiques pour le debug/UI.
   */
  getLastAerodynamics(): any {
    return this.lastAeroData || { apparent: new THREE.Vector3(), lift: new THREE.Vector3(), drag: new THREE.Vector3(), aoaDeg: 0, stallFactor: 1.0, surfaces: [] };
  }

  /**
   * Retourne les dernières tensions calculées pour les lignes.
   * @returns {{ left: number; right: number }} Un objet contenant les tensions gauche et droite.
   */
  getLastLineTensions(): { left: number; right: number } {
    return { left: this.lastLeftTension, right: this.lastRightTension };
  }

  /**
   * Obtient l'état actuel des contraintes physiques (sol, limites du monde).
   * @param {THREE.Object3D} kite - L'objet 3D du kite.
   * @returns {{ onGround: boolean; atBoundary: boolean }} L'état des contraintes.
   */
  getConstraintStatus(kite: THREE.Object3D): { onGround: boolean; atBoundary: boolean } {
    return this.physicsConstraints.getConstraintStatus(kite);
  }

  /**
   * Réinitialise l'état physique du moteur (vitesses, positions précédentes, forces lissées).
   */
  reset(): void {
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.previousPosition.set(0, 0, 0);
    this.smoothedForce.set(0, 0, 0);
    this.smoothedTorque.set(0, 0, 0);
    this.lastLeftTension = 0;
    this.lastRightTension = 0;
    console.log('🔄 Moteur physique réinitialisé');
  }

  /**
   * Met à jour la longueur maximale des lignes.
   * @param {number} length - La nouvelle longueur maximale des lignes.
   */
  setLineLength(length: number): void {
    this.lineConstraints.setMaxLength(length);
  }
}
