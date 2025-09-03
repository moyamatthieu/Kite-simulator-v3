/**
 * BoxFactory.ts - Factory pour créer des boîtes paramétriques avec couvercle
 * Utilise le pattern Builder pour construire un objet Box en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export const DEFAULT_BOX_CONFIG = {
    width: 0.4,
    height: 0.3,
    depth: 0.3,
    wallThickness: 0.01,
    lidOpen: false,
    color: '#D2691E'
};
export interface BoxParams extends FactoryParams, Partial<typeof DEFAULT_BOX_CONFIG> { }

export class BoxFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'shape',
        name: 'Box',
        description: 'Boîte paramétrique avec couvercle',
        tags: ['boite', 'forme', 'contenant'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): BoxParams {
        return DEFAULT_BOX_CONFIG;
    }

    protected createBuilder(params: BoxParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as BoxParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hw = p.width! / 2;  // half width
                const hd = p.depth! / 2;  // half depth
                const wt = p.wallThickness!;

                // Points de base de la boîte
                context.setPoint('bottom_center', [0, wt / 2, 0]);

                // Coins de la base
                context.setPoint('bottom_fl', [-hw, wt / 2, -hd]); // front left
                context.setPoint('bottom_fr', [hw, wt / 2, -hd]);  // front right
                context.setPoint('bottom_bl', [-hw, wt / 2, hd]);  // back left
                context.setPoint('bottom_br', [hw, wt / 2, hd]);   // back right

                // Points des parois
                context.setPoint('wall_front_center', [0, p.height! / 2, -hd + wt / 2]);
                context.setPoint('wall_back_center', [0, p.height! / 2, hd - wt / 2]);
                context.setPoint('wall_left_center', [-hw + wt / 2, p.height! / 2, 0]);
                context.setPoint('wall_right_center', [hw - wt / 2, p.height! / 2, 0]);

                // Points du couvercle
                if (p.lidOpen) {
                    context.setPoint('lid_center', [0, p.height! + wt / 2, hd * 0.8]);
                    context.setPoint('handle_center', [0, p.height! + wt, hd * 0.8 - 0.05]);
                } else {
                    context.setPoint('lid_center', [0, p.height! + wt / 2, 0]);
                    context.setPoint('handle_center', [0, p.height! + wt * 2, 0]);
                }
            },

            buildStructure(context: IStructuredObjectContext): void {
                // Pas de structure spécifique - la boîte est constituée de surfaces
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hw = p.width! / 2;
                const hd = p.depth! / 2;
                const wt = p.wallThickness!;

                // === FOND ===
                const bottom = Primitive.box(p.width!, wt, p.depth!, p.color!);
                context.addPrimitiveAt(bottom, [0, wt / 2, 0]);

                // === PAROIS ===
                const frontWall = Primitive.box(p.width!, p.height!, wt, p.color!);
                context.addPrimitiveAt(frontWall, [0, p.height! / 2, -hd + wt / 2]);

                const backWall = Primitive.box(p.width!, p.height!, wt, p.color!);
                context.addPrimitiveAt(backWall, [0, p.height! / 2, hd - wt / 2]);

                const leftWall = Primitive.box(wt, p.height!, p.depth!, p.color!);
                context.addPrimitiveAt(leftWall, [-hw + wt / 2, p.height! / 2, 0]);

                const rightWall = Primitive.box(wt, p.height!, p.depth!, p.color!);
                context.addPrimitiveAt(rightWall, [hw - wt / 2, p.height! / 2, 0]);

                // === COUVERCLE ===
                const lid = Primitive.box(p.width! + wt * 2, wt, p.depth! + wt * 2, p.color!);

                if (p.lidOpen) {
                    lid.position.set(0, p.height!, hd);
                    lid.rotation.x = -Math.PI / 4;
                } else {
                    lid.position.set(0, p.height! + wt / 2, 0);
                }
                context.addExistingObject(lid); // Ajout direct car c'est un THREE.Mesh

                // === POIGNÉE ===
                const handle = Primitive.cylinder(0.01, p.width! * 0.3, '#808080');
                handle.rotation.z = Math.PI / 2;

                if (p.lidOpen) {
                    handle.position.set(0, p.height! + wt, hd - 0.05);
                    handle.rotation.x = -Math.PI / 4;
                } else {
                    handle.position.set(0, p.height! + wt * 2, 0);
                }
                context.addExistingObject(handle); // Ajout direct car c'est un THREE.Mesh
            },

            getName(): string { return 'Boîte avec Couvercle'; },
            getDescription(): string { return `Boîte paramétrique ${mergedParams.lidOpen ? 'ouverte' : 'fermée'}`; },
            getPrimitiveCount(): number { return 7; } // fond + 4 parois + couvercle + poignée
        };
    }
}