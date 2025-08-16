/**
 * CAD.ts - API de modélisation paramétrique
 * Inspiré de JSCAD/OpenSCAD avec une approche fonctionnelle
 */

import * as THREE from 'three';
import { Assembly } from './Assembly';

// Types de base pour la CAO paramétrique
export type Vec3 = [number, number, number] | { x: number; y: number; z: number };
export type Color = string | number | THREE.Color;
export type Params = Record<string, any>;

// Convertir Vec3 en tableau
function toArray(v: Vec3): [number, number, number] {
    if (Array.isArray(v)) return v;
    return [v.x, v.y, v.z];
}

// ============================================
// PRIMITIVES 3D
// ============================================

/**
 * Créer un cube/boîte
 */
export function cube(options: {
    size?: number | Vec3;
    center?: boolean;
} = {}): THREE.Mesh {
    const size = options.size || 1;
    const center = options.center ?? true;
    
    let width, height, depth;
    if (typeof size === 'number') {
        width = height = depth = size;
    } else {
        [width, height, depth] = toArray(size);
    }
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    
    if (!center) {
        mesh.position.set(width/2, height/2, depth/2);
    }
    
    return mesh;
}

/**
 * Créer une sphère
 */
export function sphere(options: {
    radius?: number;
    segments?: number;
    center?: boolean;
} = {}): THREE.Mesh {
    const radius = options.radius || 0.5;
    const segments = options.segments || 32;
    
    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    const material = new THREE.MeshStandardMaterial();
    return new THREE.Mesh(geometry, material);
}

/**
 * Créer un cylindre
 */
export function cylinder(options: {
    radius?: number;
    radius1?: number;
    radius2?: number;
    height?: number;
    segments?: number;
    center?: boolean;
} = {}): THREE.Mesh {
    const height = options.height || 1;
    const radius1 = options.radius1 || options.radius || 0.5;
    const radius2 = options.radius2 || options.radius || 0.5;
    const segments = options.segments || 32;
    const center = options.center ?? true;
    
    const geometry = new THREE.CylinderGeometry(radius1, radius2, height, segments);
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    
    if (!center) {
        mesh.position.y = height/2;
    }
    
    return mesh;
}

/**
 * Créer un tore
 */
export function torus(options: {
    radius?: number;
    tube?: number;
    radialSegments?: number;
    tubularSegments?: number;
} = {}): THREE.Mesh {
    const radius = options.radius || 1;
    const tube = options.tube || 0.2;
    const radialSegments = options.radialSegments || 16;
    const tubularSegments = options.tubularSegments || 32;
    
    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    const material = new THREE.MeshStandardMaterial();
    return new THREE.Mesh(geometry, material);
}

// ============================================
// TRANSFORMATIONS
// ============================================

/**
 * Translater un objet
 */
export function translate(v: Vec3, obj: THREE.Object3D): THREE.Object3D {
    const [x, y, z] = toArray(v);
    obj.position.set(x, y, z);
    return obj;
}

/**
 * Rotation d'un objet
 */
export function rotate(v: Vec3, obj: THREE.Object3D): THREE.Object3D {
    const [x, y, z] = toArray(v);
    obj.rotation.set(x, y, z);
    return obj;
}

/**
 * Mise à l'échelle d'un objet
 */
export function scale(v: Vec3 | number, obj: THREE.Object3D): THREE.Object3D {
    if (typeof v === 'number') {
        obj.scale.set(v, v, v);
    } else {
        const [x, y, z] = toArray(v);
        obj.scale.set(x, y, z);
    }
    return obj;
}

/**
 * Définir la couleur d'un objet
 */
export function color(col: Color, obj: THREE.Mesh): THREE.Mesh {
    if (obj.material instanceof THREE.MeshStandardMaterial) {
        obj.material.color = new THREE.Color(col);
    }
    return obj;
}

// ============================================
// OPÉRATIONS BOOLÉENNES (CSG)
// ============================================

/**
 * Union de plusieurs objets (groupe)
 */
export function union(...objects: THREE.Object3D[]): THREE.Group {
    const group = new THREE.Group();
    objects.forEach(obj => group.add(obj.clone()));
    return group;
}

/**
 * Différence (soustraction) - Placeholder
 * Note: Les vraies opérations CSG nécessitent une bibliothèque spécialisée
 */
export function difference(base: THREE.Object3D, ...subtract: THREE.Object3D[]): THREE.Group {
    console.warn('CSG difference not fully implemented - returning base object');
    const group = new THREE.Group();
    group.add(base.clone());
    // TODO: Implémenter avec three-csg-ts ou similar
    return group;
}

/**
 * Intersection - Placeholder
 */
export function intersection(...objects: THREE.Object3D[]): THREE.Group {
    console.warn('CSG intersection not fully implemented - returning union');
    return union(...objects);
}

// ============================================
// HELPERS ET UTILITAIRES
// ============================================

/**
 * Créer une ligne entre deux points
 */
export function line(points: Vec3[]): THREE.Line {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    
    points.forEach(p => {
        const [x, y, z] = toArray(p);
        positions.push(x, y, z);
    });
    
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color: 0x000000 });
    return new THREE.Line(geometry, material);
}

/**
 * Créer un polygone (face plane)
 */
export function polygon(points: Vec3[]): THREE.Mesh {
    if (points.length < 3) throw new Error('Polygon needs at least 3 points');
    
    const shape = new THREE.Shape();
    const first = toArray(points[0]);
    shape.moveTo(first[0], first[1]);
    
    for (let i = 1; i < points.length; i++) {
        const [x, y] = toArray(points[i]);
        shape.lineTo(x, y);
    }
    shape.closePath();
    
    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
    return new THREE.Mesh(geometry, material);
}

/**
 * Créer un texte 3D (placeholder)
 */
export function text(str: string, options: {
    size?: number;
    height?: number;
    font?: string;
} = {}): THREE.Group {
    // TODO: Implémenter avec TextGeometry
    console.warn('Text geometry not implemented - returning placeholder');
    return new THREE.Group();
}

// ============================================
// FONCTIONS DE HAUT NIVEAU
// ============================================

/**
 * Répéter un objet selon un pattern
 */
export function repeat(count: Vec3 | number, spacing: Vec3 | number, obj: THREE.Object3D): THREE.Group {
    const group = new THREE.Group();
    
    let countX = 1, countY = 1, countZ = 1;
    if (typeof count === 'number') {
        countX = count;
    } else {
        [countX, countY, countZ] = toArray(count);
    }
    
    let spacingX = 1, spacingY = 1, spacingZ = 1;
    if (typeof spacing === 'number') {
        spacingX = spacingY = spacingZ = spacing;
    } else {
        [spacingX, spacingY, spacingZ] = toArray(spacing);
    }
    
    for (let x = 0; x < countX; x++) {
        for (let y = 0; y < countY; y++) {
            for (let z = 0; z < countZ; z++) {
                const clone = obj.clone();
                clone.position.set(x * spacingX, y * spacingY, z * spacingZ);
                group.add(clone);
            }
        }
    }
    
    return group;
}

/**
 * Créer un hull convexe (placeholder)
 */
export function hull(...objects: THREE.Object3D[]): THREE.Group {
    console.warn('Convex hull not implemented - returning union');
    return union(...objects);
}

// ============================================
// EXPORT DES FONCTIONS PRINCIPALES
// ============================================

export const CAD = {
    // Primitives
    cube,
    sphere,
    cylinder,
    torus,
    
    // Transformations
    translate,
    rotate,
    scale,
    color,
    
    // Opérations
    union,
    difference,
    intersection,
    hull,
    
    // Utilitaires
    line,
    polygon,
    text,
    repeat
};

export default CAD;