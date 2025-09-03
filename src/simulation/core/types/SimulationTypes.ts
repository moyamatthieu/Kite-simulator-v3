/**
 * Types centralisés pour la simulation
 * Évite la duplication entre les différents modules
 */

export interface IPhysicsConfig {
  readonly gravity: number;
  readonly linearDamping: number;
  readonly angularDamping: number;
  readonly maxForce: number;
  readonly maxVelocity: number;
  readonly maxAngularVelocity: number;
  readonly timeStep: number;
  readonly subSteps: number;
}

export interface IWindConfig {
  readonly baseSpeed: number; // km/h
  readonly direction: number; // degrés
  readonly turbulenceIntensity: number; // 0-1
  readonly gustiness: number; // 0-1
  readonly windShear: number; // variation avec l'altitude
  readonly coherenceLength: number;
}

export interface IKiteConfig {
  readonly mass: number;
  readonly area: number;
  readonly aspectRatio: number;
  readonly dragCoefficient: number;
  readonly liftCoefficient: number;
  readonly inertia: number;
}

export interface ILinesConfig {
  readonly length: number;
  readonly elasticity: number;
  readonly damping: number;
}

export interface IRenderingConfig {
  readonly enablePhysicsDebug: boolean;
  readonly enableWindVisualization: boolean;
  readonly enableForceVectors: boolean;
}

export interface ISimulationConfig {
  readonly physics: IPhysicsConfig;
  readonly wind: IWindConfig;
  readonly kite: IKiteConfig;
  readonly lines: ILinesConfig;
  readonly rendering: IRenderingConfig;
}