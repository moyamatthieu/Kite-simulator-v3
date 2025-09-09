/**
 * wind.ts — Générateur de vent compatible V8
 *
 * SYSTÈME DE COORDONNÉES V8 :
 * - Direction 0° = vent de face poussant vers -Z
 * - Turbulences cohérentes avec fréquences multiples
 * - Paramètres identiques à V8 pour comportement équivalent
 */

import * as THREE from 'three';
import { CONFIG } from '@/simulation/config/SimulationConfig';

export class WindSimulator {
  private speed: number; // m/s
  private direction: number; // degrés
  private turbulence: number; // Turbulence par défaut V8 (3%)
  private time: number = 0;

  // Paramètres turbulences
  private readonly turbulenceScale: number;
  private readonly turbulenceFreqBase: number;
  private readonly turbulenceFreqY = 1.3;
  private readonly turbulenceFreqZ = 0.7;
  private readonly turbulenceIntensityXZ = 0.8;
  private readonly turbulenceIntensityY = 0.2;
  private readonly maxApparentSpeed: number;

  constructor(initialSpeedMs?: number, initialDirectionDeg?: number) {
    const windConfig = CONFIG.get('wind');
    this.speed = initialSpeedMs !== undefined ? initialSpeedMs : (windConfig.defaultSpeed * 1000) / 3600; // Convert km/h to m/s
    this.direction = initialDirectionDeg !== undefined ? initialDirectionDeg : windConfig.defaultDirection;
    this.turbulence = windConfig.defaultTurbulence; // Utilise la turbulence de la config
    this.turbulenceScale = windConfig.turbulenceScale;
    this.turbulenceFreqBase = windConfig.turbulenceFreqBase;
    this.maxApparentSpeed = windConfig.maxApparentSpeed;
  }


  /**
   * Définit à la fois la vitesse et la direction du vent.
   * @param {number} speedMs - La nouvelle vitesse du vent en mètres par seconde.
   * @param {number} directionDeg - La nouvelle direction du vent en degrés.
   */
  set(speedMs: number, directionDeg: number): void {
    this.speed = speedMs;
    this.direction = directionDeg;
  }

  /**
   * Définit uniquement la vitesse du vent.
   * @param {number} speedMs - La nouvelle vitesse du vent en mètres par seconde.
   */
  setSpeed(speedMs: number): void {
    this.speed = speedMs;
  }

  /**
   * Définit uniquement la direction du vent.
   * @param {number} directionDeg - La nouvelle direction du vent en degrés.
   */
  setDirection(directionDeg: number): void {
    this.direction = directionDeg;
  }

  setTurbulence(turbulencePercent: number): void {
    this.turbulence = turbulencePercent; // 0..1 (0% à 100%)
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
  }

  /**
   * Obtient le vecteur de vent avec turbulences (EXACTEMENT V8)
   */
  getVector(): THREE.Vector3 {
    // Conversion direction : V8 utilise 0° = vent poussant vers -Z
    const windRad = (this.direction * Math.PI) / 180;

    // Vecteur de base (COORDONNÉES V8)
    const windVector = new THREE.Vector3(
      Math.sin(windRad) * this.speed,  // X
      0,                                // Y (pas de vent vertical de base)
      -Math.cos(windRad) * this.speed   // Z (0° = vers -Z comme V8)
    );

    // Turbulences V8 (si activées)
    if (this.turbulence > 0) {
      const turbIntensity = this.turbulence * this.turbulenceScale;
      const freq = this.turbulenceFreqBase;

      // Variations sinusoïdales multiples V8
      windVector.x += Math.sin(this.time * freq) * this.speed * turbIntensity * this.turbulenceIntensityXZ;
      windVector.y += Math.sin(this.time * freq * this.turbulenceFreqY) * this.speed * turbIntensity * this.turbulenceIntensityY;
      windVector.z += Math.cos(this.time * freq * this.turbulenceFreqZ) * this.speed * turbIntensity * this.turbulenceIntensityXZ;
    }

    return windVector;
  }

  /**
   * Calcule le vent apparent (V8) : vent réel - vitesse du kite
   */
  getApparentWind(kiteVelocity: THREE.Vector3): THREE.Vector3 {
    const windVector = this.getVector();
    const apparent = windVector.clone().sub(kiteVelocity);

    // Limite V8 pour éviter des valeurs irréalistes
    if (apparent.length() > this.maxApparentSpeed) {
      apparent.setLength(this.maxApparentSpeed);
    }

    return apparent;
  }

  // Getters pour debug
  getParams(): { speed: number; direction: number; turbulence: number } {
    return {
      speed: this.speed,
      direction: this.direction,
      turbulence: this.turbulence
    };
  }
}
