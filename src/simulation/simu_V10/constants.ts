/**
* constants.ts — Constantes physiques et paramètres globaux
*/

export class PhysicsConstants {
  static readonly EPSILON = 1e-4;
  static readonly GRAVITY = 9.81; // m/s^2
  static readonly GROUND_FRICTION = 0.85; // Friction du sol (15% de perte)

  // Limites de sécurité
  static readonly MAX_FORCE = 1000; // N
  static readonly MAX_VELOCITY = 30; // m/s
  static readonly MAX_ANGULAR_VELOCITY = 25; // rad/s environ

  // Propriétés physiques du cerf-volant
  static readonly KITE_MASS = 0.22; // kg
  static readonly KITE_INERTIA = 0.05; // kg·m² - Inertie angulaire
  static readonly ANGULAR_DAMPING = 0.985; // Amortissement angulaire
  static readonly ANGULAR_DRAG_COEFF = 0.08; // Coefficient de traînée angulaire
}

export interface SimParams {
  windSpeed: number; // m/s
  windDirectionDeg: number; // 0..360
  paused: boolean;
}

export const defaultParams: SimParams = {
  windSpeed: 12, // Vent plus fort comme V8 (12 m/s = 43 km/h)
  windDirectionDeg: 0,
  paused: false,
};

