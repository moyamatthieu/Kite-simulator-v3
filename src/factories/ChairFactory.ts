/**
 * ChairFactory.ts - Factory pour créer des chaises paramétriques
 * Utilise le pattern Builder pour construire un objet Chaise en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

// Configuration par défaut de la chaise
export const DEFAULT_CHAIR_CONFIG = {
    // Dimensions (en unités 3D)
    seatWidth: 0.4,
    seatDepth: 0.4,
    seatHeight: 0.45,
    seatThickness: 0.03,

    backHeight: 0.4,
    backThickness: 0.03,
    backAngle: 5,  // Inclinaison du dossier en degrés

    legRadius: 0.02,
    legStyle: 'round' as 'round' | 'square',

    // Couleurs
    seatColor: '#8B4513',    // Bois marron
    backColor: '#8B4513',    // Bois marron
    legColor: '#654321',     // Bois plus foncé

    // Options
    hasArmrests: false,
    armrestHeight: 0.2,
    style: 'modern' as 'modern' | 'classic' | 'scandinavian'
};

export interface ChairParams extends FactoryParams, Partial<typeof DEFAULT_CHAIR_CONFIG> { }

export class ChairFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'furniture',
        name: 'Chair',
        description: 'Chaise paramétrique',
        tags: ['chaise', 'mobilier', 'siège'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): ChairParams {
        return DEFAULT_CHAIR_CONFIG;
    }

    protected createBuilder(params: ChairParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as ChairParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;
                const hw = p.seatWidth! / 2;  // half width
                const hd = p.seatDepth! / 2;  // half depth

                // Points de l'assise
                context.setPoint('seat_center', [0, p.seatHeight!, 0]);
                context.setPoint('seat_fl', [-hw, p.seatHeight!, -hd]); // front left
                context.setPoint('seat_fr', [hw, p.seatHeight!, -hd]);  // front right
                context.setPoint('seat_bl', [-hw, p.seatHeight!, hd]);  // back left
                context.setPoint('seat_br', [hw, p.seatHeight!, hd]);   // back right

                // Points du dossier
                const backY = p.seatHeight! + p.backHeight! / 2;
                const backZ = -hd + p.backThickness! / 2;
                context.setPoint('back_center', [0, backY, backZ]);
                context.setPoint('back_top', [0, p.seatHeight! + p.backHeight!, backZ]);
                context.setPoint('back_bottom', [0, p.seatHeight!, backZ]);

                // Points des pieds
                const legInset = p.legRadius!;
                context.setPoint('leg_fl', [-hw + legInset, p.seatHeight! / 2, -hd + legInset]);
                context.setPoint('leg_fr', [hw - legInset, p.seatHeight! / 2, -hd + legInset]);
                context.setPoint('leg_bl', [-hw + legInset, p.seatHeight! / 2, hd - legInset]);
                context.setPoint('leg_br', [hw - legInset, p.seatHeight! / 2, hd - legInset]);

                // Points pour les accoudoirs si nécessaire
                if (p.hasArmrests) {
                    context.setPoint('armrest_left', [-hw, p.seatHeight! + p.armrestHeight!, 0]);
                    context.setPoint('armrest_right', [hw, p.seatHeight! + p.armrestHeight!, 0]);
                }
            },

            buildStructure(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Pieds de la chaise (structure principale)
                const legPositions = [
                    context.getPoint('leg_fl'),
                    context.getPoint('leg_fr'),
                    context.getPoint('leg_bl'),
                    context.getPoint('leg_br')
                ];

                legPositions.forEach((pos) => {
                    if (pos) {
                        let leg;
                        if (p.legStyle === 'square') {
                            leg = Primitive.box(p.legRadius! * 2, p.seatHeight!, p.legRadius! * 2, p.legColor!);
                        } else {
                            leg = Primitive.cylinder(p.legRadius!, p.seatHeight!, p.legColor!);
                        }
                        context.addPrimitiveAt(leg, [pos.x, pos.y, pos.z]);
                    }
                });

                // Supports pour accoudoirs si nécessaire
                if (p.hasArmrests) {
                    const leftSupport = Primitive.cylinder(p.legRadius! * 0.8, p.armrestHeight!, p.legColor!);
                    context.addPrimitiveAt(leftSupport, [-p.seatWidth! / 2, p.seatHeight! + p.armrestHeight! / 2, p.seatDepth! / 4]);

                    const rightSupport = Primitive.cylinder(p.legRadius! * 0.8, p.armrestHeight!, p.legColor!);
                    context.addPrimitiveAt(rightSupport, [p.seatWidth! / 2, p.seatHeight! + p.armrestHeight! / 2, p.seatDepth! / 4]);
                }
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // === ASSISE ===
                const seat = Primitive.box(p.seatWidth!, p.seatThickness!, p.seatDepth!, p.seatColor!);
                context.addPrimitiveAt(seat, [0, p.seatHeight!, 0]);

                // === DOSSIER ===
                let back = Primitive.box(p.seatWidth!, p.backHeight!, p.backThickness!, p.backColor!);

                // Appliquer l'inclinaison si nécessaire
                if (p.backAngle! > 0) {
                    back.rotation.x = -THREE.MathUtils.degToRad(p.backAngle!);
                }

                // Style scandinave : dossier avec barreaux
                if (p.style === 'scandinavian') {
                    // Remplacer par des barreaux verticaux
                    for (let i = 0; i < 5; i++) {
                        const slat = Primitive.box(p.seatWidth! * 0.15, p.backHeight! * 0.8, p.backThickness!, p.backColor!);
                        const x = (i - 2) * p.seatWidth! * 0.2;
                        context.addPrimitiveAt(slat, [x, p.seatHeight! + p.backHeight! / 2, -p.seatDepth! / 2 + p.backThickness! / 2]);
                    }
                } else {
                    context.addPrimitiveAt(back, [0, p.seatHeight! + p.backHeight! / 2, -p.seatDepth! / 2 + p.backThickness! / 2]);
                }

                // === ACCOUDOIRS ===
                if (p.hasArmrests) {
                    const armrestLength = p.seatDepth! * 0.8;
                    const armrestWidth = p.legRadius! * 2;

                    const leftArmrest = Primitive.box(armrestWidth, armrestWidth, armrestLength, p.seatColor!);
                    context.addPrimitiveAt(leftArmrest, [-p.seatWidth! / 2, p.seatHeight! + p.armrestHeight!, 0]);

                    const rightArmrest = Primitive.box(armrestWidth, armrestWidth, armrestLength, p.seatColor!);
                    context.addPrimitiveAt(rightArmrest, [p.seatWidth! / 2, p.seatHeight! + p.armrestHeight!, 0]);
                }
            },

            getName(): string { return 'Chaise'; },
            getDescription(): string { return `Chaise ${mergedParams.style} ${(mergedParams.seatHeight! * 100).toFixed(0)}cm`; },
            getPrimitiveCount(): number {
                let count = 2; // Assise + dossier (box de dossier ou barreaux)
                if (mergedParams.style === 'scandinavian') count += 5; // pour les 5 lattes
                count += 4; // 4 pieds

                if (mergedParams.hasArmrests) {
                    count += 2; // 2 accoudoirs
                    count += 2; // 2 supports d'accoudoirs
                }
                return count;
            }
        };
    }
}

// Variantes prédéfinies
export const CHAIR_VARIANTS = {
    dining: { ...DEFAULT_CHAIR_CONFIG },
    office: {
        seatHeight: 0.5,
        hasArmrests: true,
        backHeight: 0.5,
        style: 'modern' as const
    },
    bar: {
        seatHeight: 0.75,
        seatWidth: 0.35,
        seatDepth: 0.35,
        legRadius: 0.015,
        style: 'modern' as const
    },
    lounge: {
        seatWidth: 0.5,
        seatDepth: 0.45,
        backAngle: 15,
        style: 'scandinavian' as const
    }
};