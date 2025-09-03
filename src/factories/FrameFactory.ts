/**
 * FrameFactory.ts - Factory pour créer des structures filaires (frames)
 * 
 * Utilise le pattern Builder pour construire des structures, compatible avec buildStructure() de StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D } from '@/types'; // Import de Position3D
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export interface FrameParams extends FactoryParams {
  diameter?: number;     // Diamètre des tubes
  material?: string;     // Couleur/matériau
  points?: Array<[string, number[]]>;  // Points nommés
  connections?: Array<[string, string]>; // Connexions entre points
}

/**
 * Factory pour créer des structures filaires
 */
export class FrameFactory extends BaseFactory<StructuredObject & ICreatable> {
  protected metadata = {
    category: 'structure',
    name: 'Frame',
    description: 'Structure filaire paramétrique',
    tags: ['frame', 'structure', 'squelette'],
    complexity: 'simple' as const
  };

  protected getDefaultParams(): FrameParams {
    return {
      diameter: 0.01,
      material: '#333333',
      points: [],
      connections: []
    };
  }

  protected createBuilder(params: FrameParams): IStructuredObjectBuilder {
    const mergedParams = this.mergeParams(params) as FrameParams;
    const factoryMetadata = this.metadata;

    return {
      definePoints(context: IStructuredObjectContext): void {
        if (mergedParams.points) {
          mergedParams.points.forEach(([name, position]) => {
            context.setPoint(name, position as Position3D);
          });
        }
      },

      buildStructure(context: IStructuredObjectContext): void {
        // Créer les cylindres entre les points connectés
        if (mergedParams.connections) {
          mergedParams.connections.forEach(([point1, point2]) => {
            // Utilisation du context pour appeler addCylinderBetweenPoints
            context.addCylinderBetweenPoints(
              point1,
              point2,
              mergedParams.diameter || 0.01,
              mergedParams.material || '#333333'
            );
          });
        }
      },

      buildSurfaces(context: IStructuredObjectContext): void {
        // Pas de surfaces pour un frame
      },

      getName(): string { return factoryMetadata.name; }, // Utilise les métadonnées capturées de la factory
      getDescription(): string { return factoryMetadata.description; }, // Utilise les métadonnées capturées de la factory
      getPrimitiveCount(): number { return (mergedParams.connections || []).length; }
    };
  }
}