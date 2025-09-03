/**
 * FractalTreeFactory.ts - Factory pour créer des arbres fractals génératifs
 * Utilise le pattern Builder pour construire un objet FractalTree en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export interface FractalTreeParams extends FactoryParams {
    depth?: number;
    branches?: number;
}

export class FractalTreeFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'organic',
        name: 'FractalTree',
        description: 'Arbre fractal génératif',
        tags: ['arbre', 'fractal', 'generatif'],
        complexity: 'medium' as const
    };

    protected getDefaultParams(): FractalTreeParams {
        return {
            depth: 3,
            branches: 3
        };
    }

    protected createBuilder(params: FractalTreeParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as FractalTreeParams;
        const branchPoints: Map<string, { position: Position3D, level: number, angle: number }> = new Map();

        const defineBranchPoints = (
            context: IStructuredObjectContext,
            level: number,
            position: Position3D,
            angle: number,
            name: string
        ): void => {
            if (level <= 0) return;

            const length = 0.5 * Math.pow(0.7, (mergedParams.depth || 3) - level);

            context.setPoint(`${name}_start`, position);

            const endY = position[1] + length;
            const endPosition: Position3D = [position[0], endY, position[2]];
            context.setPoint(`${name}_end`, endPosition);

            branchPoints.set(name, { position, level, angle });

            if (level > 1) {
                const newY = position[1] + length * 0.8;
                for (let i = 0; i < (mergedParams.branches || 3); i++) {
                    const branchAngle = (i - ((mergedParams.branches || 3) - 1) / 2) * 0.5;
                    const newX = position[0] + Math.sin(branchAngle) * length * 0.5;
                    const newZ = position[2] + Math.cos(branchAngle) * length * 0.5;

                    const branchName = `${name}_b${i}`;
                    defineBranchPoints(
                        context,
                        level - 1,
                        [newX, newY, newZ],
                        branchAngle,
                        branchName
                    );
                }
            }
        };

        return {
            definePoints(context: IStructuredObjectContext): void {
                defineBranchPoints(context, mergedParams.depth!, [0, 0, 0], 0, "trunk");
            },

            buildStructure(context: IStructuredObjectContext): void {
                branchPoints.forEach((branchInfo, name) => {
                    const { position, level, angle } = branchInfo;
                    const length = 0.5 * Math.pow(0.7, (mergedParams.depth || 3) - level);
                    const thickness = 0.05 * Math.pow(0.7, (mergedParams.depth || 3) - level);

                    const branchColor = level === mergedParams.depth ? '#654321' : '#8B4513';
                    const branch = Primitive.cylinder(thickness, length, branchColor);

                    branch.position.set(position[0], position[1] + length / 2, position[2]);
                    branch.rotation.z = angle;

                    context.addPrimitiveAt(branch, [branch.position.x, branch.position.y, branch.position.z]);
                });
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                branchPoints.forEach((branchInfo, name) => {
                    const { position, level } = branchInfo;

                    if (level === 1) {
                        const leaf = Primitive.sphere(0.02, '#228B22');
                        const length = 0.5 * Math.pow(0.7, (mergedParams.depth || 3) - level);
                        context.addPrimitiveAt(leaf, [position[0], position[1] + length, position[2]]);
                    }
                });
            },

            getName(): string { return 'Arbre Fractal'; },
            getDescription(): string { return `Arbre fractal de profondeur ${mergedParams.depth}`; },
            getPrimitiveCount(): number {
                let count = 0;
                for (let i = 0; i < mergedParams.depth!; i++) {
                    count += Math.pow(mergedParams.branches!, i);
                }
                return count;
            }
        };
    }
}