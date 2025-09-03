/**
 * ThreeJSUtils.ts - Utilitaires génériques pour les opérations Three.js
 * Centralise les fonctions mathématiques et de manipulation d'objets 3D
 */

import * as THREE from 'three';
import { Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';

/**
 * Classe utilitaire pour des opérations courantes avec Three.js
 */
export class ThreeJSUtils {
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
     * Crée un cylindre entre deux points spécifiés par des positions 3D.
     * Cette méthode doit être réimplémentée ici si elle est vraiment un utilitaire générique.
     * Actuellement, StructuredObject utilise Primitive.cylinder et fait l'orientation lui-même.
     * Pour éviter la duplication, cette méthode n'est pas recréer telle quelle sauf si absolutement nécessaire
     * et serait mieux gérée par une factory spécifique ou au niveau de StructuredObject.
     *
     * Pour l'instant, nous nous en tenons aux utilitaires mathématiques purs.
     */
    /**
     * Générer point symétrique
     */
    static mirrorPoint(point: Position3D, axis: 'X' | 'Y' | 'Z'): Position3D {
        const mirrored: Position3D = [...point];
        const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
        mirrored[axisIndex] = -mirrored[axisIndex];
        return mirrored;
    }

    /**
     * Interpoler entre deux points
     */
    static interpolate(
        p1: Position3D,
        p2: Position3D,
        ratio: number
    ): Position3D {
        return [
            p1[0] + (p2[0] - p1[0]) * ratio,
            p1[1] + (p2[1] - p1[1]) * ratio,
            p1[2] + (p2[2] - p1[2]) * ratio
        ];
    }
}