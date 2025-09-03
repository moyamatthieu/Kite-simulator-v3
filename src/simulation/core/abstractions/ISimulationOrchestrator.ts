/**
 * Interface principale de l'orchestrateur de simulation - respect du Single Responsibility Principle
 * Remplace la classe monolithique SimulationAppV10
 */
import { Vector3D } from '@simulation/core/types/PhysicsTypes';
import { 
  ISimulationConfig, 
  IPhysicsConfig, 
  IWindConfig, 
  IKiteConfig, 
  ILinesConfig, 
  IRenderingConfig 
} from '../types/SimulationTypes';

// Ré-export pour compatibilité (avec export type pour isolatedModules)
export type { 
  ISimulationConfig, 
  IPhysicsConfig, 
  IWindConfig, 
  IKiteConfig, 
  ILinesConfig, 
  IRenderingConfig 
};

export interface ISimulationOrchestrator {
  /**
   * Initialise la simulation
   */
  initialize(): Promise<void>;

  /**
   * Démarre la simulation
   */
  start(): void;

  /**
   * Met en pause la simulation
   */
  pause(): void;

  /**
   * Arrête la simulation
   */
  stop(): void;

  /**
   * Réinitialise la simulation
   */
  reset(): void;

  /**
   * Met à jour un frame de simulation
   */
  update(deltaTime: number): void;

  /**
   * Configure la simulation
   */
  configure(config: ISimulationConfig): void;

  /**
   * Obtient l'état actuel de la simulation
   */
  getState(): ISimulationState;
}

// Toutes les interfaces de configuration sont maintenant importées depuis SimulationTypes

export interface ISimulationState {
  readonly isRunning: boolean;
  readonly isPaused: boolean;
  readonly currentTime: number;
  readonly kitePosition: Vector3D;
  readonly kiteVelocity: Vector3D;
  readonly windSpeed: number;
  readonly metrics: ISimulationMetrics;
}

export interface ISimulationMetrics {
  readonly frameRate: number;
  readonly airspeed: number;
  readonly altitude: number;
  readonly totalForce: number;
  readonly angleOfAttack: number;
}