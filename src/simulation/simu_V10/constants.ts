/**
 * constants.ts — Constantes physiques EXACTEMENT comme V8
 * 
 * VALEURS ÉPROUVÉES V8 :
 * Ces paramètres ont été finement ajustés dans V8 pour un comportement de vol optimal
 * Chaque modification peut impacter significativement la stabilité et le réalisme
 */

export class PhysicsConstants {
  // Valeurs de base V8
  static readonly EPSILON = 1e-4;
  static readonly GRAVITY = 9.81; // m/s²
  static readonly GROUND_FRICTION = 0.85; // Friction du sol V8

  // Limites de sécurité V8 (éprouvées)
  static readonly MAX_FORCE = 1000; // N - Force max comme soulever 100kg
  static readonly MAX_VELOCITY = 30; // m/s - 108 km/h max
  static readonly MAX_ANGULAR_VELOCITY = 25; // rad/s - Presque 1 tour par seconde

  // Propriétés physiques du cerf-volant V8
  static readonly KITE_MASS = 0.28; // kg - Masse V8 optimisée
  static readonly KITE_INERTIA = 0.08; // kg·m² - Inertie V8 (pas 0.05)
  static readonly ANGULAR_DAMPING = 0.85; // Amortissement angulaire V8 équilibré
  static readonly ANGULAR_DRAG_COEFF = 0.10; // Coefficient V8 (pas 0.08)

  // Paramètres de contrôle et contraintes V8
  static readonly CONTROL_DEADZONE = 0.01;
  static readonly LINE_CONSTRAINT_TOLERANCE = 0.0005;
  static readonly LINE_TENSION_FACTOR = 0.99;
  static readonly MAX_ACCELERATION = 100; // m/s²
  static readonly MAX_ANGULAR_ACCELERATION = 20; // rad/s²
}

export interface SimParams {
  windSpeed: number; // km/h (interface utilisateur)
  windDirectionDeg: number; // 0..360
  paused: boolean;
}

export const defaultParams: SimParams = {
  windSpeed: 18, // km/h - Vent V8 optimal (5 m/s)
  windDirectionDeg: 0,
  paused: false,
};

