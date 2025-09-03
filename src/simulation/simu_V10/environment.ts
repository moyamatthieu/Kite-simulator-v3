/**
 * environment.ts — Sol, ciel et ambiance lumineuse
 */

import * as THREE from 'three';

export class Environment {
  private group = new THREE.Group();

  constructor() {
    this.group.name = 'Environment';

    // Sol vert
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d7d2a });
    const groundGeo = new THREE.CircleGeometry(50, 64);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'Ground';
    this.group.add(ground);

    // Quadrillage léger
    const grid = new THREE.GridHelper(40, 40, 0x335533, 0x224422);
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).transparent = true;
    this.group.add(grid);
  }

  get object3d(): THREE.Object3D { return this.group; }
}

