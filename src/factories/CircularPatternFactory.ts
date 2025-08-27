/**
 * CircularPatternFactory.ts - Factory pour créer des patterns circulaires
 * 
 * Gère la répétition d'éléments en cercle (dents d'engrenage, rayons, etc.)
 */

import { BaseFactory, FactoryParams } from '@base/BaseFactory';
import { StructuredObject } from '@core/StructuredObject';
import { ICreatable } from '@types';
import { Primitive } from '@core/Primitive';
import * as THREE from 'three';

export interface CircularPatternParams extends FactoryParams {
  centerPoint?: [number, number, number];  // Centre du pattern
  radius: number;                          // Rayon du cercle
  count: number;                           // Nombre d'éléments
  elementType: 'box' | 'cylinder' | 'cone' | 'custom';  // Type d'élément
  elementSize?: {
    width?: number;
    height?: number;
    depth?: number;
    radius?: number;
  };
  material?: {
    color?: string;
    metalness?: number;
    roughness?: number;
  };
  startAngle?: number;      // Angle de départ en radians
  endAngle?: number;        // Angle de fin (2*PI par défaut pour cercle complet)
  alignToRadius?: boolean;  // Orienter les éléments vers le centre
  alternating?: boolean;    // Alterner entre 2 positions/tailles
}

/**
 * Factory pour créer des patterns circulaires répétitifs
 */
export class CircularPatternFactory extends BaseFactory<StructuredObject & ICreatable> {
  protected metadata = {
    category: 'pattern',
    name: 'CircularPattern',
    description: 'Pattern circulaire répétitif',
    tags: ['pattern', 'circular', 'repetition'],
    complexity: 'simple' as const
  };

  protected getDefaultParams(): CircularPatternParams {
    return {
      centerPoint: [0, 0, 0],
      radius: 1,
      count: 12,
      elementType: 'box',
      elementSize: {
        width: 0.1,
        height: 0.1,
        depth: 0.1
      },
      material: {
        color: '#808080',
        metalness: 0.5,
        roughness: 0.5
      },
      startAngle: 0,
      endAngle: Math.PI * 2,
      alignToRadius: true,
      alternating: false
    };
  }

  createObject(params?: CircularPatternParams): StructuredObject & ICreatable {
    const mergedParams = this.mergeParams(params) as CircularPatternParams;
    
    class CircularPatternObject extends StructuredObject implements ICreatable {
      constructor() {
        super("CircularPattern", false);
      }
      
      protected definePoints(): void {
        const center = mergedParams.centerPoint || [0, 0, 0];
        const angleRange = (mergedParams.endAngle || Math.PI * 2) - (mergedParams.startAngle || 0);
        const angleStep = angleRange / mergedParams.count;
        
        // Point central
        this.setPoint('CENTER', center);
        
        // Points pour chaque élément du pattern
        for (let i = 0; i < mergedParams.count; i++) {
          const angle = (mergedParams.startAngle || 0) + i * angleStep;
          const x = center[0] + Math.cos(angle) * mergedParams.radius;
          const z = center[2] + Math.sin(angle) * mergedParams.radius;
          
          this.setPoint(`ELEMENT_${i}`, [x, center[1], z]);
          
          // Points alternatifs si mode alternating
          if (mergedParams.alternating && i % 2 === 1) {
            const altRadius = mergedParams.radius * 0.9;
            const altX = center[0] + Math.cos(angle) * altRadius;
            const altZ = center[2] + Math.sin(angle) * altRadius;
            this.setPoint(`ELEMENT_ALT_${i}`, [altX, center[1], altZ]);
          }
        }
      }
      
      protected buildStructure(): void {
        const center = mergedParams.centerPoint || [0, 0, 0];
        const angleRange = (mergedParams.endAngle || Math.PI * 2) - (mergedParams.startAngle || 0);
        const angleStep = angleRange / mergedParams.count;
        const size = mergedParams.elementSize || {};
        const mat = mergedParams.material || {};
        
        for (let i = 0; i < mergedParams.count; i++) {
          const angle = (mergedParams.startAngle || 0) + i * angleStep;
          const useAlt = mergedParams.alternating && i % 2 === 1;
          const radius = useAlt ? mergedParams.radius * 0.9 : mergedParams.radius;
          
          const x = center[0] + Math.cos(angle) * radius;
          const z = center[2] + Math.sin(angle) * radius;
          
          let element: THREE.Mesh;
          
          // Créer l'élément selon le type
          switch (mergedParams.elementType) {
            case 'cylinder':
              element = Primitive.cylinder(
                size.radius || 0.05,
                size.height || 0.1,
                (mat && mat.color) ? mat.color : '#808080'
              );
              break;
              
            case 'cone':
              element = Primitive.cone(
                size.radius || 0.05,
                size.height || 0.1,
                (mat && mat.color) ? mat.color : '#808080'
              );
              break;
              
            case 'box':
            default:
              element = Primitive.box(
                size.width || 0.1,
                size.height || 0.1,
                size.depth || 0.1,
                (mat && mat.color) ? mat.color : '#808080'
              );
              break;
          }
          
          // Orienter vers le centre si demandé
          if (mergedParams.alignToRadius) {
            element.rotation.y = angle;
          }
          
          this.addPrimitiveAt(element, [x, center[1], z]);
        }
      }
      
      protected buildSurfaces(): void {
        // Pas de surfaces supplémentaires pour un pattern
      }
      
      // Implémentation ICreatable
      create(): this { return this; }
      getName(): string { return 'CircularPattern'; }
      getDescription(): string { return `Pattern circulaire de ${mergedParams.count} éléments`; }
      getPrimitiveCount(): number { return mergedParams.count; }
    }
    
    const pattern = new CircularPatternObject();
    pattern.init();
    return pattern;
  }
  
  /**
   * Méthode helper pour créer un pattern de dents d'engrenage
   */
  static createGearTeeth(params: {
    radius: number;
    teethCount: number;
    toothHeight: number;
    toothWidth: number;
    thickness: number;
    color?: string;
  }): CircularPatternParams {
    return {
      radius: params.radius + params.toothHeight / 2,
      count: params.teethCount,
      elementType: 'box',
      elementSize: {
        width: params.toothHeight,
        height: params.thickness,
        depth: params.toothWidth
      },
      material: {
        color: params.color || '#708090',
        metalness: 0.7,
        roughness: 0.3
      },
      alignToRadius: true
    };
  }
  
  /**
   * Méthode helper pour créer des rayons
   */
  static createSpokes(params: {
    innerRadius: number;
    outerRadius: number;
    spokeCount: number;
    spokeWidth: number;
    thickness: number;
    color?: string;
  }): CircularPatternParams {
    const spokeLength = params.outerRadius - params.innerRadius;
    return {
      radius: (params.innerRadius + params.outerRadius) / 2,
      count: params.spokeCount,
      elementType: 'box',
      elementSize: {
        width: spokeLength,
        height: params.thickness * 0.8,
        depth: params.spokeWidth
      },
      material: {
        color: params.color || '#606060'
      },
      alignToRadius: true
    };
  }
}