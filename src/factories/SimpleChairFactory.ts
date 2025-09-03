/**
 * SimpleChairFactory.ts - Factory pour créer des chaises simples
 * Utilise le pattern Builder pour construire un objet SimpleChair en tant que StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D, MaterialConfig } from '@/types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export const DEFAULT_SIMPLE_CHAIR_CONFIG = {
    seatWidth: 0.45,
    seatDepth: 0.40,
    seatHeight: 0.45,
    seatThickness: 0.03,
    backHeight: 0.40,
    backThickness: 0.02,
    legRadius: 0.02,
    woodColor: '#8B4513'
};
export interface SimpleChairParams extends FactoryParams, Partial<typeof DEFAULT_SIMPLE_CHAIR_CONFIG> { }

export class SimpleChairFactory extends BaseFactory<StructuredObject & ICreatable> {
    protected metadata = {
        category: 'furniture',
        name: 'SimpleChair',
        description: 'Chaise simple paramétrique',
        tags: ['chaise', 'mobilier', 'simple'],
        complexity: 'simple' as const
    };

    protected getDefaultParams(): SimpleChairParams {
        return DEFAULT_SIMPLE_CHAIR_CONFIG;
    }

    protected createBuilder(params: SimpleChairParams): IStructuredObjectBuilder {
        const mergedParams = this.mergeParams(params) as SimpleChairParams;

        return {
            definePoints(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Points de l'assise (coins supérieurs)
                context.setPoint('ASSISE_AVANT_GAUCHE', [-p.seatWidth! / 2, p.seatHeight!, -p.seatDepth! / 2]);
                context.setPoint('ASSISE_AVANT_DROIT', [p.seatWidth! / 2, p.seatHeight!, -p.seatDepth! / 2]);
                context.setPoint('ASSISE_ARRIERE_GAUCHE', [-p.seatWidth! / 2, p.seatHeight!, p.seatDepth! / 2]);
                context.setPoint('ASSISE_ARRIERE_DROIT', [p.seatWidth! / 2, p.seatHeight!, p.seatDepth! / 2]);
                context.setPoint('CENTRE_ASSISE', [0, p.seatHeight!, 0]);

                // Points des pieds (base au sol)
                context.setPoint('PIED_BAS_AVANT_GAUCHE', [-p.seatWidth! / 2 + p.legRadius!, 0, -p.seatDepth! / 2 + p.legRadius!]);
                context.setPoint('PIED_BAS_AVANT_DROIT', [p.seatWidth! / 2 - p.legRadius!, 0, -p.seatDepth! / 2 + p.legRadius!]);
                context.setPoint('PIED_BAS_ARRIERE_GAUCHE', [-p.seatWidth! / 2 + p.legRadius!, 0, p.seatDepth! / 2 - p.legRadius!]);
                context.setPoint('PIED_BAS_ARRIERE_DROIT', [p.seatWidth! / 2 - p.legRadius!, 0, p.seatDepth! / 2 - p.legRadius!]);

                // Points des pieds (haut, connexion avec assise)
                context.setPoint('PIED_HAUT_AVANT_GAUCHE', [-p.seatWidth! / 2 + p.legRadius!, p.seatHeight!, -p.seatDepth! / 2 + p.legRadius!]);
                context.setPoint('PIED_HAUT_AVANT_DROIT', [p.seatWidth! / 2 - p.legRadius!, p.seatHeight!, -p.seatDepth! / 2 + p.legRadius!]);
                context.setPoint('PIED_HAUT_ARRIERE_GAUCHE', [-p.seatWidth! / 2 + p.legRadius!, p.seatHeight!, p.seatDepth! / 2 - p.legRadius!]);
                context.setPoint('PIED_HAUT_ARRIERE_DROIT', [p.seatWidth! / 2 - p.legRadius!, p.seatHeight!, p.seatDepth! / 2 - p.legRadius!]);

                // Points du dossier
                context.setPoint('DOSSIER_BAS_GAUCHE', [-p.seatWidth! / 2, p.seatHeight!, p.seatDepth! / 2]);
                context.setPoint('DOSSIER_BAS_DROIT', [p.seatWidth! / 2, p.seatHeight!, p.seatDepth! / 2]);
                context.setPoint('DOSSIER_HAUT_GAUCHE', [-p.seatWidth! / 2, p.seatHeight! + p.backHeight!, p.seatDepth! / 2]);
                context.setPoint('DOSSIER_HAUT_DROIT', [p.seatWidth! / 2, p.seatHeight! + p.backHeight!, p.seatDepth! / 2]);
                context.setPoint('CENTRE_DOSSIER', [0, p.seatHeight! + p.backHeight! / 2, p.seatDepth! / 2 - p.backThickness! / 2]);

                // Points des barres de support
                context.setPoint('BARRE_AVANT_GAUCHE', [-p.seatWidth! / 2 + p.legRadius!, p.seatHeight! * 0.3, -p.seatDepth! / 2 + p.legRadius!]);
                context.setPoint('BARRE_AVANT_DROIT', [p.seatWidth! / 2 - p.legRadius!, p.seatHeight! * 0.3, -p.seatDepth! / 2 + p.legRadius!]);
                context.setPoint('BARRE_ARRIERE_GAUCHE', [-p.seatWidth! / 2 + p.legRadius!, p.seatHeight! * 0.3, p.seatDepth! / 2 - p.legRadius!]);
                context.setPoint('BARRE_ARRIERE_DROIT', [p.seatWidth! / 2 - p.legRadius!, p.seatHeight! * 0.3, p.seatDepth! / 2 - p.legRadius!]);
            },

            buildStructure(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Les 4 pieds
                context.addCylinderBetweenPoints('PIED_BAS_AVANT_GAUCHE', 'PIED_HAUT_AVANT_GAUCHE', p.legRadius!, p.woodColor!);
                context.addCylinderBetweenPoints('PIED_BAS_AVANT_DROIT', 'PIED_HAUT_AVANT_DROIT', p.legRadius!, p.woodColor!);
                context.addCylinderBetweenPoints('PIED_BAS_ARRIERE_GAUCHE', 'PIED_HAUT_ARRIERE_GAUCHE', p.legRadius!, p.woodColor!);
                context.addCylinderBetweenPoints('PIED_BAS_ARRIERE_DROIT', 'PIED_HAUT_ARRIERE_DROIT', p.legRadius!, p.woodColor!);

                // Barres de support horizontales
                context.addCylinderBetweenPoints('BARRE_AVANT_GAUCHE', 'BARRE_AVANT_DROIT', p.legRadius! * 0.8, p.woodColor!);
                context.addCylinderBetweenPoints('BARRE_ARRIERE_GAUCHE', 'BARRE_ARRIERE_DROIT', p.legRadius! * 0.8, p.woodColor!);
            },

            buildSurfaces(context: IStructuredObjectContext): void {
                const p = mergedParams;

                // Assise
                const assisePos = context.getPoint('CENTRE_ASSISE');
                if (assisePos) {
                    const seat = Primitive.box(p.seatWidth!, p.seatThickness!, p.seatDepth!, p.woodColor!);
                    context.addPrimitiveAt(seat, [assisePos.x, assisePos.y, assisePos.z]);
                }

                // Dossier
                const dossierPos = context.getPoint('CENTRE_DOSSIER');
                if (dossierPos) {
                    const backrest = Primitive.box(p.seatWidth!, p.backHeight!, p.backThickness!, p.woodColor!);
                    context.addPrimitiveAt(backrest, [dossierPos.x, dossierPos.y, dossierPos.z]);
                }
            },

            getName(): string { return 'Chaise Simple'; },
            getDescription(): string { return `Chaise simple avec les dimensions : L${mergedParams.seatWidth}xP${mergedParams.seatDepth}xH${mergedParams.seatHeight}`; },
            getPrimitiveCount(): number { return 8; } // 1 assise + 4 pieds + 1 dossier + 2 barres
        };
    }
}