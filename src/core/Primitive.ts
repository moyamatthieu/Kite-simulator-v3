/**
 * Primitive - Générateur de formes 3D de base
 * Principe KISS : seulement les formes essentielles
 */

import * as THREE from 'three';
import { MaterialOptions } from '../types';

export class Primitive {
    /**
     * Créer une boîte
     */
    static box(
        width = 1, 
        height = 1, 
        depth = 1, 
        color: string | number = '#808080',
        options: MaterialOptions = {}
    ): THREE.Mesh {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshPhongMaterial({ 
            color,
            ...options 
        });
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Créer une sphère
     */
    static sphere(
        radius = 0.5, 
        color: string | number = '#808080',
        options: MaterialOptions = {}
    ): THREE.Mesh {
        const geometry = new THREE.SphereGeometry(radius, 32, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color,
            ...options 
        });
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Créer un cylindre
     */
    static cylinder(
        radius = 0.5, 
        height = 1, 
        color: string | number = '#808080',
        options: MaterialOptions = {}
    ): THREE.Mesh {
        const geometry = new THREE.CylinderGeometry(radius, radius, height, 32);
        const material = new THREE.MeshPhongMaterial({ 
            color,
            ...options 
        });
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Créer un cône
     */
    static cone(
        radius = 0.5, 
        height = 1, 
        radialSegments = 8, 
        color: string | number = '#808080',
        options: MaterialOptions = {}
    ): THREE.Mesh {
        const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
        const material = new THREE.MeshPhongMaterial({ 
            color,
            ...options 
        });
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * Créer un tore (donut)
     */
    static torus(
        radius = 0.5,
        tube = 0.2,
        color: string | number = '#808080',
        options: MaterialOptions = {}
    ): THREE.Mesh {
        const geometry = new THREE.TorusGeometry(radius, tube, 16, 100);
        const material = new THREE.MeshPhongMaterial({ 
            color,
            ...options 
        });
        return new THREE.Mesh(geometry, material);
    }
}