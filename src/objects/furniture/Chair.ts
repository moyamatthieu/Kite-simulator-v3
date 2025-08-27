/**
 * Chair.ts - Chaise paramétrique avec structure standard
 * Utilise StructuredObject pour définir les points anatomiques de la chaise
 */

import { ICreatable } from '@types';
import { StructuredObject } from '@core/StructuredObject';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';

// Configuration par défaut de la chaise
export const DEFAULT_CONFIG = {
  // Dimensions (en unités 3D)
  seatWidth: 0.4,
  seatDepth: 0.4,
  seatHeight: 0.45,
  seatThickness: 0.03,
  
  backHeight: 0.4,
  backThickness: 0.03,
  backAngle: 5,  // Inclinaison du dossier en degrés
  
  legRadius: 0.02,
  legStyle: 'round' as 'round' | 'square',
  
  // Couleurs
  seatColor: '#8B4513',    // Bois marron
  backColor: '#8B4513',    // Bois marron
  legColor: '#654321',     // Bois plus foncé
  
  // Options
  hasArmrests: false,
  armrestHeight: 0.2,
  style: 'modern' as 'modern' | 'classic' | 'scandinavian'
};

export class Chair extends StructuredObject implements ICreatable {
    private params: typeof DEFAULT_CONFIG;
    
    constructor(customParams: Partial<typeof DEFAULT_CONFIG> = {}) {
        super("Chair");
        this.params = { ...DEFAULT_CONFIG, ...customParams };
        this.init(); // Initialiser après la configuration
    }
    
    protected definePoints(): void {
        const p = this.params;
        const hw = p.seatWidth / 2;  // half width
        const hd = p.seatDepth / 2;  // half depth
        
        // Points de l'assise
        this.setPoint('seat_center', [0, p.seatHeight, 0]);
        this.setPoint('seat_fl', [-hw, p.seatHeight, -hd]); // front left
        this.setPoint('seat_fr', [hw, p.seatHeight, -hd]);  // front right
        this.setPoint('seat_bl', [-hw, p.seatHeight, hd]);  // back left
        this.setPoint('seat_br', [hw, p.seatHeight, hd]);   // back right
        
        // Points du dossier
        const backY = p.seatHeight + p.backHeight/2;
        const backZ = -hd + p.backThickness/2;
        this.setPoint('back_center', [0, backY, backZ]);
        this.setPoint('back_top', [0, p.seatHeight + p.backHeight, backZ]);
        this.setPoint('back_bottom', [0, p.seatHeight, backZ]);
        
        // Points des pieds
        const legInset = p.legRadius;
        this.setPoint('leg_fl', [-hw + legInset, p.seatHeight/2, -hd + legInset]);
        this.setPoint('leg_fr', [hw - legInset, p.seatHeight/2, -hd + legInset]);
        this.setPoint('leg_bl', [-hw + legInset, p.seatHeight/2, hd - legInset]);
        this.setPoint('leg_br', [hw - legInset, p.seatHeight/2, hd - legInset]);
        
        // Points pour les accoudoirs si nécessaire
        if (p.hasArmrests) {
            this.setPoint('armrest_left', [-hw, p.seatHeight + p.armrestHeight, 0]);
            this.setPoint('armrest_right', [hw, p.seatHeight + p.armrestHeight, 0]);
        }
    }
    
    protected buildStructure(): void {
        const p = this.params;
        
        // Pieds de la chaise (structure principale)
        const legPositions = [
            this.getPoint('leg_fl'), 
            this.getPoint('leg_fr'), 
            this.getPoint('leg_bl'), 
            this.getPoint('leg_br')
        ];
        
        legPositions.forEach((pos, i) => {
            if (pos) {
                let leg;
                if (p.legStyle === 'square') {
                    leg = Primitive.box(p.legRadius * 2, p.seatHeight, p.legRadius * 2, p.legColor);
                } else {
                    leg = Primitive.cylinder(p.legRadius, p.seatHeight, p.legColor);
                }
                this.addPrimitiveAt(leg, [pos.x, pos.y, pos.z]);
            }
        });
        
        // Supports pour accoudoirs si nécessaire
        if (p.hasArmrests) {
            const leftSupport = Primitive.cylinder(p.legRadius * 0.8, p.armrestHeight, p.legColor);
            this.addPrimitiveAt(leftSupport, [-p.seatWidth/2, p.seatHeight + p.armrestHeight/2, p.seatDepth/4]);
            
            const rightSupport = Primitive.cylinder(p.legRadius * 0.8, p.armrestHeight, p.legColor);
            this.addPrimitiveAt(rightSupport, [p.seatWidth/2, p.seatHeight + p.armrestHeight/2, p.seatDepth/4]);
        }
    }
    
    protected buildSurfaces(): void {
        const p = this.params;
        
        // === ASSISE ===
        const seat = Primitive.box(p.seatWidth, p.seatThickness, p.seatDepth, p.seatColor);
        this.addPrimitiveAt(seat, [0, p.seatHeight, 0]);
        
        // === DOSSIER ===
        let back = Primitive.box(p.seatWidth, p.backHeight, p.backThickness, p.backColor);
        
        // Appliquer l'inclinaison si nécessaire
        if (p.backAngle > 0) {
            back.rotation.x = -THREE.MathUtils.degToRad(p.backAngle);
        }
        
        // Style scandinave : dossier avec barreaux
        if (p.style === 'scandinavian') {
            // Remplacer par des barreaux verticaux
            for (let i = 0; i < 5; i++) {
                const slat = Primitive.box(p.seatWidth * 0.15, p.backHeight * 0.8, p.backThickness, p.backColor);
                const x = (i - 2) * p.seatWidth * 0.2;
                this.addPrimitiveAt(slat, [x, p.seatHeight + p.backHeight/2, -p.seatDepth/2 + p.backThickness/2]);
            }
        } else {
            this.addPrimitiveAt(back, [0, p.seatHeight + p.backHeight/2, -p.seatDepth/2 + p.backThickness/2]);
        }
        
        // === ACCOUDOIRS ===
        if (p.hasArmrests) {
            const armrestLength = p.seatDepth * 0.8;
            const armrestWidth = p.legRadius * 2;
            
            const leftArmrest = Primitive.box(armrestWidth, armrestWidth, armrestLength, p.seatColor);
            this.addPrimitiveAt(leftArmrest, [-p.seatWidth/2, p.seatHeight + p.armrestHeight, 0]);
            
            const rightArmrest = Primitive.box(armrestWidth, armrestWidth, armrestLength, p.seatColor);
            this.addPrimitiveAt(rightArmrest, [p.seatWidth/2, p.seatHeight + p.armrestHeight, 0]);
        }
    }
    
    create(): this {
        return this;
    }
    
    getName(): string {
        return "Chaise";
    }
    
    getDescription(): string {
        return `Chaise ${this.params.style} ${(this.params.seatHeight * 100).toFixed(0)}cm`;
    }
    
    getPrimitiveCount(): number {
        let count = 6; // assise + dossier + 4 pieds
        if (this.params.hasArmrests) count += 4; // 2 accoudoirs + 2 supports
        if (this.params.style === 'scandinavian') count += 4; // Barreaux du dossier
        return count;
    }
}

// Variantes prédéfinies
export const VARIANTS = {
  dining: { ...DEFAULT_CONFIG },
  office: { 
    seatHeight: 0.5, 
    hasArmrests: true, 
    backHeight: 0.5,
    style: 'modern' as const
  },
  bar: { 
    seatHeight: 0.75, 
    seatWidth: 0.35, 
    seatDepth: 0.35,
    legRadius: 0.015,
    style: 'modern' as const
  },
  lounge: { 
    seatWidth: 0.5, 
    seatDepth: 0.45, 
    backAngle: 15,
    style: 'scandinavian' as const
  }
};