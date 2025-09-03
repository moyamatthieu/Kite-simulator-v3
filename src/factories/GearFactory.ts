/**
 * GearFactory.ts - Factory pour créer des engrenages paramétriques
 * Utilise le pattern Builder pour construire un objet Gear en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

// Configuration par défaut de l'engrenage
export const DEFAULT_GEAR_CONFIG = {
    // Dimensions (en unités 3D)
    outerRadius: 0.05,      // Rayon externe
    innerRadius: 0.035,     // Rayon interne (base des dents)
    thickness: 0.01,        // Épaisseur
    holeRadius: 0.01,       // Rayon du trou central

    // Dents
    teethCount: 20,         // Nombre de dents
    toothHeight: 0.015,     // Hauteur des dents
    toothWidth: 0.3,        // Largeur relative des dents (0-1)

    // Style
    style: 'standard' as 'standard' | 'simple',
    hasSpokes: false,       // Rayons intérieurs
    spokeCount: 6,          // Nombre de rayons

    // Couleurs
    color: '#708090',       // Gris métallique
    accentColor: '#4169E1'  // Bleu royal pour les détails
};
export interface GearParams extends FactoryParams, Partial<typeof DEFAULT_GEAR_CONFIG> { }

export class GearFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'mechanical',
        name: 'Gear',
        description: 'Engrenage paramétrique',
        tags: ['engrenage', 'roue dentee', 'mecanique'],
        complexity: 'medium' as const
    };

    protected getDefaultParams(): GearParams {
        return DEFAULT_GEAR_CONFIG;
    }

    protected createBuilder(params: GearParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as GearParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;

                context.setPoint('center', [0, 0, 0]);
                context.setPoint('body_center', [0, p.thickness! / 2, 0]);

                const angleStep = (Math.PI * 2) / p.teethCount!;
                for (let i = 0; i < p.teethCount!; i++) {
                    const angle = i * angleStep;
                    const x = Math.cos(angle) * p.innerRadius!;
                    const z = Math.sin(angle) * p.innerRadius!;
                    context.setPoint(`tooth_base_${i}`, [x, p.thickness! / 2, z]);

                    const xOuter = Math.cos(angle) * p.outerRadius!;
                    const zOuter = Math.sin(angle) * p.outerRadius!;
                    context.setPoint(`tooth_tip_${i}`, [xOuter, p.thickness! / 2, zOuter]);
                }

                if (p.hasSpokes) {
                    const spokeAngleStep = (Math.PI * 2) / p.spokeCount!;
                    for (let i = 0; i < p.spokeCount!; i++) {
                        const angle = i * spokeAngleStep;
                        const x = Math.cos(angle) * (p.holeRadius! * 2);
                        const z = Math.sin(angle) * (p.holeRadius! * 2);
                        context.setPoint(`spoke_inner_${i}`, [x, p.thickness! / 2, z]);

                        const xOuter = Math.cos(angle) * p.innerRadius! * 0.8;
                        const zOuter = Math.sin(angle) * p.innerRadius! * 0.8;
                        context.setPoint(`spoke_outer_${i}`, [xOuter, p.thickness! / 2, zOuter]);
                    }
                }
            },

            buildStructure(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Corps principal de l'engrenage (cylindre interne)
                const body = Primitive.cylinder(p.innerRadius!, p.thickness!, p.color!);
                context.addPrimitiveAt(body, [0, p.thickness! / 2, 0]);

                // Rayons si demandés
                if (p.hasSpokes) {
                    const spokeAngleStep = (Math.PI * 2) / p.spokeCount!;
                    for (let i = 0; i < p.spokeCount!; i++) {
                        const angle = i * spokeAngleStep;
                        const spokeLength = (p.innerRadius! - p.holeRadius! * 2);
                        const spokeWidth = p.thickness! * 0.3;

                        const spoke = Primitive.box(spokeLength, p.thickness! * 0.8, spokeWidth, p.color!);
                        const x = Math.cos(angle) * spokeLength / 2;
                        const z = Math.sin(angle) * spokeLength / 2;

                        spoke.rotation.y = angle;
                        context.addPrimitiveAt(spoke, [x, p.thickness! / 2, z]);
                    }
                }
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // === DENTS ===
                const angleStep = (Math.PI * 2) / p.teethCount!;
                const toothWidth = (2 * Math.PI * p.innerRadius! / p.teethCount!) * p.toothWidth!;

                for (let i = 0; i < p.teethCount!; i++) {
                    const angle = i * angleStep;

                    // Créer une dent simple comme un petit cube
                    const tooth = Primitive.box(p.toothHeight!, p.thickness!, toothWidth, p.color!);

                    // Positionner la dent
                    const x = Math.cos(angle) * (p.innerRadius! + p.toothHeight! / 2);
                    const z = Math.sin(angle) * (p.innerRadius! + p.toothHeight! / 2);

                    tooth.rotation.y = angle;
                    context.addPrimitiveAt(tooth, [x, p.thickness! / 2, z]);
                }

                // === TROU CENTRAL ===
                // Note: Dans une vraie implémentation CSG, on soustrairait ce cylindre
                // Ici on ajoute juste un anneau visuel pour indiquer le trou
                const holeRing = Primitive.cylinder(p.holeRadius! + 0.001, p.thickness! * 0.1, '#333333');
                context.addPrimitiveAt(holeRing, [0, p.thickness! + 0.001, 0]);
            },

            getName(): string { return 'Engrenage'; },
            getDescription(): string { return `Engrenage ${mergedParams.teethCount} dents, Ø${(mergedParams.outerRadius! * 2 * 1000).toFixed(0)}mm`; },
            getPrimitiveCount(): number {
                let count = 1 + mergedParams.teethCount!; // corps + dents
                if (mergedParams.hasSpokes) count += mergedParams.spokeCount!;
                return count + 1; // +1 pour l'anneau du trou
            }
        };
    }
}
// Variantes prédéfinies
export const GEAR_VARIANTS = {
    small: { outerRadius: 0.025, thickness: 0.005, teethCount: 12 },
    medium: { ...DEFAULT_GEAR_CONFIG },
    large: { outerRadius: 0.1, thickness: 0.015, teethCount: 40 },
    clockwork: {
        outerRadius: 0.03,
        thickness: 0.003,
        teethCount: 60,
        toothHeight: 0.005,
        color: '#B8860B' // Laiton
    },
    industrial: {
        outerRadius: 0.075,
        thickness: 0.02,
        teethCount: 16,
        hasSpokes: true,
        style: 'simple' as const
    }
};