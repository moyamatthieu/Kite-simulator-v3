/**
 * `lines.ts` - Système de lignes : Physique géométrique pure avec PIVOTS LIBRES
 *
 * 🎯 PHYSIQUE GÉOMÉTRIQUE :
 * - Barre de contrôle tourne → poignées se déplacent dans l'espace world
 * - Nouvelles distances géométriques entre kite et poignées  
 * - Si distance > longueur max → ligne tendue → force vers poignée
 * - Si distance ≤ longueur max → ligne molle → aucune force (pivot libre)
 * 
 * 🌍 GÉOMÉTRIE DU CONTRÔLE :
 * - Rotation barre → déplacement géométrique des poignées
 * - Ligne gauche : Point contrôle gauche kite ↔ Poignée gauche (position world)
 * - Ligne droite : Point contrôle droit kite ↔ Poignée droite (position world)
 * - Asymétrie des distances → asymétrie des forces → couple émergent
 *
 * FONCTIONNALITÉS GÉOMÉTRIQUES :
 * - Forces basées sur distances réelles dans l'espace 3D
 * - Pivots libres : aucune force si ligne molle
 * - Tension proportionnelle à l'extension géométrique
 * - Représentation visuelle avec caténaire selon distance réelle
 */

import * as THREE from 'three';
import { PhysicsConstants, CONFIG } from '@core/constants';
import { Kite } from '@objects/Kite';
import { C_objet, C_objetConfig } from './C_objet';

/**
 * Une ligne individuelle entre 2 points avec contrainte de distance
 */
export class Line {
  private pointA: THREE.Vector3;  // Point fixe A
  private pointB: THREE.Vector3;  // Point fixe B 
  private maxLength: number;      // Distance maximale autorisée
  private visualLine: THREE.Line; // Représentation graphique

  constructor(
    pointA: THREE.Vector3,
    pointB: THREE.Vector3,
    maxLength: number,
    color: number = 0x333333
  ) {
    this.pointA = pointA;
    this.pointB = pointB;
    this.maxLength = maxLength;

    // Créer la représentation visuelle
    const material = new THREE.LineBasicMaterial({ color, linewidth: 2 });
    const geometry = new THREE.BufferGeometry().setFromPoints([pointA, pointB]);
    this.visualLine = new THREE.Line(geometry, material);
  }

  /**
   * Applique la contrainte de pivot libre - Empêche SEULEMENT l'étirement
   * Le point peut bouger librement sur une sphère de rayon maxLength
   * @param mobilePoint Le point qui peut bouger (sera modifié si nécessaire)
   * @param fixedPoint Le point fixe (centre du pivot)
   */
  enforceConstraint(mobilePoint: THREE.Vector3, fixedPoint: THREE.Vector3): void {
    const distance = fixedPoint.distanceTo(mobilePoint);

    // SEULEMENT si la ligne est étirée au-delà de sa longueur max
    if (distance > this.maxLength) {
      // Calculer la direction du point fixe vers le point mobile
      const direction = mobilePoint.clone().sub(fixedPoint).normalize();

      // Placer le point mobile à EXACTEMENT maxLength du point fixe
      // Le point peut ensuite bouger librement sur cette sphère
      const constrainedPosition = fixedPoint.clone().add(
        direction.multiplyScalar(this.maxLength)
      );

      // FORCER seulement la distance, pas la direction
      mobilePoint.copy(constrainedPosition);
    }

    // Si distance <= maxLength : AUCUNE contrainte !
    // Le point est complètement libre de bouger (pivot libre)
  }

  /**
   * Mesure la tension actuelle dans la ligne
   * Tension = 0 si ligne molle (pivot libre)
   * Tension > 0 seulement si ligne tendue à sa limite
   */
  getTension(): number {
    const distance = this.pointA.distanceTo(this.pointB);
    // Tension nulle si ligne molle (pivot complètement libre)
    // Tension = dépassement si ligne étirée
    return Math.max(0, distance - this.maxLength);
  }

  /**
   * Vérifie si la ligne est tendue
   */
  isTaut(): boolean {
    return this.pointA.distanceTo(this.pointB) >= this.maxLength;
  }

  /**
   * Distance actuelle entre les deux points
   */
  getCurrentDistance(): number {
    return this.pointA.distanceTo(this.pointB);
  }

  /**
   * Met à jour la représentation visuelle
   */
  updateVisual(): void {
    // Calcul de la caténaire si ligne molle
    const points = this.calculateDisplayPoints();
    this.visualLine.geometry.setFromPoints(points);
  }

  private calculateDisplayPoints(): THREE.Vector3[] {
    const distance = this.getCurrentDistance();

    // Si tendue, ligne droite
    if (distance >= this.maxLength) {
      return [this.pointA, this.pointB];
    }

    // Si molle, caténaire simple
    const points: THREE.Vector3[] = [];
    const segments = 5;
    const slack = this.maxLength - distance;
    const sag = slack * 0.1; // Léger affaissement

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = new THREE.Vector3().lerpVectors(this.pointA, this.pointB, t);
      // Affaissement au milieu
      point.y -= sag * t * (1 - t);
      points.push(point);
    }

    return points;
  }

  get object3d(): THREE.Object3D {
    return this.visualLine;
  }

  setMaxLength(length: number): void {
    this.maxLength = length;
  }

  getMaxLength(): number {
    return this.maxLength;
  }
}

/**
 * Système de 2 lignes indépendantes : gauche et droite
 */
export class LineSystem extends C_objet {
  private leftLine: Line;   // Ligne poignée gauche → contrôle gauche kite
  private rightLine: Line;  // Ligne poignée droite → contrôle droit kite

  // Points de connexion (références, mis à jour dynamiquement)
  private leftHandlePos = new THREE.Vector3();
  private rightHandlePos = new THREE.Vector3();
  private leftKitePos = new THREE.Vector3();
  private rightKitePos = new THREE.Vector3();

  constructor(lineLength: number = CONFIG.lines.defaultLength, config: C_objetConfig = {}) {
    super(config);

    // Créer les deux lignes avec couleurs distinctes
    this.leftLine = new Line(
      this.leftHandlePos,
      this.leftKitePos,
      lineLength,
      0x1e90ff // Bleu
    );

    this.rightLine = new Line(
      this.rightHandlePos,
      this.rightKitePos,
      lineLength,
      0xff5555 // Rouge
    );

    this.group.name = 'LineSystem';
    this.group.add(this.leftLine.object3d, this.rightLine.object3d);
  }

  protected createGeometry(): void {
    // La géométrie est créée dans le constructeur
  }

  /**
   * Calcule les forces de tension des lignes - Style SimulationV8 physique pure
   * Retourne les forces que les lignes appliquent au kite quand elles sont tendues
   */
  calculateLineTensions(
    kite: Kite,
    controlRotation: number,
    pilotPosition: THREE.Vector3
  ): {
    leftForce: THREE.Vector3;
    rightForce: THREE.Vector3;
    torque: THREE.Vector3;
  } {
    // Points d'attache des lignes sur le kite
    const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
    const ctrlRight = kite.getPoint('CTRL_DROIT');
    if (!ctrlLeft || !ctrlRight) {
      return { leftForce: new THREE.Vector3(), rightForce: new THREE.Vector3(), torque: new THREE.Vector3() };
    }

    // Transformer en coordonnées monde
    const leftWorld = ctrlLeft.clone().applyQuaternion(kite.quaternion).add(kite.position);
    const rightWorld = ctrlRight.clone().applyQuaternion(kite.quaternion).add(kite.position);

    // GÉOMÉTRIE : Calcul des nouvelles positions des poignées selon rotation barre
    this.updateHandlePositions(controlRotation, pilotPosition);

    // DISTANCES GÉOMÉTRIQUES : Mesurer distance actuelle entre points fixes
    const leftDistance = leftWorld.distanceTo(this.leftHandlePos);
    const rightDistance = rightWorld.distanceTo(this.rightHandlePos);

    // Directions des forces (du kite vers les poignées)
    const leftLineDir = this.leftHandlePos.clone().sub(leftWorld).normalize();
    const rightLineDir = this.rightHandlePos.clone().sub(rightWorld).normalize();

    // PRINCIPE CLÉ : Chaque ligne a une longueur MAX fixe (ex: 15m)
    // La tension est nulle si la ligne est molle, puis augmente progressivement
    // dans une "zone de raffermissement" avant d'atteindre la raideur maximale.
    let leftForce = new THREE.Vector3();
    let rightForce = new THREE.Vector3();

    const lineStiffness = CONFIG.lines.stiffness || 25000; // N/m
    const maxTension = CONFIG.lines.maxTension || 1000;    // N
    const STIFFENING_ZONE = 0.05; // 5% de la longueur de la ligne

    // Fonction pour une transition douce (smoothstep)
    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    // PHYSIQUE LIGNE GAUCHE : Raffermissement progressif
    const leftMaxLength = this.leftLine.getMaxLength();
    const leftStiffeningStart = leftMaxLength * (1 - STIFFENING_ZONE);

    if (leftDistance > leftStiffeningStart) {
      let tension = 0;
      if (leftDistance < leftMaxLength) {
        // Zone de raffermissement progressif
        const factor = smoothstep(leftStiffeningStart, leftMaxLength, leftDistance);
        tension = factor * lineStiffness * (leftDistance - leftStiffeningStart);
      } else {
        // Zone de raideur maximale (au-delà de la longueur max)
        const extension = leftDistance - leftMaxLength;
        tension = lineStiffness * (leftStiffeningStart * STIFFENING_ZONE + extension);
      }
      leftForce = leftLineDir.multiplyScalar(Math.min(tension, maxTension));
    }

    // PHYSIQUE LIGNE DROITE : Raffermissement progressif
    const rightMaxLength = this.rightLine.getMaxLength();
    const rightStiffeningStart = rightMaxLength * (1 - STIFFENING_ZONE);

    if (rightDistance > rightStiffeningStart) {
      let tension = 0;
      if (rightDistance < rightMaxLength) {
        // Zone de raffermissement progressif
        const factor = smoothstep(rightStiffeningStart, rightMaxLength, rightDistance);
        tension = factor * lineStiffness * (rightDistance - rightStiffeningStart);
      } else {
        // Zone de raideur maximale (au-delà de la longueur max)
        const extension = rightDistance - rightMaxLength;
        tension = lineStiffness * (rightStiffeningStart * STIFFENING_ZONE + extension);
      }
      rightForce = rightLineDir.multiplyScalar(Math.min(tension, maxTension));
    }

    // COUPLE ÉMERGENT : Résulte de l'asymétrie des tensions (comme SimulationV8)
    let totalTorque = new THREE.Vector3();

    // Couple ligne gauche (si tendue)
    if (leftForce.length() > 0) {
      const leftTorque = new THREE.Vector3().crossVectors(
        ctrlLeft.clone().applyQuaternion(kite.quaternion),
        leftForce
      );
      totalTorque.add(leftTorque);
    }

    // Couple ligne droite (si tendue)
    if (rightForce.length() > 0) {
      const rightTorque = new THREE.Vector3().crossVectors(
        ctrlRight.clone().applyQuaternion(kite.quaternion),
        rightForce
      );
      totalTorque.add(rightTorque);
    }

    return {
      leftForce,
      rightForce,
      torque: totalTorque
    };
  }

  /**
   * Met à jour les positions des points de connexion et applique les contraintes
   * SYSTÈME PBD (Position-Based Dynamics) AVANCÉ style SimulationV8
   * Solver sophistiqué qui respecte la contrainte de distance tout en
   * permettant la rotation naturelle du kite
   */
  updateAndEnforceConstraints(
    kite: Kite,
    controlRotation: number,
    pilotPosition: THREE.Vector3
  ): void {
    // 1. Mettre à jour les positions des poignées de la barre
    this.updateHandlePositions(controlRotation, pilotPosition);

    // 2. Mettre à jour les positions des points de contrôle du kite
    this.updateKiteControlPoints(kite);

    // 3. APPLIQUER LES CONTRAINTES PBD AVANCÉES
    this.enforceLineConstraintsPBD(kite);

    // 4. Mettre à jour l'affichage visuel
    this.leftLine.updateVisual();
    this.rightLine.updateVisual();
  }

  /**
   * Applique les contraintes des lignes - Solver PBD (Position-Based Dynamics) V8
   * Algorithme sophistiqué qui respecte la contrainte de distance tout en
   * permettant la rotation naturelle du kite
   */
  private enforceLineConstraintsPBD(kite: Kite): void {
    // PRINCIPE DE LA PYRAMIDE DE CONTRAINTE :
    // Le cerf-volant est constamment poussé par le vent contre la sphère de contrainte
    // Les lignes + brides forment une pyramide qui maintient une géométrie stable
    // Le kite "glisse" sur la surface de la sphère définie par la longueur des lignes
    // C'est quand il sort de cette sphère qu'il "décroche"

    const lineLength = this.getLineLength();
    const tol = PhysicsConstants.LINE_CONSTRAINT_TOLERANCE || 0.0005;

    const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
    const ctrlRight = kite.getPoint('CTRL_DROIT');
    if (!ctrlLeft || !ctrlRight) return;

    const mass = CONFIG.kite.mass;
    const inertia = CONFIG.kite.inertia;
    const predictedPosition = kite.position.clone();

    // Résolution PBD pour chaque ligne (style SimulationV8)
    const solveLine = (ctrlLocal: THREE.Vector3, handle: THREE.Vector3) => {
      const q = kite.quaternion;
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

      // Facteur d'amortissement pour réduire les oscillations (0.7 = 30% de correction)
      const dampingFactor = 0.7;

      // Corrections de position avec amortissement
      const dPos = n.clone().multiplyScalar(-invMass * lambda * dampingFactor);
      predictedPosition.add(dPos);

      // Corrections d'orientation avec amortissement
      const dTheta = alpha.clone().multiplyScalar(-invInertia * lambda * dampingFactor);
      const angle = dTheta.length();
      if (angle > PhysicsConstants.EPSILON) {
        const axis = dTheta.normalize();
        const dq = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        kite.quaternion.premultiply(dq).normalize();
      }

      // Correction de vitesse (si disponible dans l'état du kite)
      if (kite.userData.velocity && kite.userData.angularVelocity) {
        const q2 = kite.quaternion;
        const cpWorld2 = ctrlLocal.clone().applyQuaternion(q2).add(predictedPosition);
        const n2 = cpWorld2.clone().sub(handle).normalize();
        const r2 = cpWorld2.clone().sub(predictedPosition);
        const pointVel = kite.userData.velocity.clone()
          .add(new THREE.Vector3().crossVectors(kite.userData.angularVelocity, r2));
        const radialSpeed = pointVel.dot(n2);

        if (radialSpeed > 0) {
          const rxn = new THREE.Vector3().crossVectors(r2, n2);
          const eff = invMass + (rxn.lengthSq() * invInertia);
          const J = -radialSpeed / Math.max(eff, PhysicsConstants.EPSILON);

          kite.userData.velocity.add(n2.clone().multiplyScalar(J * invMass));
          const angImpulse = new THREE.Vector3().crossVectors(r2, n2.clone().multiplyScalar(J));
          kite.userData.angularVelocity.add(angImpulse.multiplyScalar(invInertia));
        }
      }
    };

    // Deux passes pour mieux satisfaire les contraintes (style SimulationV8)
    for (let i = 0; i < 2; i++) {
      solveLine(ctrlLeft, this.leftHandlePos);
      solveLine(ctrlRight, this.rightHandlePos);
    }

    // Appliquer la position finale
    kite.position.copy(predictedPosition);
  }

  private updateHandlePositions(controlRotation: number, pilotPosition: THREE.Vector3): void {
    // GÉOMÉTRIE DE LA BARRE : barre de 60cm avec poignées aux extrémités
    const barHalfWidth = CONFIG.controlBar.width * 0.5; // 30cm de chaque côté
    const barRight = new THREE.Vector3(1, 0, 0);

    // ROTATION DE LA BARRE : comme un guidon de vélo qui tourne
    // controlRotation > 0 → barre tourne vers la gauche
    // controlRotation < 0 → barre tourne vers la droite
    const leftOffset = barRight.clone().multiplyScalar(-barHalfWidth)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), controlRotation);
    const rightOffset = barRight.clone().multiplyScalar(barHalfWidth)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), controlRotation);

    // NOUVELLES POSITIONS WORLD des poignées après rotation
    this.leftHandlePos.copy(pilotPosition).add(leftOffset);
    this.rightHandlePos.copy(pilotPosition).add(rightOffset);

    // RÉSULTAT : Les poignées ont bougé dans l'espace world
    // → Les distances géométriques kite ↔ poignées ont changé
    // → Certaines lignes peuvent devenir tendues, d'autres molles
  }

  private updateKiteControlPoints(kite: Kite): void {
    const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
    const ctrlRight = kite.getPoint('CTRL_DROIT');

    if (ctrlLeft && ctrlRight) {
      // Positions mondiales des points de contrôle
      this.leftKitePos.copy(ctrlLeft).applyQuaternion(kite.quaternion).add(kite.position);
      this.rightKitePos.copy(ctrlRight).applyQuaternion(kite.quaternion).add(kite.position);
    }
  }

  private resolveKitePosition(
    kite: Kite,
    constrainedLeftPos: THREE.Vector3,
    constrainedRightPos: THREE.Vector3
  ): void {
    // PHYSIQUE PURE : Calculer SEULEMENT la position basée sur les contraintes géométriques
    // L'orientation émerge UNIQUEMENT des forces aérodynamiques dans SimulationApp
    const ctrlLeft = kite.getPoint('CTRL_GAUCHE');
    const ctrlRight = kite.getPoint('CTRL_DROIT');

    if (!ctrlLeft || !ctrlRight) return;

    // Position locale des points de contrôle dans le repère du kite
    const leftLocal = ctrlLeft.clone();
    const rightLocal = ctrlRight.clone();

    // Centre local entre les deux points de contrôle
    const centerLocal = leftLocal.clone().add(rightLocal).multiplyScalar(0.5);

    // Centre mondial contraint par les deux lignes
    const centerWorld = constrainedLeftPos.clone().add(constrainedRightPos).multiplyScalar(0.5);

    // Calculer la nouvelle position du kite basée sur les contraintes géométriques
    const centerLocalWorld = centerLocal.clone().applyQuaternion(kite.quaternion);
    const newKitePosition = centerWorld.clone().sub(centerLocalWorld);

    // Appliquer SEULEMENT la nouvelle position
    // L'orientation sera gérée par les forces aérodynamiques dans updatePhysics()
    kite.position.copy(newKitePosition);

    // *** AUCUNE ROTATION ARTIFICIELLE ***
    // Le kite s'oriente naturellement via :
    // 1. Forces aérodynamiques (AerodynamicsCalculator)
    // 2. Couples émergents (asymétrie des forces)
    // 3. Contraintes géométriques pures (distance seulement)
  }

  /**
   * Obtient les informations sur les tensions des lignes
   */
  getLineTensions(): {
    leftTension: number;
    rightTension: number;
    leftDistance: number;
    rightDistance: number;
    leftTaut: boolean;
    rightTaut: boolean;
  } {
    return {
      leftTension: this.leftLine.getTension(),
      rightTension: this.rightLine.getTension(),
      leftDistance: this.leftLine.getCurrentDistance(),
      rightDistance: this.rightLine.getCurrentDistance(),
      leftTaut: this.leftLine.isTaut(),
      rightTaut: this.rightLine.isTaut()
    };
  }

  /**
   * Change la longueur des lignes
   */
  setLineLength(length: number): void {
    this.leftLine.setMaxLength(length);
    this.rightLine.setMaxLength(length);
  }

  /**
   * Obtient la longueur des lignes
   */
  getLineLength(): number {
    return this.leftLine.getMaxLength();
  }

  /**
   * Met à jour uniquement l'affichage visuel (sans contraintes)
   * Utile pour compatibilité avec ancien code
   */
  updateVisual(leftA: THREE.Vector3, leftB: THREE.Vector3, rightA: THREE.Vector3, rightB: THREE.Vector3): void {
    // Mettre à jour les positions des points de référence
    this.leftHandlePos.copy(leftA);
    this.leftKitePos.copy(leftB);
    this.rightHandlePos.copy(rightA);
    this.rightKitePos.copy(rightB);

    // Mettre à jour l'affichage
    this.leftLine.updateVisual();
    this.rightLine.updateVisual();
  }

  get object3d(): THREE.Object3D {
    return this.group;
  }
}
