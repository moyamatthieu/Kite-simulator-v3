/**
 * control_bar.ts — Barre de contrôle 3D
 */

import * as THREE from 'three';

export class ControlBar3D {
  private group = new THREE.Group();
  private bar: THREE.Mesh;
  private leftOffset = new THREE.Vector3(-0.4, 0, 0);
  private rightOffset = new THREE.Vector3(0.4, 0, 0);

  constructor() {
    this.group.name = 'ControlBar3D';
    // Barre simple: cylindre horizontal
    const geo = new THREE.CylinderGeometry(0.02, 0.02, 0.9, 12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.2, roughness: 0.8 });
    this.bar = new THREE.Mesh(geo, mat);
    this.bar.rotation.z = Math.PI / 2; // horizontal
    this.bar.castShadow = true;
    this.group.add(this.bar);

    // Poignées colorées
    const handleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12);
    const left = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x1e90ff }));
    const right = new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0xff5555 }));
    left.position.copy(this.leftOffset);
    right.position.copy(this.rightOffset);
    left.rotation.z = right.rotation.z = Math.PI / 2;
    this.group.add(left, right);

    // Position initiale (hauteur des mains du pilote)
    this.group.position.set(0, 1.4, 0);
  }

  get object3d(): THREE.Object3D { return this.group; }

  updateTilt(tilt: number): void {
    // Rotation autour de l'axe Z: incline la barre gauche/droite
    this.group.rotation.z = THREE.MathUtils.clamp(tilt, -1, 1) * 0.35; // ~20° max
  }

  getLeftWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.leftOffset).applyMatrix4(this.group.matrixWorld);
  }

  getRightWorldPosition(target = new THREE.Vector3()): THREE.Vector3 {
    return target.copy(this.rightOffset).applyMatrix4(this.group.matrixWorld);
  }
}

