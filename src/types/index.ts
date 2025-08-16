/**
 * Types partagés pour le système CAO KISS
 */

import * as THREE from 'three';

// Configuration pour les matériaux
export interface MaterialOptions {
    color?: string | number;
    side?: THREE.Side;
    transparent?: boolean;
    opacity?: number;
    roughness?: number;
    metalness?: number;
}

// Position et rotation dans l'espace 3D
export type Position3D = [number, number, number];
export type Rotation3D = [number, number, number];

// Interface pour un objet créable
export interface ICreatable {
    create(): Assembly;
    getName(): string;
    getDescription(): string;
    getPrimitiveCount(): number;
}

// Import Assembly pour éviter la dépendance circulaire
import { Assembly } from '../core/Assembly';

// Métadonnées d'un objet
export interface ObjectMetadata {
    name: string;
    description: string;
    category: 'furniture' | 'toy' | 'tool' | 'decoration';
    complexity: 'simple' | 'medium' | 'complex';
    primitiveCount: number;
    author?: string;
    version?: string;
}