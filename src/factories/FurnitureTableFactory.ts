/**
 * FurnitureTableFactory.ts - Factory pour créer des tables paramétriques
 * Utilise le pattern Builder pour construire un objet Table en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export const DEFAULT_TABLE_CONFIG = {
    width: 1.2,
    depth: 0.8,
    height: 0.75,
    topThickness: 0.03,
    legRadius: 0.025,
    woodColor: '#8B4513'
};
export interface FurnitureTableParams extends FactoryParams, Partial<typeof DEFAULT_TABLE_CONFIG> { }

export class FurnitureTableFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'furniture',
        name: 'Table',
        description: 'Table simple paramétrique',
        tags: ['table', 'mobilier', 'simple'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): FurnitureTableParams {
        return DEFAULT_TABLE_CONFIG;
    }

    protected createBuilder(params: FurnitureTableParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as FurnitureTableParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const { width, depth, height } = mergedParams;

                // Points du plateau
                context.setPoint('PLATEAU_CENTRE', [0, height!, 0]);

                // Points des pieds (positions en bas et en haut)
                context.setPoint('PIED_BAS_AG', [-width! / 2 + 0.05, 0, -depth! / 2 + 0.05]);
                context.setPoint('PIED_BAS_AD', [width! / 2 - 0.05, 0, -depth! / 2 + 0.05]);
                context.setPoint('PIED_BAS_RG', [-width! / 2 + 0.05, 0, depth! / 2 - 0.05]);
                context.setPoint('PIED_BAS_RD', [width! / 2 - 0.05, 0, depth! / 2 - 0.05]);

                context.setPoint('PIED_HAUT_AG', [-width! / 2 + 0.05, height!, -depth! / 2 + 0.05]);
                context.setPoint('PIED_HAUT_AD', [width! / 2 - 0.05, height!, -depth! / 2 + 0.05]);
                context.setPoint('PIED_HAUT_RG', [-width! / 2 + 0.05, height!, depth! / 2 - 0.05]);
                context.setPoint('PIED_HAUT_RD', [width! / 2 - 0.05, height!, depth! / 2 - 0.05]);
            },

            buildStructure(context: IStructuredObjectContext): void {
                const { legRadius, woodColor } = mergedParams;

                // Les 4 pieds
                context.addCylinderBetweenPoints('PIED_BAS_AG', 'PIED_HAUT_AG', legRadius!, woodColor!);
                context.addCylinderBetweenPoints('PIED_BAS_AD', 'PIED_HAUT_AD', legRadius!, woodColor!);
                context.addCylinderBetweenPoints('PIED_BAS_RG', 'PIED_HAUT_RG', legRadius!, woodColor!);
                context.addCylinderBetweenPoints('PIED_BAS_RD', 'PIED_HAUT_RD', legRadius!, woodColor!);
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const { width, depth, topThickness, woodColor } = mergedParams;

                // Plateau
                const plateau = Primitive.box(width!, topThickness!, depth!, woodColor!);
                context.addPrimitiveAtPoint(plateau, 'PLATEAU_CENTRE');
            },

            getName(): string { return 'Table'; },
            getDescription(): string { return `Table simple en bois de ${mergedParams.width}x${mergedParams.depth}x${mergedParams.height}`; },
            getPrimitiveCount(): number { return 5; } // 1 plateau + 4 pieds
        };
    }
}