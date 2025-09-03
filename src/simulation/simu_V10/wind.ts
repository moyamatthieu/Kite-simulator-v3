/**
 * wind.ts — Génération du vent (simple)
 */

import * as THREE from 'three';

export class WindSimulator {
  private baseSpeed: number; // m/s
  private dirRad: number; // radians (0 = +X)
  private turbulence: number = 0; // 0..1
  private t: number = 0; // temps interne pour bruit

  constructor(speed: number, directionDeg: number) {
    this.baseSpeed = speed;
    this.dirRad = THREE.MathUtils.degToRad(directionDeg);
  }

  set(speed: number, directionDeg: number): void {
    this.baseSpeed = speed;
    this.dirRad = THREE.MathUtils.degToRad(directionDeg);
  }

  setTurbulence(amount: number): void {
    this.turbulence = THREE.MathUtils.clamp(amount, 0, 1);
  }

  update(dt: number): void {
    this.t += dt;
  }

  getVector(): THREE.Vector3 {
    // Vent dans le plan XZ (Y up) avec turbulences basées sur des sinusoïdes combinées
    const gust = this.turbulence * 0.5; // amplitude relative
    const s1 = Math.sin(this.t * 0.7);
    const s2 = Math.sin(this.t * 1.7 + 1.3);
    const s3 = Math.sin(this.t * 2.3 + 2.1);
    const noise = (s1 * 0.5 + s2 * 0.3 + s3 * 0.2); // [-1,1]
    const speed = Math.max(0, this.baseSpeed * (1 + gust * noise));

    const dirJitter = this.turbulence * 0.05 * noise; // +/- ~3°
    const dir = this.dirRad + dirJitter;

    const x = Math.cos(dir) * speed;
    const z = Math.sin(dir) * speed;
    return new THREE.Vector3(x, 0, z);
  }
}
