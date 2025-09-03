/**
 * history.ts — Stockage léger de l'historique de vol
 */

import * as THREE from 'three';

export class FlightHistory {
  private static readonly HISTORY_SIZE = 120; // ~2s à 60fps

  private positions: THREE.Vector3[] = [];
  private forces: number[] = [];

  add(position: THREE.Vector3, totalForce: number): void {
    this.positions.push(position.clone());
    this.forces.push(totalForce);
    if (this.positions.length > FlightHistory.HISTORY_SIZE) {
      this.positions.shift();
      this.forces.shift();
    }
  }
}

