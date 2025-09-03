/**
 * pilot.ts — Représentation simple du pilote
 */

import * as THREE from 'three';

export class Pilot3D {
  private group = new THREE.Group();

  constructor() {
    this.group.name = 'Pilot3D';

    // Corps (cylindre)
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 1.6, 16),
      new THREE.MeshStandardMaterial({ color: 0x444c66, roughness: 0.9 })
    );
    body.position.y = 0.8;
    this.group.add(body);

    // Tête (sphère)
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffe0bd })
    );
    head.position.y = 1.7;
    this.group.add(head);

    // Position du pilote
    this.group.position.set(0, 0, -3);
  }

  get object3d(): THREE.Object3D { return this.group; }
}

