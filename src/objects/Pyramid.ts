/**
 * Pyramid.ts - Pyramide paramétrique
 * Utilise StructuredObject pour définir les points anatomiques de la pyramide
 */

import { ICreatable } from '../types';
import { StructuredObject, Position3D } from '../core/StructuredObject';
import { Primitive } from '../core/Primitive';
import * as THREE from 'three';

export class Pyramid extends StructuredObject implements ICreatable {
    private size: number;
    private height: number;
    private color: string;
    
    constructor(params: {
        size?: number;
        height?: number;
        color?: string;
    } = {}) {
        super("Pyramid");
        this.size = params.size || 1;
        this.height = params.height || 1.5;
        this.color = params.color || '#FFD700';
    }
    
    protected definePoints(): void {
        const hs = this.size / 2; // half size
        const baseHeight = 0.05;
        
        // Points de la base carrée
        this.setPoint('base_center', [0, baseHeight/2, 0]);
        this.setPoint('base_fl', [-hs, baseHeight/2, -hs]); // front left
        this.setPoint('base_fr', [hs, baseHeight/2, -hs]);  // front right
        this.setPoint('base_bl', [-hs, baseHeight/2, hs]);  // back left
        this.setPoint('base_br', [hs, baseHeight/2, hs]);   // back right
        
        // Points de la pyramide
        this.setPoint('pyramid_base', [0, baseHeight, 0]);
        this.setPoint('pyramid_top', [0, baseHeight + this.height, 0]);
        this.setPoint('pyramid_center', [0, baseHeight + this.height/2, 0]);
    }
    
    protected buildFrame(): void {
        // Pas de frame - structure simple avec base et pyramide
    }
    
    protected buildSurface(): void {
        const baseHeight = 0.05;
        
        // === BASE CARRÉE ===
        const base = Primitive.box(this.size, baseHeight, this.size, this.color);
        this.add(base, [0, baseHeight/2, 0]);
        
        // === PYRAMIDE ===
        // Utilise un cône avec 4 segments pour faire une pyramide carrée
        const pyramid = Primitive.cone(this.size * 0.7, 0.01, this.height, 4);
        
        // Appliquer la couleur
        if (pyramid.material && 'color' in pyramid.material) {
            (pyramid.material as any).color.setStyle(this.color);
        }
        
        pyramid.position.set(0, baseHeight + this.height/2, 0);
        pyramid.rotation.y = Math.PI/4; // Rotation pour aligner avec la base carrée
        this.add(pyramid);
    }
    
    create(): StructuredObject {
        return this;
    }
    
    getName(): string {
        return "Pyramide";
    }
    
    getDescription(): string {
        return `Pyramide de ${this.height}m de hauteur`;
    }
    
    getPrimitiveCount(): number {
        return 2; // base + pyramide
    }
}