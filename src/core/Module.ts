/**
 * Module.ts - Système de modules inspiré d'OpenSCAD
 * Permet de créer des fonctions réutilisables pour construire des objets
 */

import * as THREE from 'three';
import { Assembly } from './Assembly';

// Types de base
export type Vec3 = [number, number, number];
export type Vec2 = [number, number];
export type Color = string;

// ============================================
// PRIMITIVES DE BASE (comme OpenSCAD)
// ============================================

/**
 * Créer un cube/boîte
 */
export function cube(size: Vec3 | number, options?: { center?: boolean }): THREE.Mesh {
    const [width, height, depth] = typeof size === 'number' 
        ? [size, size, size] 
        : size;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    
    if (!options?.center) {
        mesh.position.set(width/2, height/2, depth/2);
    }
    
    return mesh;
}

/**
 * Créer un cylindre
 */
export function cylinder(h: number, r: number, options?: { 
    r1?: number; 
    r2?: number; 
    $fn?: number;
    center?: boolean;
}): THREE.Mesh {
    const r1 = options?.r1 ?? r;
    const r2 = options?.r2 ?? r;
    const segments = options?.$fn ?? 32;
    
    const geometry = new THREE.CylinderGeometry(r1, r2, h, segments);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    
    if (!options?.center) {
        mesh.position.y = h/2;
    }
    
    return mesh;
}

/**
 * Créer une sphère
 */
export function sphere(r: number, options?: { $fn?: number }): THREE.Mesh {
    const segments = options?.$fn ?? 32;
    const geometry = new THREE.SphereGeometry(r, segments, segments);
    const material = new THREE.MeshStandardMaterial();
    return new THREE.Mesh(geometry, material);
}

// ============================================
// TRANSFORMATIONS (comme OpenSCAD)
// ============================================

/**
 * Translater un ou plusieurs objets
 */
export function translate(v: Vec3, ...objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    objects.forEach(obj => {
        const clone = obj.clone();
        clone.position.set(v[0], v[1], v[2]);
        group.add(clone);
    });
    return group.children.length === 1 ? group.children[0] as any : group;
}

/**
 * Rotation
 */
export function rotate(angles: Vec3, ...objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    objects.forEach(obj => {
        const clone = obj.clone();
        clone.rotation.set(angles[0], angles[1], angles[2]);
        group.add(clone);
    });
    return group.children.length === 1 ? group.children[0] as any : group;
}

/**
 * Mise à l'échelle
 */
export function scale(v: Vec3 | number, ...objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    const [x, y, z] = typeof v === 'number' ? [v, v, v] : v;
    
    objects.forEach(obj => {
        const clone = obj.clone();
        clone.scale.set(x, y, z);
        group.add(clone);
    });
    return group.children.length === 1 ? group.children[0] as any : group;
}

/**
 * Définir la couleur
 */
export function color(c: Color, ...objects: THREE.Mesh[]): THREE.Mesh | THREE.Group {
    const group = new THREE.Group();
    const col = new THREE.Color(c);
    
    objects.forEach(obj => {
        const clone = obj.clone() as THREE.Mesh;
        if (clone.material) {
            (clone.material as THREE.MeshStandardMaterial).color = col;
        }
        group.add(clone);
    });
    
    return group.children.length === 1 ? group.children[0] as THREE.Mesh : group;
}

// ============================================
// OPÉRATIONS (comme OpenSCAD)
// ============================================

/**
 * Union de plusieurs objets
 */
export function union(...objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    objects.forEach(obj => group.add(obj.clone()));
    return group;
}

/**
 * Boucle for pour créer plusieurs objets
 */
export function forLoop<T>(
    items: T[], 
    callback: (item: T, index: number) => THREE.Object3D
): THREE.Group {
    const group = new THREE.Group();
    items.forEach((item, index) => {
        const obj = callback(item, index);
        if (obj) group.add(obj);
    });
    return group;
}

// ============================================
// MODULE : Classe de base pour créer des modules
// ============================================

export abstract class Module {
    protected params: any;
    
    constructor(params: any = {}) {
        this.params = { ...this.getDefaultParams(), ...params };
    }
    
    /**
     * Paramètres par défaut du module
     */
    protected abstract getDefaultParams(): any;
    
    /**
     * Construire le module
     */
    abstract build(): THREE.Object3D;
    
    /**
     * Convertir en Assembly pour compatibilité
     */
    toAssembly(name?: string): Assembly {
        const assembly = new Assembly(name || this.constructor.name);
        const built = this.build();
        
        if (built instanceof THREE.Group) {
            built.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    assembly.add(child);
                }
            });
        } else if (built instanceof THREE.Mesh) {
            assembly.add(built);
        }
        
        return assembly;
    }
}

// ============================================
// MODULES PRÉDÉFINIS
// ============================================

/**
 * Module pour créer un pied de meuble
 */
export class LegModule extends Module {
    protected getDefaultParams() {
        return {
            height: 45,
            radius: 2,
            color: '#654321'
        };
    }
    
    build(): THREE.Mesh {
        const leg = cylinder(this.params.height, this.params.radius);
        return color(this.params.color, leg) as THREE.Mesh;
    }
}

/**
 * Module pour créer une assise
 */
export class SeatModule extends Module {
    protected getDefaultParams() {
        return {
            width: 40,
            depth: 40,
            thickness: 3,
            color: '#8B4513'
        };
    }
    
    build(): THREE.Mesh {
        const seat = cube([
            this.params.width,
            this.params.thickness,
            this.params.depth
        ]);
        return color(this.params.color, seat) as THREE.Mesh;
    }
}

/**
 * Module pour créer un dossier
 */
export class BackrestModule extends Module {
    protected getDefaultParams() {
        return {
            width: 40,
            height: 40,
            thickness: 3,
            color: '#8B4513'
        };
    }
    
    build(): THREE.Mesh {
        const back = cube([
            this.params.width,
            this.params.height,
            this.params.thickness
        ]);
        return color(this.params.color, back) as THREE.Mesh;
    }
}