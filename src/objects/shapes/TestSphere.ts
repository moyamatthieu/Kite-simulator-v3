/**
 * TestSphere.ts - Sphère de test pour démontrer l'AutoLoader
 * Cet objet sera automatiquement détecté sans modifier aucun autre fichier !
 */

import { ICreatable } from '@types';
import { StructuredObject } from '@core/StructuredObject';
import { Primitive } from '@core/Primitive';

export class TestSphere extends StructuredObject implements ICreatable {
    private params = {
        radius: 0.5,
        color: '#FF6B6B',
        segments: 32
    };
    
    constructor() {
        super("Sphère de Test");
    }
    
    protected definePoints(): void {
        // Point central
        this.setPoint('CENTER', [0, 0, 0]);
        
        // Points de référence sur la sphère
        this.setPoint('TOP', [0, this.params.radius, 0]);
        this.setPoint('BOTTOM', [0, -this.params.radius, 0]);
        this.setPoint('FRONT', [0, 0, this.params.radius]);
        this.setPoint('BACK', [0, 0, -this.params.radius]);
        this.setPoint('LEFT', [-this.params.radius, 0, 0]);
        this.setPoint('RIGHT', [this.params.radius, 0, 0]);
    }
    
    protected buildStructure(): void {
        // Pas de structure rigide pour une sphère
    }
    
    protected buildSurfaces(): void {
        // Créer la sphère
        const sphere = Primitive.sphere(
            this.params.radius, 
            this.params.color,
            this.params.segments
        );
        
        this.addPrimitiveAtPoint(sphere, 'CENTER');
    }
    
    // Implémentation de ICreatable
    create(): this {
        return this;
    }
    
    getName(): string {
        return "Sphère de Test";
    }
    
    getDescription(): string {
        return "Sphère automatiquement détectée par l'AutoLoader";
    }
    
    getPrimitiveCount(): number {
        return 1;
    }
}
