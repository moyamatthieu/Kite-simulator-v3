/**
 * Interface pour les calculs aérodynamiques - respect du Single Responsibility Principle
 */
import { Vector3D, Quaternion3D, IAerodynamicForces, IWindState } from '@simulation/core/types/PhysicsTypes';

export interface IAerodynamicsCalculator {
  /**
   * Calcule les forces aérodynamiques sur le cerf-volant
   */
  calculateForces(
    windApparent: Vector3D,
    kiteOrientation: Quaternion3D,
    windState?: IWindState
  ): IAerodynamicForces;

  /**
   * Calcule les métriques aérodynamiques (angle d'attaque, facteur de décrochage, etc.)
   */
  calculateMetrics(
    windApparent: Vector3D,
    kiteOrientation: Quaternion3D
  ): IAerodynamicsMetrics;

  /**
   * Met à jour la configuration aérodynamique
   */
  updateConfiguration(config: IAerodynamicsConfig): void;
}

export interface IAerodynamicsMetrics {
  readonly angleOfAttackDegrees: number;
  readonly stallFactor: number;
  readonly effectiveArea: number;
  readonly liftToDragRatio: number;
}

export interface IAerodynamicsConfig {
  readonly airDensity: number;
  readonly stallAngle: number;
  readonly maxLiftCoefficient: number;
  readonly minDragCoefficient: number;
  readonly stallSmoothness: number;
}