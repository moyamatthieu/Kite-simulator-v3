/**
 * Interface pour la simulation du vent - respect du Single Responsibility Principle
 */
import { Vector3D, IWindState } from '@simulation/core/types/PhysicsTypes';
import { IWindConfig } from '../types/SimulationTypes';

export interface IWindSimulator {
  /**
   * Obtient le vecteur de vent actuel
   */
  getVector(): Vector3D;

  /**
   * Obtient l'état complet du vent
   */
  getState(): IWindState;

  /**
   * Met à jour la simulation du vent
   */
  update(deltaTime: number): void;

  /**
   * Configure les paramètres du vent
   */
  configure(config: IWindConfig): void;

  /**
   * Réinitialise la simulation du vent
   */
  reset(): void;
}

// IWindConfig est maintenant importé depuis SimulationTypes

export interface IWindLayer {
  readonly altitude: number;
  readonly speed: number;
  readonly direction: number;
  readonly turbulence: number;
}