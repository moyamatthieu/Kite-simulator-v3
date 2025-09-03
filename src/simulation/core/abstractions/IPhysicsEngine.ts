/**
 * Interface principale du moteur physique - respect du Dependency Inversion Principle
 */
import { Vector3D, Quaternion3D } from '@simulation/core/types/PhysicsTypes';
import { IPhysicsConfig } from '../types/SimulationTypes';

// Ré-export pour compatibilité (avec export type pour isolatedModules)
export type { IPhysicsConfig };

export interface IPhysicsEngine {
  /**
   * Exécute une étape de simulation physique
   */
  step(
    deltaTime: number,
    kiteState: IKiteState,
    controlInput: IControlInput,
    pilotHandles: IPilotHandles
  ): IPhysicsResult;

  /**
   * Réinitialise l'état physique du moteur
   */
  reset(): void;

  /**
   * Met à jour la configuration physique
   */
  updateConfig(config: IPhysicsConfig): void;

  /**
   * Obtient l'état actuel des contraintes
   */
  getConstraintStatus(): IConstraintStatus;
}

export interface IKiteState {
  readonly position: Vector3D;
  readonly quaternion: Quaternion3D;
  readonly velocity: Vector3D;
  readonly angularVelocity: Vector3D;
  readonly mass: number;
  readonly inertia: number;
}

export interface IControlInput {
  readonly steer: number;
  readonly tensionDiff?: number;
}

export interface IPilotHandles {
  readonly left: Vector3D;
  readonly right: Vector3D;
}

export interface IPhysicsResult {
  readonly totalForce: number;
  readonly totalTension: number;
  readonly angleOfAttack: number;
  readonly airspeed: number;
  readonly leftTension: number;
  readonly rightTension: number;
  readonly stallFactor: number;
}

// IPhysicsConfig est maintenant importé depuis SimulationTypes

export interface IConstraintStatus {
  readonly onGround: boolean;
  readonly atBoundary: boolean;
  readonly linesTaut: boolean;
}