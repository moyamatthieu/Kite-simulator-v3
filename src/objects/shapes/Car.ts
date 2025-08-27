/**
 * Car.ts - Voiture paramétrique
 * Utilise StructuredObject pour définir les points anatomiques de la voiture
 */

import { ICreatable } from '@types';
import { StructuredObject } from '@core/StructuredObject';
import { Primitive } from '@core/Primitive';

export class Car extends StructuredObject implements ICreatable {
    private params = {
        length: 0.5,        // 50cm
        width: 0.25,        // 25cm  
        height: 0.15,       // 15cm
        wheelRadius: 0.05,  // 5cm
        color: '#3498db'    // Bleu
    };
    
    constructor(customParams: Partial<typeof Car.prototype.params> = {}) {
        super("Voiture");
        this.params = { ...this.params, ...customParams };
        this.init(); // Initialiser après la configuration
    }
    
    protected definePoints(): void {
        const p = this.params;
        const hl = p.length / 2;  // half length
        const hw = p.width / 2;   // half width
        
        // Point central
        this.setPoint('center', [0, 0, 0]);
        
        // Points du châssis
        this.setPoint('chassis_center', [0, p.wheelRadius + p.height/2, 0]);
        
        // Points des roues
        this.setPoint('wheel_fl', [hl * 0.6, p.wheelRadius, hw * 0.9]);   // front left
        this.setPoint('wheel_fr', [hl * 0.6, p.wheelRadius, -hw * 0.9]);  // front right
        this.setPoint('wheel_bl', [-hl * 0.6, p.wheelRadius, hw * 0.9]);  // back left
        this.setPoint('wheel_br', [-hl * 0.6, p.wheelRadius, -hw * 0.9]); // back right
        
        // Points de la cabine
        this.setPoint('cabin_center', [0, p.wheelRadius + p.height + p.height/3, 0]);
        
        // Points des phares
        this.setPoint('headlight_left', [hl - 0.02, p.wheelRadius + p.height/2, hw/2]);
        this.setPoint('headlight_right', [hl - 0.02, p.wheelRadius + p.height/2, -hw/2]);
    }
    
    protected buildStructure(): void {
        // Pas de structure spécifique - la voiture est constituée de surfaces
    }
    
    protected buildSurfaces(): void {
        const p = this.params;
        const hl = p.length / 2;
        const hw = p.width / 2;
        
        // === CHÂSSIS ===
        const chassis = Primitive.box(p.length, p.height, p.width, p.color);
        this.addPrimitiveAt(chassis, [0, p.wheelRadius + p.height/2, 0]);
        
        // === CABINE ===
        const cabin = Primitive.box(p.length * 0.6, p.height * 0.6, p.width * 0.9, p.color);
        this.addPrimitiveAt(cabin, [0, p.wheelRadius + p.height + p.height * 0.3, 0]);
        
        // === ROUES ===
        // Roue avant gauche
        const wheel_fl = Primitive.cylinder(p.wheelRadius, p.width * 0.15, '#000000');
        wheel_fl.rotation.z = Math.PI/2;
        this.addPrimitiveAt(wheel_fl, [hl * 0.6, p.wheelRadius, hw * 0.9]);
        
        // Roue avant droite
        const wheel_fr = Primitive.cylinder(p.wheelRadius, p.width * 0.15, '#000000');
        wheel_fr.rotation.z = Math.PI/2;
        this.addPrimitiveAt(wheel_fr, [hl * 0.6, p.wheelRadius, -hw * 0.9]);
        
        // Roue arrière gauche
        const wheel_bl = Primitive.cylinder(p.wheelRadius, p.width * 0.15, '#000000');
        wheel_bl.rotation.z = Math.PI/2;
        this.addPrimitiveAt(wheel_bl, [-hl * 0.6, p.wheelRadius, hw * 0.9]);
        
        // Roue arrière droite
        const wheel_br = Primitive.cylinder(p.wheelRadius, p.width * 0.15, '#000000');
        wheel_br.rotation.z = Math.PI/2;
        this.addPrimitiveAt(wheel_br, [-hl * 0.6, p.wheelRadius, -hw * 0.9]);
        
        // === PHARES ===
        const headlight_l = Primitive.sphere(0.015, '#ffff00');
        this.addPrimitiveAt(headlight_l, [hl - 0.02, p.wheelRadius + p.height/2, hw/2]);
        
        const headlight_r = Primitive.sphere(0.015, '#ffff00');
        this.addPrimitiveAt(headlight_r, [hl - 0.02, p.wheelRadius + p.height/2, -hw/2]);
        
        // === PARE-BRISE ===
        const windshield = Primitive.box(0.02, p.height * 0.5, p.width * 0.8, '#87CEEB');
        windshield.position.set(p.length * 0.25, p.wheelRadius + p.height + p.height * 0.3, 0);
        this.add(windshield);
    }
    
    create(): this {
        return this;
    }
    
    getName(): string {
        return "Voiture";
    }
    
    getDescription(): string {
        return `Voiture ${this.params.length}m x ${this.params.width}m`;
    }
    
    getPrimitiveCount(): number {
        return 9; // châssis + cabine + 4 roues + 2 phares + pare-brise
    }
}