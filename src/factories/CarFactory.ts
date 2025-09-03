/**
 * CarFactory.ts - Factory pour créer des voitures paramétriques
 * Utilise le pattern Builder pour construire un objet Voiture en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export const DEFAULT_CAR_CONFIG = {
    length: 0.5,        // 50cm
    width: 0.25,        // 25cm  
    height: 0.15,       // 15cm
    wheelRadius: 0.05,  // 5cm
    color: '#3498db'    // Bleu
};
export interface CarParams extends FactoryParams, Partial<typeof DEFAULT_CAR_CONFIG> { }

export class CarFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'shape',
        name: 'Car',
        description: 'Voiture paramétrique',
        tags: ['voiture', 'vehicule', 'forme'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): CarParams {
        return DEFAULT_CAR_CONFIG;
    }

    protected createBuilder(params: CarParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as CarParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hl = p.length! / 2;  // half length
                const hw = p.width! / 2;   // half width

                // Point central
                context.setPoint('center', [0, 0, 0]);

                // Points du châssis
                context.setPoint('chassis_center', [0, p.wheelRadius! + p.height! / 2, 0]);

                // Points des roues
                context.setPoint('wheel_fl', [hl * 0.6, p.wheelRadius!, hw * 0.9]);   // front left
                context.setPoint('wheel_fr', [hl * 0.6, p.wheelRadius!, -hw * 0.9]);  // front right
                context.setPoint('wheel_bl', [-hl * 0.6, p.wheelRadius!, hw * 0.9]);  // back left
                context.setPoint('wheel_br', [-hl * 0.6, p.wheelRadius!, -hw * 0.9]); // back right

                // Points de la cabine
                context.setPoint('cabin_center', [0, p.wheelRadius! + p.height! + p.height! / 3, 0]);

                // Points des phares
                context.setPoint('headlight_left', [hl - 0.02, p.wheelRadius! + p.height! / 2, hw / 2]);
                context.setPoint('headlight_right', [hl - 0.02, p.wheelRadius! + p.height! / 2, -hw / 2]);
            },

            buildStructure(context: IStructuredObjectContext): void {
                // Pas de structure spécifique - la voiture est constituée de surfaces
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hl = p.length! / 2;
                const hw = p.width! / 2;

                // === CHÂSSIS ===
                const chassis = Primitive.box(p.length!, p.height!, p.width!, p.color!);
                context.addPrimitiveAt(chassis, [0, p.wheelRadius! + p.height! / 2, 0]);

                // === CABINE ===
                const cabin = Primitive.box(p.length! * 0.6, p.height! * 0.6, p.width! * 0.9, p.color!);
                context.addPrimitiveAt(cabin, [0, p.wheelRadius! + p.height! + p.height! * 0.3, 0]);

                // === ROUES ===
                // Roue avant gauche
                const wheel_fl = Primitive.cylinder(p.wheelRadius!, p.width! * 0.15, '#000000');
                wheel_fl.rotation.z = Math.PI / 2;
                context.addPrimitiveAt(wheel_fl, [hl * 0.6, p.wheelRadius!, hw * 0.9]);

                // Roue avant droite
                const wheel_fr = Primitive.cylinder(p.wheelRadius!, p.width! * 0.15, '#000000');
                wheel_fr.rotation.z = Math.PI / 2;
                context.addPrimitiveAt(wheel_fr, [hl * 0.6, p.wheelRadius!, -hw * 0.9]);

                // Roue arrière gauche
                const wheel_bl = Primitive.cylinder(p.wheelRadius!, p.width! * 0.15, '#000000');
                wheel_bl.rotation.z = Math.PI / 2;
                context.addPrimitiveAt(wheel_bl, [-hl * 0.6, p.wheelRadius!, hw * 0.9]);

                // Roue arrière droite
                const wheel_br = Primitive.cylinder(p.wheelRadius!, p.width! * 0.15, '#000000');
                wheel_br.rotation.z = Math.PI / 2;
                context.addPrimitiveAt(wheel_br, [-hl * 0.6, p.wheelRadius!, -hw * 0.9]);

                // === PHARES ===
                const headlight_l = Primitive.sphere(0.015, '#ffff00');
                context.addPrimitiveAt(headlight_l, [hl - 0.02, p.wheelRadius! + p.height! / 2, hw / 2]);

                const headlight_r = Primitive.sphere(0.015, '#ffff00');
                context.addPrimitiveAt(headlight_r, [hl - 0.02, p.wheelRadius! + p.height! / 2, -hw / 2]);

                // === PARE-BRISE ===
                const windshield = Primitive.box(0.02, p.height! * 0.5, p.width! * 0.8, '#87CEEB');
                (windshield as THREE.Mesh).position.set(p.length! * 0.25, p.wheelRadius! + p.height! + p.height! * 0.3, 0);
                context.addExistingObject(windshield); // Ajout direct car c'est un THREE.Mesh
            },

            getName(): string { return 'Voiture'; },
            getDescription(): string { return `Voiture ${mergedParams.length}m x ${mergedParams.width}m`; },
            getPrimitiveCount(): number { return 9; } // châssis + cabine + 4 roues + 2 phares + pare-brise
        };
    }
}