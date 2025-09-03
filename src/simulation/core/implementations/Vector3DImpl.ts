/**
 * Implémentation concrète de Vector3D - encapsule Three.js
 * Respect du Dependency Inversion Principle
 */
import * as THREE from 'three';
import { Vector3D } from '@simulation/core/types/PhysicsTypes';

export class Vector3DImpl implements Vector3D {
  private vector: THREE.Vector3;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.vector = new THREE.Vector3(x, y, z);
  }

  static fromThreeVector(threeVector: THREE.Vector3): Vector3DImpl {
    return new Vector3DImpl(threeVector.x, threeVector.y, threeVector.z);
  }

  get x(): number { return this.vector.x; }
  get y(): number { return this.vector.y; }
  get z(): number { return this.vector.z; }

  clone(): Vector3D {
    return new Vector3DImpl(this.x, this.y, this.z);
  }

  add(vector: Vector3D): Vector3D {
    const result = this.clone() as Vector3DImpl;
    result.vector.add(new THREE.Vector3(vector.x, vector.y, vector.z));
    return result;
  }

  subtract(vector: Vector3D): Vector3D {
    const result = this.clone() as Vector3DImpl;
    result.vector.sub(new THREE.Vector3(vector.x, vector.y, vector.z));
    return result;
  }

  multiply(scalar: number): Vector3D {
    const result = this.clone() as Vector3DImpl;
    result.vector.multiplyScalar(scalar);
    return result;
  }

  normalize(): Vector3D {
    const result = this.clone() as Vector3DImpl;
    result.vector.normalize();
    return result;
  }

  length(): number {
    return this.vector.length();
  }

  lengthSquared(): number {
    return this.vector.lengthSq();
  }

  dot(vector: Vector3D): number {
    return this.vector.dot(new THREE.Vector3(vector.x, vector.y, vector.z));
  }

  cross(vector: Vector3D): Vector3D {
    const result = this.clone() as Vector3DImpl;
    result.vector.cross(new THREE.Vector3(vector.x, vector.y, vector.z));
    return result;
  }

  distanceTo(vector: Vector3D): number {
    return this.vector.distanceTo(new THREE.Vector3(vector.x, vector.y, vector.z));
  }

  // Méthode utilitaire pour accéder à l'objet Three.js interne si nécessaire
  getThreeVector(): THREE.Vector3 {
    return this.vector.clone();
  }

  // Méthode pour mettre à jour depuis un THREE.Vector3
  setFromThreeVector(threeVector: THREE.Vector3): void {
    this.vector.copy(threeVector);
  }
}