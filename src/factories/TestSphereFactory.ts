/**
 * TestSphereFactory.ts - Factory pour créer une sphère de test paramétrique
 * Utilise le pattern Builder pour construire un objet TestSphere en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';
import { logger } from '@core/Logger';

export const DEFAULT_TEST_SPHERE_CONFIG = {
    radius: 0.5,
    color: '#FF6B6B',
    segments: 32
};
export interface TestSphereParams extends FactoryParams, Partial<typeof DEFAULT_TEST_SPHERE_CONFIG> { }

export class TestSphereFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'debug',
        name: 'TestSphere',
        description: 'Sphère de test pour démonstration',
        tags: ['sphere', 'test', 'debug'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): TestSphereParams {
        return DEFAULT_TEST_SPHERE_CONFIG;
    }

    protected createBuilder(params: TestSphereParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as TestSphereParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Point central
                context.setPoint('CENTER', [0, 0, 0]);

                // Points de référence sur la sphère
                context.setPoint('TOP', [0, p.radius!, 0]);
                context.setPoint('BOTTOM', [0, -p.radius!, 0]);
                context.setPoint('FRONT', [0, 0, p.radius!]);
                context.setPoint('BACK', [0, 0, -p.radius!]);
                context.setPoint('LEFT', [-p.radius!, 0, 0]);
                context.setPoint('RIGHT', [p.radius!, 0, 0]);
            },

            buildStructure(context: IStructuredObjectContext): void {
                // Pas de structure rigide pour une sphère
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                // Créer la sphère
                const sphere = Primitive.sphere(
                    mergedParams.radius!,
                    mergedParams.color!,
                    mergedParams.segments!
                );

                context.addPrimitiveAtPoint(sphere, 'CENTER');
            },

            getName(): string { return 'Sphère de Test'; },
            getDescription(): string { return 'Sphère automatiquement détectée par l\'AutoLoader'; },
            getPrimitiveCount(): number { return 1; }
        };
    }
}