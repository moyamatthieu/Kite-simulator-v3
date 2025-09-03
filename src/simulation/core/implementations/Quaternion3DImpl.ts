/**
 * Implémentation concrète de Quaternion3D - encapsule Three.js
 * Respect du Dependency Inversion Principle
 */
import * as THREE from 'three';
import { Quaternion3D, Vector3D } from '@simulation/core/types/PhysicsTypes';

export class Quaternion3DImpl implements Quaternion3D {
  private quaternion: THREE.Quaternion;

  constructor(x: number = 0, y: number = 0, z: number = 0, w: number = 1) {
    this.quaternion = new THREE.Quaternion(x, y, z, w);
  }

  static fromThreeQuaternion(threeQuaternion: THREE.Quaternion): Quaternion3DImpl {
    return new Quaternion3DImpl(threeQuaternion.x, threeQuaternion.y, threeQuaternion.z, threeQuaternion.w);
  }

  get x(): number { return this.quaternion.x; }
  get y(): number { return this.quaternion.y; }
  get z(): number { return this.quaternion.z; }
  get w(): number { return this.quaternion.w; }

  clone(): Quaternion3D {
    return new Quaternion3DImpl(this.x, this.y, this.z, this.w);
  }

  multiply(quaternion: Quaternion3D): Quaternion3D {
    const result = this.clone() as Quaternion3DImpl;
    const otherQuat = new THREE.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    result.quaternion.multiply(otherQuat);
    return result;
  }

  normalize(): Quaternion3D {
    const result = this.clone() as Quaternion3DImpl;
    result.quaternion.normalize();
    return result;
  }

  setFromAxisAngle(axis: Vector3D, angle: number): Quaternion3D {
    const result = this.clone() as Quaternion3DImpl;
    const threeAxis = new THREE.Vector3(axis.x, axis.y, axis.z);
    result.quaternion.setFromAxisAngle(threeAxis, angle);
    return result;
  }

  // Méthode utilitaire pour accéder à l'objet Three.js interne
  getThreeQuaternion(): THREE.Quaternion {
    return this.quaternion.clone();
  }

  // Méthode pour mettre à jour depuis un THREE.Quaternion
  setFromThreeQuaternion(threeQuaternion: THREE.Quaternion): void {
    this.quaternion.copy(threeQuaternion);
  }

  // Méthodes utilitaires supplémentaires
  invert(): Quaternion3D {
    const result = this.clone() as Quaternion3DImpl;
    result.quaternion.invert();
    return result;
  }

  slerp(target: Quaternion3D, alpha: number): Quaternion3D {
    const result = this.clone() as Quaternion3DImpl;
    const targetQuat = new THREE.Quaternion(target.x, target.y, target.z, target.w);
    result.quaternion.slerp(targetQuat, alpha);
    return result;
  }
}