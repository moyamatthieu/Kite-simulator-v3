/**
 * AssemblyFactory.ts - Factory pour assembler des objets complexes
 * 
 * Pattern actuel KISS : Composition d'objets StructuredObject
 * Suit le workflow : Points → Frame → Surfaces
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';

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
 * TODO: Questions pour évolution future
 * - [ ] Gérer les contraintes d'assemblage (mate constraints) ?
 * - [ ] Supporter assemblages hiérarchiques (sous-assemblages) ?
 * - [ ] Détecter collisions entre composants ?
 * - [ ] Optimiser ordre d'assemblage ?
 * - [ ] Gérer nomenclature (BOM) ?
 * - [ ] Animation d'assemblage/désassemblage ?
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

  createObject(params?: AssemblyParams): StructuredObject & ICreatable {
    const mergedParams = this.mergeParams(params);
    
    // TODO: Implémenter la création
    // Pour l'instant, on compose manuellement dans StructuredObject
    
    throw new Error('AssemblyFactory: À implémenter - utiliser composition manuelle pour le moment');
    
    // Idée future :
    // - Résoudre les contraintes automatiquement
    // - Gérer les dépendances entre composants
    // - Optimiser les performances
  }
}

/**
 * TODO: Méthodes utilitaires à considérer
 * 
 * - solveConstraints() : Résoudre contraintes d'assemblage
 * - detectCollisions() : Détecter interférences
 * - explodeView() : Vue éclatée automatique
 * - generateBOM() : Générer nomenclature
 * - animateAssembly() : Animation d'assemblage
 */

/**
 * NOTE: Workflow actuel KISS qui fonctionne
 * 
 * 1. definePoints() : Points anatomiques de l'assemblage
 * 2. buildStructure() : Frame/squelette rigide
 * 3. buildSurfaces() : Surfaces et habillage
 * 
 * Chaque objet est autonome et peut être composé !
 */

/**
 * EXEMPLE: Assemblage d'un cerf-volant
 * 
 * Points anatomiques:
 * - NEZ, SPINE_BAS, BORD_GAUCHE, BORD_DROIT
 * - CENTRE, INTER_GAUCHE, INTER_DROIT
 * - WHISKER_GAUCHE, WHISKER_DROIT
 * 
 * Frame (cylindres):
 * - Épine centrale
 * - Bords d'attaque
 * - Barre transversale (spreader)
 * - Whiskers
 * 
 * Surfaces (triangles):
 * - Panneaux de toile gauche/droit
 * - Subdivision en triangles
 * 
 * C'est simple et ça marche !
 */