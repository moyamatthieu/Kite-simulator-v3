/**
 * lines.ts — Système de lignes (simple)
 */

import * as THREE from 'three';

export class LineSystem {
  private group = new THREE.Group();
  private leftLine: THREE.Line;
  private rightLine: THREE.Line;

  constructor() {
    this.group.name = 'LineSystem';

    const matL = new THREE.LineBasicMaterial({ color: 0x1e90ff });
    const matR = new THREE.LineBasicMaterial({ color: 0xff5555 });
    const geoL = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const geoR = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.leftLine = new THREE.Line(geoL, matL);
    this.rightLine = new THREE.Line(geoR, matR);
    this.group.add(this.leftLine, this.rightLine);
  }

  update(leftA: THREE.Vector3, leftB: THREE.Vector3, rightA: THREE.Vector3, rightB: THREE.Vector3): void {
    const posL = this.leftLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    posL.setXYZ(0, leftA.x, leftA.y, leftA.z);
    posL.setXYZ(1, leftB.x, leftB.y, leftB.z);
    posL.needsUpdate = true;

    const posR = this.rightLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    posR.setXYZ(0, rightA.x, rightA.y, rightA.z);
    posR.setXYZ(1, rightB.x, rightB.y, rightB.z);
    posR.needsUpdate = true;
  }

  get object3d(): THREE.Object3D { return this.group; }
}

