/**
 * Box.ts - Boîte paramétrique avec couvercle
 * Utilise StructuredObject pour définir les points anatomiques de la boîte
 */

import { ICreatable } from '@types';
import { StructuredObject } from '@core/StructuredObject';
import { Primitive } from '@core/Primitive';


export class Box extends StructuredObject implements ICreatable {
    private params = {
        width: 0.4,
        height: 0.3,
        depth: 0.3,
        wallThickness: 0.01,
        lidOpen: false,
        color: '#D2691E'
    };
    
    constructor(customParams: Partial<typeof Box.prototype.params> = {}) {
        super("Box with Lid");
        this.params = { ...this.params, ...customParams };
        this.init(); // Initialiser après la configuration
    }
    
    protected definePoints(): void {
        const p = this.params;
        const hw = p.width / 2;  // half width
        const hd = p.depth / 2;  // half depth
        const wt = p.wallThickness;
        
        // Points de base de la boîte
        this.setPoint('bottom_center', [0, wt/2, 0]);
        
        // Coins de la base
        this.setPoint('bottom_fl', [-hw, wt/2, -hd]); // front left
        this.setPoint('bottom_fr', [hw, wt/2, -hd]);  // front right
        this.setPoint('bottom_bl', [-hw, wt/2, hd]);  // back left
        this.setPoint('bottom_br', [hw, wt/2, hd]);   // back right
        
        // Points des parois
        this.setPoint('wall_front_center', [0, p.height/2, -hd + wt/2]);
        this.setPoint('wall_back_center', [0, p.height/2, hd - wt/2]);
        this.setPoint('wall_left_center', [-hw + wt/2, p.height/2, 0]);
        this.setPoint('wall_right_center', [hw - wt/2, p.height/2, 0]);
        
        // Points du couvercle
        if (p.lidOpen) {
            this.setPoint('lid_center', [0, p.height + wt/2, hd * 0.8]);
            this.setPoint('handle_center', [0, p.height + wt, hd * 0.8 - 0.05]);
        } else {
            this.setPoint('lid_center', [0, p.height + wt/2, 0]);
            this.setPoint('handle_center', [0, p.height + wt * 2, 0]);
        }
    }
    
    protected buildStructure(): void {
        // Pas de structure spécifique - la boîte est constituée de surfaces
    }
    
    protected buildSurfaces(): void {
        const p = this.params;
        const hw = p.width / 2;
        const hd = p.depth / 2;
        const wt = p.wallThickness;
        
        // === FOND ===
        const bottom = Primitive.box(p.width, wt, p.depth, p.color);
        this.addPrimitiveAt(bottom, [0, wt/2, 0]);
        
        // === PAROIS ===
        const frontWall = Primitive.box(p.width, p.height, wt, p.color);
        this.addPrimitiveAt(frontWall, [0, p.height/2, -hd + wt/2]);
        
        const backWall = Primitive.box(p.width, p.height, wt, p.color);
        this.addPrimitiveAt(backWall, [0, p.height/2, hd - wt/2]);
        
        const leftWall = Primitive.box(wt, p.height, p.depth, p.color);
        this.addPrimitiveAt(leftWall, [-hw + wt/2, p.height/2, 0]);
        
        const rightWall = Primitive.box(wt, p.height, p.depth, p.color);
        this.addPrimitiveAt(rightWall, [hw - wt/2, p.height/2, 0]);
        
        // === COUVERCLE ===
        const lid = Primitive.box(p.width + wt * 2, wt, p.depth + wt * 2, p.color);
        
        if (p.lidOpen) {
            // Couvercle ouvert (rotation autour du bord arrière)
            lid.position.set(0, p.height, hd);
            lid.rotation.x = -Math.PI/4;
        } else {
            // Couvercle fermé
            lid.position.set(0, p.height + wt/2, 0);
        }
        this.add(lid);
        
        // === POIGNÉE ===
        const handle = Primitive.cylinder(0.01, p.width * 0.3, '#808080');
        handle.rotation.z = Math.PI/2;
        
        if (p.lidOpen) {
            handle.position.set(0, p.height + wt, hd - 0.05);
            handle.rotation.x = -Math.PI/4;
        } else {
            handle.position.set(0, p.height + wt * 2, 0);
        }
        this.add(handle);
    }
    
    create(): this {
        return this;
    }
    
    getName(): string {
        return "Boîte avec Couvercle";
    }
    
    getDescription(): string {
        return `Boîte paramétrique ${this.params.lidOpen ? 'ouverte' : 'fermée'}`;
    }
    
    getPrimitiveCount(): number {
        return 7; // fond + 4 parois + couvercle + poignée
    }
}