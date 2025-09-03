/**
 * ModularChairFactory.ts - Factory pour créer des chaises modulaires
 * Utilise le pattern Builder pour construire un objet ModularChair en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

// Configuration par défaut de la chaise modulaire
export const DEFAULT_MODULAR_CHAIR_CONFIG = {
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
export interface ModularChairParams extends FactoryParams, Partial<typeof DEFAULT_MODULAR_CHAIR_CONFIG> { }

export class ModularChairFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'furniture',
        name: 'ModularChair',
        description: 'Chaise modulaire paramétrique',
        tags: ['chaise', 'modulaire', 'mobilier'],
        complexity: 'medium' as const
    };

    protected getDefaultParams(): ModularChairParams {
        return DEFAULT_MODULAR_CHAIR_CONFIG;
    }

    protected createBuilder(params: ModularChairParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as ModularChairParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hw = p.seat_width! / 2;  // half width
                const hd = p.seat_depth! / 2;  // half depth

                // Module assise
                context.setPoint('seat_center', [0, p.seat_height!, 0]);
                context.setPoint('seat_fl', [-hw, p.seat_height!, -hd]);
                context.setPoint('seat_fr', [hw, p.seat_height!, -hd]);
                context.setPoint('seat_bl', [-hw, p.seat_height!, hd]);
                context.setPoint('seat_br', [hw, p.seat_height!, hd]);

                // Module dossier
                context.setPoint('back_center', [0, p.seat_height! + p.back_height! / 2, -hd + p.back_thickness! / 2]);
                context.setPoint('back_top', [0, p.seat_height! + p.back_height!, -hd + p.back_thickness! / 2]);
                context.setPoint('back_bottom', [0, p.seat_height!, -hd + p.back_thickness! / 2]);

                // Module pieds - positions modulaires
                const offset = p.leg_size! / 2;
                context.setPoint('leg_fl', [-hw + offset, p.seat_height! / 2, -hd + offset]);
                context.setPoint('leg_fr', [hw - offset, p.seat_height! / 2, -hd + offset]);
                context.setPoint('leg_bl', [-hw + offset, p.seat_height! / 2, hd - offset]);
                context.setPoint('leg_br', [hw - offset, p.seat_height! / 2, hd - offset]);
            },

            buildStructure(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Positions des 4 pieds (style modulaire)
                const legPositions = [
                    context.getPoint('leg_fl'),
                    context.getPoint('leg_fr'),
                    context.getPoint('leg_bl'),
                    context.getPoint('leg_br')
                ];

                legPositions.forEach((pos) => {
                    if (pos) {
                        const leg = Primitive.box(p.leg_size!, p.seat_height!, p.leg_size!, p.leg_color!);
                        context.addPrimitiveAt(leg, [pos.x, pos.y, pos.z]);
                    }
                });
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hd = p.seat_depth! / 2;

                // Assise
                const seat = Primitive.box(p.seat_width!, p.seat_thickness!, p.seat_depth!, p.wood_color!);
                context.addPrimitiveAt(seat, [0, p.seat_height!, 0]);

                // Dossier
                const backrest = Primitive.box(p.seat_width!, p.back_height!, p.back_thickness!, p.wood_color!);
                context.addPrimitiveAt(backrest, [0, p.seat_height! + p.back_height! / 2, -hd + p.back_thickness! / 2]);
            },

            getName(): string { return 'Chaise Modulaire'; },
            getDescription(): string { return 'Chaise construite avec modules StructuredObject'; },
            getPrimitiveCount(): number { return 6; } // assise + dossier + 4 pieds
        };
    }
}

// Variantes prédéfinies
export const MODULAR_CHAIR_VARIANTS = {
    office: {
        seat_height: 0.5,
        back_height: 0.5,
        leg_size: 0.05,
        wood_color: '#2F4F4F',
        leg_color: '#1C1C1C'
    },
    bar: {
        seat_height: 0.75,
        seat_width: 0.35,
        seat_depth: 0.35,
        back_height: 0.2, // dossier plus court pour tabouret de bar
        leg_size: 0.03,
        wood_color: '#8B4513',
        leg_color: '#654321'
    }
};