/**
 * FractalTree.ts - Arbre fractal génératif
 * Utilise StructuredObject avec génération récursive de branches
 */

import { ICreatable } from '../types';
import { StructuredObject, Position3D } from '../core/StructuredObject';
import { Primitive } from '../core/Primitive';
import * as THREE from 'three';

export class FractalTree extends StructuredObject implements ICreatable {
    private depth: number;
    private branches: number;
    private branchPoints: Map<string, { position: Position3D, level: number, angle: number }> = new Map();
    
    constructor(params: {
        depth?: number;
        branches?: number;
    } = {}) {
        super("Fractal Tree");
        this.depth = params.depth || 3;
        this.branches = params.branches || 3;
    }
    
    protected definePoints(): void {
        // Définir récursivement tous les points des branches
        this.defineBranchPoints(this.depth, [0, 0, 0], 0, "trunk");
    }
    
    private defineBranchPoints(
        level: number, 
        position: Position3D, 
        angle: number, 
        name: string
    ): void {
        if (level <= 0) return;
        
        const length = 0.5 * Math.pow(0.7, 3 - level);
        
        // Point de départ de la branche
        this.setPoint(`${name}_start`, position);
        
        // Point de fin de la branche
        const endY = position[1] + length;
        const endPosition: Position3D = [position[0], endY, position[2]];
        this.setPoint(`${name}_end`, endPosition);
        
        // Stocker les informations de la branche
        this.branchPoints.set(name, { position, level, angle });
        
        // Créer les sous-branches récursivement
        if (level > 1) {
            const newY = position[1] + length * 0.8;
            for (let i = 0; i < this.branches; i++) {
                const branchAngle = (i - (this.branches - 1) / 2) * 0.5;
                const newX = position[0] + Math.sin(branchAngle) * length * 0.5;
                const newZ = position[2] + Math.cos(branchAngle) * length * 0.5;
                
                const branchName = `${name}_b${i}`;
                this.defineBranchPoints(
                    level - 1, 
                    [newX, newY, newZ], 
                    branchAngle,
                    branchName
                );
            }
        }
    }
    
    protected buildFrame(): void {
        // Le frame est constitué de toutes les branches qui forment la structure
        this.branchPoints.forEach((branchInfo, name) => {
            const { position, level, angle } = branchInfo;
            const length = 0.5 * Math.pow(0.7, 3 - level);
            const thickness = 0.05 * Math.pow(0.7, 3 - level);
            
            const branchColor = level === this.depth ? '#654321' : '#8B4513';
            const branch = Primitive.cylinder(thickness, length, branchColor);
            
            // Positionnement et rotation
            branch.position.set(position[0], position[1] + length/2, position[2]);
            branch.rotation.z = angle;
            
            this.add(branch);
        });
    }
    
    protected buildSurface(): void {
        // Pas de surface spécifique - l'arbre est entièrement constitué de branches
        // On pourrait ajouter des feuilles ici si nécessaire
    }
    
    create(): StructuredObject {
        return this;
    }
    
    getName(): string {
        return "Arbre Fractal";
    }
    
    getDescription(): string {
        return `Arbre fractal de profondeur ${this.depth}`;
    }
    
    getPrimitiveCount(): number {
        // Calcul du nombre de branches selon la profondeur
        let count = 0;
        for (let i = 0; i < this.depth; i++) {
            count += Math.pow(this.branches, i);
        }
        return count;
    }
}