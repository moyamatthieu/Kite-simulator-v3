/**
 * PyramidFactory.ts - Factory pour créer des pyramides paramétriques
 * Utilise le pattern Builder pour construire un objet Pyramide en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export interface PyramidParams extends FactoryParams {
    size?: number;
    height?: number;
    color?: string;
}

export class PyramidFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'shape',
        name: 'Pyramid',
        description: 'Pyramide géométrique paramétrique',
        tags: ['pyramide', 'forme', 'geometrie'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): PyramidParams {
        return {
            size: 1,
            height: 1.5,
            color: '#FFD700'
        };
    }

    protected createBuilder(params: PyramidParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as PyramidParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const hs = mergedParams.size! / 2; // half size
                const baseHeight = 0.05;

                // Points de la base carrée
                context.setPoint('base_center', [0, baseHeight / 2, 0]);
                context.setPoint('base_fl', [-hs, baseHeight / 2, -hs]); // front left
                context.setPoint('base_fr', [hs, baseHeight / 2, -hs]);  // front right
                context.setPoint('base_bl', [-hs, baseHeight / 2, hs]);  // back left
                context.setPoint('base_br', [hs, baseHeight / 2, hs]);   // back right

                // Points de la pyramide
                context.setPoint('pyramid_base', [0, baseHeight, 0]);
                context.setPoint('pyramid_top', [0, baseHeight + mergedParams.height!, 0]);
                context.setPoint('pyramid_center', [0, baseHeight + mergedParams.height! / 2, 0]);
            },

            buildStructure(context: IStructuredObjectContext): void {
                // Pas de structure spécifique - forme géométrique simple
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const baseHeight = 0.05;

                // === BASE CARRÉE ===
                const base = Primitive.box(mergedParams.size!, baseHeight, mergedParams.size!, mergedParams.color!);
                context.addPrimitiveAt(base, [0, baseHeight / 2, 0]);

                // === PYRAMIDE ===
                const pyramid = Primitive.cone(mergedParams.size! * 0.7, mergedParams.height!, mergedParams.color!, 4);
                pyramid.rotation.y = Math.PI / 4; // Rotation pour aligner avec la base carrée
                context.addPrimitiveAt(pyramid, [0, baseHeight + mergedParams.height! / 2, 0]);
            },

            getName(): string { return 'Pyramid'; },
            getDescription(): string { return `Pyramide de ${mergedParams.height}m de hauteur`; },
            getPrimitiveCount(): number { return 2; }
        };
    }
}