/**
 * `lines.ts` - Gestionnaire des lignes de contrôle 3D.
 *
 * Cette classe est responsable de la création, de la mise à jour et de la représentation
 * visuelle des lignes de contrôle (gauche et droite) entre le pilote et le kite dans l'environnement 3D.
 * Elle se concentre uniquement sur l'aspect graphique des lignes.
 */

import * as THREE from 'three';

export class LineSystem {
  private group = new THREE.Group();   // Le groupe contient toutes les lignes pour faciliter leur gestion
  private leftLine: THREE.Line;        // L'objet THREE.Line pour la ligne gauche
  private rightLine: THREE.Line;       // L'objet THREE.Line pour la ligne droite

  constructor() {
    this.group.name = 'LineSystem'; // Nomme le groupe pour une meilleure identification dans l'éditeur Three.js

    // Matériaux pour les lignes (couleurs distinctes pour gauche et droite)
    const materialLeft = new THREE.LineBasicMaterial({ color: 0x1e90ff }); // Bleu pour la ligne gauche
    const materialRight = new THREE.LineBasicMaterial({ color: 0xff5555 }); // Rouge pour la ligne droite

    // Géométries initiales avec deux points (début et fin)
    const geometryLeft = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const geometryRight = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);

    // Crée les objets Line avec leurs géométries et matériaux
    this.leftLine = new THREE.Line(geometryLeft, materialLeft);
    this.rightLine = new THREE.Line(geometryRight, materialRight);

    // Ajoute les lignes au groupe
    this.group.add(this.leftLine, this.rightLine);
  }

  /**
   * Met à jour les positions des points d'extrémité des lignes.
   * @param {THREE.Vector3} leftA - Point de départ de la ligne gauche (ex: main du pilote).
   * @param {THREE.Vector3} leftB - Point d'arrivée de la ligne gauche (ex: bord du kite).
   * @param {THREE.Vector3} rightA - Point de départ de la ligne droite (ex: main du pilote).
   * @param {THREE.Vector3} rightB - Point d'arrivée de la ligne droite (ex: bord du kite).
   */
  update(leftA: THREE.Vector3, leftB: THREE.Vector3, rightA: THREE.Vector3, rightB: THREE.Vector3): void {
    // Met à jour la position des points de la ligne gauche
    const positionAttributeLeft = this.leftLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttributeLeft.setXYZ(0, leftA.x, leftA.y, leftA.z);
    positionAttributeLeft.setXYZ(1, leftB.x, leftB.y, leftB.z);
    positionAttributeLeft.needsUpdate = true; // Indique à Three.js que la géométrie a changé

    // Met à jour la position des points de la ligne droite
    const positionAttributeRight = this.rightLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttributeRight.setXYZ(0, rightA.x, rightA.y, rightA.z);
    positionAttributeRight.setXYZ(1, rightB.x, rightB.y, rightB.z);
    positionAttributeRight.needsUpdate = true; // Indique à Three.js que la géométrie a changé
  }

  /**
   * Retourne l'objet 3D principal (groupe) contenant les lignes.
   * @returns {THREE.Object3D} Le groupe Three.js représentant le système de lignes.
   */
  get object3d(): THREE.Object3D {
    return this.group;
  }
}

