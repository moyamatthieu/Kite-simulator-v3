/**
 * PointFactory.ts - Factory pour gérer les points anatomiques
 * 
 * Pattern actuel KISS : Définition de points nommés dans l'espace 3D
 * Compatible avec definePoints() de StructuredObject
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D } from '@/types'; // Import de Position3D est nécessaire
import { ThreeJSUtils } from '@/utils/ThreeJSUtils';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject'; // Import des interfaces

export interface PointParams extends FactoryParams {
  points: Map<string, [number, number, number]>;
  constraints?: Array<{
    type: 'distance' | 'angle' | 'coplanar';
    points: string[];
    value?: number;
  }>;
  symmetric?: boolean;
}

/**
 * Factory pour gérer les nuages de points anatomiques
 */
export class PointFactory extends BaseFactory<StructuredObject & ICreatable> {
  protected metadata = {
    category: 'foundation',
    name: 'Points',
    description: 'Nuage de points anatomiques',
    tags: ['points', 'squelette', 'anatomie'],
    complexity: 'simple' as const
  };

  protected getDefaultParams(): PointParams {
    return {
      points: new Map(),
      constraints: [],
      symmetric: false
    };
  }

  protected createBuilder(params: PointParams): IStructuredObjectBuilder {
    const mergedParams = this.mergeParams(params) as PointParams;

    return {
      definePoints(context: IStructuredObjectContext): void {
        // Ajouter tous les points fournis
        if (mergedParams.points) {
          mergedParams.points.forEach((value, key) => {
            // Utilisation du context pour appeler setPoint
            context.setPoint(key, value);
          });
        }

        // Si symétrique, générer les points _GAUCHE/_DROIT automatiquement
        if (mergedParams.symmetric) {
          const originalPoints = new Map(mergedParams.points);
          originalPoints.forEach((value: Position3D, key: string) => { // Spécifier le type de value
            if (!key.includes('_GAUCHE') && !key.includes('_DROIT')) {
              if (value[0] !== 0) { // Si pas sur l'axe central
                // Utilisation du context pour appeler setPoint
                context.setPoint(`${key}_GAUCHE`, ThreeJSUtils.mirrorPoint(value, 'X'));
                context.setPoint(`${key}_DROIT`, value); // Le point original est le droit
              }
            }
          });
        }
      },

      buildStructure(context: IStructuredObjectContext): void {
        // Pas de structure pour un nuage de points
      },

      buildSurfaces(context: IStructuredObjectContext): void {
        // Pas de surfaces pour un nuage de points
      },

      getName(): string { return 'Points'; },
      getDescription(): string { return 'Nuage de points anatomiques'; },
      getPrimitiveCount(): number { return (mergedParams.points?.size || 0); }
    };
  }
}