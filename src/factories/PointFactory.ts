/**
 * PointFactory.ts - Factory pour gérer les points anatomiques
 * 
 * Pattern actuel KISS : Définition de points nommés dans l'espace 3D
 * Compatible avec definePoints() de StructuredObject
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';

export interface PointParams extends FactoryParams {
  points: Map<string, [number, number, number]>;  // Points nommés
  constraints?: Array<{                           // Contraintes entre points
    type: 'distance' | 'angle' | 'coplanar';
    points: string[];
    value?: number;
  }>;
  symmetric?: boolean;  // Génération symétrique automatique
}

/**
 * Factory pour gérer les nuages de points anatomiques
 * 
 * TODO: Questions pour évolution future
 * - [ ] Générer automatiquement les points symétriques (_GAUCHE/_DROIT) ?
 * - [ ] Valider les contraintes géométriques entre points ?
 * - [ ] Supporter import de points depuis sketches 2D ?
 * - [ ] Calculer points intermédiaires par interpolation ?
 * - [ ] Gérer hiérarchie de points (parent/enfant) ?
 * - [ ] Snapping sur grille ou plans de construction ?
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

  createObject(params?: PointParams): StructuredObject & ICreatable {
    const mergedParams = this.mergeParams(params) as PointParams;
    
    // Créer un objet vide qui contiendra uniquement les points
    class PointObject extends StructuredObject implements ICreatable {
      constructor() {
        super("Points", false);
      }
      
      protected definePoints(): void {
        // Ajouter tous les points fournis
        if (mergedParams.points) {
          mergedParams.points.forEach((value, key) => {
            this.setPoint(key, value);
          });
        }
        
        // Si symétrique, générer les points _GAUCHE/_DROIT automatiquement
        if (mergedParams.symmetric) {
          const originalPoints = new Map(mergedParams.points);
          originalPoints.forEach((value, key) => {
            if (!key.includes('_GAUCHE') && !key.includes('_DROIT')) {
              // Générer les versions symétriques
              if (value[0] !== 0) { // Si pas sur l'axe central
                this.setPoint(`${key}_GAUCHE`, [-Math.abs(value[0]), value[1], value[2]]);
                this.setPoint(`${key}_DROIT`, [Math.abs(value[0]), value[1], value[2]]);
              }
            }
          });
        }
      }
      
      protected buildStructure(): void {
        // Pas de structure pour un nuage de points
      }
      
      protected buildSurfaces(): void {
        // Pas de surfaces pour un nuage de points
      }
      
      // Implémentation ICreatable
      create(): this { return this; }
      getName(): string { return 'Points'; }
      getDescription(): string { return 'Nuage de points anatomiques'; }
      getPrimitiveCount(): number { return (mergedParams.points?.size || 0); }
    }
    
    const pointObject = new PointObject();
    pointObject.init();
    return pointObject;
  }

  /**
   * Méthodes utilitaires futures
   */
  
  // Générer point symétrique
  static mirrorPoint(point: [number, number, number], axis: 'X' | 'Y' | 'Z'): [number, number, number] {
    const mirrored: [number, number, number] = [...point];
    const axisIndex = axis === 'X' ? 0 : axis === 'Y' ? 1 : 2;
    mirrored[axisIndex] = -mirrored[axisIndex];
    return mirrored;
  }
  
  // Interpoler entre deux points
  static interpolate(
    p1: [number, number, number], 
    p2: [number, number, number], 
    ratio: number
  ): [number, number, number] {
    return [
      p1[0] + (p2[0] - p1[0]) * ratio,
      p1[1] + (p2[1] - p1[1]) * ratio,
      p1[2] + (p2[2] - p1[2]) * ratio
    ];
  }
}

/**
 * TODO: Patterns de points courants à considérer
 * 
 * - createGrid() : Grille de points régulière
 * - createCircle() : Points sur un cercle
 * - createSpiral() : Points en spirale
 * - createFromSketch() : Importer depuis esquisse 2D
 * - createBoundingPoints() : Points de boîte englobante
 */

/**
 * NOTE: Pattern actuel qui fonctionne bien
 * 
 * 1. Définir chaque point avec un nom explicite
 * 2. Utiliser des noms sémantiques (NEZ, BORD_GAUCHE, etc.)
 * 3. Calculer les positions relatives
 * 
 * Simple et clair pour la maintenance !
 */