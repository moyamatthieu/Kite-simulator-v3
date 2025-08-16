/**
 * Gear.ts - Engrenage simplifié
 * Utilise StructuredObject pour définir les points anatomiques de l'engrenage
 * Note: Version simplifiée sans opérations CSG complexes
 */

import { ICreatable } from '../types';
import { StructuredObject, Position3D } from '../core/StructuredObject';
import { Primitive } from '../core/Primitive';
import * as THREE from 'three';

// Configuration par défaut de l'engrenage
export const DEFAULT_CONFIG = {
  // Dimensions (en unités 3D)
  outerRadius: 0.05,      // Rayon externe
  innerRadius: 0.035,     // Rayon interne (base des dents)
  thickness: 0.01,        // Épaisseur
  holeRadius: 0.01,       // Rayon du trou central
  
  // Dents
  teethCount: 20,         // Nombre de dents
  toothHeight: 0.015,     // Hauteur des dents
  toothWidth: 0.3,        // Largeur relative des dents (0-1)
  
  // Style
  style: 'standard' as 'standard' | 'simple',
  hasSpokes: false,       // Rayons intérieurs
  spokeCount: 6,          // Nombre de rayons
  
  // Couleurs
  color: '#708090',       // Gris métallique
  accentColor: '#4169E1'  // Bleu royal pour les détails
};

export class Gear extends StructuredObject implements ICreatable {
    private params: typeof DEFAULT_CONFIG;
    
    constructor(customParams: Partial<typeof DEFAULT_CONFIG> = {}) {
        super("Gear");
        this.params = { ...DEFAULT_CONFIG, ...customParams };
    }
    
    protected definePoints(): void {
        const p = this.params;
        
        // Point central
        this.setPoint('center', [0, 0, 0]);
        
        // Points du corps principal
        this.setPoint('body_center', [0, p.thickness/2, 0]);
        
        // Points pour les dents (on en définit quelques-unes pour la structure)
        const angleStep = (Math.PI * 2) / p.teethCount;
        for (let i = 0; i < p.teethCount; i++) {
            const angle = i * angleStep;
            const x = Math.cos(angle) * p.innerRadius;
            const z = Math.sin(angle) * p.innerRadius;
            this.setPoint(`tooth_base_${i}`, [x, p.thickness/2, z]);
            
            // Point externe de la dent
            const xOuter = Math.cos(angle) * p.outerRadius;
            const zOuter = Math.sin(angle) * p.outerRadius;
            this.setPoint(`tooth_tip_${i}`, [xOuter, p.thickness/2, zOuter]);
        }
        
        // Points pour les rayons si nécessaire
        if (p.hasSpokes) {
            const spokeAngleStep = (Math.PI * 2) / p.spokeCount;
            for (let i = 0; i < p.spokeCount; i++) {
                const angle = i * spokeAngleStep;
                const x = Math.cos(angle) * (p.holeRadius * 2);
                const z = Math.sin(angle) * (p.holeRadius * 2);
                this.setPoint(`spoke_inner_${i}`, [x, p.thickness/2, z]);
                
                const xOuter = Math.cos(angle) * p.innerRadius * 0.8;
                const zOuter = Math.sin(angle) * p.innerRadius * 0.8;
                this.setPoint(`spoke_outer_${i}`, [xOuter, p.thickness/2, zOuter]);
            }
        }
    }
    
    protected buildFrame(): void {
        const p = this.params;
        
        // Corps principal de l'engrenage (cylindre interne)
        const body = Primitive.cylinder(p.innerRadius, p.thickness, p.color);
        this.add(body, [0, p.thickness/2, 0]);
        
        // Rayons si demandés
        if (p.hasSpokes) {
            const spokeAngleStep = (Math.PI * 2) / p.spokeCount;
            for (let i = 0; i < p.spokeCount; i++) {
                const angle = i * spokeAngleStep;
                const spokeLength = (p.innerRadius - p.holeRadius * 2);
                const spokeWidth = p.thickness * 0.3;
                
                const spoke = Primitive.box(spokeLength, p.thickness * 0.8, spokeWidth, p.color);
                const x = Math.cos(angle) * spokeLength / 2;
                const z = Math.sin(angle) * spokeLength / 2;
                
                spoke.rotation.y = angle;
                this.add(spoke, [x, p.thickness/2, z]);
            }
        }
    }
    
    protected buildSurface(): void {
        const p = this.params;
        
        // === DENTS ===
        const angleStep = (Math.PI * 2) / p.teethCount;
        const toothWidth = (2 * Math.PI * p.innerRadius / p.teethCount) * p.toothWidth;
        
        for (let i = 0; i < p.teethCount; i++) {
            const angle = i * angleStep;
            
            // Créer une dent simple comme un petit cube
            const tooth = Primitive.box(p.toothHeight, p.thickness, toothWidth, p.color);
            
            // Positionner la dent
            const x = Math.cos(angle) * (p.innerRadius + p.toothHeight/2);
            const z = Math.sin(angle) * (p.innerRadius + p.toothHeight/2);
            
            tooth.rotation.y = angle;
            this.add(tooth, [x, p.thickness/2, z]);
        }
        
        // === TROU CENTRAL ===
        // Note: Dans une vraie implémentation CSG, on soustrairait ce cylindre
        // Ici on ajoute juste un anneau visuel pour indiquer le trou
        const holeRing = Primitive.cylinder(p.holeRadius + 0.001, p.thickness * 0.1, '#333333');
        this.add(holeRing, [0, p.thickness + 0.001, 0]);
    }
    
    create(): StructuredObject {
        return this;
    }
    
    getName(): string {
        return "Engrenage";
    }
    
    getDescription(): string {
        return `Engrenage ${this.params.teethCount} dents, Ø${(this.params.outerRadius*2*1000).toFixed(0)}mm`;
    }
    
    getPrimitiveCount(): number {
        let count = 1 + this.params.teethCount; // corps + dents
        if (this.params.hasSpokes) count += this.params.spokeCount;
        return count + 1; // +1 pour l'anneau du trou
    }
}

// Variantes prédéfinies
export const VARIANTS = {
  small: { outerRadius: 0.025, thickness: 0.005, teethCount: 12 },
  medium: { ...DEFAULT_CONFIG },
  large: { outerRadius: 0.1, thickness: 0.015, teethCount: 40 },
  clockwork: { 
    outerRadius: 0.03, 
    thickness: 0.003, 
    teethCount: 60,
    toothHeight: 0.005,
    color: '#B8860B' // Laiton
  },
  industrial: {
    outerRadius: 0.075,
    thickness: 0.02,
    teethCount: 16,
    hasSpokes: true,
    style: 'simple' as const
  }
};