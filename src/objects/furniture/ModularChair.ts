/**
 * ModularChair.ts - Chaise modulaire construite avec StructuredObject
 * Démontre l'utilisation modulaire du pattern StructuredObject
 */

import { ICreatable } from '@types';
import { StructuredObject } from '@core/StructuredObject';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';

// Configuration par défaut de la chaise modulaire
export const DEFAULT_CONFIG = {
    // Dimensions (en unités 3D)
    seat_width: 0.4,
    seat_depth: 0.4,
    seat_height: 0.45,
    seat_thickness: 0.03,
    
    // Dimensions dossier
    back_height: 0.4,
    back_thickness: 0.03,
    
    // Dimensions pieds
    leg_size: 0.04,
    
    // Couleurs
    wood_color: '#8B4513',
    leg_color: '#654321'
};

export class ModularChair extends StructuredObject implements ICreatable {
    private params: typeof DEFAULT_CONFIG;
    
    constructor(customParams: Partial<typeof DEFAULT_CONFIG> = {}) {
        super("Modular Chair");
        this.params = { ...DEFAULT_CONFIG, ...customParams };
        this.init(); // Initialiser après la configuration
    }
    
    protected definePoints(): void {
        const p = this.params;
        const hw = p.seat_width / 2;  // half width
        const hd = p.seat_depth / 2;  // half depth
        
        // Points modulaires - chaque composant a ses propres points
        this.defineSeatingPoints();
        this.defineBackrestPoints();
        this.defineLegPoints();
    }
    
    private defineSeatingPoints(): void {
        const p = this.params;
        const hw = p.seat_width / 2;
        const hd = p.seat_depth / 2;
        
        // Module assise
        this.setPoint('seat_center', [0, p.seat_height, 0]);
        this.setPoint('seat_fl', [-hw, p.seat_height, -hd]);
        this.setPoint('seat_fr', [hw, p.seat_height, -hd]);
        this.setPoint('seat_bl', [-hw, p.seat_height, hd]);
        this.setPoint('seat_br', [hw, p.seat_height, hd]);
    }
    
    private defineBackrestPoints(): void {
        const p = this.params;
        const hw = p.seat_width / 2;
        const hd = p.seat_depth / 2;
        
        // Module dossier
        this.setPoint('back_center', [0, p.seat_height + p.back_height/2, -hd + p.back_thickness/2]);
        this.setPoint('back_top', [0, p.seat_height + p.back_height, -hd + p.back_thickness/2]);
        this.setPoint('back_bottom', [0, p.seat_height, -hd + p.back_thickness/2]);
    }
    
    private defineLegPoints(): void {
        const p = this.params;
        const hw = p.seat_width / 2;
        const hd = p.seat_depth / 2;
        const offset = p.leg_size / 2;
        
        // Module pieds - positions modulaires
        this.setPoint('leg_fl', [-hw + offset, p.seat_height/2, -hd + offset]);
        this.setPoint('leg_fr', [hw - offset, p.seat_height/2, -hd + offset]);
        this.setPoint('leg_bl', [-hw + offset, p.seat_height/2, hd - offset]);
        this.setPoint('leg_br', [hw - offset, p.seat_height/2, hd - offset]);
    }
    
    protected buildStructure(): void {
        // Le structure est constituée des pieds (structure porteuse)
        this.buildLegModule();
    }
    
    protected buildSurfaces(): void {
        // Les surfaces sont l'assise et le dossier
        this.buildSeatingModule();
        this.buildBackrestModule();
    }
    
    /**
     * Module pour construire l'assise
     */
    private buildSeatingModule(): void {
        const p = this.params;
        const seat = Primitive.box(p.seat_width, p.seat_thickness, p.seat_depth, p.wood_color);
        this.addPrimitiveAt(seat, [0, p.seat_height, 0]);
    }
    
    /**
     * Module pour construire le dossier
     */
    private buildBackrestModule(): void {
        const p = this.params;
        const hd = p.seat_depth / 2;
        
        const backrest = Primitive.box(p.seat_width, p.back_height, p.back_thickness, p.wood_color);
        this.addPrimitiveAt(backrest, [0, p.seat_height + p.back_height/2, -hd + p.back_thickness/2]);
    }
    
    /**
     * Module pour construire les pieds
     */
    private buildLegModule(): void {
        const p = this.params;
        
        // Positions des 4 pieds (style modulaire)
        const legPositions = [
            this.getPoint('leg_fl'),
            this.getPoint('leg_fr'), 
            this.getPoint('leg_bl'),
            this.getPoint('leg_br')
        ];
        
        legPositions.forEach((pos) => {
            if (pos) {
                const leg = Primitive.box(p.leg_size, p.seat_height, p.leg_size, p.leg_color);
                this.addPrimitiveAt(leg, [pos.x, pos.y, pos.z]);
            }
        });
    }
    
    create(): this {
        return this;
    }
    
    getName(): string {
        return "Chaise Modulaire";
    }
    
    getDescription(): string {
        return "Chaise construite avec modules StructuredObject";
    }
    
    getPrimitiveCount(): number {
        return 6; // assise + dossier + 4 pieds
    }
}

// ============================================
// VARIANTES MODULAIRES
// ============================================

/**
 * Chaise de bureau modulaire
 */
export class OfficeModularChair extends ModularChair {
    constructor() {
        super({
            seat_height: 0.5,
            back_height: 0.5,
            leg_size: 0.05,
            wood_color: '#2F4F4F',
            leg_color: '#1C1C1C'
        });
    }
    
    getName(): string {
        return "Chaise Bureau Modulaire";
    }
}

/**
 * Tabouret de bar modulaire
 */
export class BarStoolModular extends ModularChair {
    constructor() {
        super({
            seat_height: 0.75,
            seat_width: 0.35,
            seat_depth: 0.35,
            back_height: 0.2,
            leg_size: 0.03,
            wood_color: '#8B4513',
            leg_color: '#654321'
        });
    }
    
    getName(): string {
        return "Tabouret Bar Modulaire";
    }
}