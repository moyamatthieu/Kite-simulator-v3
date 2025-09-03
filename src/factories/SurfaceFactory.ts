/**
 * SurfaceFactory.ts - Factory pour créer des surfaces et toiles
 * 
 * Utilise le pattern Builder pour construire des surfaces, compatible avec buildSurfaces() de StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable, Position3D } from '@/types'; // Import de Position3D
import * as THREE from 'three';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export interface SurfaceParams extends FactoryParams {
  points?: Array<[string, number[]]>;  // Points nommés pour la surface
  panels?: Array<string[]>;             // Groupes de 3-4 points formant des panneaux
  material?: {
    color?: string;
    opacity?: number;
    transparent?: boolean;
    doubleSided?: boolean;  // true = visible des deux côtés (défaut), false = une face
    side?: THREE.Side;
  };
  tension?: number;  // Tension de la toile (future feature)
}

/**
 * Factory pour créer des surfaces tendues
 */
export class SurfaceFactory extends BaseFactory<StructuredObject & ICreatable> {
  protected metadata = {
    category: 'surface',
    name: 'Surface',
    description: 'Surface tendue paramétrique',
    tags: ['surface', 'toile', 'membrane'],
    complexity: 'simple' as const
  };

  protected getDefaultParams(): SurfaceParams {
    return {
      points: [],
      panels: [],
      material: {
        color: '#ff0000',
        opacity: 0.9,
        transparent: true,
        doubleSided: true
      },
      tension: 1.0
    };
  }

  protected createBuilder(params: SurfaceParams): IStructuredObjectBuilder {
    const mergedParams = this.mergeParams(params) as SurfaceParams;
    const factoryMetadata = this.metadata;

    return {
      definePoints(context: IStructuredObjectContext): void {
        if (mergedParams.points) {
          mergedParams.points.forEach(([name, positionalArray]) => {
            context.setPoint(name, positionalArray as Position3D);
          });
        }
      },

      buildStructure(context: IStructuredObjectContext): void {
        // Pas de structure pour une surface pure
      },

      buildSurfaces(context: IStructuredObjectContext): void {
        // Créer les panneaux de surface
        if (mergedParams.panels) {
          mergedParams.panels.forEach(panel => {
            const mat = mergedParams.material || {};
            const side = mat.doubleSided !== false ? THREE.DoubleSide : THREE.FrontSide;

            context.addSurfaceBetweenPoints(panel, {
              color: mat.color || '#ff0000',
              opacity: mat.opacity !== undefined ? mat.opacity : 0.9,
              transparent: mat.transparent !== false,
              side: mat.side || side
            });
          });
        }
      },

      getName(): string { return factoryMetadata.name; }, // Utilise les métadonnées capturées de la factory
      getDescription(): string { return factoryMetadata.description; }, // Utilise les métadonnées capturées de la factory
      getPrimitiveCount(): number { return (mergedParams.panels || []).length; }
    };
  }
}