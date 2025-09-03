/**
 * ThreeJSBase.ts - Classe de base abstraite pour les entités Three.js
 * Sert de point d'extension pour des fonctionnalités Three.js génériques
 */

import * as THREE from 'three';
import { Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import { ThreeJSUtils } from '@/utils/ThreeJSUtils';

export interface GeometryParams {
  box?: { width: number; height: number; depth: number };
  sphere?: { radius: number; segments?: number };
  cylinder?: { radius: number; height: number; segments?: number };
  cone?: { radius: number; height: number; segments?: number };
  torus?: { radius: number; tubeRadius: number; segments?: number };
  plane?: { width: number; height: number; segments?: number };
}

export interface TransformParams {
  position?: Position3D;
  rotation?: Position3D;
  scale?: Position3D | number;
}

/**
 * Classe abstraite de base pour les objets Three.js avec des utilitaires
 * Cette classe doit être dépouillée de toutes les fonctionnalités qui ne sont pas son rôle principal.
 */
export class ThreeJSBase {
  /**
   * Créer un groupe d'objets
   */
  static createGroup(name?: string): THREE.Group {
    const group = new THREE.Group();
    if (name) group.name = name;
    return group;
  }
}
