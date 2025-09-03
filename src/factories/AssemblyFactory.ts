/**
 * AssemblyFactory.ts - Factory pour assembler des objets complexes
 *
 * Utilise le pattern Builder pour composer des objets StructuredObject.
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@/types';
import { IStructuredObjectBuilder, IStructuredObjectContext } from '@core/DynamicStructuredObject';

export interface AssemblyParams extends FactoryParams {
  components?: Array<{
    type: string;      // Type de composant
    params: any;       // Paramètres du composant
    transform?: {      // Transformation locale
      position?: [number, number, number];
      rotation?: [number, number, number];
      scale?: [number, number, number];
    };
  }>;
  constraints?: Array<{  // Contraintes d'assemblage
    type: 'coincident' | 'parallel' | 'perpendicular' | 'distance';
    component1: string;
    component2: string;
    value?: number;
  }>;
}

/**
 * Factory pour créer des assemblages complexes
 *
 * NOTE: L'implémentation actuelle est un placeholder pour le pattern Builder.
 * La logique d'assemblage réelle (gestion des composants, contraintes)
 * est à étendre dans les futures itérations.
 */
export class AssemblyFactory extends BaseFactory<StructuredObject & ICreatable> {
  protected metadata = {
    category: 'assembly',
    name: 'Assembly',
    description: 'Assemblage de composants',
    tags: ['assemblage', 'composite', 'mecanique'],
    complexity: 'complex' as const
  };

  protected getDefaultParams(): AssemblyParams {
    return {
      components: [],
      constraints: []
    };
  }

  protected createBuilder(params: AssemblyParams): IStructuredObjectBuilder {
    // const mergedParams = this.mergeParams(params) as AssemblyParams; // Pas nécessaire de merger ici si pas utilisé directement
    // Pour l'instant, l'assemblage est conceptuel dans cette factory.
    // Les vrais assemblages se feront par composition d'objets dans structuredObject.

    // Capturer les métadonnées de la factory pour le builder
    const factoryMetadata = this.metadata;

    // Le builder renvoie une implémentation minimale pour l'objet "Assembly"
    return {
      definePoints(context: IStructuredObjectContext): void {
        // La logique de définition des points de l'assemblage irait ici
        // Ex: points d'ancrage pour les composants
      },
      buildStructure(context: IStructuredObjectContext): void {
        // La logique de construction de la structure de l'assemblage irait ici
        // Ex: ajouter les sous-objets assemblés
      },
      buildSurfaces(context: IStructuredObjectContext): void {
        // La logique de construction des surfaces de l'assemblage irait ici
      },

      getName(): string { return factoryMetadata.name; }, // Utilise les métadonnées capturées de la factory
      getDescription(): string { return factoryMetadata.description; }, // Utilise les métadonnées capturées de la factory
      getPrimitiveCount(): number { return 0; } // Un simple assemblage ne contient pas de primitives directes
    };
  }
}