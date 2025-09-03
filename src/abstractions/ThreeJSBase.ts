/**
 * ThreeJSBase.ts - Abstraction complète de Three.js
 * 
 * Cette classe encapsule toute l'interaction avec Three.js pour faciliter :
 * - Migration vers d'autres moteurs 3D (Godot, Babylon.js, etc.)
 * - Tests unitaires sans dépendance Three.js
 * - API unifiée et simplifiée
 */

import * as THREE from 'three';
import { Position3D, MaterialConfig } from '../types';

export interface GeometryParams {
  // Primitives de base
  box?: { width: number; height: number; depth: number };
  sphere?: { radius: number; segments?: number };
  cylinder?: { radius: number; height: number; segments?: number };
  cone?: { radius: number; height: number; segments?: number };
  
  // Géométries complexes
  torus?: { radius: number; tubeRadius: number; segments?: number };
  plane?: { width: number; height: number; segments?: number };
}

export interface TransformParams {
  position?: Position3D;
  rotation?: Position3D;
  scale?: Position3D | number;
}

/**
 * Abstraction Three.js - Interface unifiée pour les opérations 3D
 */
export class ThreeJSBase {
  /**
   * Créer une géométrie primitive
   */
  static createGeometry(params: GeometryParams): THREE.BufferGeometry {
    if (params.box) {
      const { width, height, depth } = params.box;
      return new THREE.BoxGeometry(width, height, depth);
    }
    
    if (params.sphere) {
      const { radius, segments = 16 } = params.sphere;
      return new THREE.SphereGeometry(radius, segments, segments);
    }
    
    if (params.cylinder) {
      const { radius, height, segments = 16 } = params.cylinder;
      return new THREE.CylinderGeometry(radius, radius, height, segments);
    }
    
    if (params.cone) {
      const { radius, height, segments = 16 } = params.cone;
      return new THREE.ConeGeometry(radius, height, segments);
    }
    
    if (params.torus) {
      const { radius, tubeRadius, segments = 16 } = params.torus;
      return new THREE.TorusGeometry(radius, tubeRadius, segments, segments * 2);
    }
    
    if (params.plane) {
      const { width, height, segments = 1 } = params.plane;
      return new THREE.PlaneGeometry(width, height, segments, segments);
    }
    
    throw new Error('Type de géométrie non supporté');
  }

  /**
   * Créer un matériau
   */
  static createMaterial(config: string | MaterialConfig): THREE.Material {
    if (typeof config === 'string') {
      return new THREE.MeshStandardMaterial({ color: config });
    }
    
    return new THREE.MeshStandardMaterial({
      color: config.color,
      transparent: config.transparent || false,
      opacity: config.opacity || 1,
      metalness: config.metalness || 0,
      roughness: config.roughness || 0.5,
      side: config.side || THREE.FrontSide
    });
  }

  /**
   * Créer un mesh avec géométrie et matériau
   */
  static createMesh(
    geometry: GeometryParams,
    material: string | MaterialConfig
  ): THREE.Mesh {
    const geom = this.createGeometry(geometry);
    const mat = this.createMaterial(material);
    return new THREE.Mesh(geom, mat);
  }

  /**
   * Appliquer des transformations à un objet
   */
  static applyTransform(
    object: THREE.Object3D,
    transform: TransformParams
  ): void {
    if (transform.position) {
      const [x, y, z] = transform.position;
      object.position.set(x, y, z);
    }
    
    if (transform.rotation) {
      const [x, y, z] = transform.rotation;
      object.rotation.set(x, y, z);
    }
    
    if (transform.scale) {
      if (typeof transform.scale === 'number') {
        object.scale.setScalar(transform.scale);
      } else {
        const [x, y, z] = transform.scale;
        object.scale.set(x, y, z);
      }
    }
  }

  /**
   * Créer un groupe d'objets
   */
  static createGroup(name?: string): THREE.Group {
    const group = new THREE.Group();
    if (name) group.name = name;
    return group;
  }

  /**
   * Calculer la distance entre deux points
   */
  static distance(p1: Position3D, p2: Position3D): number {
    const v1 = new THREE.Vector3(p1[0], p1[1], p1[2]);
    const v2 = new THREE.Vector3(p2[0], p2[1], p2[2]);
    return v1.distanceTo(v2);
  }

  /**
   * Calculer le point milieu entre deux points
   */
  static midpoint(p1: Position3D, p2: Position3D): Position3D {
    return [
      (p1[0] + p2[0]) / 2,
      (p1[1] + p2[1]) / 2,
      (p1[2] + p2[2]) / 2
    ];
  }

  /**
   * Convertir Position3D vers THREE.Vector3
   */
  static toVector3(position: Position3D): THREE.Vector3 {
    return new THREE.Vector3(position[0], position[1], position[2]);
  }

  /**
   * Convertir THREE.Vector3 vers Position3D
   */
  static fromVector3(vector: THREE.Vector3): Position3D {
    return [vector.x, vector.y, vector.z];
  }

  /**
   * Créer un cylindre entre deux points
   */
  static createCylinderBetween(
    p1: Position3D,
    p2: Position3D,
    radius: number,
    material: string | MaterialConfig
  ): THREE.Mesh {
    const distance = this.distance(p1, p2);
    const midpoint = this.midpoint(p1, p2);
    
    const cylinder = this.createMesh(
      { cylinder: { radius, height: distance } },
      material
    );
    
    // Orienter le cylindre
    const direction = this.toVector3(p2).sub(this.toVector3(p1)).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction
    );
    
    cylinder.quaternion.copy(quaternion);
    this.applyTransform(cylinder, { position: midpoint });
    
    return cylinder;
  }

  /**
   * Disposer des objets
   */
  static dispose(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
