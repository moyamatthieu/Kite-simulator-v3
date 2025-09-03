/**
 * Interface pour les contraintes de lignes - respect du Single Responsibility Principle
 */
import { Vector3D } from '@simulation/core/types/PhysicsTypes';

export interface ILineConstraints {
  /**
   * Applique les contraintes des lignes et retourne la position corrigée
   */
  enforceConstraints(
    kiteState: IKiteConstraintState,
    predictedPosition: Vector3D,
    leftHandle: Vector3D,
    rightHandle: Vector3D
  ): Vector3D;

  /**
   * Définit la direction de la barre de contrôle
   */
  setSteer(steerValue: number): void;

  /**
   * Obtient les longueurs maximales actuelles des lignes
   */
  getMaxLengths(): ILineLengths;

  /**
   * Définit la longueur maximale des lignes
   */
  setMaxLength(length: number): void;

  /**
   * Met à jour la configuration des lignes
   */
  updateConfiguration(config: ILineConstraintsConfig): void;

  /**
   * Calcule les forces de tension des lignes
   */
  calculateTensions(
    kiteState: IKiteConstraintState,
    leftHandle: Vector3D,
    rightHandle: Vector3D
  ): ILineTensions;
}

export interface IKiteConstraintState {
  readonly position: Vector3D;
  readonly quaternion: any; // Quaternion générique
  readonly controlPoints: {
    readonly left: Vector3D;
    readonly right: Vector3D;
  };
}

export interface ILineLengths {
  readonly left: number;
  readonly right: number;
}

export interface ILineTensions {
  readonly leftForce: Vector3D;
  readonly rightForce: Vector3D;
  readonly totalTorque: Vector3D;
}

export interface ILineConstraintsConfig {
  readonly baseLength: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly maxTension: number;
  readonly controlSensitivity: number;
  readonly asymmetryFactor: number;
}