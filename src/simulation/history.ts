/**
 * `history.ts` - Gestion de l'historique de vol de la simulation.
 *
 * Cette classe enregistre un historique limité des positions du kite et des forces totales
 * s'y appliquant. Elle permet de suivre la trajectoire et l'intensité des forces sur une
 * courte période, utile pour l'analyse ou la visualisation de debug.
 */

import * as THREE from 'three';

export class FlightHistory {
  // `HISTORY_SIZE` : Nombre maximal d'enregistrements à conserver.
  // Déterminé pour stocker environ 2 secondes d'historique à 60 images par seconde.
  private static readonly HISTORY_SIZE = 120;

  private positions: THREE.Vector3[] = []; // Historique des positions du kite
  private forces: number[] = [];           // Historique des forces totales appliquées au kite

  /**
   * Ajoute une nouvelle entrée à l'historique de vol.
   * Si l'historique dépasse la taille maximale, la plus ancienne entrée est supprimée.
   * @param {THREE.Vector3} position - La position actuelle du kite.
   * @param {number} totalForce - La magnitude de la force totale appliquée au kite.
   */
  add(position: THREE.Vector3, totalForce: number): void {
    this.positions.push(position.clone()); // Ajoute une copie de la position actuelle
    this.forces.push(totalForce);          // Ajoute la force totale

    // Maintient la taille de l'historique en supprimant les anciennes entrées si nécessaire
    if (this.positions.length > FlightHistory.HISTORY_SIZE) {
      this.positions.shift(); // Supprime la première (plus ancienne) position
      this.forces.shift();    // Supprime la première (plus ancienne) force
    }
  }

  /**
   * Retourne l'historique des positions.
   * @returns {THREE.Vector3[]} Un tableau des positions enregistrées.
   */
  getPositions(): THREE.Vector3[] {
    return this.positions;
  }

  /**
   * Retourne l'historique des forces.
   * @returns {number[]} Un tableau des forces enregistrées.
   */
  getForces(): number[] {
    return this.forces;
  }
}

