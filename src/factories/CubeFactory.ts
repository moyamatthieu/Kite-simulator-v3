/**
 * CubeFactory.ts - Factory pour créer des cubes paramétriques
 * Utilise le pattern Builder pour construire un objet Cube en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';
import { logger } from '@core/Logger';

export const DEFAULT_CUBE_CONFIG = {
    size: 2,
    printable: false,
    color: '#8B4513'
};
export interface CubeParams extends FactoryParams, Partial<typeof DEFAULT_CUBE_CONFIG> { }

export class CubeFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'shape',
        name: 'Cube',
        description: 'Cube paramétrique',
        tags: ['cube', 'forme', 'geometrie'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): CubeParams {
        return DEFAULT_CUBE_CONFIG;
    }

    protected createBuilder(params: CubeParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as CubeParams;

        const buildPrintableSurfaces = (context: IStructuredObjectContext) => {
            const halfSize = mergedParams.size! / 2;
            const color = mergedParams.color!;

            // Front face (z = halfSize)
            context.addSurfaceBetweenPoints(['bottom-front-left', 'bottom-front-right', 'top-front-right'], color);
            context.addSurfaceBetweenPoints(['bottom-front-left', 'top-front-right', 'top-front-left'], color);

            // Back face (z = -halfSize)
            context.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-back-right', 'top-back-right'], color);
            context.addSurfaceBetweenPoints(['bottom-back-left', 'top-back-right', 'top-back-left'], color);

            // Left face (x = -halfSize)
            context.addSurfaceBetweenPoints(['bottom-back-left', 'top-back-left', 'top-front-left'], color);
            context.addSurfaceBetweenPoints(['bottom-back-left', 'top-front-left', 'bottom-front-left'], color);

            // Right face (x = halfSize)
            context.addSurfaceBetweenPoints(['bottom-back-right', 'top-back-right', 'top-front-right'], color);
            context.addSurfaceBetweenPoints(['bottom-back-right', 'top-front-right', 'bottom-front-right'], color);

            // Top face (y = halfSize)
            context.addSurfaceBetweenPoints(['top-back-left', 'top-back-right', 'top-front-right'], color);
            context.addSurfaceBetweenPoints(['top-back-left', 'top-front-right', 'top-front-left'], color);

            // Bottom face (y = -halfSize)
            context.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-back-right', 'bottom-front-right'], color);
            context.addSurfaceBetweenPoints(['bottom-back-left', 'bottom-front-right', 'bottom-front-left'], color);

            logger.debug(`Printable cube: Created 12 triangles for 6 faces`, 'CubeFactory');
        };

        const buildVisualSurfaces = (context: IStructuredObjectContext) => {
            const box = Primitive.box(mergedParams.size!, mergedParams.size!, mergedParams.size!, mergedParams.color!);
            context.addExistingObject(box);
            logger.debug(`Visual cube: Created box primitive`, 'CubeFactory');
        };

        return {
            definePoints(context: IStructuredObjectContext): void {
                const halfSize = mergedParams.size! / 2;

                context.setPoint('bottom-back-left', [-halfSize, -halfSize, -halfSize]);
                context.setPoint('bottom-back-right', [halfSize, -halfSize, -halfSize]);
                context.setPoint('top-back-right', [halfSize, halfSize, -halfSize]);
                context.setPoint('top-back-left', [-halfSize, halfSize, -halfSize]);
                context.setPoint('bottom-front-left', [-halfSize, -halfSize, halfSize]);
                context.setPoint('bottom-front-right', [halfSize, -halfSize, halfSize]);
                context.setPoint('top-front-right', [halfSize, halfSize, halfSize]);
                context.setPoint('top-front-left', [-halfSize, halfSize, halfSize]);

                logger.debug(`Cube points defined - Total points: ${context.getPointNames().length}`, 'CubeFactory');
            },

            buildStructure(context: IStructuredObjectContext): void {
                if (!mergedParams.printable) {
                    const material = new THREE.LineBasicMaterial({ color: 0x000000 });

                    const points = [
                        context.getPoint('bottom-back-left')!, context.getPoint('bottom-back-right')!,
                        context.getPoint('bottom-back-right')!, context.getPoint('top-back-right')!,
                        context.getPoint('top-back-right')!, context.getPoint('top-back-left')!,
                        context.getPoint('top-back-left')!, context.getPoint('bottom-back-left')!
                    ];
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    const line = new THREE.Line(geometry, material);
                    context.addExistingObject(line);
                }
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                if (mergedParams.printable) {
                    buildPrintableSurfaces(context);
                } else {
                    buildVisualSurfaces(context);
                }
            },

            getName(): string { return mergedParams.printable ? 'Cube (Impression 3D)' : 'Cube'; },
            getDescription(): string {
                return mergedParams.printable
                    ? `Cube optimisé pour l'impression 3D - Taille: ${mergedParams.size} unités`
                    : `Cube simple - Taille: ${mergedParams.size} unités`;
            },
            getPrimitiveCount(): number { return mergedParams.printable ? 12 : 6; } // 12 triangles ou 6 quads
        };
    }
}